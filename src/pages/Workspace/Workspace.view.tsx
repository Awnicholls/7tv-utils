import type { ReactNode } from 'react';

import type { Account } from '../../../electron/types/seventv';
import type { AccountState } from '../../hooks/useAccount';
import type { JobControls, JobView } from '../../hooks/useJob';
import type { ToolId } from '../../types/copier';

import { JobPanel } from '../../components/JobPanel';
import { TOOLS } from '../../constants';
import { AccountBar } from './components/AccountBar';
import { CloneToolContainer } from './components/CloneTool/CloneTool.container';
import { CopyToolContainer } from './components/CopyTool/CopyTool.container';
import { EditToolContainer } from './components/EditTool/EditTool.container';
import { MergeToolContainer } from './components/MergeTool/MergeTool.container';
import { Tabs } from './components/Tabs';
import { TokenFieldContainer } from './components/TokenField/TokenField.container';

export interface WorkspaceViewProps {
  account: Account | null;
  accountState: AccountState;
  busy: boolean;
  editSeed: { id: string; key: number };
  job: JobControls;
  jobView: JobView;
  onCancel: () => void;
  onEditSet: (setId: string) => void;
  onForgetToken: () => void;
  onOpenSet: (setId: string) => void;
  onRefreshAccount: () => void;
  onTokenChange: (value: string) => void;
  onToolChange: (tool: ToolId) => void;
  token: string;
  tokenNote: string;
  tool: ToolId;
}

export const WorkspaceView = ({
  account,
  accountState,
  busy,
  editSeed,
  job,
  jobView,
  onCancel,
  onEditSet,
  onForgetToken,
  onOpenSet,
  onRefreshAccount,
  onTokenChange,
  onToolChange,
  token,
  tokenNote,
  tool,
}: WorkspaceViewProps): ReactNode => {
  const created = (): void => {
    onRefreshAccount();
  };
  // Every tool stays mounted so its fields survive switching tabs.
  const panel = (id: ToolId, content: ReactNode): ReactNode => (
    <div
      aria-labelledby={`tab-${id}`}
      hidden={tool !== id}
      id={`panel-${id}`}
      role="tabpanel"
    >
      {content}
    </div>
  );
  return (
    <div className="page">
      <main className="shell">
        <h1 className="hero">{TOOLS.find((t) => t.id === tool)?.headline}</h1>

        <Tabs active={tool} disabled={busy} onChange={onToolChange} />

        <section aria-label="7TV tools" className="card">
          <TokenFieldContainer
            busy={busy}
            note={tokenNote}
            onChange={onTokenChange}
            onForget={onForgetToken}
            token={token}
          />
          <AccountBar
            busy={busy}
            onRefresh={onRefreshAccount}
            state={accountState}
          />

          <div className="tool">
            {panel('copy', <CopyToolContainer job={job} onCancel={onCancel} />)}
            {panel(
              'clone',
              <CloneToolContainer
                account={account}
                job={job}
                onCancel={onCancel}
                onCreated={created}
              />
            )}
            {panel(
              'merge',
              <MergeToolContainer
                account={account}
                job={job}
                onCancel={onCancel}
                onCreated={created}
              />
            )}
            {panel(
              'edit',
              <EditToolContainer
                account={account}
                initialSetId={editSeed.id}
                job={job}
                key={editSeed.key}
                onCancel={onCancel}
              />
            )}
          </div>

          <JobPanel
            job={jobView}
            onEditSet={tool === 'edit' ? undefined : onEditSet}
            onOpenSet={onOpenSet}
          />
        </section>
      </main>
    </div>
  );
};
