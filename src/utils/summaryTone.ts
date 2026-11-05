import type { JobPhase } from '../types/copier';

export const summaryTone = (phase: JobPhase): string => {
  if (phase === 'error') {
    return 'err';
  }
  return phase === 'done' ? 'ok' : '';
};
