import type { ReactNode } from 'react';

import type { MergeSide } from '../../../../../../electron/seventv/planMerge';

import { EmoteTile } from '../../../../../components/EmoteTile';

export interface TrimRow {
  emoteId: string;
  error?: string;
  excluded: boolean;
  from: MergeSide;
  key: string;
  name: string;
  originalName: string;
}

interface TrimListProps {
  capacity: null | number;
  count: number;
  disabled: boolean;
  filter: string;
  leftOut: number;
  onFilterChange: (value: string) => void;
  onLeaveOut: (keys: string[], leaveOut: boolean) => void;
  onRename: (itemKey: string, value: string) => void;
  onToggleExclude: (itemKey: string) => void;
  overCapacity: number;
  primaryName: string;
  rows: TrimRow[];
  secondaryName: string;
}

export const TrimList = ({
  capacity,
  count,
  disabled,
  filter,
  leftOut,
  onFilterChange,
  onLeaveOut,
  onRename,
  onToggleExclude,
  overCapacity,
  primaryName,
  rows,
  secondaryName,
}: TrimListProps): ReactNode => {
  const shownKeys = rows.map((r) => r.key);
  return (
    <div className="trim">
      <div className="row trim-head">
        <span className="preview-title">Everything in the merge</span>
        <span className={`trim-count ${overCapacity > 0 ? 'over' : ''}`}>
          {count}
          {capacity === null ? '' : ` / ${capacity}`}
          {leftOut > 0 && ` · ${leftOut} left out`}
        </span>
      </div>

      <div className="trim-tools">
        <input
          aria-label="Filter merge emotes"
          autoComplete="off"
          onChange={(e) => {
            onFilterChange(e.target.value);
          }}
          placeholder="Filter by name"
          spellCheck={false}
          type="text"
          value={filter}
        />
        {filter.trim() && (
          <>
            <button
              className="link danger"
              disabled={disabled || rows.length === 0}
              onClick={() => {
                onLeaveOut(shownKeys, true);
              }}
              type="button"
            >
              Leave out {rows.length}
            </button>
            <button
              className="link"
              disabled={disabled || rows.length === 0}
              onClick={() => {
                onLeaveOut(shownKeys, false);
              }}
              type="button"
            >
              Keep {rows.length}
            </button>
          </>
        )}
      </div>

      <ul aria-label="Emotes in the merge" className="tile-grid">
        {rows.map((row) => (
          <EmoteTile
            actionLabel="Leave out"
            badge={row.from}
            badgeTitle={row.from === 'primary' ? primaryName : secondaryName}
            disabled={disabled}
            emoteId={row.emoteId}
            error={row.error}
            itemKey={row.key}
            key={row.key}
            name={row.name}
            onRename={onRename}
            onToggleRemove={onToggleExclude}
            originalName={row.originalName}
            removed={row.excluded}
          />
        ))}
        {rows.length === 0 && <li className="hint empty">No matches.</li>}
      </ul>
    </div>
  );
};
