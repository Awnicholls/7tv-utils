import type { ReactNode } from 'react';

import { CloneToolView } from './CloneTool.view';
import { type CloneToolProps, useCloneTool } from './useCloneTool';

/**
Makes a brand-new set on the signed-in account holding another set's emotes.
*/
export const CloneToolContainer = (props: CloneToolProps): ReactNode => (
  <CloneToolView {...useCloneTool(props)} />
);
