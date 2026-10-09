import { app } from 'electron';
import path from 'node:path';

export const DEV_URL = process.env.VITE_DEV_SERVER_URL;
export const PRELOAD_PATH = path.join(import.meta.dirname, '..', 'preload.cjs');
export const INDEX_PATH = path.join(app.getAppPath(), 'dist', 'index.html');
export const ICON_PATH = path.join(
  app.getAppPath(),
  'build',
  'android-chrome-512x512.png'
);
