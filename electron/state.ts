import type { BrowserWindow } from 'electron';

export const state: {
  activeCopy: AbortController | null;
  mainWindow: BrowserWindow | null;
} = { activeCopy: null, mainWindow: null };
