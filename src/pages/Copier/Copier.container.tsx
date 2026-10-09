import type { ReactNode } from 'react';

import { CopierView } from './Copier.view';
import { useCopier } from './useCopier';

export const CopierContainer = (): ReactNode => <CopierView {...useCopier()} />;
