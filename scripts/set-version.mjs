import fs from 'node:fs';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version || '')) {
  console.error('Usage: yarn set-version <semver>');
  console.error('Example: yarn set-version 0.2.0');
  process.exit(1);
}

const path = 'package.json';
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
json.version = version;
fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');

console.log(`Version set to ${version}`);
console.log('Next: commit and push main to publish the release.');
