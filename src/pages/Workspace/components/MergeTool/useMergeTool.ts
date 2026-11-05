import { useCallback, useState } from 'react';

import type {
  DupeChoice,
  DupeChoices,
  MergeDestination,
} from '../../../../../electron/types/ipc';
import type { Account } from '../../../../../electron/types/seventv';
import type { JobControls } from '../../../../hooks/useJob';
import type { ConflictRow } from './components/ConflictTile';
import type { TrimRow } from './components/TrimList';
import type { DupeMode, MergeToolViewProps } from './MergeTool.view';

import {
  candidateKey,
  planMerge,
} from '../../../../../electron/seventv/planMerge';
import { SET_NAME_LIMIT } from '../../../../constants';
import { useSetLookup } from '../../../../hooks/useSetLookup';
import { compareNames } from '../../../../utils/byName';
import { describeSet } from '../../../../utils/describeSet';

export interface MergeToolProps {
  account: Account | null;
  job: JobControls;
  onCancel: () => void;
  onCreated: () => void;
}

export const useMergeTool = ({
  account,
  job,
  onCancel,
  onCreated,
}: MergeToolProps): MergeToolViewProps => {
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const [destination, setDestination] = useState<MergeDestination>('new');
  const [dupeMode, setDupeMode] = useState<DupeMode>('auto');
  const [choices, setChoices] = useState<DupeChoices>({});
  const [customName, setCustomName] = useState<null | string>(null);
  // Candidate keys the user is leaving out, usually to fit under the limit.
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  // New names typed in the grids, keyed by candidate key.
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [trimFilter, setTrimFilter] = useState('');
  const primary = useSetLookup();
  const secondary = useSetLookup();

  const effectiveChoices = dupeMode === 'ask' ? choices : {};
  const plan =
    primary.set && secondary.set && primary.set.id !== secondary.set.id
      ? planMerge(primary.set.emotes, secondary.set.emotes, {
          choices: effectiveChoices,
          exclude: [...excluded],
          renames,
        })
      : null;
  const defaultName =
    primary.set && secondary.set
      ? `${primary.set.name} + ${secondary.set.name}`
      : '';
  const name = (customName ?? defaultName).slice(0, SET_NAME_LIMIT);
  // A new set gets the account's usual slot count, so the primary's
  // capacity is the best guess for either destination.
  const capacity = primary.set?.capacity ?? null;
  const overCapacity =
    plan && capacity !== null ? plan.final.length - capacity : 0;

  const byKey = new Map((plan?.candidates ?? []).map((c) => [c.key, c]));
  const conflictRows: ConflictRow[] = (plan?.conflicts ?? [])
    .map((c) => {
      const secondaryKey = candidateKey('secondary', c.secondary.name);
      const kept = byKey.get(secondaryKey);
      return {
        choice: c.choice,
        error: c.choice === 'both' ? kept?.error : undefined,
        name: c.secondary.name,
        newName: kept?.name ?? c.secondary.name,
        primaryId: c.primary.id,
        secondaryId: c.secondary.id,
        secondaryKey,
      };
    })
    .toSorted((a, b) => compareNames(a.name, b.name));

  // Sorted by the original name so a tile doesn't jump while being renamed.
  const needle = trimFilter.trim().toLowerCase();
  const trimRows: TrimRow[] = (plan?.candidates ?? [])
    .filter(
      (c) =>
        !needle ||
        c.emote.name.toLowerCase().includes(needle) ||
        c.name.toLowerCase().includes(needle)
    )
    .map((c) => ({
      emoteId: c.emote.id,
      error: c.error,
      excluded: c.excluded,
      from: c.from,
      key: c.key,
      name: c.name,
      originalName: c.emote.name,
    }))
    .toSorted(
      (a, b) =>
        compareNames(a.originalName, b.originalName) ||
        a.from.localeCompare(b.from)
    );

  // Stable callbacks let unchanged tiles skip re-rendering on each click.
  const setExcludedFor = useCallback(
    (keys: string[], leaveOut: boolean): void => {
      setExcluded((prev) => {
        const next = new Set(prev);
        for (const key of keys) {
          if (leaveOut) {
            next.add(key);
          } else {
            next.delete(key);
          }
        }
        return next;
      });
    },
    []
  );
  const toggleExclude = useCallback((key: string): void => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }, []);
  const rename = useCallback((key: string, value: string): void => {
    setRenames((prev) => ({ ...prev, [key]: value }));
  }, []);
  const choose = useCallback(
    (secondaryName: string, choice: DupeChoice): void => {
      setChoices((prev) => ({ ...prev, [secondaryName]: choice }));
    },
    []
  );

  const resetPicks = (): void => {
    setChoices({});
    setExcluded(new Set());
    setRenames({});
    setTrimFilter('');
  };

  const pickPrimary = (id: string): void => {
    setPrimaryId(id);
    resetPicks();
    void primary.lookup(id);
  };
  const pickSecondary = (id: string): void => {
    setSecondaryId(id);
    resetPicks();
    void secondary.lookup(id);
  };

  const start = async (): Promise<void> => {
    const result = await job.run(
      {
        choices: effectiveChoices,
        destination,
        exclude: [...excluded],
        kind: 'merge',
        name,
        primary: primaryId,
        renames,
        secondary: secondaryId,
      },
      'changed'
    );
    if (!result) {
      return;
    }
    if (destination === 'primary') {
      resetPicks();
      void primary.lookup(primaryId);
    } else {
      onCreated();
    }
  };

  return {
    account,
    busy: job.busy,
    canStart: Boolean(
      plan &&
      plan.final.length > 0 &&
      plan.errors === 0 &&
      (destination === 'primary' || name.trim())
    ),
    capacity,
    conflictRows,
    destination,
    dupeMode,
    name,
    onCancel,
    onChoose: choose,
    onChooseAll: (choice) => {
      setChoices(
        Object.fromEntries(conflictRows.map((row) => [row.name, choice]))
      );
    },
    onDestinationChange: setDestination,
    onDupeModeChange: setDupeMode,
    onLeaveOut: setExcludedFor,
    onNameChange: setCustomName,
    onPrimaryChange: pickPrimary,
    onRename: rename,
    onSecondaryChange: pickSecondary,
    onStart: () => void start(),
    onSwap: () => {
      const [p, s] = [primaryId, secondaryId];
      pickPrimary(s);
      pickSecondary(p);
    },
    onToggleExclude: toggleExclude,
    onTrimFilterChange: setTrimFilter,
    overCapacity,
    plan,
    primaryHint: describeSet(primary.state),
    primaryId,
    primaryName: primary.set?.name ?? 'primary',
    secondaryHint: describeSet(secondary.state),
    secondaryId,
    secondaryName: secondary.set?.name ?? 'secondary',
    trimFilter,
    trimRows,
  };
};
