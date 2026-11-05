import type { ReactNode } from 'react';

import type { EmoteSet } from '../../../../../electron/types/seventv';

import { JobActions } from '../../../../components/JobActions';
import { SetField } from '../../../../components/SetField';
import { SetPreview } from '../../../../components/SetPreview';

export interface CopyToolViewProps {
  busy: boolean;
  canStart: boolean;
  onCancel: () => void;
  onSourceBlur: () => void;
  onSourceChange: (value: string) => void;
  onStart: () => void;
  onTargetBlur: () => void;
  onTargetChange: (value: string) => void;
  preview: EmoteSet | null;
  source: string;
  sourceHint?: string;
  target: string;
  targetHint?: string;
}

export const CopyToolView = ({
  busy,
  canStart,
  onCancel,
  onSourceBlur,
  onSourceChange,
  onStart,
  onTargetBlur,
  onTargetChange,
  preview,
  source,
  sourceHint,
  target,
  targetHint,
}: CopyToolViewProps): ReactNode => (
  <>
    <div className="grid2">
      <SetField
        disabled={busy}
        hint={sourceHint}
        id="copy-source"
        label="Source"
        onBlur={onSourceBlur}
        onChange={onSourceChange}
        placeholder="Set ID or 7tv.app URL"
        value={source}
      />
      <SetField
        disabled={busy}
        hint={targetHint}
        id="copy-target"
        label="Destination"
        onBlur={onTargetBlur}
        onChange={onTargetChange}
        placeholder="Your set ID or URL"
        value={target}
      />
    </div>

    <JobActions
      busy={busy}
      disabled={!canStart}
      label="Start copying"
      onCancel={onCancel}
      onStart={onStart}
    />

    {preview && preview.emotes.length > 0 && (
      <SetPreview set={preview} title="Source preview" />
    )}
  </>
);
