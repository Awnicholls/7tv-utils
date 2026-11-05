import type { JobResult } from '../../electron/types/seventv';

export const summarizeResult = (
  { applied, failed, skipped, stoppedReason }: JobResult,
  verb: string
): string => {
  const parts = [`${applied} ${verb}`];
  if (skipped.length > 0) {
    parts.push(`${skipped.length} skipped`);
  }
  if (failed.length > 0) {
    parts.push(`${failed.length} failed`);
  }
  return `${stoppedReason ? `${stoppedReason} ` : 'Done. '}${parts.join(' · ')}.`;
};
