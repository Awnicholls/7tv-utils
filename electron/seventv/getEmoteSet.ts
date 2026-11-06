import type { SetResponse } from '../types/copier.js';
import type { EmoteSet, GetEmoteSetOptions } from '../types/seventv.js';

import { abortableSleep } from '../utils/abortableSleep.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { parseSetId } from '../utils/parseSetId.js';
import { withJitter } from '../utils/withJitter.js';
import {
  API,
  MAX_SET_LOAD_ATTEMPTS,
  MAX_SET_NETWORK_RETRIES,
} from './constants.js';
import { CopyError } from './CopyError.js';
import { resetSeconds } from './rateHeaders.js';

const toEmoteSet = (json: SetResponse, id: string): EmoteSet => ({
  capacity: typeof json.capacity === 'number' ? json.capacity : null,
  emotes: (json.emotes ?? []).map((e) => ({ id: e.id, name: e.name })),
  id: json.id ?? id,
  name: json.name ?? 'Untitled set',
  owner: json.owner?.display_name ?? json.owner?.username ?? null,
});

export const getEmoteSet = async (
  input: string,
  opts: GetEmoteSetOptions = {}
): Promise<EmoteSet> => {
  const id = parseSetId(input);
  if (!id) {
    throw new CopyError('Enter an emote set ID or URL.');
  }
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? abortableSleep;
  const { signal } = opts;

  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    let res: Response;
    try {
      res = await fetchWithTimeout(doFetch, `${API}/emote-sets/${id}`, {
        headers: opts.bearer ? { Authorization: `Bearer ${opts.bearer}` } : {},
        signal,
      });
    } catch (error) {
      if (signal?.aborted || attempt >= MAX_SET_NETWORK_RETRIES) {
        throw error;
      }
      await sleep(withJitter(1500 * 2 ** attempt), signal);
      continue;
    }
    if (res.status === 404 || res.status === 400) {
      throw new CopyError(`Emote set ${id} was not found.`);
    }
    if (
      (res.status === 429 || res.status >= 500) &&
      attempt < MAX_SET_LOAD_ATTEMPTS
    ) {
      const reset = resetSeconds(res.headers);
      await sleep(
        withJitter(reset ? reset * 1000 + 500 : 2000 * 2 ** attempt),
        signal
      );
      continue;
    }
    if (!res.ok) {
      throw new CopyError(`Could not load emote set (HTTP ${res.status}).`);
    }
    return toEmoteSet((await res.json()) as SetResponse, id);
  }
};
