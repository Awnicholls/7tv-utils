import type { IpcMainInvokeEvent } from 'electron';

import type {
  CopyRequest,
  IpcResult,
  JobEvent,
  JobRequest,
} from '../types/ipc.js';
import type { JobOptions, JobResult } from '../types/seventv.js';

import { IPC } from '../constants/ipc.js';
import { cloneSet } from '../seventv/cloneSet.js';
import { copyEmotes } from '../seventv/copyEmotes.js';
import { CopyError } from '../seventv/CopyError.js';
import { editSet } from '../seventv/editSet.js';
import { getEmoteSet } from '../seventv/getEmoteSet.js';
import { mergeSets } from '../seventv/mergeSets.js';
import { state } from '../state.js';
import { normalizeToken } from '../utils/normalizeToken.js';
import { toIpcResult } from '../utils/toIpcResult.js';

const runCopy = async (
  req: CopyRequest,
  opts: JobOptions
): Promise<JobResult> => {
  opts.onLog?.('info', 'Loading source set…');
  const source = await getEmoteSet(req.source, {
    ...opts,
    bearer: normalizeToken(req.token),
  });
  opts.onLog?.(
    'ok',
    `Found “${source.name}” with ${source.emotes.length} emotes.`
  );
  if (source.emotes.length === 0) {
    throw new CopyError('The source set is empty.');
  }
  return copyEmotes(source, req.target, req.token, opts);
};

const runJob = (req: JobRequest, opts: JobOptions): Promise<JobResult> => {
  switch (req.kind) {
    case 'clone': {
      return cloneSet(req, opts);
    }
    case 'copy': {
      return runCopy(req, opts);
    }
    case 'edit': {
      return editSet(req, opts);
    }
    case 'merge': {
      return mergeSets(req, opts);
    }
  }
};

export const startJob = async (
  e: IpcMainInvokeEvent,
  raw: unknown
): Promise<IpcResult<JobResult>> => {
  if (state.activeJob) {
    return { error: 'Another job is already running.', ok: false };
  }
  const ctrl = new AbortController();
  state.activeJob = ctrl;
  const send = (event: JobEvent): void => {
    if (!e.sender.isDestroyed()) {
      e.sender.send(IPC.jobEvent, event);
    }
  };
  try {
    return await toIpcResult(() =>
      runJob(raw as JobRequest, {
        onLog: (kind, text) => {
          send({ kind, text, type: 'log' });
        },
        onProgress: (progress) => {
          send({ progress, type: 'progress' });
        },
        signal: ctrl.signal,
      })
    );
  } finally {
    state.activeJob = null;
  }
};
