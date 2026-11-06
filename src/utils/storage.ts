/**
 * Small per-device preferences. Storage can be unavailable or hold junk, so
 * every read falls back and every write is best effort.
 */
export const readStored = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const writeStored = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not worth interrupting anyone over a preference.
  }
};
