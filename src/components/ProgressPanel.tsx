import type { ReactNode } from 'react';

import type { JobProgress } from '../../electron/types/seventv';

interface ProgressPanelProps {
  percent: number;
  progress: JobProgress | null;
  status: string;
  verb: string;
}

export const ProgressPanel = ({
  percent,
  progress,
  status,
  verb,
}: ProgressPanelProps): ReactNode => (
  <div className="progress" role="status">
    <div className="row">
      <span className="status-text">{status}</span>
      <span className="value">{percent}%</span>
    </div>
    <div className="bar">
      <div
        className={`fill ${progress?.phase === 'waiting' ? 'paused' : ''}`}
        style={{ width: `${percent}%` }}
      />
    </div>
    {progress && (
      <p className="hint">
        {progress.applied} {verb} · {progress.skipped} skipped ·{' '}
        {progress.failed} failed · {progress.total} total
      </p>
    )}
  </div>
);
