import type { ReactNode } from 'react';

import type { EmoteSet } from '../../electron/types/seventv';

import { PREVIEW_LIMIT } from '../constants';

export const SetPreview = ({
  set,
  title = 'Preview',
}: {
  set: EmoteSet;
  title?: string;
}): ReactNode => (
  <div className="preview">
    <p className="preview-title">
      {title} · first {Math.min(PREVIEW_LIMIT, set.emotes.length)}
    </p>
    <div className="chips">
      {set.emotes.slice(0, PREVIEW_LIMIT).map((e) => (
        <span className="chip" key={e.name} title={e.id}>
          {e.name}
        </span>
      ))}
      {set.emotes.length > PREVIEW_LIMIT && (
        <span className="chip more">
          +{set.emotes.length - PREVIEW_LIMIT} more
        </span>
      )}
    </div>
  </div>
);
