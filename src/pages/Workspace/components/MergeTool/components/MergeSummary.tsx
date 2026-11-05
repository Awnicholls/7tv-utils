import type { ReactNode } from 'react';

import type { MergePlan } from '../../../../../../electron/seventv/planMerge';
import type { MergeDestination } from '../../../../../../electron/types/ipc';
import type { DupeMode } from '../MergeTool.view';

interface MergeSummaryProps {
  capacity: null | number;
  destination: MergeDestination;
  dupeMode: DupeMode;
  overCapacity: number;
  plan: MergePlan;
  primaryName: string;
  secondaryName: string;
}

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

export const MergeSummary = ({
  capacity,
  destination,
  dupeMode,
  overCapacity,
  plan,
  primaryName,
  secondaryName,
}: MergeSummaryProps): ReactNode => {
  const included = plan.candidates.filter((c) => !c.excluded);
  const fromSecondary = included.filter((c) => c.from === 'secondary').length;
  const fromPrimary = included.length - fromSecondary;
  const leftOut = plan.candidates.length - included.length;
  const renamed = included.filter((c) => c.name.trim() !== c.emote.name).length;
  const count = (choice: string): number =>
    plan.conflicts.filter((c) => c.choice === choice).length;
  const removedFromPrimary =
    plan.overridden.length +
    plan.candidates.filter((c) => c.from === 'primary' && c.excluded).length;

  return (
    <div className="merge-summary">
      <p>
        <strong>{plural(plan.final.length, 'emote')}</strong> — {fromPrimary}{' '}
        from “{primaryName}”, {fromSecondary} from “{secondaryName}”.
        {plan.identical > 0 && ` ${plan.identical} already in both.`}
        {leftOut > 0 && ` ${leftOut} left out.`}
        {renamed > 0 && ` ${renamed} renamed.`}
      </p>
      {plan.conflicts.length > 0 && (
        <p className="hint">
          {plural(plan.conflicts.length, 'duplicate')}
          {dupeMode === 'auto'
            ? ' — the primary keeps each one.'
            : ` — ${count('primary')} primary, ${count('secondary')} secondary, ${count('both')} keep both.`}
        </p>
      )}
      {destination === 'primary' && removedFromPrimary > 0 && (
        <p className="hint">
          {plural(removedFromPrimary, 'emote')} will be taken out of “
          {primaryName}”.
        </p>
      )}
      {plan.errors > 0 && (
        <p className="hint warn">
          {plural(plan.errors, 'name')} to fix before merging.
        </p>
      )}
      {overCapacity > 0 && capacity !== null && (
        <p className="hint warn">
          That’s {overCapacity} over the {capacity}-emote limit. Leave{' '}
          {overCapacity} out below, or the last {overCapacity} won’t be added.
        </p>
      )}
    </div>
  );
};
