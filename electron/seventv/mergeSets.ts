import type { MergeRequest } from '../types/ipc.js';
import type { EmoteOp, JobOptions, JobResult } from '../types/seventv.js';

import { parseSetId } from '../utils/parseSetId.js';
import { requireBearer } from '../utils/requireBearer.js';
import { resolveOwner } from '../utils/resolveOwner.js';
import { CopyError } from './CopyError.js';
import { createEmoteSet } from './createEmoteSet.js';
import { getEmoteSet } from './getEmoteSet.js';
import { addOp } from './planCopy.js';
import { planMerge } from './planMerge.js';
import { runOps } from './runOps.js';

/**
 * Merges two sets, primary winning duplicates unless the request's choices
 * say otherwise. Either fills a brand-new set or edits the primary in place.
 */
export const mergeSets = async (
  req: MergeRequest,
  opts: JobOptions = {}
): Promise<JobResult> => {
  const log = opts.onLog;
  const bearer = requireBearer(req.token);
  if (parseSetId(req.primary) === parseSetId(req.secondary)) {
    throw new CopyError('Pick two different sets to merge.');
  }

  log?.('info', 'Loading both sets…');
  const primary = await getEmoteSet(req.primary, { ...opts, bearer });
  const secondary = await getEmoteSet(req.secondary, { ...opts, bearer });
  const plan = planMerge(primary.emotes, secondary.emotes, {
    choices: req.choices,
    exclude: req.exclude,
    renames: req.renames,
  });
  if (plan.errors > 0) {
    throw new CopyError(
      `${plan.errors} emote name${plan.errors === 1 ? '' : 's'} in the merge need fixing first.`
    );
  }
  const included = plan.candidates.filter((c) => !c.excluded);
  const fromSecondary = included.filter((c) => c.from === 'secondary');
  log?.(
    'ok',
    `Merging ${included.length - fromSecondary.length} from “${primary.name}” with ${fromSecondary.length} from “${secondary.name}” (${plan.conflicts.length} duplicates, ${plan.candidates.length - included.length} left out).`
  );

  if (req.destination === 'primary') {
    // Make room first, then rename what stays, then add the rest, so every
    // step's names and slots are free when it runs.
    const removes: EmoteOp[] = [
      ...plan.overridden.map((emote) => ({
        action: 'REMOVE' as const,
        emote,
        label: `${emote.name} (replaced)`,
      })),
      ...plan.candidates
        .filter((c) => c.from === 'primary' && c.excluded)
        .map(({ emote }) => ({
          action: 'REMOVE' as const,
          emote,
          label: `${emote.name} (left out)`,
        })),
    ];
    const renames: EmoteOp[] = included
      .filter((c) => c.from === 'primary' && c.name.trim() !== c.emote.name)
      .map((c) => ({
        action: 'UPDATE' as const,
        emote: { id: c.emote.id, name: c.name.trim() },
        label: `${c.emote.name} → ${c.name.trim()}`,
      }));
    const adds = fromSecondary.map((c) =>
      addOp({ id: c.emote.id, name: c.name.trim() })
    );
    if (removes.length + renames.length + adds.length === 0) {
      log?.('info', `Nothing to change in “${primary.name}”.`);
    }
    if (primary.capacity !== null && plan.final.length > primary.capacity) {
      log?.(
        'warn',
        `“${primary.name}” holds ${primary.capacity} emotes; the merge needs ${plan.final.length}. Adding until it is full.`
      );
    }
    return runOps(
      { bearer, emoteSetId: primary.id, phases: [removes, renames, adds] },
      opts
    );
  }

  const userId = resolveOwner(req.ownerId, bearer);
  const created = await createEmoteSet(
    bearer,
    userId,
    req.name || `${primary.name} + ${secondary.name}`,
    opts
  );
  log?.('ok', `Created “${created.name}” on your account.`);
  if (created.capacity !== null && plan.final.length > created.capacity) {
    log?.(
      'warn',
      `The new set holds ${created.capacity} emotes; the merge has ${plan.final.length}. Adding until it is full.`
    );
  }
  return runOps(
    { bearer, emoteSetId: created.id, phases: [plan.final.map(addOp)] },
    opts
  );
};
