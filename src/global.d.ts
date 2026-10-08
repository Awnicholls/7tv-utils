import type { BridgeApi } from '../shared/ipc';

declare global {
  /**
   * Provided by electron/preload.cts. Undefined in a plain browser.
   */
  var api: BridgeApi | undefined;
}

export {};
