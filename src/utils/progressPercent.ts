import type { JobProgress } from '../../electron/types/seventv';

export const progressPercent = (progress: JobProgress | null): number =>
  progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;
