import { app, Menu } from 'electron';

import { APP_NAME } from './constants/app.js';
import { DEV_URL, ICON_PATH } from './constants/paths.js';
import { registerIpc } from './ipc/registerIpc.js';
import { state } from './state.js';
import { createWindow, focusMainWindow } from './window.js';

const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) {
  console.error(`Another ${APP_NAME} instance is already running.`);
  app.exit(0);
}

app.on('second-instance', focusMainWindow);

app.on('window-all-closed', () => {
  state.activeJob?.abort();
  app.quit();
});

app.on('child-process-gone', (_e, details) => {
  console.error(
    `[app] ${details.type} process gone: ${details.reason} (exit code ${details.exitCode})`
  );
});

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

if (isPrimaryInstance) {
  void app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      if (DEV_URL) {
        app.dock?.setIcon(ICON_PATH);
      }
    } else {
      Menu.setApplicationMenu(null);
    }
    registerIpc();
    createWindow();
  });
}
