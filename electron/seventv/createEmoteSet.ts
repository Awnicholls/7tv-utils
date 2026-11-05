import type { GetEmoteSetOptions, SetSummary } from '../types/seventv.js';

import { GQL_CREATE_SET } from './constants.js';
import { CopyError } from './CopyError.js';
import { gqlRequest } from './gqlRequest.js';

export const MAX_SET_NAME = 40;

export const createEmoteSet = async (
  bearer: string,
  userId: string,
  rawName: string,
  opts: GetEmoteSetOptions = {}
): Promise<SetSummary> => {
  const name = rawName.trim().slice(0, MAX_SET_NAME);
  if (!name) {
    throw new CopyError('Give the new set a name.');
  }
  const data = await gqlRequest<{
    createEmoteSet: { capacity?: number; id: string; name?: string } | null;
  }>(GQL_CREATE_SET, { data: { name }, user_id: userId }, bearer, opts);
  const set = data.createEmoteSet;
  if (!set?.id) {
    throw new CopyError('7TV did not create the set.');
  }
  return {
    capacity: typeof set.capacity === 'number' ? set.capacity : null,
    id: set.id,
    name: set.name ?? name,
  };
};
