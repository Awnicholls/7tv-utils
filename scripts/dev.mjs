import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const electronBin = require('electron');
const tscBin = require.resolve('typescript/bin/tsc');
const logFile = createWriteStream('dev.log', { flags: 'w' });
const state = { child: null, restarting: false, tsc: null, watchBuilds: 0 };

const log = (line) => {
  const text = `[dev] ${line}\n`;
  process.stdout.write(text);
  logFile.write(text);
};

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    spawn(cmd, args, { stdio: 'inherit' }).on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
  });

const server = await createServer({ logLevel: 'warn' });
await server.listen();
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:1420/';

const shutdown = async () => {
  state.tsc?.kill();
  await server.close();
  logFile.end();
  process.exit(0);
};

const startElectron = () => {
  log(`starting Electron: ${electronBin}`);
  const child = spawn(electronBin, ['.'], {
    env: { ...process.env, VITE_DEV_SERVER_URL: url },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const [stream, out] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (chunk) => {
      out.write(chunk);
      logFile.write(chunk);
    });
  }
  child.on('exit', (code, signal) => {
    log(`Electron exited (code ${code}, signal ${signal})`);
    if (!state.restarting) {
      void shutdown();
    }
  });
  return child;
};

const restartElectron = () => {
  log('main/preload changed, restarting Electron');
  state.restarting = true;
  state.child.once('exit', () => {
    state.restarting = false;
    state.child = startElectron();
  });
  state.child.kill();
};

const onTscOutput = (chunk) => {
  process.stdout.write(chunk);
  const match = /Found (\d+) errors?\. Watching for file changes/.exec(chunk);
  if (!match) {
    return;
  }
  state.watchBuilds += 1;
  if (state.watchBuilds > 1 && match[1] === '0') {
    restartElectron();
  }
};

log(`renderer dev server on ${url} (opened in the Electron window)`);
await run(process.execPath, [tscBin, '-p', 'tsconfig.electron.json']);

state.child = startElectron();
state.tsc = spawn(
  process.execPath,
  [tscBin, '-p', 'tsconfig.electron.json', '--watch', '--preserveWatchOutput'],
  { stdio: ['ignore', 'pipe', 'inherit'] }
);
state.tsc.stdout.setEncoding('utf8');
state.tsc.stdout.on('data', onTscOutput);

process.on('SIGINT', shutdown);
