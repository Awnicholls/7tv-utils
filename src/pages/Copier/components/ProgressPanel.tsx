import type { ReactNode } from 'react';

import type { CopyProgress } from '../../../../electron/types/seventv';

interface ProgressPanelProps {
  percent: number;
  progress: CopyProgress | null;
  status: string;
}

export const ProgressPanel = ({
  percent,
  progress,
  status,
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
        {progress.copied} copied · {progress.skipped} skipped ·{' '}
        {progress.failed} failed · {progress.total} total
      </p>
    )}
  </div>
);
