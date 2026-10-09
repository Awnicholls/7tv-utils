import { CopyError } from '../seventv/CopyError.js';

export const errorMessage = (error: unknown): string => {
  if (error instanceof CopyError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') {
      return '7TV did not respond in time. Check your connection.';
    }
    if (error.name === 'TypeError' && /fetch/i.test(error.message)) {
      return 'Could not reach 7TV. Check your connection.';
    }
    return error.message;
  }
  return String(error);
};
