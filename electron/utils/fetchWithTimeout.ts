import { REQUEST_TIMEOUT_MS } from '../seventv/constants.js';

export const fetchWithTimeout = (
  doFetch: typeof fetch,
  url: string,
  init: { signal?: AbortSignal } & RequestInit = {}
): Promise<Response> => {
  const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (init.signal) {
    signals.push(init.signal);
  }
  return doFetch(url, { ...init, signal: AbortSignal.any(signals) });
};
