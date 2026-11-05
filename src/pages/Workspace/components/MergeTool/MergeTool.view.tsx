import type { ReactNode } from 'react';

import type { MergePlan } from '../../../../../electron/seventv/planMerge';
import type {
  DupeChoice,
  MergeDestination,
} from '../../../../../electron/types/ipc';
import type { Account } from '../../../../../electron/types/seventv';
import type { ConflictRow } from './components/ConflictTile';

import { JobActions } from '../../../../components/JobActions';
import { SetField } from '../../../../components/SetField';
import { SetSelect } from '../../../../components/SetSelect';
import { SET_NAME_LIMIT } from '../../../../constants';
import { ConflictList } from './components/ConflictList';
import { MergeSummary } from './components/MergeSummary';
import { TrimList, type TrimRow } from './components/TrimList';

export type DupeMode = 'ask' | 'auto';

export interface MergeToolViewProps {
  account: Account | null;
  busy: boolean;
  canStart: boolean;
  capacity: null | number;
  conflictRows: ConflictRow[];
  destination: MergeDestination;
  dupeMode: DupeMode;
  name: string;
  onCancel: () => void;
  onChoose: (secondaryName: string, choice: DupeChoice) => void;
  onChooseAll: (choice: DupeChoice) => void;
  onDestinationChange: (value: MergeDestination) => void;
  onDupeModeChange: (value: DupeMode) => void;
  onLeaveOut: (keys: string[], leaveOut: boolean) => void;
  onNameChange: (value: string) => void;
  onPrimaryChange: (setId: string) => void;
  onRename: (itemKey: string, value: string) => void;
  onSecondaryChange: (setId: string) => void;
  onStart: () => void;
  onSwap: () => void;
  onToggleExclude: (itemKey: string) => void;
  onTrimFilterChange: (value: string) => void;
  overCapacity: number;
  plan: MergePlan | null;
  primaryHint?: string;
  primaryId: string;
  primaryName: string;
  secondaryHint?: string;
  secondaryId: string;
  secondaryName: string;
  trimFilter: string;
  trimRows: TrimRow[];
}

export const MergeToolView = ({
  account,
  busy,
  canStart,
  capacity,
  conflictRows,
  destination,
  dupeMode,
  name,
  onCancel,
  onChoose,
  onChooseAll,
  onDestinationChange,
  onDupeModeChange,
  onLeaveOut,
  onNameChange,
  onPrimaryChange,
  onRename,
  onSecondaryChange,
  onStart,
  onSwap,
  onToggleExclude,
  onTrimFilterChange,
  overCapacity,
  plan,
  primaryHint,
  primaryId,
  primaryName,
  secondaryHint,
  secondaryId,
  secondaryName,
  trimFilter,
  trimRows,
}: MergeToolViewProps): ReactNode => (
  <>
    <div className="grid2 merge-pick">
      <SetSelect
        account={account}
        disabled={busy}
        exclude={[secondaryId]}
        hint={primaryHint ?? 'Wins duplicates by default.'}
        id="merge-primary"
        label="Primary"
        onChange={onPrimaryChange}
        value={primaryId}
      />
      <SetSelect
        account={account}
        disabled={busy}
        exclude={[primaryId]}
        hint={secondaryHint}
        id="merge-secondary"
        label="Secondary"
        onChange={onSecondaryChange}
        value={secondaryId}
      />
      <button
        aria-label="Swap primary and secondary"
        className="swap"
        disabled={busy || (!primaryId && !secondaryId)}
        onClick={onSwap}
        title="Swap"
        type="button"
      >
        ⇄
      </button>
    </div>

    <div className="grid2">
      <div className="field">
        <label htmlFor="merge-destination">Merge into</label>
        <select
          disabled={busy}
          id="merge-destination"
          onChange={(e) => {
            onDestinationChange(e.target.value as MergeDestination);
          }}
          value={destination}
        >
          <option value="new">A new set</option>
          <option value="primary">The primary set</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="merge-dupes">Duplicates</label>
        <select
          disabled={busy}
          id="merge-dupes"
          onChange={(e) => {
            onDupeModeChange(e.target.value as DupeMode);
          }}
          value={dupeMode}
        >
          <option value="auto">Auto — primary wins</option>
          <option value="ask">Ask me — pick, or keep both</option>
        </select>
      </div>
    </div>

    {destination === 'new' && (
      <SetField
        disabled={busy}
        id="merge-name"
        label="New set name"
        maxLength={SET_NAME_LIMIT}
        onChange={onNameChange}
        placeholder="Name for the merged set"
        value={name}
      />
    )}

    {plan && (
      <MergeSummary
        capacity={capacity}
        destination={destination}
        dupeMode={dupeMode}
        overCapacity={overCapacity}
        plan={plan}
        primaryName={primaryName}
        secondaryName={secondaryName}
      />
    )}

    {dupeMode === 'ask' && conflictRows.length > 0 && (
      <ConflictList
        disabled={busy}
        onChoose={onChoose}
        onChooseAll={onChooseAll}
        onRename={onRename}
        primaryName={primaryName}
        rows={conflictRows}
        secondaryName={secondaryName}
      />
    )}

    {plan && (
      <TrimList
        capacity={capacity}
        count={plan.final.length}
        disabled={busy}
        filter={trimFilter}
        leftOut={plan.candidates.filter((c) => c.excluded).length}
        onFilterChange={onTrimFilterChange}
        onLeaveOut={onLeaveOut}
        onRename={onRename}
        onToggleExclude={onToggleExclude}
        overCapacity={overCapacity}
        primaryName={primaryName}
        rows={trimRows}
        secondaryName={secondaryName}
      />
    )}

    <JobActions
      busy={busy}
      disabled={!canStart}
      label={destination === 'new' ? 'Create merged set' : 'Merge into primary'}
      onCancel={onCancel}
      onStart={onStart}
    />
  </>
);
