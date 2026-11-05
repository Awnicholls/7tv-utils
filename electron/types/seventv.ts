export interface Account {
  activeSetIds: string[];
  displayName: string;
  id: string;
  sets: SetSummary[];
}

export type EmoteAction = 'ADD' | 'REMOVE' | 'UPDATE';

export interface EmoteEntry {
  id: string;
  name: string;
}

/**
One change to one emote in a set. `emote.name` is the name to apply.
*/
export interface EmoteOp {
  action: EmoteAction;
  emote: EmoteEntry;
  label: string;
}

export interface EmoteSet {
  capacity: null | number;
  emotes: EmoteEntry[];
  id: string;
  name: string;
  owner: null | string;
}

export interface GetEmoteSetOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  sleep?: Sleep;
}

export interface JobFailure {
  error: string;
  name: string;
}

export interface JobOptions {
  fetch?: typeof fetch;
  onLog?: (kind: LogKind, text: string) => void;
  onProgress?: (p: JobProgress) => void;
  signal?: AbortSignal;
  sleep?: Sleep;
}

export interface JobProgress {
  applied: number;
  batchSize: number;
  done: number;
  failed: number;
  phase: 'sending' | 'waiting';
  skipped: number;
  total: number;
  waitReason?: string;
  waitUntil?: number;
}

export interface JobResult {
  applied: number;
  /**
  The set the job created or changed, for linking to it afterwards.
  */
  emoteSetId?: string;
  failed: JobFailure[];
  skipped: JobFailure[];
  stoppedReason?: string;
}

export type LogKind = 'err' | 'info' | 'ok' | 'warn';

export interface SetSummary {
  capacity: null | number;
  id: string;
  name: string;
}

export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;
