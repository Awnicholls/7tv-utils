import { BrowserWindow, nativeTheme, screen } from 'electron';
import { existsSync } from 'node:fs';

import {
  APP_NAME,
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
} from './constants/app.js';
import {
  DEV_URL,
  ICON_PATH,
  INDEX_PATH,
  PRELOAD_PATH,
} from './constants/paths.js';
import { state } from './state.js';
import { isAppUrl } from './utils/isAppUrl.js';
import { openExternalSafe } from './utils/openExternalSafe.js';

const attachDevDiagnostics = (win: BrowserWindow): void => {
  win.webContents.on('console-message', ({ level, message }) => {
    console.log(`[renderer:${level}] ${message}`);
  });
  win.webContents.on('did-finish-load', () => {
    void win.webContents
      .executeJavaScript('typeof window.api')
      .then((kind: unknown) => {
        console.log(
          `[dev] preload=${PRELOAD_PATH} exists=${existsSync(PRELOAD_PATH)} bridge=${String(kind)}`
        );
      });
  });
};

/**
 * Logs why the page died, if it does, and brings it back rather than
 * leaving a blank window.
 */
const watchRenderer = (win: BrowserWindow): void => {
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error(
      `[renderer] process gone: ${details.reason} (exit code ${details.exitCode})`
    );
    if (details.reason !== 'clean-exit' && !win.isDestroyed()) {
      win.webContents.reload();
    }
  });
  win.webContents.on('unresponsive', () => {
    console.error('[renderer] page stopped responding');
  });
  win.webContents.on('responsive', () => {
    console.error('[renderer] page is responding again');
  });
};

const lockNavigation = (win: BrowserWindow): void => {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (isAppUrl(url)) {
      return;
    }
    e.preventDefault();
    openExternalSafe(url);
  });
};

export const focusMainWindow = (): void => {
  const win = state.mainWindow;
  if (!win) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.focus();
};

export const createWindow = (): void => {
  const area = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors
      ? DARK_BACKGROUND
      : LIGHT_BACKGROUND,
    height: Math.max(
      MIN_WINDOW_HEIGHT,
      Math.min(WINDOW_HEIGHT, area.height - 60)
    ),
    icon: ICON_PATH,
    minHeight: MIN_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH,
    show: false,
    title: APP_NAME,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: PRELOAD_PATH,
      sandbox: true,
      spellcheck: false,
    },
    width: Math.max(MIN_WINDOW_WIDTH, Math.min(WINDOW_WIDTH, area.width)),
  });
  state.mainWindow = win;

  win.once('ready-to-show', () => {
    win.show();
  });
  win.on('closed', () => {
    state.mainWindow = null;
  });
  win.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error(`[preload] ${preloadPath} failed:`, error);
  });

  if (DEV_URL) {
    attachDevDiagnostics(win);
  }
  watchRenderer(win);
  lockNavigation(win);

  void (DEV_URL ? win.loadURL(DEV_URL) : win.loadFile(INDEX_PATH));
};
