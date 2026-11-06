import { useState } from 'react';

import type { AccountRef } from '../../../electron/types/seventv';
import type { ToolId } from '../../types/copier';
import type { WorkspaceViewProps } from './Workspace.view';

import { normalizeToken } from '../../../electron/utils/normalizeToken';
import { parseUserId } from '../../../electron/utils/parseUserId';
import { useAccount } from '../../hooks/useAccount';
import { useJob } from '../../hooks/useJob';
import { useToken } from '../../hooks/useToken';
import { getApi } from '../../utils/getApi';
import { setPageUrl } from '../../utils/sevenTvUrls';
import { readStored, writeStored } from '../../utils/storage';
import { OTHER_ACCOUNT } from './components/AccountBar';

const ACTING_FOR_KEY = '7tv-utils:acting-for';
const SAVED_ACCOUNTS_KEY = '7tv-utils:saved-accounts';

export const useWorkspace = (): WorkspaceViewProps => {
  const { forgetToken, setToken, token, tokenNote } = useToken();
  // The account Clone, Merge and Edit work on: '' for your own, otherwise
  // the id of an account you are an editor for.
  const [actingFor, setActingForValue] = useState(() =>
    readStored(ACTING_FOR_KEY, '')
  );
  const [saved, setSaved] = useState<AccountRef[]>(() =>
    readStored<AccountRef[]>(SAVED_ACCOUNTS_KEY, [])
  );
  const [showOther, setShowOther] = useState(false);
  const [otherInput, setOtherInput] = useState('');
  const [otherError, setOtherError] = useState('');
  const [checkingOther, setCheckingOther] = useState(false);
  const { refreshAccount, self, target } = useAccount(token, actingFor);
  const job = useJob(token);
  const [tool, setTool] = useState<ToolId>('copy');
  // Bumping the key reopens the Edit tool on a set another tool just made.
  const [editSeed, setEditSeed] = useState({ id: '', key: 0 });

  const me = self.status === 'ok' ? self.account : null;
  const editorOf = me?.editorOf ?? [];
  const choices = [
    ...editorOf.map((a) => ({ ...a, saved: false })),
    ...saved
      .filter((a) => editorOf.every((e) => e.id !== a.id))
      .map((a) => ({ ...a, saved: true })),
  ].filter((a) => a.id !== me?.id);

  const setActingFor = (id: string): void => {
    setActingForValue(id);
    writeStored(ACTING_FOR_KEY, id);
  };
  const updateSaved = (next: AccountRef[]): void => {
    setSaved(next);
    writeStored(SAVED_ACCOUNTS_KEY, next);
  };

  const switchToOther = async (): Promise<void> => {
    const id = parseUserId(otherInput);
    const api = getApi();
    if (!id || !api) {
      setOtherError('Enter a 7TV user ID or profile link.');
      return;
    }
    setOtherError('');
    if (id === me?.id) {
      setActingFor('');
      setShowOther(false);
      return;
    }
    // Check the account exists before switching to it.
    setCheckingOther(true);
    const res = await api.loadAccount(normalizeToken(token), id);
    setCheckingOther(false);
    if (!res.ok) {
      setOtherError(res.error);
      return;
    }
    const ref = { displayName: res.value.displayName, id: res.value.id };
    updateSaved([...saved.filter((a) => a.id !== ref.id), ref]);
    setActingFor(ref.id);
    setShowOther(false);
    setOtherInput('');
  };

  const switchTool = (next: ToolId): void => {
    if (next === tool || job.busy) {
      return;
    }
    job.reset();
    setTool(next);
  };

  let account = me;
  if (actingFor) {
    account = target.status === 'ok' ? target.account : null;
  }

  return {
    account,
    accountBar: {
      actingFor,
      busy: job.busy || checkingOther,
      choices,
      onActingForChange: (value) => {
        setOtherError('');
        if (value === OTHER_ACCOUNT) {
          setShowOther(true);
          return;
        }
        setShowOther(false);
        setActingFor(value);
        job.reset();
      },
      onForgetSaved: (id) => {
        updateSaved(saved.filter((a) => a.id !== id));
        setActingFor('');
      },
      onOtherInputChange: setOtherInput,
      onRefresh: refreshAccount,
      onUseOther: () => void switchToOther(),
      otherError: checkingOther ? 'Checking…' : otherError,
      otherInput,
      self,
      showOther,
      target,
    },
    actingFor,
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
