import { memo, type ReactNode } from 'react';

import type { DupeChoice } from '../../../../../../electron/types/ipc';

import { EmoteImage } from '../../../../../components/EmoteImage';

export interface ConflictRow {
  choice: DupeChoice;
  error?: string;
  name: string;
  /**
  The secondary's name when both are kept.
  */
  newName: string;
  primaryId: string;
  secondaryId: string;
  /**
  Candidate key of the secondary, for renaming it.
  */
  secondaryKey: string;
}

interface ConflictTileProps extends ConflictRow {
  disabled: boolean;
  onChoose: (secondaryName: string, choice: DupeChoice) => void;
  onRename: (itemKey: string, value: string) => void;
  primarySet: string;
  secondarySet: string;
}

const ConflictTileView = ({
  choice,
  disabled,
  error,
  name,
  newName,
  onChoose,
  onRename,
  primaryId,
  primarySet,
  secondaryId,
  secondaryKey,
  secondarySet,
}: ConflictTileProps): ReactNode => {
  const pick = (next: DupeChoice) => () => {
    onChoose(name, next);
  };
  const keepsPrimary = choice !== 'secondary';
  const keepsSecondary = choice !== 'primary';
  return (
    <li className={`conflict-tile ${error ? 'invalid' : ''}`}>
      <code className="conflict-title" title={name}>
        {name}
      </code>
      <div className="conflict-picks">
        <button
          aria-pressed={choice === 'primary'}
          className={`pick ${keepsPrimary ? 'picked' : ''}`}
          disabled={disabled}
          onClick={pick('primary')}
          title={`Keep only the one from ${primarySet}`}
          type="button"
        >
          <EmoteImage id={primaryId} size={40} />
          <span>Primary</span>
        </button>
        <button
          aria-pressed={choice === 'secondary'}
          className={`pick ${keepsSecondary ? 'picked' : ''}`}
          disabled={disabled}
          onClick={pick('secondary')}
          title={`Keep only the one from ${secondarySet}`}
          type="button"
        >
          <EmoteImage id={secondaryId} size={40} />
          <span>Secondary</span>
        </button>
      </div>
      {choice === 'both' ? (
        <div className="keep-both-name">
          <input
            aria-label={`New name for the secondary ${name}`}
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => {
              onRename(secondaryKey, e.target.value);
            }}
            spellCheck={false}
            title={error ?? 'Name for the secondary copy'}
            type="text"
            value={newName}
          />
          <button
            className="link muted"
            disabled={disabled}
            onClick={pick('primary')}
            type="button"
          >
            Undo
          </button>
        </div>
      ) : (
        <button
          className="link keep-both"
          disabled={disabled}
          onClick={pick('both')}
          type="button"
        >
          Keep both
        </button>
      )}
      {error && <span className="tile-note">{error}</span>}
    </li>
  );
};

/**
Plain-value props, so only the tile that changed re-renders.
*/
export const ConflictTile = memo(ConflictTileView);
