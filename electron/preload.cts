// Sandboxed preload: CommonJS, and may only require 'electron'. Channel names
// mirror IPC in shared/ipc.ts (they cannot be imported at runtime here).
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type { BridgeApi, CopyEvent } from '../shared/ipc.js';

const api: BridgeApi = {
  cancelCopy: () => ipcRenderer.invoke('copy:cancel'),
  forgetToken: () => ipcRenderer.invoke('token:forget'),
  loadSet: (input) => ipcRenderer.invoke('set:load', input),
  loadToken: () => ipcRenderer.invoke('token:load'),
  onCopyEvent: (cb) => {
    const listener = (_e: IpcRendererEvent, payload: CopyEvent): void => {
      cb(payload);
    };
    ipcRenderer.on('copy:event', listener);
    return () => {
      ipcRenderer.removeListener('copy:event', listener);
    };
  },
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  saveToken: (token) => ipcRenderer.invoke('token:save', token),
  startCopy: (req) => ipcRenderer.invoke('copy:start', req),
};

contextBridge.exposeInMainWorld('api', api);
