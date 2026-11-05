import { useEffect, useState } from 'react';

import type { Account } from '../../electron/types/seventv';

import { normalizeToken } from '../../electron/utils/normalizeToken';
import { ACCOUNT_LOAD_DELAY_MS } from '../constants';
import { getApi } from '../utils/getApi';

export interface AccountControls {
  refreshAccount: () => void;
  state: AccountState;
}

export type AccountState =
  | { account: Account; status: 'ok' }
  | { error: string; status: 'error' }
  | { status: 'idle' }
  | { status: 'loading' };

/**
The account the current token signs in as, with its emote sets.
*/
export const useAccount = (token: string): AccountControls => {
  const bearer = normalizeToken(token);
  // Remember which token a result belongs to, so switching tokens never
  // shows the previous account while the new one loads.
  const [loaded, setLoaded] = useState<{ bearer: string; state: AccountState }>(
    { bearer: '', state: { status: 'idle' } }
  );
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const api = getApi();
    if (!api || !bearer) {
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      void api.loadAccount(bearer).then((res) => {
        if (stale) {
          return;
        }
        setLoaded({
          bearer,
          state: res.ok
            ? { account: res.value, status: 'ok' }
            : { error: res.error, status: 'error' },
        });
      });
    }, ACCOUNT_LOAD_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [bearer, version]);

  let state: AccountState = { status: 'idle' };
  if (bearer) {
    state = loaded.bearer === bearer ? loaded.state : { status: 'loading' };
  }

  return {
    refreshAccount: () => {
      setVersion((v) => v + 1);
    },
    state,
  };
};
