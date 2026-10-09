export interface CopyFailure {
  error: string;
  name: string;
}

export interface CopyOptions {
  fetch?: typeof fetch;
  onLog?: (kind: LogKind, text: string) => void;
  onProgress?: (p: CopyProgress) => void;
  signal?: AbortSignal;
  sleep?: Sleep;
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
  waitUntil?: number;
}

export interface CopyResult {
  copied: number;
  failed: CopyFailure[];
  skipped: CopyFailure[];
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

export interface GetEmoteSetOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  sleep?: Sleep;
}

export type LogKind = 'err' | 'info' | 'ok' | 'warn';

export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;
