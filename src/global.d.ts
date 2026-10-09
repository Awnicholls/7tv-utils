import type { BridgeApi } from '../electron/types/ipc';

declare global {
  var api: BridgeApi | undefined;
}

export {};
