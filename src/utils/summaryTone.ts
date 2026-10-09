import type { Phase } from '../types/copier';

export const summaryTone = (phase: Phase): string => {
  if (phase === 'error') {
    return 'err';
  }
  return phase === 'done' ? 'ok' : '';
};
