import { MISSING_TOKEN_MESSAGE } from '../seventv/constants.js';
import { CopyError } from '../seventv/CopyError.js';
import { normalizeToken } from './normalizeToken.js';

export const requireBearer = (token: string): string => {
  const bearer = normalizeToken(token);
  if (!bearer) {
    throw new CopyError(MISSING_TOKEN_MESSAGE);
  }
  return bearer;
};
