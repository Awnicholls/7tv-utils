import type { ReactNode } from 'react';

import type { CopyFailure } from '../../../../electron/types/seventv';

import { VISIBLE_FAILURES } from '../../../constants';

export const FailureList = ({
  problems,
}: {
  problems: CopyFailure[];
}): ReactNode => (
  <details className="failures">
    <summary>{problems.length} not copied — show details</summary>
    <ul>
      {problems.slice(0, VISIBLE_FAILURES).map((f) => (
        <li key={`${f.name}-${f.error}`}>
          <code>{f.name}</code> — {f.error}
        </li>
      ))}
    </ul>
  </details>
);
