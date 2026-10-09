import type { Pace } from '../types/copier.js';

import { withJitter } from '../utils/withJitter.js';
import {
  MAX_BATCH,
  MAX_CONSECUTIVE_LIMITS,
  MAX_GAP_MS,
  MAX_LIMIT_BACKOFF_MS,
  MAX_TRANSIENT_RETRIES,
  MIN_GAP_MS,
  START_BATCH,
  START_GAP_MS,
} from './constants.js';
import { CopyError } from './CopyError.js';

export const createPace = (): Pace => ({
  batchSize: START_BATCH,
  gapMs: START_GAP_MS,
  limitHits: 0,
  maxBatch: MAX_BATCH,
  streak: 0,
  transientHits: 0,
});

export const nextBatchSize = (
  pace: Pace,
  queueLength: number,
  remaining: null | number
): number => {
  const size = Math.min(pace.batchSize, queueLength, pace.maxBatch);
  return remaining !== null && remaining > 0 ? Math.min(size, remaining) : size;
};

export const limitedBackoff = (pace: Pace, resetSec: null | number): number => {
  pace.streak = 0;
  pace.limitHits += 1;
  if (pace.limitHits > MAX_CONSECUTIVE_LIMITS) {
    throw new CopyError(
      '7TV keeps rate limiting this account. Try again in a few minutes.'
    );
  }
  pace.batchSize = Math.max(1, Math.floor(pace.batchSize / 2));
  pace.gapMs = Math.min(MAX_GAP_MS, Math.max(pace.gapMs * 2, 5000));
  const backoff =
    resetSec !== null && resetSec > 0
      ? resetSec * 1000 + 1000
      : Math.min(MAX_LIMIT_BACKOFF_MS, 15_000 * 2 ** (pace.limitHits - 1));
  return withJitter(backoff);
};

export const transientBackoff = (pace: Pace, why: string): number => {
  pace.transientHits += 1;
  if (pace.transientHits > MAX_TRANSIENT_RETRIES) {
    throw new CopyError(`7TV is not responding reliably (${why}).`);
  }
  return withJitter(Math.min(60_000, 2000 * 2 ** pace.transientHits));
};

export const recordSuccess = (pace: Pace, remaining: null | number): void => {
  pace.streak += 1;
  pace.limitHits = 0;
  pace.transientHits = 0;
  pace.gapMs = Math.max(MIN_GAP_MS, Math.round(pace.gapMs * 0.75));
  if (remaining !== null && remaining >= pace.batchSize * 2) {
    pace.batchSize = Math.min(pace.maxBatch, pace.batchSize * 2);
  } else if (pace.streak % 2 === 0) {
    pace.batchSize = Math.min(pace.maxBatch, pace.batchSize + 2);
  }
};

export const shrinkBatchLimit = (pace: Pace, size: number): void => {
  pace.maxBatch = Math.max(1, Math.floor(size / 2));
  pace.batchSize = Math.min(pace.batchSize, pace.maxBatch);
};
