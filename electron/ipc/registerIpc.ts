import { IPC } from '../constants/ipc.js';
import { getAccount } from '../seventv/getAccount.js';
import { getEmoteSet } from '../seventv/getEmoteSet.js';
import { state } from '../state.js';
import { clearToken, loadToken, saveToken } from '../store/token.js';
import { asString } from '../utils/asString.js';
import { normalizeToken } from '../utils/normalizeToken.js';
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
    toIpcResult(async () =>
      // Use the saved token so private sets you can edit still load.
      getEmoteSet(asString(input), {
        bearer: normalizeToken(await loadToken()) || undefined,
      })
    )
  );
  handle(IPC.loadAccount, (_e, token, userId) =>
    toIpcResult(() => getAccount(asString(token), asString(userId)))
  );
  handle(IPC.cancelJob, () => {
    state.activeJob?.abort();
  });
  handle(IPC.startJob, (e, raw) => startJob(e, raw));
};
