import type { ReactNode } from 'react';

import { TokenFieldView } from './TokenField.view';
import { type TokenFieldProps, useTokenField } from './useTokenField';

export const TokenFieldContainer = (props: TokenFieldProps): ReactNode => (
  <TokenFieldView {...useTokenField(props)} />
);
