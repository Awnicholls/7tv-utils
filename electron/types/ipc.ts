import type { CopyProgress, CopyResult, EmoteSet, LogKind } from './seventv.js';

export interface BridgeApi {
  cancelCopy: () => Promise<void>;
  forgetToken: () => Promise<void>;
  loadSet: (input: string) => Promise<IpcResult<EmoteSet>>;
  loadToken: () => Promise<string>;
  onCopyEvent: (cb: (e: CopyEvent) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  startCopy: (req: CopyRequest) => Promise<IpcResult<CopyResult>>;
}

export type CopyEvent =
  | { kind: LogKind; text: string; type: 'log' }
  | { progress: CopyProgress; type: 'progress' };

export interface CopyRequest {
  source: string;
  target: string;
  token: string;
}

export type IpcResult<T> =
  { cancelled?: boolean; error: string; ok: false } | { ok: true; value: T };
