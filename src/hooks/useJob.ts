import { useEffect, useState } from 'react';

import type { JobEvent } from '../../electron/types/ipc';
import type {
  JobFailure,
  JobProgress,
  JobResult,
  LogKind,
} from '../../electron/types/seventv';
import type { JobInput, JobPhase, LogLine } from '../types/copier';

import { normalizeToken } from '../../electron/utils/normalizeToken';
import { BRIDGE_MISSING_MESSAGE } from '../constants';
import { appendLog } from '../utils/appendLog';
import { getApi } from '../utils/getApi';
import { progressPercent } from '../utils/progressPercent';
import { statusText } from '../utils/statusText';
import { summarizeResult } from '../utils/summarizeResult';
import { summaryTone } from '../utils/summaryTone';
import { useNow } from './useNow';

export interface JobControls {
  busy: boolean;
  /**
  Starts a job; resolves with its result, or null if it didn't finish.
  */
  run: (input: JobInput, verb: string) => Promise<JobResult | null>;
}

export interface JobState extends JobControls {
  cancel: () => void;
  /**
  Clears the last job's output, e.g. when switching tools.
  */
  reset: () => void;
  view: JobView;
}

export interface JobView {
  log: LogLine[];
  percent: number;
  problems: JobFailure[];
  progress: JobProgress | null;
  resultSetId?: string;
  showProgress: boolean;
  status: string;
  summary: string;
  summaryTone: string;
  verb: string;
}

/**
 * Runs one 7TV job at a time and collects its progress, log and outcome
 * for the job panel.
 */
export const useJob = (token: string): JobState => {
  const [phase, setPhase] = useState<JobPhase>('idle');
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [summary, setSummary] = useState('');
  const [problems, setProblems] = useState<JobFailure[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [verb, setVerb] = useState('done');
  const [resultSetId, setResultSetId] = useState<string>();

  const busy = phase === 'running';
  const now = useNow(progress?.phase === 'waiting');

  useEffect(
    () =>
      getApi()?.onJobEvent((e: JobEvent) => {
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

  const run = async (
    input: JobInput,
    nextVerb: string
  ): Promise<JobResult | null> => {
    if (busy) {
      return null;
    }
    const api = getApi();
    if (!api) {
      setPhase('error');
      setSummary(BRIDGE_MISSING_MESSAGE);
      return null;
    }
    setProblems([]);
    setSummary('');
    setProgress(null);
    setResultSetId(undefined);
    setVerb(nextVerb);
    setPhase('running');

    const res = await api.startJob({ ...input, token: normalizeToken(token) });
    if (!res.ok) {
      setPhase(res.cancelled ? 'idle' : 'error');
      setSummary(res.error);
      pushLog(res.cancelled ? 'info' : 'err', res.error);
      return null;
    }
    const hasFailures = res.value.failed.length > 0;
    const message = summarizeResult(res.value, nextVerb);
    setProblems([...res.value.failed, ...res.value.skipped]);
    setPhase(hasFailures ? 'error' : 'done');
    setSummary(message);
    setResultSetId(res.value.emoteSetId);
    pushLog(hasFailures ? 'warn' : 'ok', message);
    return res.value;
  };

  return {
    busy,
    cancel: () => void getApi()?.cancelJob(),
    reset: () => {
      if (busy) {
        return;
      }
      setPhase('idle');
      setProgress(null);
      setSummary('');
      setProblems([]);
      setLog([]);
      setResultSetId(undefined);
    },
    run,
    view: {
      log,
      percent: progressPercent(progress),
      problems,
      progress,
      resultSetId,
      showProgress: busy || progress !== null,
      status: statusText(progress, busy, now),
      summary,
      summaryTone: summaryTone(phase),
      verb,
    },
  };
};
