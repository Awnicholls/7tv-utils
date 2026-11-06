import type { ToolId } from './types/copier';

import { APP_NAME } from '../electron/constants/app';

export const BRIDGE_MISSING_MESSAGE = navigator.userAgent.includes('Electron/')
  ? 'The app bridge failed to load. Check dev.log or the terminal for a [preload] error.'
  : `This is the browser preview. Use the “${APP_NAME}” window that yarn dev opens.`;

export const MAX_LOG_LINES = 100;
export const VISIBLE_LOG_LINES = 6;
export const PREVIEW_LIMIT = 24;
export const VISIBLE_FAILURES = 100;
export const TOKEN_SAVE_DELAY_MS = 400;
export const ACCOUNT_LOAD_DELAY_MS = 600;
export const NOW_TICK_MS = 250;
export const DAY_MS = 86_400_000;
export const SET_NAME_LIMIT = 40;

export const TOOLS: { headline: string; id: ToolId; label: string }[] = [
  { headline: 'Copy any 7TV set.', id: 'copy', label: 'Copy' },
  { headline: 'Clone a set to your account.', id: 'clone', label: 'Clone' },
  { headline: 'Merge two sets.', id: 'merge', label: 'Merge' },
  { headline: 'Rename or remove emotes.', id: 'edit', label: 'Edit' },
];
