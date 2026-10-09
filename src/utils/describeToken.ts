import { normalizeToken } from '../../electron/utils/normalizeToken';
import { DAY_MS } from '../constants';
import { jwtExp } from './jwtExp';

export const describeToken = (raw: string): string => {
  if (!raw.trim()) {
    return '';
  }
  const exp = jwtExp(normalizeToken(raw));
  if (exp === null) {
    return '';
  }
  const ms = exp - Date.now();
  if (ms <= 0) {
    return 'This token has expired. Get a new one from 7tv.app.';
  }
  const days = Math.floor(ms / DAY_MS);
  return days >= 1
    ? `Token valid for ${days} more day${days === 1 ? '' : 's'}.`
    : 'Token expires within a day.';
};
