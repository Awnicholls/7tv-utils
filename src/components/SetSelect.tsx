import type { ReactNode } from 'react';

import type { Account } from '../../electron/types/seventv';

interface SetSelectProps {
  account: Account | null;
  /**
  Name to show when `value` isn't one of the account's sets yet.
  */
  currentName?: string;
  disabled?: boolean;
  /**
  Set ids to leave out, e.g. the one already picked in another select.
  */
  exclude?: string[];
  hint?: string;
  id: string;
  label: string;
  onChange: (setId: string) => void;
  value: string;
}

export const SetSelect = ({
  account,
  currentName,
  disabled,
  exclude = [],
  hint,
  id,
  label,
  onChange,
  value,
}: SetSelectProps): ReactNode => {
  const sets = (account?.sets ?? []).filter(
    (s) => s.id === value || !exclude.includes(s.id)
  );
  const active = new Set(account?.activeSetIds);
  const isListed = sets.some((s) => s.id === value);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        disabled={disabled === true || (!account && !value)}
        id={id}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        value={value}
      >
        <option value="">
          {account ? 'Choose a set…' : 'Add your token first'}
        </option>
        {value && !isListed && (
          <option value={value}>{currentName ?? value}</option>
        )}
        {sets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {active.has(s.id) ? ' (active)' : ''}
          </option>
        ))}
      </select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
};
