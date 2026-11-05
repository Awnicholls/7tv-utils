import { IPC } from '../constants/ipc.js';
import { getAccount } from '../seventv/getAccount.js';
import { getEmoteSet } from '../seventv/getEmoteSet.js';
import { state } from '../state.js';
import { clearToken, loadToken, saveToken } from '../store/token.js';
import { asString } from '../utils/asString.js';
import { openExternalSafe } from '../utils/openExternalSafe.js';
import { toIpcResult } from '../utils/toIpcResult.js';
import { handle } from './handle.js';
import { startJob } from './startJob.js';

export const registerIpc = (): void => {
  handle(IPC.loadToken, () => loadToken());
  handle(IPC.saveToken, (_e, token) => saveToken(asString(token)));
  handle(IPC.forgetToken, () => clearToken());
  handle(IPC.openExternal, (_e, url) => {
    openExternalSafe(asString(url));
  });
  handle(IPC.loadSet, (_e, input) =>
    toIpcResult(() => getEmoteSet(asString(input)))
  );
  handle(IPC.loadAccount, (_e, token) =>
    toIpcResult(() => getAccount(asString(token)))
  );
  handle(IPC.cancelJob, () => {
    state.activeJob?.abort();
  });
  handle(IPC.startJob, (e, raw) => startJob(e, raw));
};
