/**
 * Reads the 7TV user id out of a token's JWT payload without verifying it.
 * Current tokens carry it in `sub`; older v3 tokens used `u`.
 */
export const tokenUserId = (bearer: string): null | string => {
  const part = bearer.split('.', 2)[1];
  if (!part) {
    return null;
  }
  try {
    const claims = JSON.parse(
      Buffer.from(part, 'base64url').toString('utf8')
    ) as { sub?: unknown; u?: unknown };
    const id = claims.sub ?? claims.u;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
};
