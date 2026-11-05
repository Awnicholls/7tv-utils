import { useState } from 'react';

import type { JobControls } from '../../../../hooks/useJob';
import type { CopyToolViewProps } from './CopyTool.view';

import { parseSetId } from '../../../../../electron/utils/parseSetId';
import { useSetLookup } from '../../../../hooks/useSetLookup';
import { describeSet } from '../../../../utils/describeSet';

export interface CopyToolProps {
  job: JobControls;
  onCancel: () => void;
}

export const useCopyTool = ({
  job,
  onCancel,
}: CopyToolProps): CopyToolViewProps => {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const sourceSet = useSetLookup();
  const targetSet = useSetLookup();

  const start = async (): Promise<void> => {
    const result = await job.run({ kind: 'copy', source, target }, 'copied');
    if (result) {
      void targetSet.lookup(target);
    }
  };

  return {
    busy: job.busy,
    canStart: Boolean(parseSetId(source) && parseSetId(target)),
    onCancel,
    onSourceBlur: () => void sourceSet.lookup(source),
    onSourceChange: setSource,
    onStart: () => void start(),
    onTargetBlur: () => void targetSet.lookup(target),
    onTargetChange: setTarget,
    preview: sourceSet.set,
    source,
    sourceHint: describeSet(sourceSet.state),
    target,
    targetHint: describeSet(targetSet.state),
  };
};
