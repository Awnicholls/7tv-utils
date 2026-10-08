// Token persistence. Encrypted with the OS keychain (DPAPI on Windows,
// Keychain on macOS, libsecret on Linux) when available.
import { app, safeStorage } from 'electron';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = (): string => path.join(app.getPath('userData'), 'token.bin');
const PLAIN = 'plain:';

export async function clearToken(): Promise<void> {
  await rm(file(), { force: true });
}

export async function loadToken(): Promise<string> {
  try {
    const buf = await readFile(file());
    if (buf.subarray(0, PLAIN.length).toString('utf8') === PLAIN) {
      return buf.subarray(PLAIN.length).toString('utf8');
    }
    return safeStorage.decryptString(buf);
  } catch {
    return '';
  }
}

export async function saveToken(token: string): Promise<void> {
  const value = token.trim();
  if (!value) {
    await clearToken();
    return;
  }
  await mkdir(path.dirname(file()), { recursive: true });
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(value)
    : Buffer.from(PLAIN + value, 'utf8');
  await writeFile(file(), data, { mode: 0o600 });
}
