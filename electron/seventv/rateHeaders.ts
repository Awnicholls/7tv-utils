import type { GqlError, RateHint } from '../types/copier.js';

import { maxNullable } from '../utils/maxNullable.js';

const RATE_HEADER = /^x-ratelimit-(.+)-(remaining|reset)$/i;
const RESET_HEADER = /^x-ratelimit-.+-reset$/i;

const parseNumbers = (value: string): number[] =>
  value
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n));

const parseRetryAfter = (value: null | string): null | number => {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return seconds;
  }
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, (at - Date.now()) / 1000);
};

export const readRateHeaders = (headers: Headers): RateHint => {
  const buckets = new Map<string, { remaining?: number; reset?: number }>();
  headers.forEach((value, key) => {
    const match = RATE_HEADER.exec(key);
    const nums = parseNumbers(value);
    if (!match || nums.length === 0) {
      return;
    }
    const bucket = buckets.get(match[1]) ?? {};
    if (match[2].toLowerCase() === 'remaining') {
      bucket.remaining = Math.min(...nums);
    } else {
      bucket.reset = Math.max(...nums);
    }
    buckets.set(match[1], bucket);
  });

  const hint: RateHint = { remaining: null, resetAt: null };
  for (const bucket of buckets.values()) {
    if (bucket.remaining === undefined) {
      continue;
    }
    if (hint.remaining === null || bucket.remaining < hint.remaining) {
      hint.remaining = bucket.remaining;
      hint.resetAt =
        bucket.reset === undefined ? null : Date.now() + bucket.reset * 1000;
    }
  }
  return hint;
};

export const resetSeconds = (headers: Headers): null | number => {
  let best: null | number = null;
  for (const [key, value] of headers) {
    if (!RESET_HEADER.test(key)) {
      continue;
    }
    for (const n of parseNumbers(value)) {
      if (n > 0) {
        best = maxNullable(best, n);
      }
    }
  }
  return best ?? parseRetryAfter(headers.get('retry-after'));
};

export const resetFromGqlErrors = (errors: GqlError[]): null | number => {
  let best: null | number = null;
  for (const error of errors) {
    const headers = Object.entries(error.extensions?.headers ?? {});
    for (const [key, value] of headers) {
      if (RESET_HEADER.test(key)) {
        best = maxNullable(best, Number(value) || null);
      }
    }
  }
  return best;
};
