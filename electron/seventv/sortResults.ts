import type { BatchOutcome, GqlError, QueueItem } from '../types/copier.js';

import { maxNullable } from '../utils/maxNullable.js';
import { classifyErrors } from './classifyErrors.js';
import {
  MAX_ITEM_ATTEMPTS,
  SET_FULL_MESSAGE,
  TOKEN_INVALID_MESSAGE,
} from './constants.js';
import { CopyError } from './CopyError.js';
import { resetFromGqlErrors } from './rateHeaders.js';

const sortError = (
  out: BatchOutcome,
  item: QueueItem,
  errors: GqlError[]
): void => {
  const name = item.op.label;
  const message = errors.map((e) => e.message ?? 'Unknown error').join('; ');
  switch (classifyErrors(errors)) {
    case 'auth': {
      throw new CopyError(TOKEN_INVALID_MESSAGE);
    }
    case 'capacity': {
      out.full = true;
      out.failed.push({ error: SET_FULL_MESSAGE, name });
      return;
    }
    case 'conflict': {
      // Adding something that is already there is harmless; a rename that
      // collides with another emote's name is a real failure.
      (item.op.action === 'ADD' ? out.skipped : out.failed).push({
        error: message,
        name,
      });
      return;
    }
    case 'forbidden': {
      out.forbidden += 1;
      out.failed.push({ error: message, name });
      return;
    }
    case 'other': {
      out.failed.push({ error: message, name });
      return;
    }
    case 'rate': {
      out.limited = true;
      out.limitReset = maxNullable(out.limitReset, resetFromGqlErrors(errors));
      out.retry.push(item);
      return;
    }
    case 'transient': {
      item.attempts += 1;
      if (item.attempts >= MAX_ITEM_ATTEMPTS) {
        out.failed.push({ error: message, name });
      } else {
        out.retry.push(item);
      }
      return;
    }
  }
};

export const sortResults = (
  batch: QueueItem[],
  results: unknown[]
): BatchOutcome => {
  const out: BatchOutcome = {
    applied: 0,
    failed: [],
    forbidden: 0,
    full: false,
    limited: false,
    limitReset: null,
    retry: [],
    skipped: [],
  };
  for (const [i, item] of batch.entries()) {
    const errors = (results[i] as { errors?: GqlError[] } | undefined)?.errors;
    if (!errors || errors.length === 0) {
      out.applied += 1;
    } else {
      sortError(out, item, errors);
    }
  }
  return out;
};
