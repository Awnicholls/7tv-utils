import type { ReactNode } from 'react';

import { CopyToolView } from './CopyTool.view';
import { type CopyToolProps, useCopyTool } from './useCopyTool';

/**
Copies every emote from any set into an existing set the user can edit.
*/
export const CopyToolContainer = (props: CopyToolProps): ReactNode => (
  <CopyToolView {...useCopyTool(props)} />
);
