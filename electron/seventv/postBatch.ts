import type { QueueItem } from '../types/copier.js';

import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
import { API, GQL_MUTATION } from './constants.js';

export const postBatch = ({
  batch,
  bearer,
  doFetch,
  signal,
  targetId,
}: {
  batch: QueueItem[];
  bearer: string;
  doFetch: typeof fetch;
  signal?: AbortSignal;
  targetId: string;
}): Promise<Response> =>
  fetchWithTimeout(doFetch, `${API}/gql`, {
    body: JSON.stringify(
      batch.map((item) => ({
        operationName: 'ChangeEmoteInSet',
        query: GQL_MUTATION,
        variables: {
          action: 'ADD',
          emote_id: item.emote.id,
          id: targetId,
          name: item.emote.name,
        },
      }))
    ),
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });
