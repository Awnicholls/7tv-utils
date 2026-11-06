import type { ReactNode } from 'react';

import type { AccountRef } from '../../../../electron/types/seventv';
import type { AccountState } from '../../../hooks/useAccount';

/**
Select value for "type in another account".
*/
export const OTHER_ACCOUNT = '__other__';

export interface AccountBarProps {
  actingFor: string;
  busy: boolean;
  /**
  Accounts you can switch to, besides your own.
  */
  choices: ({ saved: boolean } & AccountRef)[];
  onActingForChange: (value: string) => void;
  onForgetSaved: (id: string) => void;
  onOtherInputChange: (value: string) => void;
  onRefresh: () => void;
  onUseOther: () => void;
  otherError: string;
  otherInput: string;
  self: AccountState;
  showOther: boolean;
  target: AccountState;
}

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

const describe = (state: AccountState): string => {
  switch (state.status) {
    case 'error': {
      return state.error;
    }
    case 'idle': {
      return '';
    }
    case 'loading': {
      return 'Loading account…';
    }
    case 'ok': {
      return plural(state.account.sets.length, 'set');
    }
  }
};

export const AccountBar = ({
  actingFor,
  busy,
  choices,
  onActingForChange,
  onForgetSaved,
  onOtherInputChange,
  onRefresh,
  onUseOther,
  otherError,
  otherInput,
  self,
  showOther,
  target,
}: AccountBarProps): ReactNode => {
  if (self.status === 'idle') {
    return null;
  }
  if (self.status !== 'ok') {
    return (
      <div className={`account-bar ${self.status}`}>
        <span>
          {self.status === 'loading' ? 'Checking your account…' : self.error}
        </span>
        {self.status === 'error' && (
          <button className="link" onClick={onRefresh} type="button">
            Retry
          </button>
        )}
      </div>
    );
  }

  const me = self.account;
  const current = choices.find((c) => c.id === actingFor);
  const shown = actingFor ? target : self;
  return (
    <div className="account-bar ok">
      <div className="account-row">
        <span>
          Signed in as <strong>{me.displayName}</strong>
        </span>
        <button
          className="link"
          disabled={busy}
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="account-row acting">
        <label htmlFor="acting-for">Working on</label>
        <select
          disabled={busy}
          id="acting-for"
          onChange={(e) => {
            onActingForChange(e.target.value);
          }}
          value={showOther ? OTHER_ACCOUNT : actingFor}
        >
          <option value="">{me.displayName} (you)</option>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
              {c.saved ? '' : ' (you edit for them)'}
            </option>
          ))}
          {actingFor && !current && (
            <option value={actingFor}>
              {target.status === 'ok' ? target.account.displayName : actingFor}
            </option>
          )}
          <option value={OTHER_ACCOUNT}>Another account…</option>
        </select>
        <span
          className={`acting-status ${shown.status === 'error' ? 'err' : ''}`}
        >
          {describe(shown)}
        </span>
        {current?.saved && actingFor && (
          <button
            className="link muted"
            disabled={busy}
            onClick={() => {
              onForgetSaved(actingFor);
            }}
            type="button"
          >
            Forget
          </button>
        )}
      </div>

      {showOther && (
        <form
          className="account-row other"
          onSubmit={(e) => {
            e.preventDefault();
            onUseOther();
          }}
        >
          <input
            aria-label="7TV user ID or profile URL"
            autoComplete="off"
            disabled={busy}
            onChange={(e) => {
              onOtherInputChange(e.target.value);
            }}
            placeholder="7TV user ID or 7tv.app/users/… link"
            spellCheck={false}
            type="text"
            value={otherInput}
          />
          <button
            className="btn ghost small"
            disabled={busy || !otherInput.trim()}
            type="submit"
          >
            Use account
          </button>
          {otherError && <span className="hint other-error">{otherError}</span>}
        </form>
      )}

      {actingFor && target.status === 'ok' && (
        <p className="hint acting-note">
          New sets from Clone and Merge are created on{' '}
          {target.account.displayName}’s account. You need to be one of their
          editors.
        </p>
      )}
    </div>
  );
};
