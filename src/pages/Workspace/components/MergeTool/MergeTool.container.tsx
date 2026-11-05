import type { ReactNode } from 'react';

import { MergeToolView } from './MergeTool.view';
import { type MergeToolProps, useMergeTool } from './useMergeTool';

/**
 * Merges two of the user's sets. The primary wins same-name duplicates
 * automatically, or the user picks a winner for each one.
 */
export const MergeToolContainer = (props: MergeToolProps): ReactNode => (
  <MergeToolView {...useMergeTool(props)} />
);
