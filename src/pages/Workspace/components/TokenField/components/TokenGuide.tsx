import type { ReactNode } from 'react';

export const TokenGuide = (): ReactNode => (
  <details className="token-guide">
    <summary>How to get a token</summary>
    <ol>
      <li>
        Sign in at{' '}
        <a href="https://7tv.app" rel="noreferrer" target="_blank">
          7tv.app
        </a>
        .
      </li>
      <li>
        Open DevTools with <kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+
        <kbd>I</kbd>, then the <strong>Application</strong> tab.
      </li>
      <li>
        Under <strong>Local storage</strong> → <code>https://7tv.app</code>,
        copy the value of <code>7tv-token</code>. It starts with <code>ey</code>
        .
      </li>
    </ol>
    <p className="token-guide-note">
      Saved encrypted on this device. It is only ever sent to 7TV.
    </p>
  </details>
);
