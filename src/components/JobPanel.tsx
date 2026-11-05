import type { ReactNode } from 'react';

import type { JobView } from '../hooks/useJob';

import { FailureList } from './FailureList';
import { LogConsole } from './LogConsole';
import { ProgressPanel } from './ProgressPanel';

interface JobPanelProps {
  job: JobView;
  onEditSet?: (setId: string) => void;
  onOpenSet: (setId: string) => void;
}

export const JobPanel = ({
  job,
  onEditSet,
  onOpenSet,
}: JobPanelProps): ReactNode => (
  <>
    {job.showProgress && (
      <ProgressPanel
        percent={job.percent}
        progress={job.progress}
        status={job.status}
        verb={job.verb}
      />
    )}

    {job.summary && (
      <p className={`summary ${job.summaryTone}`}>
        {job.summary}
        {job.resultSetId && (
          <span className="summary-links">
            <button
              className="link"
              onClick={() => {
                if (job.resultSetId) {
                  onOpenSet(job.resultSetId);
                }
              }}
              type="button"
            >
              Open on 7tv.app
            </button>
            {onEditSet && (
              <button
                className="link"
                onClick={() => {
                  if (job.resultSetId) {
                    onEditSet(job.resultSetId);
                  }
                }}
                type="button"
              >
                Edit this set
              </button>
            )}
          </span>
        )}
      </p>
    )}

    {job.problems.length > 0 && <FailureList problems={job.problems} />}

    {job.log.length > 0 && <LogConsole lines={job.log} />}
  </>
);
