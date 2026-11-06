import { useState } from 'react';

import type { Account } from '../../../../../electron/types/seventv';
import type { JobControls } from '../../../../hooks/useJob';
import type { CloneToolViewProps } from './CloneTool.view';

import { parseSetId } from '../../../../../electron/utils/parseSetId';
import { SET_NAME_LIMIT } from '../../../../constants';
import { useSetLookup } from '../../../../hooks/useSetLookup';
import { describeSet } from '../../../../utils/describeSet';

export interface CloneToolProps {
  account: Account | null;
  job: JobControls;
  onCancel: () => void;
  onCreated: () => void;
}

export const useCloneTool = ({
  account,
  job,
  onCancel,
  onCreated,
}: CloneToolProps): CloneToolViewProps => {
  const [source, setSource] = useState('');
  // Until the user types a name, the new set takes the source set's name.
  const [customName, setCustomName] = useState<null | string>(null);
  const sourceSet = useSetLookup();
  const name = (customName ?? sourceSet.set?.name ?? '').slice(
    0,
    SET_NAME_LIMIT
  );

  const start = async (): Promise<void> => {
    const result = await job.run(
      { kind: 'clone', name, ownerId: account?.id, source },
      'copied'
    );
    if (result) {
      onCreated();
    }
  };

  return {
    busy: job.busy,
    canStart: Boolean(account && parseSetId(source) && name.trim()),
    name,
    nameHint: account
      ? `Created as a new set on ${account.displayName}’s account.`
      : 'Add a valid token to clone onto your account.',
    onCancel,
    onNameChange: setCustomName,
    onSourceBlur: () => void sourceSet.lookup(source),
    onSourceChange: setSource,
    onStart: () => void start(),
    preview: sourceSet.set,
    source,
    sourceHint: describeSet(sourceSet.state),
  };
};
