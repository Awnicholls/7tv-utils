import { app, safeStorage } from 'electron';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PLAIN_PREFIX = 'plain:';

const tokenFile = (): string => path.join(app.getPath('userData'), 'token.bin');

export const clearToken = async (): Promise<void> => {
  await rm(tokenFile(), { force: true });
};

export const loadToken = async (): Promise<string> => {
  try {
    const buf = await readFile(tokenFile());
    if (
      buf.subarray(0, PLAIN_PREFIX.length).toString('utf8') === PLAIN_PREFIX
    ) {
      return buf.subarray(PLAIN_PREFIX.length).toString('utf8');
    }
    return safeStorage.decryptString(buf);
  } catch {
    return '';
  }
};

export const saveToken = async (token: string): Promise<void> => {
  const value = token.trim();
  if (!value) {
    await clearToken();
    return;
  }
  await mkdir(path.dirname(tokenFile()), { recursive: true });
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(value)
    : Buffer.from(PLAIN_PREFIX + value, 'utf8');
  await writeFile(tokenFile(), data, { mode: 0o600 });
};
