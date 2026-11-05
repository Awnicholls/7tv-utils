import type { ReactNode } from 'react';

import type { DupeChoice } from '../../../../../../electron/types/ipc';

import { type ConflictRow, ConflictTile } from './ConflictTile';

interface ConflictListProps {
  disabled: boolean;
  onChoose: (secondaryName: string, choice: DupeChoice) => void;
  onChooseAll: (choice: DupeChoice) => void;
  onRename: (itemKey: string, value: string) => void;
  primaryName: string;
  rows: ConflictRow[];
  secondaryName: string;
}

export const ConflictList = ({
  disabled,
  onChoose,
  onChooseAll,
  onRename,
  primaryName,
  rows,
  secondaryName,
}: ConflictListProps): ReactNode => (
  <div className="conflicts">
    <div className="row conflicts-head">
      <span className="preview-title">Duplicates ({rows.length})</span>
      <span className="row-links">
        {(['primary', 'secondary', 'both'] as const).map((choice) => (
          <button
            className="link"
            disabled={disabled}
            key={choice}
            onClick={() => {
              onChooseAll(choice);
            }}
            type="button"
          >
            {choice === 'both' ? 'Keep all both' : `All ${choice}`}
          </button>
        ))}
      </span>
    </div>
    <ul className="tile-grid conflict-grid">
      {rows.map((row) => (
        <ConflictTile
          disabled={disabled}
          key={row.name}
          onChoose={onChoose}
          onRename={onRename}
          primarySet={primaryName}
          secondarySet={secondaryName}
          {...row}
        />
      ))}
    </ul>
  </div>
);
