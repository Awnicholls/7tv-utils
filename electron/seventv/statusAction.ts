import type { StatusAction } from '../types/copier.js';

import { TOKEN_INVALID_MESSAGE } from './constants.js';
import { CopyError } from './CopyError.js';

export const statusAction = (
  status: number,
  batchLength: number
): StatusAction => {
  if (status === 401) {
    throw new CopyError(TOKEN_INVALID_MESSAGE);
  }
  if (status === 403) {
    throw new CopyError(
      'Forbidden (403). Check that you can edit the destination set.'
    );
  }
  if (status === 429) {
    return 'limited';
  }
  if (status === 400 && batchLength > 1) {
    return 'shrink';
  }
  if (status === 408 || status >= 500) {
    return 'transient';
  }
  if (status < 200 || status >= 300) {
    throw new CopyError(`7TV rejected the request (HTTP ${status}).`);
  }
  return 'ok';
};
