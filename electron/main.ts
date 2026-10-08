// Electron main process. All network calls to 7TV happen here (no CORS, and
// the token never has to leave this machine except to 7tv.io).
import {
  app,
  BrowserWindow,
  ipcMain,
  type IpcMainInvokeEvent,
  Menu,
  nativeTheme,
  shell,
} from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  type CopyEvent,
  type CopyRequest,
  IPC,
  type IpcResult,
} from '../shared/ipc.js';
import { copyEmotes, CopyError, getEmoteSet } from '../shared/seventv.js';
import { clearToken, loadToken, saveToken } from './store.js';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const PRELOAD = path.join(import.meta.dirname, 'preload.cjs');

const state: {
  activeCopy: AbortController | null;
  mainWindow: BrowserWindow | null;
} = { activeCopy: null, mainWindow: null };

const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) {
  // eslint-disable-next-line no-console -- explains an otherwise silent exit
  console.error('Another 7TV Emote Copier instance is already running.');
  app.exit(0);
}

app.on('second-instance', () => {
  if (!state.mainWindow) {
    return;
  }

  if (state.mainWindow.isMinimized()) {
    state.mainWindow.restore();
  }
  state.mainWindow.focus();
});

app.on('window-all-closed', () => {
  state.activeCopy?.abort();
  app.quit();
});

app.on('web-contents-created', (_e, contents) => {
  // Never let a page spawn <webview>s.
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

// Do NOT top-level `await app.whenReady()`: with an ESM entry point, Electron
// only finishes launching once this module has finished evaluating, so
// awaiting `ready` here deadlocks (the dock icon just bounces forever).
if (isPrimaryInstance) {
  void app.whenReady().then(() => {
    if (process.platform !== 'darwin') {
      Menu.setApplicationMenu(null);
    }
    registerIpc();
    createWindow();
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b0c0e' : '#ffffff',
    height: 720,
    maximizable: false,
    resizable: false,
    show: false,
    title: '7TV Emote Copier',
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: PRELOAD,
      sandbox: true,
      spellcheck: false,
    },
    width: 760,
  });
  state.mainWindow = win;

  win.once('ready-to-show', () => {
    win.show();
  });
  win.on('closed', () => {
    state.mainWindow = null;
  });

  // Surface bridge failures in the terminal instead of failing silently.
  win.webContents.on('preload-error', (_e, preloadPath, error) => {
    // eslint-disable-next-line no-console -- dev diagnostics for the terminal
    console.error(`[preload] ${preloadPath} failed:`, error);
  });
  if (DEV_URL) {
    win.webContents.on('console-message', ({ level, message }) => {
      // eslint-disable-next-line no-console -- dev diagnostics for the terminal
      console.log(`[renderer:${level}] ${message}`);
    });
    win.webContents.on('did-finish-load', () => {
      void win.webContents
        .executeJavaScript('typeof window.api')
        .then((kind: unknown) => {
          // eslint-disable-next-line no-console -- dev diagnostics for the terminal
          console.log(
            `[dev] preload=${PRELOAD} exists=${existsSync(PRELOAD)} bridge=${String(kind)}`
          );
        });
    });
  }

  // Links open in the user's browser; the app window never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (isAppUrl(url)) {
      return;
    }

    e.preventDefault();
    openExternalSafe(url);
  });

  if (DEV_URL) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof CopyError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') {
      return '7TV did not respond in time. Check your connection.';
    }
    if (error.name === 'TypeError' && /fetch/i.test(error.message)) {
      return 'Could not reach 7TV. Check your connection.';
    }
    return error.message;
  }
  return String(error);
}

/**
 * ipcMain.handle, but only for messages from our own window.
 */
function handle(
  channel: string,
  fn: (e: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  ipcMain.handle(channel, (e, ...args: unknown[]) => {
    if (!isTrusted(e)) {
      throw new Error('Untrusted sender');
    }
    return fn(e, ...args);
  });
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isAppUrl(url: string): boolean {
  return DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
}

/**
 * Only accept IPC from our own top-level page.
 */
function isTrusted(e: IpcMainInvokeEvent): boolean {
  return (
    state.mainWindow !== null &&
    e.sender === state.mainWindow.webContents &&
    isAppUrl(e.senderFrame?.url ?? '')
  );
}

function openExternalSafe(url: string): void {
  if (url.startsWith('https://')) {
    void shell.openExternal(url);
  }
}

function registerIpc(): void {
  handle(IPC.loadToken, () => loadToken());
  handle(IPC.saveToken, (_e, token: unknown) =>
    saveToken(typeof token === 'string' ? token : '')
  );
  handle(IPC.forgetToken, async () => {
    await clearToken();
  });
  handle(IPC.openExternal, (_e, url: unknown) => {
    if (typeof url === 'string') {
      openExternalSafe(url);
    }
  });

  handle(IPC.loadSet, async (_e, input: unknown) =>
    wrap(() => getEmoteSet(typeof input === 'string' ? input : ''))
  );

  handle(IPC.cancelCopy, () => {
    state.activeCopy?.abort();
  });

  handle(IPC.startCopy, async (e, raw) => {
    if (state.activeCopy) {
      return { error: 'A copy is already running.', ok: false } as const;
    }
    const req = raw as CopyRequest;
    const ctrl = new AbortController();
    state.activeCopy = ctrl;
    const send = (event: CopyEvent): void => {
      if (!e.sender.isDestroyed()) {
        e.sender.send(IPC.copyEvent, event);
      }
    };
    try {
      return await wrap(async () => {
        send({ kind: 'info', text: 'Loading source set…', type: 'log' });
        const source = await getEmoteSet(req.source, {
          signal: ctrl.signal,
        });
        send({
          kind: 'ok',
          text: `Found “${source.name}” with ${source.emotes.length} emotes.`,
          type: 'log',
        });
        if (source.emotes.length === 0) {
          throw new CopyError('The source set is empty.');
        }
        return copyEmotes(source, req.target, req.token, {
          onLog: (kind, text) => {
            send({ kind, text, type: 'log' });
          },
          onProgress: (progress) => {
            send({ progress, type: 'progress' });
          },
          signal: ctrl.signal,
        });
      });
    } finally {
      state.activeCopy = null;
    }
  });
}

async function wrap<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (isAbort(error)) {
      return { cancelled: true, error: 'Cancelled.', ok: false };
    }
    return { error: errorMessage(error), ok: false };
  }
}
