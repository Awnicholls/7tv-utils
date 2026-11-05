import { useState } from 'react';

import type { TokenFieldViewProps } from './TokenField.view';

export interface TokenFieldProps {
  busy: boolean;
  note: string;
  onChange: (value: string) => void;
  onForget: () => void;
  token: string;
}

export const useTokenField = (props: TokenFieldProps): TokenFieldViewProps => {
  const [showToken, setShowToken] = useState(false);
  return {
    ...props,
    onToggleShow: () => {
      setShowToken((shown) => !shown);
    },
    showToken,
  };
};
