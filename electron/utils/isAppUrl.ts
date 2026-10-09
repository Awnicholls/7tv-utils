import { DEV_URL } from '../constants/paths.js';

export const isAppUrl = (url: string): boolean =>
  DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
