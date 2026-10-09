import type { LogKind } from '../../electron/types/seventv';
import type { LogLine } from '../types/copier';

import { MAX_LOG_LINES } from '../constants';

export const appendLog = (
  lines: LogLine[],
  kind: LogKind,
  text: string
): LogLine[] => {
  const id = (lines.at(-1)?.id ?? 0) + 1;
  return [...lines.slice(-(MAX_LOG_LINES - 1)), { id, kind, text }];
};
