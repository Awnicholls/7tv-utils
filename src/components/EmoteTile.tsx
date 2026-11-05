import { memo, type ReactNode } from 'react';

import { EmoteImage } from './EmoteImage';

export type TileBadge = 'primary' | 'secondary';

interface EmoteTileProps {
  /**
  What taking the emote out is called here, e.g. "Remove" or "Leave out".
  */
  actionLabel: string;
  badge?: TileBadge;
  badgeTitle?: string;
  disabled: boolean;
  emoteId: string;
  error?: string;
  /**
  Passed back to the callbacks to say which tile changed.
  */
  itemKey: string;
  name: string;
  onRename: (itemKey: string, value: string) => void;
  onToggleRemove: (itemKey: string) => void;
  originalName: string;
  removed: boolean;
}

const EmoteTileView = ({
  actionLabel,
  badge,
  badgeTitle,
  disabled,
  emoteId,
  error,
  itemKey,
  name,
  onRename,
  onToggleRemove,
  originalName,
  removed,
}: EmoteTileProps): ReactNode => {
  const renamed = !removed && name.trim() !== originalName;
  const state = [
    removed ? 'removed' : '',
    renamed ? 'renamed' : '',
    error && !removed ? 'invalid' : '',
  ].join(' ');
  return (
    <li className={`tile ${state}`}>
      {badge && (
        <span className={`tile-badge ${badge}`} title={badgeTitle}>
          {badge === 'primary' ? 'P' : 'S'}
        </span>
      )}
      <button
        aria-label={`${removed ? 'Keep' : actionLabel} ${originalName}`}
        className="tile-x"
        disabled={disabled}
        onClick={() => {
          onToggleRemove(itemKey);
        }}
        title={removed ? 'Keep' : actionLabel}
        type="button"
      >
        {removed ? '↺' : '×'}
      </button>
      <EmoteImage id={emoteId} size={40} />
      <input
        aria-label={`Name for ${originalName}`}
        autoComplete="off"
        disabled={disabled || removed}
        onChange={(e) => {
          onRename(itemKey, e.target.value);
        }}
        spellCheck={false}
        title={error ?? (renamed ? `was ${originalName}` : originalName)}
        type="text"
        value={name}
      />
      {!removed && (error ?? renamed) && (
        <span className="tile-note">{error ?? `was ${originalName}`}</span>
      )}
    </li>
  );
};

/**
 * One emote in a grid: image, editable name and a remove toggle. Props are
 * plain values so only the tile that changed re-renders.
 */
export const EmoteTile = memo(EmoteTileView);
