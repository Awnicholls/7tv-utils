import { shell } from 'electron';

export const openExternalSafe = (url: string): void => {
  if (url.startsWith('https://')) {
    void shell.openExternal(url);
  }
};
