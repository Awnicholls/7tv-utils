import { useEffect, useRef, useState } from 'react';

import type { CopyEvent } from '../../../electron/types/ipc';
import type {
  CopyFailure,
  CopyProgress,
  LogKind,
} from '../../../electron/types/seventv';
import type { LogLine, Phase, SetState } from '../../types/copier';
import type { CopierViewProps } from './Copier.view';

import { normalizeToken } from '../../../electron/utils/normalizeToken';
import { parseSetId } from '../../../electron/utils/parseSetId';
import { BRIDGE_MISSING_MESSAGE, TOKEN_SAVE_DELAY_MS } from '../../constants';
import { useNow } from '../../hooks/useNow';
import { appendLog } from '../../utils/appendLog';
import { describeSet } from '../../utils/describeSet';
import { describeToken } from '../../utils/describeToken';
import { getApi } from '../../utils/getApi';
import { progressPercent } from '../../utils/progressPercent';
import { statusText } from '../../utils/statusText';
import { summarizeResult } from '../../utils/summarizeResult';
import { summaryTone } from '../../utils/summaryTone';

export const useCopier = (): CopierViewProps => {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [sourceSet, setSourceSet] = useState<SetState>({ status: 'idle' });
  const [targetSet, setTargetSet] = useState<SetState>({ status: 'idle' });

  const [token, setToken] = useState('');
  const [tokenNote, setTokenNote] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<CopyProgress | null>(null);
  const [summary, setSummary] = useState('');
  const [problems, setProblems] = useState<CopyFailure[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);

  const now = useNow(progress?.phase === 'waiting');
  const busy = phase === 'copying';

  useEffect(() => {
    void getApi()
      ?.loadToken()
      .then((saved) => {
        if (!saved) {
          return;
        }
        setToken(saved);
        setTokenNote(describeToken(saved));
      });
  }, []);

  useEffect(
    () =>
      getApi()?.onCopyEvent((e: CopyEvent) => {
        if (e.type === 'progress') {
          setProgress(e.progress);
        } else {
          setLog((lines) => appendLog(lines, e.kind, e.text));
        }
      }),
    []
  );

  const pushLog = (kind: LogKind, text: string): void => {
    setLog((lines) => appendLog(lines, kind, text));
  };

  const fail = (message: string): void => {
    setPhase('error');
    setSummary(message);
  };

  const lookup = async (
    input: string,
    setState: (state: SetState) => void
  ): Promise<void> => {
    const api = getApi();
    if (!api || !parseSetId(input)) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    const res = await api.loadSet(input);
    setState(
      res.ok
        ? { set: res.value, status: 'ok' }
        : { error: res.error, status: 'error' }
    );
  };

  const onTokenChange = (value: string): void => {
    setToken(value);
    setTokenNote(describeToken(value));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void getApi()?.saveToken(normalizeToken(value));
    }, TOKEN_SAVE_DELAY_MS);
  };

  const forgetToken = async (): Promise<void> => {
    await getApi()?.forgetToken();
    setToken('');
    setTokenNote('Token removed from this device.');
  };

  const start = async (): Promise<void> => {
    if (busy) {
      return;
    }
    const api = getApi();
    if (!api) {
      fail(BRIDGE_MISSING_MESSAGE);
      return;
    }
    if (!parseSetId(source)) {
      fail('Enter a source emote set.');
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
      pushLog(res.cancelled ? 'info' : 'err', res.error);
      return;
    }
    const hasFailures = res.value.failed.length > 0;
    const message = summarizeResult(res.value);
    setProblems([...res.value.failed, ...res.value.skipped]);
    setPhase(hasFailures ? 'error' : 'done');
    setSummary(message);
    pushLog(hasFailures ? 'warn' : 'ok', message);
    void lookup(target, setTargetSet);
  };

  return {
    busy,
    log,
    onCancel: () => void getApi()?.cancelCopy(),
    onForgetToken: () => void forgetToken(),
    onSourceBlur: () => void lookup(source, setSourceSet),
    onSourceChange: setSource,
    onStart: () => void start(),
    onTargetBlur: () => void lookup(target, setTargetSet),
    onTargetChange: setTarget,
    onTokenChange,
    percent: progressPercent(progress),
    preview: sourceSet.status === 'ok' ? sourceSet.set : null,
    problems,
    progress,
    showProgress: busy || progress !== null,
    source,
    sourceHint: describeSet(sourceSet),
    status: statusText(progress, busy, now),
    summary,
    summaryTone: summaryTone(phase),
    target,
    targetHint: describeSet(targetSet),
    token,
    tokenNote,
  };
};
