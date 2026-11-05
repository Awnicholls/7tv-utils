import type { ReactNode } from 'react';

import { EditToolView } from './EditTool.view';
import { type EditToolProps, useEditTool } from './useEditTool';

/**
Renames and removes emotes in one of the user's sets, applied in one go.
*/
export const EditToolContainer = (props: EditToolProps): ReactNode => (
  <EditToolView {...useEditTool(props)} />
);
