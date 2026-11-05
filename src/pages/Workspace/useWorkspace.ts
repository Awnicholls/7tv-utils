import { useState } from 'react';

import type { ToolId } from '../../types/copier';
import type { WorkspaceViewProps } from './Workspace.view';

import { useAccount } from '../../hooks/useAccount';
import { useJob } from '../../hooks/useJob';
import { useToken } from '../../hooks/useToken';
import { getApi } from '../../utils/getApi';
import { setPageUrl } from '../../utils/sevenTvUrls';

export const useWorkspace = (): WorkspaceViewProps => {
  const { forgetToken, setToken, token, tokenNote } = useToken();
  const { refreshAccount, state: accountState } = useAccount(token);
  const job = useJob(token);
  const [tool, setTool] = useState<ToolId>('copy');
  // Bumping the key reopens the Edit tool on a set another tool just made.
  const [editSeed, setEditSeed] = useState({ id: '', key: 0 });

  const switchTool = (next: ToolId): void => {
    if (next === tool || job.busy) {
      return;
    }
    job.reset();
    setTool(next);
  };

  return {
    account: accountState.status === 'ok' ? accountState.account : null,
    accountState,
    busy: job.busy,
    editSeed,
    job: { busy: job.busy, run: job.run },
    jobView: job.view,
    onCancel: job.cancel,
    onEditSet: (id) => {
      job.reset();
      setEditSeed((seed) => ({ id, key: seed.key + 1 }));
      setTool('edit');
    },
    onForgetToken: forgetToken,
    onOpenSet: (id) => void getApi()?.openExternal(setPageUrl(id)),
    onRefreshAccount: refreshAccount,
    onTokenChange: setToken,
    onToolChange: switchTool,
    token,
    tokenNote,
    tool,
  };
};
