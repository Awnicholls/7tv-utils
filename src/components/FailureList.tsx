import type { ReactNode } from 'react';

import type { JobFailure } from '../../electron/types/seventv';

import { VISIBLE_FAILURES } from '../constants';

export const FailureList = ({
  problems,
}: {
  problems: JobFailure[];
}): ReactNode => (
  <details className="failures">
    <summary>{problems.length} not applied — show details</summary>
    <ul>
      {/* One emote can fail more than once, so its name isn't a unique key. */}
      {problems.slice(0, VISIBLE_FAILURES).map((f, i) => (
        <li key={`${i}-${f.name}`}>
          <code>{f.name}</code> — {f.error}
        </li>
      ))}
    </ul>
  </details>
);
