import type { ReactNode } from 'react';

import { useWorkspace } from './useWorkspace';
import { WorkspaceView } from './Workspace.view';

/**
 * The app's single screen: the shared token and account at the top, then
 * one tab per tool (copy, clone, merge, edit) sharing one job panel.
 */
export const WorkspaceContainer = (): ReactNode => (
  <WorkspaceView {...useWorkspace()} />
);
