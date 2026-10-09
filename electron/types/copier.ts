import type { CopyFailure, EmoteEntry } from './seventv.js';

export interface BatchOutcome {
  copied: number;
  failed: CopyFailure[];
  forbidden: number;
  full: boolean;
  limited: boolean;
  limitReset: null | number;
  retry: QueueItem[];
  skipped: CopyFailure[];
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
  emote: EmoteEntry;
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
