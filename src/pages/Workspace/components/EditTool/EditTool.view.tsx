import type { ReactNode } from 'react';

import type {
  Account,
  EmoteEntry,
} from '../../../../../electron/types/seventv';

import { EmoteTile } from '../../../../components/EmoteTile';
import { JobActions } from '../../../../components/JobActions';
import { SetSelect } from '../../../../components/SetSelect';

export interface EditRow {
  emote: EmoteEntry;
  error?: string;
  name: string;
  removed: boolean;
  renamed: boolean;
}

export interface EditToolViewProps {
  account: Account | null;
  busy: boolean;
  canStart: boolean;
  errors: number;
  filter: string;
  label: string;
  onCancel: () => void;
  onFilterChange: (value: string) => void;
  onPickSet: (pickedId: string) => void;
  onRename: (emoteName: string, value: string) => void;
  onReset: () => void;
  onStart: () => void;
  onToggleRemove: (emoteName: string) => void;
  pickedHint?: string;
  pickedId: string;
  pickedName?: string;
  rows: EditRow[];
  summary: string;
  total: number;
}

export const EditToolView = ({
  account,
  busy,
  canStart,
  errors,
  filter,
  label,
  onCancel,
  onFilterChange,
  onPickSet,
  onRename,
  onReset,
  onStart,
  onToggleRemove,
  pickedHint,
  pickedId,
  pickedName,
  rows,
  summary,
  total,
}: EditToolViewProps): ReactNode => (
  <>
    <div className="grid2">
      <SetSelect
        account={account}
        currentName={pickedName}
        disabled={busy}
        hint={pickedHint}
        id="edit-set"
        label="Set"
        onChange={onPickSet}
        value={pickedId}
      />
      <div className="field">
        <label htmlFor="edit-filter">Find</label>
        <input
          autoComplete="off"
          disabled={total === 0}
          id="edit-filter"
          onChange={(e) => {
            onFilterChange(e.target.value);
          }}
          placeholder="Filter emotes by name"
          spellCheck={false}
          type="text"
          value={filter}
        />
        {filter && (
          <p className="hint">
            {rows.length} of {total} shown
          </p>
        )}
      </div>
    </div>

    {total > 0 && (
      <ul aria-label="Emotes" className="tile-grid">
        {rows.map((row) => (
          <EmoteTile
            actionLabel="Remove"
            disabled={busy}
            emoteId={row.emote.id}
            error={row.error}
            itemKey={row.emote.name}
            key={row.emote.name}
            name={row.name}
            onRename={onRename}
            onToggleRemove={onToggleRemove}
            originalName={row.emote.name}
            removed={row.removed}
          />
        ))}
        {rows.length === 0 && <li className="hint empty">No matches.</li>}
      </ul>
    )}

    {(summary || errors > 0) && (
      <p className="hint edit-summary">
        {summary}
        {errors > 0 &&
          `${summary ? ' · ' : ''}${errors} name${errors === 1 ? '' : 's'} to fix`}
        {summary && (
          <button
            className="link muted"
            disabled={busy}
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
        )}
      </p>
    )}

    <JobActions
      busy={busy}
      disabled={!canStart}
      label={label}
      note="Removals run first, then renames."
      onCancel={onCancel}
      onStart={onStart}
    />
  </>
);
