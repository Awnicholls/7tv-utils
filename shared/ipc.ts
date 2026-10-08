// Contract between the renderer and the Electron main process. The preload
// script exposes an object of this shape as `window.api`.
import type { CopyProgress, CopyResult, EmoteSet, LogKind } from './seventv.js';

export interface BridgeApi {
  cancelCopy: () => Promise<void>;
  /**
   * Deletes the saved token.
   */
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

/**
 * Errors are returned as values: Electron mangles thrown error messages.
 */
export type IpcResult<T> =
  { cancelled?: boolean; error: string; ok: false } | { ok: true; value: T };

export const IPC = {
  cancelCopy: 'copy:cancel',
  copyEvent: 'copy:event',
  forgetToken: 'token:forget',
  loadSet: 'set:load',
  loadToken: 'token:load',
  openExternal: 'shell:open-external',
  saveToken: 'token:save',
  startCopy: 'copy:start',
} as const;
