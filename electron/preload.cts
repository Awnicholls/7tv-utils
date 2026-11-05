import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type { BridgeApi, JobEvent } from './types/ipc.js';

// Channel names mirror constants/ipc.ts; a sandboxed preload can't import it.
const api: BridgeApi = {
  cancelJob: () => ipcRenderer.invoke('job:cancel'),
  forgetToken: () => ipcRenderer.invoke('token:forget'),
  loadAccount: (token) => ipcRenderer.invoke('account:load', token),
  loadSet: (input) => ipcRenderer.invoke('set:load', input),
  loadToken: () => ipcRenderer.invoke('token:load'),
  onJobEvent: (cb) => {
    const listener = (_e: IpcRendererEvent, payload: JobEvent): void => {
      cb(payload);
    };
    ipcRenderer.on('job:event', listener);
    return () => {
      ipcRenderer.removeListener('job:event', listener);
    };
  },
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  saveToken: (token) => ipcRenderer.invoke('token:save', token),
  startJob: (req) => ipcRenderer.invoke('job:start', req),
};

contextBridge.exposeInMainWorld('api', api);
