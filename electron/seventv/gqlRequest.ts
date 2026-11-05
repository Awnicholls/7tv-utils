import type { GqlError } from '../types/copier.js';
import type { GetEmoteSetOptions } from '../types/seventv.js';

import { abortableSleep } from '../utils/abortableSleep.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { withJitter } from '../utils/withJitter.js';
import { classifyErrors } from './classifyErrors.js';
import {
  API,
  MAX_SET_LOAD_ATTEMPTS,
  TOKEN_INVALID_MESSAGE,
} from './constants.js';
import { CopyError } from './CopyError.js';
import { resetFromGqlErrors, resetSeconds } from './rateHeaders.js';

interface GqlBody<T> {
  data?: null | T;
  errors?: GqlError[];
}

/**
 * Runs a single GraphQL operation against 7TV, retrying rate limits and
 * transient failures a few times before giving up.
 */
export const gqlRequest = async <T>(
  query: string,
  variables: Record<string, unknown>,
  bearer: null | string,
  opts: GetEmoteSetOptions = {}
): Promise<T> => {
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? abortableSleep;
  const { signal } = opts;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const canRetry = attempt < MAX_SET_LOAD_ATTEMPTS;
    const backoff = (resetSec: null | number): Promise<void> =>
      sleep(
        withJitter(resetSec ? resetSec * 1000 + 500 : 2000 * 2 ** attempt),
        signal
      );

    let res: Response;
    try {
      res = await fetchWithTimeout(doFetch, `${API}/gql`, {
        body: JSON.stringify({ query, variables }),
        headers,
        method: 'POST',
        signal,
      });
    } catch (error) {
      if (!canRetry || signal?.aborted) {
        throw error;
      }
      await backoff(null);
      continue;
    }

    if (res.status === 401) {
      throw new CopyError(TOKEN_INVALID_MESSAGE);
    }
    if (canRetry && (res.status === 429 || res.status >= 500)) {
      await backoff(resetSeconds(res.headers));
      continue;
    }

    let body: GqlBody<T>;
    try {
      body = (await res.json()) as GqlBody<T>;
    } catch {
      throw new CopyError(`Unexpected response from 7TV (HTTP ${res.status}).`);
    }

    const errors = body.errors ?? [];
    if (errors.length > 0) {
      const kind = classifyErrors(errors);
      if (kind === 'auth') {
        throw new CopyError(TOKEN_INVALID_MESSAGE);
      }
      if (canRetry && (kind === 'rate' || kind === 'transient')) {
        await backoff(resetFromGqlErrors(errors));
        continue;
      }
      throw new CopyError(
        errors.map((e) => e.message ?? 'Unknown error').join('; ')
      );
    }
    if (!res.ok || !body.data) {
      throw new CopyError(`7TV rejected the request (HTTP ${res.status}).`);
    }
    return body.data;
  }
};
