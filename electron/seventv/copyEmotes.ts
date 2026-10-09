import type { RateHint } from '../types/copier.js';
import type {
  CopyFailure,
  CopyOptions,
  CopyProgress,
  CopyResult,
  EmoteSet,
  LogKind,
} from '../types/seventv.js';

import { abortableSleep } from '../utils/abortableSleep.js';
import { formatSeconds } from '../utils/formatSeconds.js';
import { normalizeToken } from '../utils/normalizeToken.js';
import { parseSetId } from '../utils/parseSetId.js';
import { withJitter } from '../utils/withJitter.js';
import { SET_FULL_MESSAGE } from './constants.js';
import { CopyError } from './CopyError.js';
import { getEmoteSet } from './getEmoteSet.js';
import {
  createPace,
  limitedBackoff,
  nextBatchSize,
  recordSuccess,
  shrinkBatchLimit,
  transientBackoff,
} from './pacing.js';
import { planCopy } from './planCopy.js';
import { postBatch } from './postBatch.js';
import { readRateHeaders, resetSeconds } from './rateHeaders.js';
import { sortResults } from './sortResults.js';
import { statusAction } from './statusAction.js';

const validateInput = (
  source: EmoteSet,
  targetInput: string,
  token: string
): { bearer: string; targetId: string } => {
  const targetId = parseSetId(targetInput);
  if (!targetId) {
    throw new CopyError('Enter a destination emote set.');
  }
  if (targetId === source.id) {
    throw new CopyError('Source and destination are the same set.');
  }
  const bearer = normalizeToken(token);
  if (!bearer) {
    throw new CopyError('Enter your 7TV token, or use “Get from browser”.');
  }
  return { bearer, targetId };
};

const msUntilReset = (hint: RateHint, now: number): number =>
  hint.remaining !== null &&
  hint.remaining <= 0 &&
  hint.resetAt !== null &&
  hint.resetAt > now
    ? hint.resetAt - now
    : 0;

export const copyEmotes = async (
  source: EmoteSet,
  targetInput: string,
  token: string,
  opts: CopyOptions = {}
): Promise<CopyResult> => {
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? abortableSleep;
  const { signal } = opts;
  const log = (kind: LogKind, text: string): void => opts.onLog?.(kind, text);

  const { bearer, targetId } = validateInput(source, targetInput, token);
  const target = await getEmoteSet(targetId, { fetch: doFetch, signal, sleep });
  const { queue, skipped } = planCopy(source, target);
  const total = source.emotes.length;
  const failed: CopyFailure[] = [];
  const pace = createPace();
  const hint: RateHint = { remaining: null, resetAt: null };
  let copied = 0;
  let lastSend = 0;
  let stoppedReason: string | undefined;

  if (skipped.length > 0) {
    log('info', `Skipping ${skipped.length} already in “${target.name}”.`);
  }
  if (target.capacity !== null) {
    const free = target.capacity - target.emotes.length;
    if (queue.length > free) {
      log(
        'warn',
        `Destination has ${Math.max(free, 0)} free slots for ${queue.length} emotes. Copying until it is full.`
      );
    }
  }

  const report = (
    phase: CopyProgress['phase'],
    waitUntil?: number,
    waitReason?: string
  ): void => {
    opts.onProgress?.({
      batchSize: pace.batchSize,
      copied,
      done: copied + failed.length + skipped.length,
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

  report('sending');

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
      res = await postBatch({ batch, bearer, doFetch, signal, targetId });
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
    copied += outcome.copied;
    failed.push(...outcome.failed);
    skipped.push(...outcome.skipped);

    if (outcome.forbidden === batch.length) {
      throw new CopyError(
        'You do not have permission to edit the destination set.'
      );
    }
    queue.unshift(...outcome.retry);

    if (outcome.full) {
      stoppedReason = 'The destination set is full.';
      failed.push(
        ...queue
          .splice(0)
          .map((item) => ({ error: SET_FULL_MESSAGE, name: item.emote.name }))
      );
      report('sending');
      break;
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

  return { copied, failed, skipped, stoppedReason };
};
