import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { BridgeApi, CopyEvent } from '../shared/ipc';
import type {
  CopyFailure,
  CopyProgress,
  EmoteSet,
  LogKind,
} from '../shared/seventv';

import { normalizeToken, parseSetId } from '../shared/seventv';

interface LogLine {
  id: number;
  kind: LogKind;
  text: string;
}
type Phase = 'copying' | 'done' | 'error' | 'idle';
type SetState =
  | { error: string; status: 'error' }
  | { set: EmoteSet; status: 'ok' }
  | { status: 'idle' }
  | { status: 'loading' };

/**
 * The preload bridge. Read lazily so a late-loading preload is still found.
 */
const getApi = (): BridgeApi | undefined => globalThis.api;
const BRIDGE_MISSING = navigator.userAgent.includes('Electron/')
  ? 'The app bridge failed to load. Check dev.log or the terminal for a [preload] error.'
  : 'This is the browser preview. Use the “7TV Emote Copier” window that yarn dev opens.';

export default function App(): ReactNode {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [sourceSet, setSourceSet] = useState<SetState>({ status: 'idle' });
  const [targetSet, setTargetSet] = useState<SetState>({ status: 'idle' });

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenNote, setTokenNote] = useState('');

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<CopyProgress | null>(null);
  const [summary, setSummary] = useState('');
  const [problems, setProblems] = useState<CopyFailure[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const now = useNow(progress?.phase === 'waiting');

  const busy = phase === 'copying';
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  const push = (kind: LogKind, text: string): void => {
    setLog((l) => appendLog(l, kind, text));
  };

  // Load the saved token once.
  useEffect(() => {
    void getApi()
      ?.loadToken()
      .then((t) => {
        if (!t) {
          return;
        }

        setToken(t);
        setTokenNote(describeToken(t));
      });
  }, []);

  // Stream progress and log lines from the main process.
  useEffect(
    () =>
      getApi()?.onCopyEvent((e: CopyEvent) => {
        if (e.type === 'progress') {
          setProgress(e.progress);
        } else {
          setLog((l) => appendLog(l, e.kind, e.text));
        }
      }),
    []
  );

  // Persist manual token edits (debounced).
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function onTokenChange(v: string): void {
    setToken(v);
    setTokenNote(v.trim() ? describeToken(v) : '');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void getApi()?.saveToken(normalizeToken(v));
    }, 400);
  }

  async function forget(): Promise<void> {
    await getApi()?.forgetToken();
    setToken('');
    setTokenNote('Token removed from this device.');
  }

  async function lookup(
    input: string,
    set: (s: SetState) => void
  ): Promise<void> {
    const api = getApi();
    if (!api || !parseSetId(input)) {
      set({ status: 'idle' });
      return;
    }
    set({ status: 'loading' });
    const res = await api.loadSet(input);
    set(
      res.ok
        ? { set: res.value, status: 'ok' }
        : { error: res.error, status: 'error' }
    );
  }

  async function start(): Promise<void> {
    if (busy) {
      return;
    }
    const api = getApi();
    if (!api) {
      setPhase('error');
      setSummary(BRIDGE_MISSING);
      return;
    }
    if (!parseSetId(source)) {
      setPhase('error');
      setSummary('Enter a source emote set.');
      return;
    }
    setProblems([]);
    setSummary('');
    setProgress(null);
    setPhase('copying');

    const res = await api.startCopy({
      source,
      target,
      token: normalizeToken(token),
    });

    if (!res.ok) {
      setPhase(res.cancelled ? 'idle' : 'error');
      setSummary(res.error);
      push(res.cancelled ? 'info' : 'err', res.error);
      return;
    }
    const { copied, failed, skipped, stoppedReason } = res.value;
    setProblems([...failed, ...skipped]);
    const parts = [`${copied} copied`];
    if (skipped.length > 0) {
      parts.push(`${skipped.length} skipped`);
    }
    if (failed.length > 0) {
      parts.push(`${failed.length} failed`);
    }
    const msg = `${stoppedReason ? `${stoppedReason} ` : 'Done. '}${parts.join(' · ')}.`;
    setPhase(failed.length > 0 ? 'error' : 'done');
    setSummary(msg);
    push(failed.length > 0 ? 'warn' : 'ok', msg);
    void lookup(target, setTargetSet);
  }

  const preview = sourceSet.status === 'ok' ? sourceSet.set : null;

  return (
    <div className="page">
      <main className="shell">
        <h1 className="hero">Copy any 7TV set.</h1>

        <section aria-label="Emote copier" className="card">
          <div className="grid2">
            <Field
              disabled={busy}
              hint={describeSet(sourceSet)}
              label="Source"
              onBlur={() => void lookup(source, setSourceSet)}
              onChange={setSource}
              placeholder="Set ID or 7tv.app URL"
              value={source}
            />
            <Field
              disabled={busy}
              hint={describeSet(targetSet)}
              label="Destination"
              onBlur={() => void lookup(target, setTargetSet)}
              onChange={setTarget}
              placeholder="Your set ID or URL"
              value={target}
            />
          </div>

          <div className="field">
            <div className="row">
              <label htmlFor="token">Token</label>
              <span className="row-links">
                {token && (
                  <button
                    className="link muted"
                    disabled={busy}
                    onClick={() => void forget()}
                    type="button"
                  >
                    Forget
                  </button>
                )}
                <button
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                  className="link"
                  onClick={() => {
                    setShowToken((s) => !s);
                  }}
                  type="button"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </span>
            </div>
            <input
              autoComplete="off"
              disabled={busy}
              id="token"
              onChange={(e) => {
                onTokenChange(e.target.value);
              }}
              placeholder="Paste your 7TV token"
              spellCheck={false}
              type={showToken ? 'text' : 'password'}
              value={token}
            />
            {tokenNote && <p className="hint">{tokenNote}</p>}
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
                  Open DevTools with <kbd>F12</kbd> or <kbd>Ctrl</kbd>+
                  <kbd>Shift</kbd>+<kbd>I</kbd>, then the{' '}
                  <strong>Application</strong> tab.
                </li>
                <li>
                  Under <strong>Local storage</strong> →{' '}
                  <code>https://7tv.app</code>, copy the value of{' '}
                  <code>7tv-token</code>. It starts with <code>ey</code>.
                </li>
              </ol>
              <p className="token-guide-note">
                Saved encrypted on this device. It is only ever sent to 7TV.
              </p>
            </details>
          </div>

          {(busy || progress) && (
            <div className="progress" role="status">
              <div className="row">
                <span className="status-text">
                  {statusText(progress, busy, now)}
                </span>
                <span className="value">{pct}%</span>
              </div>
              <div className="bar">
                <div
                  className={`fill ${progress?.phase === 'waiting' ? 'paused' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {progress && (
                <p className="hint">
                  {progress.copied} copied · {progress.skipped} skipped ·{' '}
                  {progress.failed} failed · {progress.total} total
                </p>
              )}
            </div>
          )}

          {summary && (
            <p
              className={`summary ${phase === 'error' ? 'err' : phase === 'done' ? 'ok' : ''}`}
            >
              {summary}
            </p>
          )}

          <div className="actions">
            {busy ? (
              <button
                className="btn danger"
                onClick={() => void getApi()?.cancelCopy()}
                type="button"
              >
                Cancel
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={() => void start()}
                type="button"
              >
                Start copying
              </button>
            )}
            <p className="hint pace-note">
              Pacing is automatic and backs off if 7TV rate limits.
            </p>
          </div>

          {preview && preview.emotes.length > 0 && (
            <div className="preview">
              <p className="preview-title">
                Source preview · first {Math.min(24, preview.emotes.length)}
              </p>
              <div className="chips">
                {preview.emotes.slice(0, 24).map((e) => (
                  <span className="chip" key={e.id} title={e.id}>
                    {e.name}
                  </span>
                ))}
                {preview.emotes.length > 24 && (
                  <span className="chip more">
                    +{preview.emotes.length - 24} more
                  </span>
                )}
              </div>
            </div>
          )}

          {problems.length > 0 && (
            <details className="failures">
              <summary>{problems.length} not copied — show details</summary>
              <ul>
                {problems.slice(0, 100).map((f) => (
                  <li key={`${f.name}-${f.error}`}>
                    <code>{f.name}</code> — {f.error}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {log.length > 0 && (
            <div aria-label="Log" className="console">
              {log.slice(-6).map((l) => (
                <p className={`line ${l.kind}`} key={l.id}>
                  {l.text}
                </p>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function appendLog(lines: LogLine[], kind: LogKind, text: string): LogLine[] {
  const id = (lines.at(-1)?.id ?? 0) + 1;
  return [...lines.slice(-99), { id, kind, text }];
}

function describeSet(s: SetState): string | undefined {
  switch (s.status) {
    case 'error': {
      return s.error;
    }
    case 'idle': {
      return undefined;
    }
    case 'loading': {
      return 'Looking up…';
    }
    case 'ok': {
      const { capacity, emotes, name, owner } = s.set;
      const count =
        capacity === null
          ? `${emotes.length} emotes`
          : `${emotes.length}/${capacity} emotes`;
      return `${name}${owner ? ` by ${owner}` : ''} · ${count}`;
    }
  }
}

function describeToken(raw: string): string {
  const exp = jwtExp(normalizeToken(raw));
  if (exp === null) {
    return '';
  }
  const ms = exp - Date.now();
  if (ms <= 0) {
    return 'This token has expired. Get a new one from 7tv.app.';
  }
  const days = Math.floor(ms / 86_400_000);
  return days >= 1
    ? `Token valid for ${days} more day${days === 1 ? '' : 's'}.`
    : 'Token expires within a day.';
}

function Field(props: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onBlur?: () => void;
  onChange: (v: string) => void;
  placeholder: string;
  value: string;
}): ReactNode {
  const id = `f-${props.label}`;
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      <input
        autoComplete="off"
        disabled={props.disabled}
        id={id}
        onBlur={props.onBlur}
        onChange={(e) => {
          props.onChange(e.target.value);
        }}
        placeholder={props.placeholder}
        spellCheck={false}
        value={props.value}
      />
      {props.hint && <p className="hint">{props.hint}</p>}
    </div>
  );
}

function jwtExp(token: string): null | number {
  const part = token.split('.', 2)[1];
  if (!part) {
    return null;
  }
  try {
    const b64 = part.replaceAll('-', '+').replaceAll('_', '/');
    const json = JSON.parse(atob(b64)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function statusText(
  p: CopyProgress | null,
  busy: boolean,
  now: number
): string {
  if (!p) {
    return busy ? 'Preparing…' : '';
  }
  if (!busy) {
    return `${p.done}/${p.total} processed`;
  }
  if (p.phase === 'waiting' && p.waitUntil) {
    const s = Math.max(0, Math.ceil((p.waitUntil - now) / 1000));
    const left = s >= 90 ? `${Math.ceil(s / 60)} min` : `${s}s`;
    return p.waitReason ? `${p.waitReason} · resuming in ${left}` : 'Pacing…';
  }
  return `Sending up to ${p.batchSize} at a time · ${p.done}/${p.total}`;
}

/**
 * Re-render once a second while `active`, for countdowns.
 */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const t = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      clearInterval(t);
    };
  }, [active]);
  return now;
}
