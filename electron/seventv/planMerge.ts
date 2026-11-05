import type { DupeChoice, DupeChoices } from '../types/ipc.js';
import type { EmoteEntry } from '../types/seventv.js';

/**
 * An emote that could go into the merged set. `key` is unique across both
 * sets (names are unique within one set, but the same emote id can appear
 * under several names), and `name` is the name it will be added under.
 */
export interface MergeCandidate {
  emote: EmoteEntry;
  error?: string;
  excluded: boolean;
  from: MergeSide;
  key: string;
  name: string;
}

/**
A secondary emote whose name the primary already uses for another emote.
*/
export interface MergeConflict {
  choice: DupeChoice;
  primary: EmoteEntry;
  secondary: EmoteEntry;
}

export interface MergeOptions {
  /**
  How each duplicate is settled, keyed by the secondary emote's name.
  */
  choices?: DupeChoices;
  /**
  Candidate keys to leave out.
  */
  exclude?: readonly string[];
  /**
  New names, keyed by candidate key.
  */
  renames?: Readonly<Record<string, string>>;
}

export interface MergePlan {
  /**
  Every emote that could go in, primary first, before any are left out.
  */
  candidates: MergeCandidate[];
  conflicts: MergeConflict[];
  /**
  Included candidates whose names still need fixing.
  */
  errors: number;
  /**
  Exactly what the merged set will hold, under the names it will have.
  */
  final: EmoteEntry[];
  /**
  Exactly the same emote under the same name in both sets.
  */
  identical: number;
  /**
  Primary emotes dropped because a secondary emote won a duplicate.
  */
  overridden: EmoteEntry[];
}

export type MergeSide = 'primary' | 'secondary';

export const candidateKey = (from: MergeSide, name: string): string =>
  `${from === 'primary' ? 'p' : 's'}:${name}`;

const nameError = (name: string, taken: boolean): string | undefined => {
  if (!name) {
    return 'Name can’t be empty';
  }
  if (/\s/.test(name)) {
    return 'No spaces';
  }
  return taken ? 'Name already used' : undefined;
};

/**
 * `name2`, `name3`, … — the first that nothing else uses. Names already
 * ending in a digit get an underscore (`Pog2_2`) so the number stays clear.
 */
const freeName = (base: string, taken: Set<string>): string => {
  const stem = /\d$/.test(base) ? `${base}_` : base;
  let n = 2;
  while (taken.has(`${stem}${n}`)) {
    n += 1;
  }
  return `${stem}${n}`;
};

/**
 * Works out the merge of two sets. Two emotes are duplicates when they share
 * a name. Each duplicate keeps the primary unless its choice says to keep
 * the secondary instead, or both (the secondary then gets a new name).
 */
export const planMerge = (
  primary: EmoteEntry[],
  secondary: EmoteEntry[],
  { choices = {}, exclude = [], renames = {} }: MergeOptions = {}
): MergePlan => {
  const byName = new Map(primary.map((e) => [e.name, e]));
  const conflicts: MergeConflict[] = [];
  const added: EmoteEntry[] = [];
  const keepBoth = new Set<EmoteEntry>();
  const overridden = new Set<EmoteEntry>();
  let identical = 0;

  for (const emote of secondary) {
    const clash = byName.get(emote.name);
    if (!clash) {
      added.push(emote);
      continue;
    }
    if (clash.id === emote.id) {
      identical += 1;
      continue;
    }
    const choice = choices[emote.name] ?? 'primary';
    conflicts.push({ choice, primary: clash, secondary: emote });
    if (choice === 'secondary') {
      added.push(emote);
      overridden.add(clash);
    } else if (choice === 'both') {
      added.push(emote);
      keepBoth.add(emote);
    }
  }

  const skip = new Set(exclude);
  const toCandidate = (emote: EmoteEntry, from: MergeSide): MergeCandidate => {
    const key = candidateKey(from, emote.name);
    return {
      emote,
      excluded: skip.has(key),
      from,
      key,
      name: renames[key] ?? emote.name,
    };
  };
  const candidates = [
    ...primary
      .filter((e) => !overridden.has(e))
      .map((e) => toCandidate(e, 'primary')),
    ...added.map((e) => toCandidate(e, 'secondary')),
  ];

  // A secondary kept alongside its primary needs a new name; suggest one
  // until the user types their own.
  const taken = new Set([
    ...candidates.map((c) => c.emote.name),
    ...Object.values(renames),
  ]);
  for (const c of candidates) {
    if (!keepBoth.has(c.emote) || Object.hasOwn(renames, c.key)) {
      continue;
    }

    c.name = freeName(c.emote.name, taken);
    taken.add(c.name);
  }

  const included = candidates.filter((c) => !c.excluded);
  const counts = new Map<string, number>();
  for (const c of included) {
    const name = c.name.trim();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const c of included) {
    const name = c.name.trim();
    c.error = nameError(name, (counts.get(name) ?? 0) > 1);
  }

  return {
    candidates,
    conflicts,
    errors: included.filter((c) => c.error).length,
    final: included.map((c) => ({ id: c.emote.id, name: c.name.trim() })),
    identical,
    overridden: [...overridden],
  };
};
