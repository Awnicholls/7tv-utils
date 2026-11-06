import type { UserResponse } from '../types/copier.js';
import type {
  Account,
  AccountRef,
  GetEmoteSetOptions,
} from '../types/seventv.js';

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { parseUserId } from '../utils/parseUserId.js';
import { requireBearer } from '../utils/requireBearer.js';
import { tokenUserId } from '../utils/tokenUserId.js';
import { API, GQL_EDITOR_OF, GQL_USER_SETS } from './constants.js';
import { CopyError } from './CopyError.js';
import { gqlRequest } from './gqlRequest.js';

const toEditorOf = (user: UserResponse): AccountRef[] =>
  (user.editor_of ?? []).flatMap((e) => {
    const id = e.user?.id ?? e.id;
    if (!id) {
      return [];
    }
    return [
      { displayName: e.user?.display_name ?? e.user?.username ?? id, id },
    ];
  });

const toAccount = (user: UserResponse, id: string): Account => ({
  activeSetIds: (user.connections ?? [])
    .map((c) => c.emote_set_id)
    .filter((value): value is string => typeof value === 'string'),
  displayName: user.display_name ?? user.username ?? id,
  editorOf: toEditorOf(user),
  id: user.id ?? id,
  sets: (user.emote_sets ?? []).map((s) => ({
    capacity: typeof s.capacity === 'number' ? s.capacity : null,
    id: s.id,
    name: s.name ?? 'Untitled set',
  })),
});

const fetchUser = async (
  id: string,
  bearer: string,
  opts: GetEmoteSetOptions
): Promise<null | UserResponse> => {
  try {
    const res = await fetchWithTimeout(
      opts.fetch ?? fetch,
      `${API}/users/${id}`,
      // Signed in, so an editor also sees the account's private sets.
      { headers: { Authorization: `Bearer ${bearer}` }, signal: opts.signal }
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
Accounts the user edits for. Best effort: an empty list if 7TV won't say.
*/
const fetchEditorOf = async (
  id: string,
  bearer: string,
  opts: GetEmoteSetOptions
): Promise<AccountRef[]> => {
  try {
    const data = await gqlRequest<{ user: null | UserResponse }>(
      GQL_EDITOR_OF,
      { id },
      bearer,
      opts
    );
    return data.user ? toEditorOf(data.user) : [];
  } catch (error) {
    if (opts.signal?.aborted) {
      throw error;
    }
    return [];
  }
};

/**
 * Resolves an account with its emote sets: the token's own, or `userIdInput`
 * (an id or profile URL) when the user is working as that account's editor.
 */
export const getAccount = async (
  token: string,
  userIdInput = '',
  opts: GetEmoteSetOptions = {}
): Promise<Account> => {
  const bearer = requireBearer(token);
  const own = tokenUserId(bearer);
  if (!own) {
    throw new CopyError('That does not look like a 7TV token.');
  }
  const id = userIdInput.trim() ? parseUserId(userIdInput) : own;
  if (!id) {
    throw new CopyError('Enter a 7TV user ID or profile URL.');
  }

  let user = await fetchUser(id, bearer, opts);
  if (!user?.emote_sets) {
    const data = await gqlRequest<{ user: null | UserResponse }>(
      GQL_USER_SETS,
      { id },
      bearer,
      opts
    );
    user = data.user;
  }
  if (!user) {
    throw new CopyError(
      id === own
        ? 'Could not find the 7TV account for this token.'
        : `Could not find a 7TV account with ID ${id}.`
    );
  }

  const account = toAccount(user, id);
  if (id === own && account.editorOf.length === 0) {
    account.editorOf = await fetchEditorOf(id, bearer, opts);
  }
  // Only your own account lists who you edit for.
  if (id !== own) {
    account.editorOf = [];
  }
  return account;
};
