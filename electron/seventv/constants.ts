export const API = 'https://7tv.io/v3';
export const MAX_BATCH = 30;
export const START_BATCH = 6;
export const MIN_GAP_MS = 750;
export const START_GAP_MS = 2500;
export const MAX_GAP_MS = 60_000;
export const MAX_LIMIT_BACKOFF_MS = 10 * 60_000;
export const MAX_CONSECUTIVE_LIMITS = 12;
export const MAX_TRANSIENT_RETRIES = 6;
export const MAX_ITEM_ATTEMPTS = 4;
export const MAX_SET_LOAD_ATTEMPTS = 4;
export const MAX_SET_NETWORK_RETRIES = 3;
export const REQUEST_TIMEOUT_MS = 30_000;

export const TOKEN_INVALID_MESSAGE =
  'Your token is invalid or expired. Use “Get from browser” to refresh it.';
export const SET_FULL_MESSAGE = 'Destination set is full';

export const GQL_MUTATION = `mutation ChangeEmoteInSet($id: ObjectID!, $action: ListItemAction!, $emote_id: ObjectID!, $name: String) {
  emoteSet(id: $id) {
    id
    emotes(id: $emote_id, action: $action, name: $name) {
      id
      name
      __typename
    }
    __typename
  }
}`;
