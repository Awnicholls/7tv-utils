/* eslint-disable no-await-in-loop -- requests are deliberately sequential to respect 7TV rate limits */
// 7TV API client + adaptive copier. Pure TypeScript with no Electron or DOM
// dependencies so it runs in the Electron main process (no CORS) and can be
// unit-tested in plain Node.
//
// Rate limiting (from the 7TV API source, apps/api/src/ratelimit):
// - Every request spends a ticket from the `global` bucket, and every
//   ChangeEmoteInSet mutation spends one from `emote_set_change`.
// - Buckets report `x-ratelimit-<bucket>-{limit,remaining,reset,used}`,
//   where `reset` is seconds until the bucket refills.
// - Over-limit requests still count against the bucket, and repeated overuse
//   triggers a longer "punishment" window. So once limited, we must wait the
//   full reset instead of retrying early.
// - A GraphQL batch may hold at most 30 operations.

export interface CopyFailure {
  error: string;
  name: string;
}

export interface CopyOptions {
  /**
   * Injectable for tests. Defaults to global fetch.
   */
  fetch?: typeof fetch;
  onLog?: (kind: LogKind, text: string) => void;
  onProgress?: (p: CopyProgress) => void;
  signal?: AbortSignal;
  /**
   * Injectable for tests. Defaults to a real, abortable timer.
   */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export interface CopyProgress {
  batchSize: number;
  copied: number;
  done: number;
  failed: number;
  phase: 'sending' | 'waiting';
  skipped: number;
  total: number;
  waitReason?: string;
  /**
   * Epoch ms when sending resumes; set while `phase === 'waiting'`.
   */
  waitUntil?: number;
}

export interface CopyResult {
  copied: number;
  failed: CopyFailure[];
  skipped: CopyFailure[];
  /**
   * Set when the copy ended early, e.g. the destination set is full.
   */
  stoppedReason?: string;
}

export interface EmoteEntry {
  id: string;
  name: string;
}

export interface EmoteSet {
  capacity: null | number;
  emotes: EmoteEntry[];
  id: string;
  name: string;
  owner: null | string;
}

export type LogKind = 'err' | 'info' | 'ok' | 'warn';

const API = 'https://7tv.io/v3';
const MAX_BATCH = 30; // hard server limit per GraphQL batch
const START_BATCH = 6;
const MIN_GAP_MS = 750;
const START_GAP_MS = 2500;
const MAX_GAP_MS = 60_000;
const MAX_LIMIT_BACKOFF_MS = 10 * 60_000;
const MAX_CONSECUTIVE_LIMITS = 12;
const MAX_TRANSIENT_RETRIES = 6;
const MAX_ITEM_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 30_000;

const GQL_MUTATION = `mutation ChangeEmoteInSet($id: ObjectID!, $action: ListItemAction!, $emote_id: ObjectID!, $name: String) {
  emoteSet(id: $id) {
    id
    emotes(id: $emote_id, action: $action, name: $name) {
      id
      name
      __typename
    }
    __typename
  }
}`;

interface BatchOutcome {
  copied: number;
  failed: CopyFailure[];
  forbidden: number;
  full: boolean;
  limited: boolean;
  limitReset: null | number;
  retry: QueueItem[];
  skipped: CopyFailure[];
}

interface GqlError {
  extensions?: {
    code?: string;
    headers?: Record<string, string>;
    status?: number;
  };
  message?: string;
}

interface QueueItem {
  attempts: number;
  emote: EmoteEntry;
}

/**
 * Remaining tickets / reset time the server last reported.
 */
interface RateHint {
  remaining: null | number;
  resetAt: null | number;
}

type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

export class CopyError extends Error {
  override name = 'CopyError';
}

export async function copyEmotes(
  source: EmoteSet,
  targetInput: string,
  token: string,
  opts: CopyOptions = {}
): Promise<CopyResult> {
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? abortableSleep;
  const { signal } = opts;
  const log = (kind: LogKind, text: string): void => opts.onLog?.(kind, text);

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

  // Skip what is already there instead of spending rate-limit tickets on it.
  const target = await getEmoteSet(targetId, { fetch: doFetch, signal, sleep });
  const haveIds = new Set(target.emotes.map((e) => e.id));
  const haveNames = new Map(target.emotes.map((e) => [e.name, e.id]));
  const skipped: CopyFailure[] = [];
  const queue: QueueItem[] = [];
  for (const emote of source.emotes) {
    if (haveIds.has(emote.id)) {
      skipped.push({ error: 'Already in destination', name: emote.name });
    } else if (haveNames.has(emote.name)) {
      skipped.push({
        error: 'Destination has a different emote with this name',
        name: emote.name,
      });
    } else {
      queue.push({ attempts: 0, emote });
    }
  }

  const total = source.emotes.length;
  const failed: CopyFailure[] = [];
  let copied = 0;
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

  // Adaptive pacing: additive increase on success, multiplicative decrease
  // on rate limits (AIMD), plus whatever the server tells us via headers.
  let batchSize = START_BATCH;
  let maxBatch = MAX_BATCH;
  let gapMs = START_GAP_MS;
  let streak = 0;
  let limitHits = 0;
  let transientHits = 0;
  let lastSend = 0;
  const hint: RateHint = { remaining: null, resetAt: null };

  const report = (
    phase: CopyProgress['phase'],
    waitUntil?: number,
    waitReason?: string
  ): void => {
    opts.onProgress?.({
      batchSize,
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

  const onLimited = async (resetSec: null | number): Promise<void> => {
    streak = 0;
    limitHits += 1;
    if (limitHits > MAX_CONSECUTIVE_LIMITS) {
      throw new CopyError(
        '7TV keeps rate limiting this account. Try again in a few minutes.'
      );
    }
    batchSize = Math.max(1, Math.floor(batchSize / 2));
    gapMs = Math.min(MAX_GAP_MS, Math.max(gapMs * 2, 5000));
    const backoff =
      resetSec !== null && resetSec > 0
        ? resetSec * 1000 + 1000
        : Math.min(MAX_LIMIT_BACKOFF_MS, 15_000 * 2 ** (limitHits - 1));
    const ms = withJitter(backoff);
    log('warn', `Rate limited. Backing off for ${formatSeconds(ms)}.`);
    await wait(ms, 'Rate limited by 7TV');
  };

  const onSuccess = (): void => {
    streak += 1;
    limitHits = 0;
    transientHits = 0;
    gapMs = Math.max(MIN_GAP_MS, Math.round(gapMs * 0.75));
    // Ramp fast while the server says there is plenty of headroom, slowly
    // otherwise.
    const roomy = hint.remaining !== null && hint.remaining >= batchSize * 2;
    if (roomy) {
      batchSize = Math.min(maxBatch, batchSize * 2);
    } else if (streak % 2 === 0) {
      batchSize = Math.min(maxBatch, batchSize + 2);
    }
  };

  const onTransient = async (why: string): Promise<void> => {
    transientHits += 1;
    if (transientHits > MAX_TRANSIENT_RETRIES) {
      throw new CopyError(`7TV is not responding reliably (${why}).`);
    }
    const ms = withJitter(Math.min(60_000, 2000 * 2 ** transientHits));
    log('warn', `${why}. Retrying in ${formatSeconds(ms)}.`);
    await wait(ms, why);
  };

  report('sending');

  while (queue.length > 0) {
    signal?.throwIfAborted();

    // 1. Respect what the server last told us.
    const now = Date.now();
    if (
      hint.remaining !== null &&
      hint.remaining <= 0 &&
      hint.resetAt !== null &&
      hint.resetAt > now
    ) {
      await wait(
        withJitter(hint.resetAt - now + 500),
        'Waiting for 7TV rate limit to reset'
      );
      hint.remaining = null;
      hint.resetAt = null;
      continue;
    }
    // 2. Keep a polite gap between batches.
    if (lastSend > 0) {
      await wait(lastSend + gapMs - Date.now());
    }

    let size = Math.min(batchSize, queue.length, maxBatch);
    if (hint.remaining !== null && hint.remaining > 0) {
      size = Math.min(size, hint.remaining);
    }
    const batch = queue.splice(0, size);
    report('sending');
    lastSend = Date.now();

    let res: Response;
    try {
      res = await fetchWithTimeout(doFetch, `${API}/gql`, {
        body: JSON.stringify(
          batch.map((item) => ({
            operationName: 'ChangeEmoteInSet',
            query: GQL_MUTATION,
            variables: {
              action: 'ADD',
              emote_id: item.emote.id,
              id: targetId,
              name: item.emote.name,
            },
          }))
        ),
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal,
      });
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      queue.unshift(...batch);
      await onTransient('Network error');
      continue;
    }

    Object.assign(hint, readRateHeaders(res.headers));

    if (res.status === 401) {
      throw new CopyError(
        'Your token is invalid or expired. Use “Get from browser” to refresh it.'
      );
    }
    if (res.status === 403) {
      throw new CopyError(
        'Forbidden (403). Check that you can edit the destination set.'
      );
    }
    if (res.status === 429) {
      queue.unshift(...batch);
      await onLimited(resetSeconds(res.headers));
      continue;
    }
    if (res.status === 400 && batch.length > 1) {
      // e.g. "batch size too large" if the server limit ever drops.
      maxBatch = Math.max(1, Math.floor(batch.length / 2));
      batchSize = Math.min(batchSize, maxBatch);
      queue.unshift(...batch);
      continue;
    }
    if (res.status >= 500 || res.status === 408) {
      queue.unshift(...batch);
      await onTransient(`7TV returned HTTP ${res.status}`);
      continue;
    }
    if (!res.ok) {
      throw new CopyError(`7TV rejected the request (HTTP ${res.status}).`);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      queue.unshift(...batch);
      await onTransient('Unreadable response from 7TV');
      continue;
    }
    const results = Array.isArray(body) ? body : [body];

    const outcome = sortResults(batch, results);
    copied += outcome.copied;
    failed.push(...outcome.failed);
    skipped.push(...outcome.skipped);
    const { forbidden, limited, retry } = outcome;
    if (outcome.full) {
      stoppedReason = 'The destination set is full.';
    }

    if (forbidden === batch.length) {
      throw new CopyError(
        'You do not have permission to edit the destination set.'
      );
    }
    queue.unshift(...retry);

    if (stoppedReason) {
      for (const item of queue.splice(0)) {
        failed.push({
          error: 'Destination set is full',
          name: item.emote.name,
        });
      }
      report('sending');
      break;
    }

    if (limited) {
      await onLimited(outcome.limitReset ?? resetSeconds(res.headers));
    } else if (retry.length === batch.length) {
      // Nothing went through; back off. If only some items hit a temporary
      // error they are simply retried (up to MAX_ITEM_ATTEMPTS) next round.
      await onTransient('7TV had a temporary error');
    } else {
      onSuccess();
    }
    report('sending');
  }

  return { copied, failed, skipped, stoppedReason };
}

export async function getEmoteSet(
  input: string,
  opts: { fetch?: typeof fetch; signal?: AbortSignal; sleep?: Sleep } = {}
): Promise<EmoteSet> {
  const id = parseSetId(input);
  if (!id) {
    throw new CopyError('Enter an emote set ID or URL.');
  }
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? abortableSleep;

  for (let attempt = 0; ; attempt++) {
    opts.signal?.throwIfAborted();
    let res: Response;
    try {
      res = await fetchWithTimeout(doFetch, `${API}/emote-sets/${id}`, {
        signal: opts.signal,
      });
    } catch (error) {
      if (opts.signal?.aborted || attempt >= 3) {
        throw error;
      }
      await sleep(withJitter(1500 * 2 ** attempt), opts.signal);
      continue;
    }
    if (res.status === 404 || res.status === 400) {
      throw new CopyError(`Emote set ${id} was not found.`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const reset = resetSeconds(res.headers);
      await sleep(
        withJitter(reset ? reset * 1000 + 500 : 2000 * 2 ** attempt),
        opts.signal
      );
      continue;
    }
    if (!res.ok) {
      throw new CopyError(`Could not load emote set (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as {
      capacity?: number;
      emotes?: { id: string; name: string }[] | null;
      id?: string;
      name?: string;
      owner?: { display_name?: string; username?: string } | null;
    };
    return {
      capacity: typeof json.capacity === 'number' ? json.capacity : null,
      emotes: (json.emotes ?? []).map((e) => ({ id: e.id, name: e.name })),
      id: json.id ?? id,
      name: json.name ?? 'Untitled set',
      owner: json.owner?.display_name ?? json.owner?.username ?? null,
    };
  }
}

/**
 * Strip an optional `Bearer ` prefix and whitespace/quotes.
 */
export function normalizeToken(token: string): string {
  return token
    .trim()
    .replace(/^bearer\s+/i, '')
    .replaceAll(/^["']|["']$/g, '')
    .trim();
}

/**
 * Accept a raw ID or a full 7tv.app URL and return the bare set ID.
 */
export function parseSetId(input: string): string {
  const v = input.trim();
  if (!v) {
    return '';
  }
  const m = /emote-sets\/([\dA-Za-z]+)/.exec(v);
  if (m) {
    return m[1];
  }
  return (v.split('/').pop() ?? '').split('?', 1)[0].split('#', 1)[0].trim();
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(t);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const t = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      Math.max(0, ms)
    );
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function classify(
  errors: GqlError[]
):
  | 'auth'
  | 'capacity'
  | 'conflict'
  | 'forbidden'
  | 'other'
  | 'rate'
  | 'transient' {
  const text = errors.map((e) => e.message ?? '').join(' ');
  const codes = new Set(errors.map((e) => e.extensions?.code));
  const statuses = new Set(errors.map((e) => e.extensions?.status));

  if (
    codes.has('RATE_LIMIT_EXCEEDED') ||
    statuses.has(429) ||
    /rate.?limit/i.test(text)
  ) {
    return 'rate';
  }
  if (codes.has('LOGIN_REQUIRED') || statuses.has(401)) {
    return 'auth';
  }
  if (/at capacity|capacity reached|set is full/i.test(text)) {
    return 'capacity';
  }
  if (/conflicting name|name conflict|already/i.test(text)) {
    return 'conflict';
  }
  if (codes.has('LACKING_PRIVILEGES') || statuses.has(403)) {
    return 'forbidden';
  }
  if (
    codes.has('TRANSACTION_ERROR') ||
    codes.has('MISSING_CONTEXT') ||
    [...statuses].some((s) => s !== undefined && s >= 500) ||
    /timed? ?out|mutex|transaction|try again/i.test(text)
  ) {
    return 'transient';
  }
  return 'other';
}

async function fetchWithTimeout(
  doFetch: typeof fetch,
  url: string,
  init: { signal?: AbortSignal } & RequestInit
): Promise<Response> {
  const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (init.signal) {
    signals.push(init.signal);
  }
  return doFetch(url, { ...init, signal: AbortSignal.any(signals) });
}

function formatSeconds(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return s >= 90 ? `${Math.ceil(s / 60)} min` : `${s}s`;
}

function maxNullable(a: null | number, b: null | number): null | number {
  if (a === null) {
    return b;
  }
  if (b === null) {
    return a;
  }
  return Math.max(a, b);
}

/**
 * Parse all `x-ratelimit-<bucket>-{remaining,reset}` headers.
 */
function readRateHeaders(headers: Headers): RateHint {
  const buckets = new Map<string, { remaining?: number; reset?: number }>();
  headers.forEach((value, key) => {
    const m = /^x-ratelimit-(.+)-(remaining|reset)$/i.exec(key);
    if (!m) {
      return;
    }
    // Batched responses can repeat a header; the lowest remaining and the
    // longest reset are the safe interpretation.
    const nums = value
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n));
    if (nums.length === 0) {
      return;
    }
    const b = buckets.get(m[1]) ?? {};
    if (m[2].toLowerCase() === 'remaining') {
      b.remaining = Math.min(...nums);
    } else {
      b.reset = Math.max(...nums);
    }
    buckets.set(m[1], b);
  });

  let remaining: null | number = null;
  let resetAt: null | number = null;
  for (const b of buckets.values()) {
    if (b.remaining === undefined) {
      continue;
    }
    if (remaining === null || b.remaining < remaining) {
      remaining = b.remaining;
      resetAt = b.reset === undefined ? null : Date.now() + b.reset * 1000;
    }
  }
  return { remaining, resetAt };
}

function resetFromGqlErrors(errors: GqlError[]): null | number {
  let best: null | number = null;
  for (const e of errors) {
    const headers = Object.entries(e.extensions?.headers ?? {});
    for (const [k, v] of headers) {
      if (/^x-ratelimit-.+-reset$/i.test(k)) {
        best = maxNullable(best, Number(v) || null);
      }
    }
  }
  return best;
}

/**
 * Seconds until the most-constrained bucket resets, or Retry-After.
 */
function resetSeconds(headers: Headers): null | number {
  let best: null | number = null;
  for (const [key, value] of headers) {
    if (!/^x-ratelimit-.+-reset$/i.test(key)) {
      continue;
    }
    const nums = value.split(',').map(Number);
    for (const n of nums) {
      if (Number.isFinite(n) && n > 0) {
        best = maxNullable(best, n);
      }
    }
  }
  if (best !== null) {
    return best;
  }
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const n = Number(retryAfter);
    if (Number.isFinite(n)) {
      return n;
    }
    const at = Date.parse(retryAfter);
    if (!Number.isNaN(at)) {
      return Math.max(0, (at - Date.now()) / 1000);
    }
  }
  return null;
}

function sortError(
  out: BatchOutcome,
  item: QueueItem,
  errors: GqlError[]
): void {
  const kind = classify(errors);
  const name = item.emote.name;
  const message = errors.map((e) => e.message ?? 'Unknown error').join('; ');
  switch (kind) {
    case 'auth': {
      throw new CopyError(
        'Your token is invalid or expired. Use “Get from browser” to refresh it.'
      );
    }
    case 'capacity': {
      out.full = true;
      out.failed.push({ error: 'Destination set is full', name });
      return;
    }
    case 'conflict': {
      out.skipped.push({ error: message, name });
      return;
    }
    case 'forbidden': {
      out.forbidden += 1;
      out.failed.push({ error: message, name });
      return;
    }
    case 'other': {
      out.failed.push({ error: message, name });
      return;
    }
    case 'rate': {
      out.limited = true;
      out.limitReset = maxNullable(out.limitReset, resetFromGqlErrors(errors));
      out.retry.push(item);
      return;
    }
    case 'transient': {
      item.attempts += 1;
      if (item.attempts >= MAX_ITEM_ATTEMPTS) {
        out.failed.push({ error: message, name });
      } else {
        out.retry.push(item);
      }
      return;
    }
  }
}

/**
 * Sort per-operation GraphQL results into copied / retry / failed / skipped.
 */
function sortResults(batch: QueueItem[], results: unknown[]): BatchOutcome {
  const out: BatchOutcome = {
    copied: 0,
    failed: [],
    forbidden: 0,
    full: false,
    limited: false,
    limitReset: null,
    retry: [],
    skipped: [],
  };
  for (const [i, item] of batch.entries()) {
    const errors = (results[i] as { errors?: GqlError[] } | undefined)?.errors;
    if (!errors || errors.length === 0) {
      out.copied += 1;
    } else {
      sortError(out, item, errors);
    }
  }
  return out;
}

function withJitter(ms: number): number {
  return Math.round(ms * (1 + Math.random() * 0.15));
}
