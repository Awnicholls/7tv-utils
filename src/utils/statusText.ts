import type { CopyProgress } from '../../electron/types/seventv';

import { formatSeconds } from '../../electron/utils/formatSeconds';

export const statusText = (
  progress: CopyProgress | null,
  busy: boolean,
  now: number
): string => {
  if (!progress) {
    return busy ? 'Preparing…' : '';
  }
  if (!busy) {
    return `${progress.done}/${progress.total} processed`;
  }
  if (progress.phase === 'waiting' && progress.waitUntil) {
    const left = formatSeconds(Math.max(0, progress.waitUntil - now));
    return progress.waitReason
      ? `${progress.waitReason} · resuming in ${left}`
      : 'Pacing…';
  }
  return `Sending up to ${progress.batchSize} at a time · ${progress.done}/${progress.total}`;
};
