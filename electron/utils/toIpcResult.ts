import type { IpcResult } from '../types/ipc.js';

import { errorMessage } from './errorMessage.js';
import { isAbort } from './isAbort.js';

export const toIpcResult = async <T>(
  fn: () => Promise<T>
): Promise<IpcResult<T>> => {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (isAbort(error)) {
      return { cancelled: true, error: 'Cancelled.', ok: false };
    }
    return { error: errorMessage(error), ok: false };
  }
};
