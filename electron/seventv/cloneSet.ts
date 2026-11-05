import type { CloneRequest } from '../types/ipc.js';
import type { JobOptions, JobResult } from '../types/seventv.js';

import { requireBearer } from '../utils/requireBearer.js';
import { tokenUserId } from '../utils/tokenUserId.js';
import { CopyError } from './CopyError.js';
import { createEmoteSet } from './createEmoteSet.js';
import { getEmoteSet } from './getEmoteSet.js';
import { addOp } from './planCopy.js';
import { runOps } from './runOps.js';

/**
Creates a new set on the token's account and fills it from `source`.
*/
export const cloneSet = async (
  req: CloneRequest,
  opts: JobOptions = {}
): Promise<JobResult> => {
  const log = opts.onLog;
  const bearer = requireBearer(req.token);
  const userId = tokenUserId(bearer);
  if (!userId) {
    throw new CopyError('That does not look like a 7TV token.');
  }

  log?.('info', 'Loading source set…');
  const source = await getEmoteSet(req.source, opts);
  if (source.emotes.length === 0) {
    throw new CopyError('The source set is empty.');
  }
  log?.('ok', `Found “${source.name}” with ${source.emotes.length} emotes.`);

  const created = await createEmoteSet(
    bearer,
    userId,
    req.name || source.name,
    opts
  );
  log?.('ok', `Created “${created.name}” on your account.`);
  if (created.capacity !== null && source.emotes.length > created.capacity) {
    log?.(
      'warn',
      `The new set holds ${created.capacity} emotes; the source has ${source.emotes.length}. Copying until it is full.`
    );
  }

  return runOps(
    { bearer, emoteSetId: created.id, phases: [source.emotes.map(addOp)] },
    opts
  );
};
