import type { BridgeApi } from '../../electron/types/ipc';

export const getApi = (): BridgeApi | undefined => globalThis.api;
