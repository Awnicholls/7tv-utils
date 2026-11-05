import type {
  Account,
  EmoteEntry,
  EmoteSet,
  JobProgress,
  JobResult,
  LogKind,
} from './seventv.js';

export interface BridgeApi {
  cancelJob: () => Promise<void>;
  forgetToken: () => Promise<void>;
  loadAccount: (token: string) => Promise<IpcResult<Account>>;
  loadSet: (input: string) => Promise<IpcResult<EmoteSet>>;
  loadToken: () => Promise<string>;
  onJobEvent: (cb: (e: JobEvent) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  startJob: (req: JobRequest) => Promise<IpcResult<JobResult>>;
}

export interface CloneRequest {
  kind: 'clone';
  name: string;
  source: string;
  token: string;
}

export interface CopyRequest {
  kind: 'copy';
  source: string;
  target: string;
  token: string;
}

/**
How a duplicate is settled: keep one side, or both with the secondary renamed.
*/
export type DupeChoice = 'both' | 'primary' | 'secondary';

/**
How each duplicate is settled, keyed by the secondary emote's name.
*/
export type DupeChoices = Record<string, DupeChoice>;

export interface EditRequest {
  kind: 'edit';
  removes: EmoteEntry[];
  renames: EmoteRename[];
  set: string;
  token: string;
}

export interface EmoteRename {
  from: string;
  id: string;
  to: string;
}

export type IpcResult<T> =
  { cancelled?: boolean; error: string; ok: false } | { ok: true; value: T };

export type JobEvent =
  | { kind: LogKind; text: string; type: 'log' }
  | { progress: JobProgress; type: 'progress' };

export type JobRequest =
  CloneRequest | CopyRequest | EditRequest | MergeRequest;

export type MergeDestination = 'new' | 'primary';

export interface MergeRequest {
  choices: DupeChoices;
  destination: MergeDestination;
  /**
  Candidate keys (see planMerge) to leave out of the merged set.
  */
  exclude: string[];
  kind: 'merge';
  name: string;
  primary: string;
  /**
  New names, keyed by candidate key.
  */
  renames: Record<string, string>;
  secondary: string;
  token: string;
}
