export const jwtExp = (token: string): null | number => {
  const part = token.split('.', 2)[1];
  if (!part) {
    return null;
  }
  try {
    const b64 = part.replaceAll('-', '+').replaceAll('_', '/');
    const json = JSON.parse(atob(b64)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
};
