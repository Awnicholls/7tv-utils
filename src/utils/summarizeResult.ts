import type { CopyResult } from '../../electron/types/seventv';

export const summarizeResult = ({
  copied,
  failed,
  skipped,
  stoppedReason,
}: CopyResult): string => {
  const parts = [`${copied} copied`];
  if (skipped.length > 0) {
    parts.push(`${skipped.length} skipped`);
  }
  if (failed.length > 0) {
    parts.push(`${failed.length} failed`);
  }
  return `${stoppedReason ? `${stoppedReason} ` : 'Done. '}${parts.join(' · ')}.`;
};
