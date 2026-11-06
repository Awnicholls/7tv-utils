import type { EmoteEntry, EmoteOp, JobFailure } from './seventv.js';

export interface BatchOutcome {
  applied: number;
  failed: JobFailure[];
  forbidden: number;
  full: boolean;
  limited: boolean;
  limitReset: null | number;
  retry: QueueItem[];
  skipped: JobFailure[];
}

export type ErrorKind =
  | 'auth'
  | 'capacity'
  | 'conflict'
  | 'forbidden'
  | 'other'
  | 'rate'
  | 'transient';

export interface GqlError {
  extensions?: {
    code?: string;
    headers?: Record<string, string>;
    status?: number;
  };
  message?: string;
}

export interface Pace {
  batchSize: number;
  gapMs: number;
  limitHits: number;
  maxBatch: number;
  streak: number;
  transientHits: number;
}

export interface QueueItem {
  attempts: number;
  op: EmoteOp;
}

export interface RateHint {
  remaining: null | number;
  resetAt: null | number;
}

export interface SetResponse {
  capacity?: number;
  emotes?: EmoteEntry[] | null;
  id?: string;
  name?: string;
  owner?: { display_name?: string; username?: string } | null;
}

export type StatusAction = 'limited' | 'ok' | 'shrink' | 'transient';

export interface UserResponse {
  connections?: { emote_set_id?: null | string }[] | null;
  display_name?: string;
  editor_of?:
    | {
        id?: string;
        user?: {
          display_name?: string;
          id?: string;
          username?: string;
        } | null;
      }[]
    | null;
  emote_sets?: { capacity?: number; id: string; name?: string }[] | null;
  id?: string;
  username?: string;
}
