import type {
  EmoteEntry,
  EmoteOp,
  EmoteSet,
  JobFailure,
} from '../types/seventv.js';

export const addOp = (emote: EmoteEntry): EmoteOp => ({
  action: 'ADD',
  emote,
  label: emote.name,
});

export const planCopy = (
  source: EmoteSet,
  target: EmoteSet
): { ops: EmoteOp[]; skipped: JobFailure[] } => {
  const haveIds = new Set(target.emotes.map((e) => e.id));
  const haveNames = new Set(target.emotes.map((e) => e.name));
  const skipped: JobFailure[] = [];
  const ops: EmoteOp[] = [];
  for (const emote of source.emotes) {
    if (haveIds.has(emote.id)) {
      skipped.push({ error: 'Already in destination', name: emote.name });
    } else if (haveNames.has(emote.name)) {
      skipped.push({
        error: 'Destination has a different emote with this name',
        name: emote.name,
      });
    } else {
      ops.push(addOp(emote));
    }
  }
  return { ops, skipped };
};
