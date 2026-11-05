import type { EditRequest } from '../types/ipc.js';
import type { EmoteOp, JobOptions, JobResult } from '../types/seventv.js';

import { parseSetId } from '../utils/parseSetId.js';
import { requireBearer } from '../utils/requireBearer.js';
import { CopyError } from './CopyError.js';
import { runOps } from './runOps.js';

/**
Removes, then renames, emotes in one set.
*/
export const editSet = async (
  req: EditRequest,
  opts: JobOptions = {}
): Promise<JobResult> => {
  const bearer = requireBearer(req.token);
  const emoteSetId = parseSetId(req.set);
  if (!emoteSetId) {
    throw new CopyError('Pick a set to edit.');
  }
  const removes: EmoteOp[] = req.removes.map((emote) => ({
    action: 'REMOVE',
    emote,
    label: `${emote.name} (remove)`,
  }));
  const renames: EmoteOp[] = req.renames
    .filter((r) => r.to.trim() && r.to.trim() !== r.from)
    .map((r) => ({
      action: 'UPDATE',
      emote: { id: r.id, name: r.to.trim() },
      label: `${r.from} → ${r.to.trim()}`,
    }));
  if (removes.length + renames.length === 0) {
    throw new CopyError('There are no changes to apply.');
  }
  opts.onLog?.(
    'info',
    `Removing ${removes.length} and renaming ${renames.length}…`
  );
  // Removals first so a rename can reuse a name that is being freed up.
  return runOps({ bearer, emoteSetId, phases: [removes, renames] }, opts);
};
