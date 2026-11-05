import type { ReactNode } from 'react';

interface JobActionsProps {
  busy: boolean;
  disabled?: boolean;
  label: string;
  note?: string;
  onCancel: () => void;
  onStart: () => void;
}

export const JobActions = ({
  busy,
  disabled,
  label,
  note = 'Pacing is automatic and backs off if 7TV rate limits.',
  onCancel,
  onStart,
}: JobActionsProps): ReactNode => (
  <div className="actions">
    {busy ? (
      <button className="btn danger" onClick={onCancel} type="button">
        Cancel
      </button>
    ) : (
      <button
        className="btn primary"
        disabled={disabled}
        onClick={onStart}
        type="button"
      >
        {label}
      </button>
    )}
    {note && <p className="hint pace-note">{note}</p>}
  </div>
);
