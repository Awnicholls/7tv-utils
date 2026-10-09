import type { IpcMainInvokeEvent } from 'electron';

import type { CopyEvent, CopyRequest, IpcResult } from '../types/ipc.js';
import type { CopyResult } from '../types/seventv.js';

import { IPC } from '../constants/ipc.js';
import { copyEmotes } from '../seventv/copyEmotes.js';
import { CopyError } from '../seventv/CopyError.js';
import { getEmoteSet } from '../seventv/getEmoteSet.js';
import { state } from '../state.js';
import { toIpcResult } from '../utils/toIpcResult.js';

const runCopy = async (
  req: CopyRequest,
  signal: AbortSignal,
  send: (event: CopyEvent) => void
): Promise<CopyResult> => {
  send({ kind: 'info', text: 'Loading source set…', type: 'log' });
  const source = await getEmoteSet(req.source, { signal });
  send({
    kind: 'ok',
    text: `Found “${source.name}” with ${source.emotes.length} emotes.`,
    type: 'log',
  });
  if (source.emotes.length === 0) {
    throw new CopyError('The source set is empty.');
  }
  return copyEmotes(source, req.target, req.token, {
    onLog: (kind, text) => {
      send({ kind, text, type: 'log' });
    },
    onProgress: (progress) => {
      send({ progress, type: 'progress' });
    },
    signal,
  });
};

export const startCopy = async (
  e: IpcMainInvokeEvent,
  raw: unknown
): Promise<IpcResult<CopyResult>> => {
  if (state.activeCopy) {
    return { error: 'A copy is already running.', ok: false };
  }
  const ctrl = new AbortController();
  state.activeCopy = ctrl;
  const send = (event: CopyEvent): void => {
    if (!e.sender.isDestroyed()) {
      e.sender.send(IPC.copyEvent, event);
    }
  };
  try {
    return await toIpcResult(() =>
      runCopy(raw as CopyRequest, ctrl.signal, send)
    );
  } finally {
    state.activeCopy = null;
  }
};
