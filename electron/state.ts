import type { BrowserWindow } from 'electron';

export const state: {
  activeJob: AbortController | null;
  mainWindow: BrowserWindow | null;
} = { activeJob: null, mainWindow: null };
