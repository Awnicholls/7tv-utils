import { ipcMain, type IpcMainInvokeEvent } from 'electron';

import { state } from '../state.js';
import { isAppUrl } from '../utils/isAppUrl.js';

const isTrusted = (e: IpcMainInvokeEvent): boolean =>
  state.mainWindow !== null &&
  e.sender === state.mainWindow.webContents &&
  isAppUrl(e.senderFrame?.url ?? '');

export const handle = (
  channel: string,
  fn: (e: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void => {
  ipcMain.handle(channel, (e, ...args: unknown[]) => {
    if (!isTrusted(e)) {
      throw new Error('Untrusted sender');
    }
    return fn(e, ...args);
  });
};
