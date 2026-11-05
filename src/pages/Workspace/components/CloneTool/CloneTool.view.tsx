import type { ReactNode } from 'react';

import type { EmoteSet } from '../../../../../electron/types/seventv';

import { JobActions } from '../../../../components/JobActions';
import { SetField } from '../../../../components/SetField';
import { SetPreview } from '../../../../components/SetPreview';
import { SET_NAME_LIMIT } from '../../../../constants';

export interface CloneToolViewProps {
  busy: boolean;
  canStart: boolean;
  name: string;
  nameHint: string;
  onCancel: () => void;
  onNameChange: (value: string) => void;
  onSourceBlur: () => void;
  onSourceChange: (value: string) => void;
  onStart: () => void;
  preview: EmoteSet | null;
  source: string;
  sourceHint?: string;
}

export const CloneToolView = ({
  busy,
  canStart,
  name,
  nameHint,
  onCancel,
  onNameChange,
  onSourceBlur,
  onSourceChange,
  onStart,
  preview,
  source,
  sourceHint,
}: CloneToolViewProps): ReactNode => (
  <>
    <div className="grid2">
      <SetField
        disabled={busy}
        hint={sourceHint}
        id="clone-source"
        label="Set to clone"
        onBlur={onSourceBlur}
        onChange={onSourceChange}
        placeholder="Set ID or 7tv.app URL"
        value={source}
      />
      <SetField
        disabled={busy}
        hint={nameHint}
        id="clone-name"
        label="New set name"
        maxLength={SET_NAME_LIMIT}
        onChange={onNameChange}
        placeholder="Name for your copy"
        value={name}
      />
    </div>

    <JobActions
      busy={busy}
      disabled={!canStart}
      label="Clone to my account"
      onCancel={onCancel}
      onStart={onStart}
    />

    {preview && preview.emotes.length > 0 && (
      <SetPreview set={preview} title="Set preview" />
    )}
  </>
);
