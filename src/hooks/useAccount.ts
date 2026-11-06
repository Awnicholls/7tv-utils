import { useEffect, useState } from 'react';

import type { Account } from '../../electron/types/seventv';

import { normalizeToken } from '../../electron/utils/normalizeToken';
import { ACCOUNT_LOAD_DELAY_MS } from '../constants';
import { getApi } from '../utils/getApi';

export interface AccountControls {
  refreshAccount: () => void;
  /**
  The token's own account, with the accounts it edits for.
  */
  self: AccountState;
  /**
  The account being edited for; idle when working on your own.
  */
  target: AccountState;
}

export type AccountState =
  | { account: Account; status: 'ok' }
  | { error: string; status: 'error' }
  | { status: 'idle' }
  | { status: 'loading' };

/**
 * Loads one account. Results remember which token and user they belong to,
 * so switching either never shows the previous account while loading.
 */
const useAccountQuery = (
  bearer: string,
  userId: string,
  version: number,
  enabled: boolean
): AccountState => {
  const key = `${bearer}|${userId}`;
  const [loaded, setLoaded] = useState<{ key: string; state: AccountState }>({
    key: '',
    state: { status: 'idle' },
  });

  useEffect(() => {
    const api = getApi();
    if (!api || !bearer || !enabled) {
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      void api.loadAccount(bearer, userId).then((res) => {
        if (stale) {
          return;
        }
        setLoaded({
          key: `${bearer}|${userId}`,
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
  }, [bearer, userId, version, enabled]);

  if (!bearer || !enabled) {
    return { status: 'idle' };
  }
  return loaded.key === key ? loaded.state : { status: 'loading' };
};

export const useAccount = (
  token: string,
  actingFor: string
): AccountControls => {
  const bearer = normalizeToken(token);
  const [version, setVersion] = useState(0);
  const self = useAccountQuery(bearer, '', version, true);
  const target = useAccountQuery(
    bearer,
    actingFor,
    version,
    Boolean(actingFor)
  );

  return {
    refreshAccount: () => {
      setVersion((v) => v + 1);
    },
    self,
    target,
  };
};
