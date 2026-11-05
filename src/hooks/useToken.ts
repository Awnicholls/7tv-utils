import { useEffect, useRef, useState } from 'react';

import { normalizeToken } from '../../electron/utils/normalizeToken';
import { TOKEN_SAVE_DELAY_MS } from '../constants';
import { describeToken } from '../utils/describeToken';
import { getApi } from '../utils/getApi';

export interface TokenState {
  forgetToken: () => void;
  setToken: (value: string) => void;
  token: string;
  tokenNote: string;
}

/**
The 7TV token, loaded from and saved to the encrypted store.
*/
export const useToken = (): TokenState => {
  const [token, setTokenValue] = useState('');
  const [tokenNote, setTokenNote] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    void getApi()
      ?.loadToken()
      .then((saved) => {
        if (!saved) {
          return;
        }
        setTokenValue(saved);
        setTokenNote(describeToken(saved));
      });
  }, []);

  const setToken = (value: string): void => {
    setTokenValue(value);
    setTokenNote(describeToken(value));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void getApi()?.saveToken(normalizeToken(value));
    }, TOKEN_SAVE_DELAY_MS);
  };

  const forgetToken = (): void => {
    clearTimeout(saveTimer.current);
    void getApi()
      ?.forgetToken()
      .then(() => {
        setTokenValue('');
        setTokenNote('Token removed from this device.');
      });
  };

  return { forgetToken, setToken, token, tokenNote };
};
