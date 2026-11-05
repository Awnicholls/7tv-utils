import type { EmoteSet, JobOptions, JobResult } from '../types/seventv.js';

import { parseSetId } from '../utils/parseSetId.js';
import { requireBearer } from '../utils/requireBearer.js';
import { CopyError } from './CopyError.js';
import { getEmoteSet } from './getEmoteSet.js';
import { planCopy } from './planCopy.js';
import { runOps } from './runOps.js';

/**
Adds every emote from `source` that `target` doesn't already have.
*/
export const copyEmotes = async (
  source: EmoteSet,
  targetInput: string,
  token: string,
  opts: JobOptions = {}
): Promise<JobResult> => {
  const targetId = parseSetId(targetInput);
  if (!targetId) {
    throw new CopyError('Enter a destination emote set.');
  }
  if (targetId === source.id) {
    throw new CopyError('Source and destination are the same set.');
  }
  const bearer = requireBearer(token);
  const target = await getEmoteSet(targetId, opts);
  const { ops, skipped } = planCopy(source, target);

  if (skipped.length > 0) {
    opts.onLog?.(
      'info',
      `Skipping ${skipped.length} already in “${target.name}”.`
    );
  }
  if (target.capacity !== null) {
    const free = target.capacity - target.emotes.length;
    if (ops.length > free) {
      opts.onLog?.(
        'warn',
        `“${target.name}” has ${Math.max(free, 0)} free slots for ${ops.length} emotes. Copying until it is full.`
      );
    }
  }

  return runOps(
    { bearer, emoteSetId: target.id, phases: [ops], skipped },
    opts
  );
};
