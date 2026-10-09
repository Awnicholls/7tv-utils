import type { QueueItem } from '../types/copier.js';
import type { CopyFailure, EmoteSet } from '../types/seventv.js';

export const planCopy = (
  source: EmoteSet,
  target: EmoteSet
): { queue: QueueItem[]; skipped: CopyFailure[] } => {
  const haveIds = new Set(target.emotes.map((e) => e.id));
  const haveNames = new Set(target.emotes.map((e) => e.name));
  const skipped: CopyFailure[] = [];
  const queue: QueueItem[] = [];
  for (const emote of source.emotes) {
    if (haveIds.has(emote.id)) {
      skipped.push({ error: 'Already in destination', name: emote.name });
    } else if (haveNames.has(emote.name)) {
      skipped.push({
        error: 'Destination has a different emote with this name',
        name: emote.name,
      });
    } else {
      queue.push({ attempts: 0, emote });
    }
  }
  return { queue, skipped };
};
