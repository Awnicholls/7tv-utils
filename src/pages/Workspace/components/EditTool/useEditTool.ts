import { useCallback, useState } from 'react';

import type { EmoteRename } from '../../../../../electron/types/ipc';
import type {
  Account,
  EmoteEntry,
} from '../../../../../electron/types/seventv';
import type { JobControls } from '../../../../hooks/useJob';
import type { EditRow, EditToolViewProps } from './EditTool.view';

import { useSetLookup } from '../../../../hooks/useSetLookup';
import { compareNames } from '../../../../utils/byName';
import { describeSet } from '../../../../utils/describeSet';

export interface EditToolProps {
  account: Account | null;
  /**
  A set to open straight away, e.g. one a clone or merge just made.
  */
  initialSetId?: string;
  job: JobControls;
  onCancel: () => void;
}

interface Draft {
  name?: string;
  removed?: boolean;
}

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
Pending edits checked against each other, so they can be applied safely.
*/
const buildRows = (
  emotes: EmoteEntry[],
  drafts: Partial<Record<string, Draft>>
): EditRow[] => {
  const finalName = (e: EmoteEntry): string =>
    (drafts[e.name]?.name ?? e.name).trim();
  const counts = new Map<string, number>();
  for (const e of emotes) {
    if (drafts[e.name]?.removed) {
      continue;
    }

    const key = finalName(e);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return emotes.map((emote) => {
    const name = drafts[emote.name]?.name ?? emote.name;
    const removed = Boolean(drafts[emote.name]?.removed);
    const trimmed = name.trim();
    return {
      emote,
      error: removed
        ? undefined
        : nameError(trimmed, (counts.get(trimmed) ?? 0) > 1),
      name,
      removed,
      renamed: !removed && trimmed !== emote.name,
    };
  });
};

export const useEditTool = ({
  account,
  initialSetId = '',
  job,
  onCancel,
}: EditToolProps): EditToolViewProps => {
  const [pickedId, setPickedId] = useState(initialSetId);
  const [drafts, setDrafts] = useState<Partial<Record<string, Draft>>>({});
  const [filter, setFilter] = useState('');
  const lookup = useSetLookup(initialSetId);
  const emotes = lookup.set?.emotes ?? [];

  // Sorted by the name as loaded, so a tile doesn't jump while being renamed.
  const rows = buildRows(emotes, drafts).toSorted((a, b) =>
    compareNames(a.emote.name, b.emote.name)
  );
  const removes = rows.filter((r) => r.removed).map((r) => r.emote);
  const renames: EmoteRename[] = rows
    .filter((r) => r.renamed)
    .map((r) => ({ from: r.emote.name, id: r.emote.id, to: r.name.trim() }));
  const errors = rows.filter((r) => r.error).length;
  const changes = removes.length + renames.length;

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? rows.filter(
        (r) =>
          r.emote.name.toLowerCase().includes(needle) ||
          r.name.toLowerCase().includes(needle)
      )
    : rows;

  // Drafts are keyed by the emote's name in the set as loaded: unlike its
  // id, that is unique within a set. The callbacks are stable so unchanged
  // rows skip re-rendering on each keystroke.
  const patch = useCallback(
    (key: string, next: (draft: Draft) => Draft): void => {
      setDrafts((prev) => ({ ...prev, [key]: next(prev[key] ?? {}) }));
    },
    []
  );
  const rename = useCallback(
    (key: string, value: string) => {
      patch(key, (d) => ({ ...d, name: value }));
    },
    [patch]
  );
  const toggleRemove = useCallback(
    (key: string) => {
      patch(key, (d) => ({ ...d, removed: !d.removed }));
    },
    [patch]
  );

  const start = async (): Promise<void> => {
    const result = await job.run(
      { kind: 'edit', removes, renames, set: pickedId },
      'changed'
    );
    if (result) {
      setDrafts({});
      void lookup.lookup(pickedId);
    }
  };

  const label =
    changes > 0
      ? `Apply ${changes} change${changes === 1 ? '' : 's'}`
      : 'No changes yet';

  return {
    account,
    busy: job.busy,
    canStart: changes > 0 && errors === 0,
    errors,
    filter,
    label,
    onCancel,
    onFilterChange: setFilter,
    onPickSet: (id) => {
      setPickedId(id);
      setDrafts({});
      setFilter('');
      void lookup.lookup(id);
    },
    onRename: rename,
    onReset: () => {
      setDrafts({});
    },
    onStart: () => void start(),
    onToggleRemove: toggleRemove,
    pickedHint: describeSet(lookup.state),
    pickedId,
    pickedName: lookup.set?.name,
    rows: visible,
    summary:
      changes > 0
        ? `${removes.length} to remove · ${renames.length} to rename`
        : '',
    total: emotes.length,
  };
};
