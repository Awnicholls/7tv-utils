import type { ReactNode } from 'react';

import type { LogLine } from '../types/copier';

import { VISIBLE_LOG_LINES } from '../constants';

export const LogConsole = ({ lines }: { lines: LogLine[] }): ReactNode => (
  <div aria-label="Log" className="console">
    {lines.slice(-VISIBLE_LOG_LINES).map((l) => (
      <p className={`line ${l.kind}`} key={l.id}>
        {l.text}
      </p>
    ))}
  </div>
);
