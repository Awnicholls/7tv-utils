import type { ReactNode } from 'react';

interface CopyActionsProps {
  busy: boolean;
  onCancel: () => void;
  onStart: () => void;
}

export const CopyActions = ({
  busy,
  onCancel,
  onStart,
}: CopyActionsProps): ReactNode => (
  <div className="actions">
    {busy ? (
      <button className="btn danger" onClick={onCancel} type="button">
        Cancel
      </button>
    ) : (
      <button className="btn primary" onClick={onStart} type="button">
        Start copying
      </button>
    )}
    <p className="hint pace-note">
      Pacing is automatic and backs off if 7TV rate limits.
    </p>
  </div>
);
