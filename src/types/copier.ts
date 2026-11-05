import type { JobRequest } from '../../electron/types/ipc';
import type { EmoteSet, LogKind } from '../../electron/types/seventv';

/**
A job request before the workspace adds the token to it.
*/
export type JobInput = {
  [K in JobRequest['kind']]: Omit<Extract<JobRequest, { kind: K }>, 'token'>;
}[JobRequest['kind']];

export type JobPhase = 'done' | 'error' | 'idle' | 'running';

export interface LogLine {
  id: number;
  kind: LogKind;
  text: string;
}

export type SetState =
  | { error: string; status: 'error' }
  | { set: EmoteSet; status: 'ok' }
  | { status: 'idle' }
  | { status: 'loading' };

export type ToolId = 'clone' | 'copy' | 'edit' | 'merge';
