import type { UserResponse } from '../types/copier.js';
import type { Account, GetEmoteSetOptions } from '../types/seventv.js';

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { requireBearer } from '../utils/requireBearer.js';
import { tokenUserId } from '../utils/tokenUserId.js';
import { API, GQL_USER_SETS } from './constants.js';
import { CopyError } from './CopyError.js';
import { gqlRequest } from './gqlRequest.js';

const toAccount = (user: UserResponse, id: string): Account => ({
  activeSetIds: (user.connections ?? [])
    .map((c) => c.emote_set_id)
    .filter((value): value is string => typeof value === 'string'),
  displayName: user.display_name ?? user.username ?? id,
  id: user.id ?? id,
  sets: (user.emote_sets ?? []).map((s) => ({
    capacity: typeof s.capacity === 'number' ? s.capacity : null,
    id: s.id,
    name: s.name ?? 'Untitled set',
  })),
});

const fetchUser = async (
  id: string,
  opts: GetEmoteSetOptions
): Promise<null | UserResponse> => {
  try {
    const res = await fetchWithTimeout(
      opts.fetch ?? fetch,
      `${API}/users/${id}`,
      { signal: opts.signal }
    );
    return res.ok ? ((await res.json()) as UserResponse) : null;
  } catch (error) {
    if (opts.signal?.aborted) {
      throw error;
    }
    return null;
  }
};

/**
Resolves the account a token belongs to, with that account's emote sets.
*/
export const getAccount = async (
  token: string,
  opts: GetEmoteSetOptions = {}
): Promise<Account> => {
  const bearer = requireBearer(token);
  const id = tokenUserId(bearer);
  if (!id) {
    throw new CopyError('That does not look like a 7TV token.');
  }

  const rest = await fetchUser(id, opts);
  if (rest?.emote_sets) {
    return toAccount(rest, id);
  }
  const data = await gqlRequest<{ user: null | UserResponse }>(
    GQL_USER_SETS,
    { id },
    bearer,
    opts
  );
  if (!data.user) {
    throw new CopyError('Could not find the 7TV account for this token.');
  }
  return toAccount(data.user, id);
};
