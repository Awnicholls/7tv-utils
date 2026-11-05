import type { ReactNode } from 'react';

import type { AccountState } from '../../../hooks/useAccount';

interface AccountBarProps {
  busy: boolean;
  onRefresh: () => void;
  state: AccountState;
}

export const AccountBar = ({
  busy,
  onRefresh,
  state,
}: AccountBarProps): ReactNode => {
  if (state.status === 'idle') {
    return null;
  }
  return (
    <div className={`account-bar ${state.status}`}>
      {state.status === 'loading' && <span>Checking your account…</span>}
      {state.status === 'error' && <span>{state.error}</span>}
      {state.status === 'ok' && (
        <span>
          Signed in as <strong>{state.account.displayName}</strong> ·{' '}
          {state.account.sets.length} set
          {state.account.sets.length === 1 ? '' : 's'}
        </span>
      )}
      {state.status !== 'loading' && (
        <button
          className="link"
          disabled={busy}
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </button>
      )}
    </div>
  );
};
