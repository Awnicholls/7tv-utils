import type { EmoteSet, LogKind } from '../../electron/types/seventv';

export interface LogLine {
  id: number;
  kind: LogKind;
  text: string;
}

export type Phase = 'copying' | 'done' | 'error' | 'idle';

export type SetState =
  | { error: string; status: 'error' }
  | { set: EmoteSet; status: 'ok' }
  | { status: 'idle' }
  | { status: 'loading' };
