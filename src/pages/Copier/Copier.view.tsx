import type { ReactNode } from 'react';

import type {
  CopyFailure,
  CopyProgress,
  EmoteSet,
} from '../../../electron/types/seventv';
import type { LogLine } from '../../types/copier';

import { CopyActions } from './components/CopyActions';
import { FailureList } from './components/FailureList';
import { LogConsole } from './components/LogConsole';
import { ProgressPanel } from './components/ProgressPanel';
import { SetField } from './components/SetField';
import { SetPreview } from './components/SetPreview';
import { TokenFieldContainer } from './components/TokenField/TokenField.container';

export interface CopierViewProps {
  busy: boolean;
  log: LogLine[];
  onCancel: () => void;
  onForgetToken: () => void;
  onSourceBlur: () => void;
  onSourceChange: (value: string) => void;
  onStart: () => void;
  onTargetBlur: () => void;
  onTargetChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  percent: number;
  preview: EmoteSet | null;
  problems: CopyFailure[];
  progress: CopyProgress | null;
  showProgress: boolean;
  source: string;
  sourceHint?: string;
  status: string;
  summary: string;
  summaryTone: string;
  target: string;
  targetHint?: string;
  token: string;
  tokenNote: string;
}

export const CopierView = ({
  busy,
  log,
  onCancel,
  onForgetToken,
  onSourceBlur,
  onSourceChange,
  onStart,
  onTargetBlur,
  onTargetChange,
  onTokenChange,
  percent,
  preview,
  problems,
  progress,
  showProgress,
  source,
  sourceHint,
  status,
  summary,
  summaryTone,
  target,
  targetHint,
  token,
  tokenNote,
}: CopierViewProps): ReactNode => (
  <div className="page">
    <main className="shell">
      <h1 className="hero">Copy any 7TV set.</h1>

      <section aria-label="Emote copier" className="card">
        <div className="grid2">
          <SetField
            disabled={busy}
            hint={sourceHint}
            label="Source"
            onBlur={onSourceBlur}
            onChange={onSourceChange}
            placeholder="Set ID or 7tv.app URL"
            value={source}
          />
          <SetField
            disabled={busy}
            hint={targetHint}
            label="Destination"
            onBlur={onTargetBlur}
            onChange={onTargetChange}
            placeholder="Your set ID or URL"
            value={target}
          />
        </div>

        <TokenFieldContainer
          busy={busy}
          note={tokenNote}
          onChange={onTokenChange}
          onForget={onForgetToken}
          token={token}
        />

        {showProgress && (
          <ProgressPanel
            percent={percent}
            progress={progress}
            status={status}
          />
        )}

        {summary && <p className={`summary ${summaryTone}`}>{summary}</p>}

        <CopyActions busy={busy} onCancel={onCancel} onStart={onStart} />

        {preview && preview.emotes.length > 0 && <SetPreview set={preview} />}

        {problems.length > 0 && <FailureList problems={problems} />}

        {log.length > 0 && <LogConsole lines={log} />}
      </section>
    </main>
  </div>
);
