import type { QueueItem, RateHint } from '../types/copier.js';
import type {
  EmoteOp,
  JobFailure,
  JobOptions,
  JobProgress,
  JobResult,
  LogKind,
} from '../types/seventv.js';

import { abortableSleep } from '../utils/abortableSleep.js';
import { formatSeconds } from '../utils/formatSeconds.js';
import { withJitter } from '../utils/withJitter.js';
import { SET_FULL_MESSAGE } from './constants.js';
import { CopyError } from './CopyError.js';
import {
  createPace,
  limitedBackoff,
  nextBatchSize,
  recordSuccess,
  shrinkBatchLimit,
  transientBackoff,
} from './pacing.js';
import { postBatch } from './postBatch.js';
import { readRateHeaders, resetSeconds } from './rateHeaders.js';
import { sortResults } from './sortResults.js';
import { statusAction } from './statusAction.js';

export interface RunOpsInput {
  bearer: string;
  emoteSetId: string;
  /**
   * Ops run phase by phase: every op in one phase settles before the next
   * phase starts, so removals can free names and slots for later adds.
   */
  phases: EmoteOp[][];
  /**
  Items already ruled out during planning; counted towards the total.
  */
  skipped?: JobFailure[];
}

const msUntilReset = (hint: RateHint, now: number): number =>
  hint.remaining !== null &&
  hint.remaining <= 0 &&
  hint.resetAt !== null &&
  hint.resetAt > now
    ? hint.resetAt - now
    : 0;

/**
 * Sends emote changes to one set in adaptive batches, pacing itself around
 * 7TV's rate limits and retrying transient failures.
 */
export const runOps = async (
  { bearer, emoteSetId, phases, skipped: planned = [] }: RunOpsInput,
  opts: JobOptions = {}
): Promise<JobResult> => {
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? abortableSleep;
  const { signal } = opts;
  const log = (kind: LogKind, text: string): void => opts.onLog?.(kind, text);

  const skipped = [...planned];
  const total =
    skipped.length + phases.reduce((sum, phase) => sum + phase.length, 0);
  const failed: JobFailure[] = [];
  const pace = createPace();
  const hint: RateHint = { remaining: null, resetAt: null };
  let applied = 0;
  let lastSend = 0;
  let stoppedReason: string | undefined;

  const report = (
    phase: JobProgress['phase'],
    waitUntil?: number,
    waitReason?: string
  ): void => {
    opts.onProgress?.({
      applied,
      batchSize: pace.batchSize,
      done: applied + failed.length + skipped.length,
      failed: failed.length,
      phase,
      skipped: skipped.length,
      total,
      waitReason,
      waitUntil,
    });
  };

  const wait = async (ms: number, reason?: string): Promise<void> => {
    if (ms <= 0) {
      return;
    }
    report('waiting', Date.now() + ms, reason);
    await sleep(ms, signal);
  };

  const backOffLimited = async (resetSec: null | number): Promise<void> => {
    const ms = limitedBackoff(pace, resetSec);
    log('warn', `Rate limited. Backing off for ${formatSeconds(ms)}.`);
    await wait(ms, 'Rate limited by 7TV');
  };

  const backOffTransient = async (why: string): Promise<void> => {
    const ms = transientBackoff(pace, why);
    log('warn', `${why}. Retrying in ${formatSeconds(ms)}.`);
    await wait(ms, why);
  };

  /**
  Returns false when the set filled up and the job should stop.
  */
  const runPhase = async (queue: QueueItem[]): Promise<boolean> => {
    while (queue.length > 0) {
      signal?.throwIfAborted();

      const resetWait = msUntilReset(hint, Date.now());
      if (resetWait > 0) {
        await wait(
          withJitter(resetWait + 500),
          'Waiting for 7TV rate limit to reset'
        );
        hint.remaining = null;
        hint.resetAt = null;
        continue;
      }
      if (lastSend > 0) {
        await wait(lastSend + pace.gapMs - Date.now());
      }

      const batch = queue.splice(
        0,
        nextBatchSize(pace, queue.length, hint.remaining)
      );
      report('sending');
      lastSend = Date.now();

      let res: Response;
      try {
        res = await postBatch({
          batch,
          bearer,
          doFetch,
          signal,
          targetId: emoteSetId,
        });
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        queue.unshift(...batch);
        await backOffTransient('Network error');
        continue;
      }

      Object.assign(hint, readRateHeaders(res.headers));

      const action = statusAction(res.status, batch.length);
      if (action === 'limited') {
        queue.unshift(...batch);
        await backOffLimited(resetSeconds(res.headers));
        continue;
      }
      if (action === 'shrink') {
        shrinkBatchLimit(pace, batch.length);
        queue.unshift(...batch);
        continue;
      }
      if (action === 'transient') {
        queue.unshift(...batch);
        await backOffTransient(`7TV returned HTTP ${res.status}`);
        continue;
      }

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        queue.unshift(...batch);
        await backOffTransient('Unreadable response from 7TV');
        continue;
      }

      const outcome = sortResults(batch, Array.isArray(body) ? body : [body]);
      applied += outcome.applied;
      failed.push(...outcome.failed);
      skipped.push(...outcome.skipped);

      if (outcome.forbidden === batch.length) {
        throw new CopyError('You do not have permission to edit this set.');
      }
      queue.unshift(...outcome.retry);

      if (outcome.full) {
        stoppedReason = 'The set is full.';
        failed.push(
          ...queue
            .splice(0)
            .map((item) => ({ error: SET_FULL_MESSAGE, name: item.op.label }))
        );
        report('sending');
        return false;
      }

      if (outcome.limited) {
        await backOffLimited(outcome.limitReset ?? resetSeconds(res.headers));
      } else if (outcome.retry.length === batch.length) {
        await backOffTransient('7TV had a temporary error');
      } else {
        recordSuccess(pace, hint.remaining);
      }
      report('sending');
    }
    return true;
  };

  report('sending');
  for (const [i, phase] of phases.entries()) {
    const keepGoing = await runPhase(phase.map((op) => ({ attempts: 0, op })));
    if (!keepGoing) {
      const rest = phases.slice(i + 1).flat();
      failed.push(
        ...rest.map((op) => ({ error: SET_FULL_MESSAGE, name: op.label }))
      );
      report('sending');
      break;
    }
  }

  return { applied, emoteSetId, failed, skipped, stoppedReason };
};
