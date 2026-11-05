import type { ReactNode } from 'react';

import { TokenGuide } from './components/TokenGuide';

export interface TokenFieldViewProps {
  busy: boolean;
  note: string;
  onChange: (value: string) => void;
  onForget: () => void;
  onToggleShow: () => void;
  showToken: boolean;
  token: string;
}

export const TokenFieldView = ({
  busy,
  note,
  onChange,
  onForget,
  onToggleShow,
  showToken,
  token,
}: TokenFieldViewProps): ReactNode => (
  <div className="field">
    <div className="row">
      <label htmlFor="token">Token</label>
      <span className="row-links">
        {token && (
          <button
            className="link muted"
            disabled={busy}
            onClick={onForget}
            type="button"
          >
            Forget
          </button>
        )}
        <button
          aria-label={showToken ? 'Hide token' : 'Show token'}
          className="link"
          onClick={onToggleShow}
          type="button"
        >
          {showToken ? 'Hide' : 'Show'}
        </button>
      </span>
    </div>
    <input
      autoComplete="off"
      disabled={busy}
      id="token"
      onChange={(e) => {
        onChange(e.target.value);
      }}
      placeholder="Paste your 7TV token"
      spellCheck={false}
      type={showToken ? 'text' : 'password'}
      value={token}
    />
    {note && <p className="hint">{note}</p>}
    <TokenGuide />
  </div>
);
