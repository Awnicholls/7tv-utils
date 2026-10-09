import { IPC } from '../constants/ipc.js';
import { getEmoteSet } from '../seventv/getEmoteSet.js';
import { state } from '../state.js';
import { clearToken, loadToken, saveToken } from '../store/token.js';
import { asString } from '../utils/asString.js';
import { openExternalSafe } from '../utils/openExternalSafe.js';
import { toIpcResult } from '../utils/toIpcResult.js';
import { handle } from './handle.js';
import { startCopy } from './startCopy.js';

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
  handle(IPC.cancelCopy, () => {
    state.activeCopy?.abort();
  });
  handle(IPC.startCopy, (e, raw) => startCopy(e, raw));
};
