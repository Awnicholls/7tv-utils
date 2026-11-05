import { useEffect, useRef, useState } from 'react';

import type { EmoteSet } from '../../electron/types/seventv';
import type { SetState } from '../types/copier';

import { parseSetId } from '../../electron/utils/parseSetId';
import { getApi } from '../utils/getApi';

export interface SetLookup {
  clear: () => void;
  /**
  Loads a set; resolves with it, or null if it couldn't be loaded.
  */
  lookup: (input: string) => Promise<EmoteSet | null>;
  set: EmoteSet | null;
  state: SetState;
}

/**
 * Looks up an emote set by id or URL. Only the newest lookup's answer is
 * kept, so fast changes can't leave a stale set on screen.
 */
export const useSetLookup = (initialInput = ''): SetLookup => {
  const [state, setState] = useState<SetState>(() =>
    initialInput && parseSetId(initialInput)
      ? { status: 'loading' }
      : { status: 'idle' }
  );
  const latest = useRef(0);

  const fetchSet = async (input: string): Promise<EmoteSet | null> => {
    const request = ++latest.current;
    const api = getApi();
    if (!api) {
      return null;
    }
    const res = await api.loadSet(input);
    if (request !== latest.current) {
      return null;
    }
    setState(
      res.ok
        ? { set: res.value, status: 'ok' }
        : { error: res.error, status: 'error' }
    );
    return res.ok ? res.value : null;
  };

  useEffect(() => {
    if (initialInput && parseSetId(initialInput)) {
      void fetchSet(initialInput);
    }
    // Only the first input is looked up automatically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    clear: () => {
      latest.current += 1;
      setState({ status: 'idle' });
    },
    lookup: (input) => {
      if (!getApi() || !parseSetId(input)) {
        latest.current += 1;
        setState({ status: 'idle' });
        return Promise.resolve(null);
      }
      setState({ status: 'loading' });
      return fetchSet(input);
    },
    set: state.status === 'ok' ? state.set : null,
    state,
  };
};
