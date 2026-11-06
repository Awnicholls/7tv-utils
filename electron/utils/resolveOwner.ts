import { CopyError } from '../seventv/CopyError.js';
import { tokenUserId } from './tokenUserId.js';

/**
 * The account a new set is created on: the one being edited for, if any,
 * otherwise the token's own.
 */
export const resolveOwner = (
  ownerId: string | undefined,
  bearer: string
): string => {
  const chosen = ownerId?.trim() ?? '';
  const id = chosen.length > 0 ? chosen : tokenUserId(bearer);
  if (id === null) {
    throw new CopyError('That does not look like a 7TV token.');
  }
  return id;
};
