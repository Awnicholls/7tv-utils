export const normalizeToken = (token: string): string =>
  token
    .trim()
    .replace(/^bearer\s+/i, '')
    .replaceAll(/^["']|["']$/g, '')
    .trim();
