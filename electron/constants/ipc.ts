export const IPC = {
  cancelJob: 'job:cancel',
  forgetToken: 'token:forget',
  jobEvent: 'job:event',
  loadAccount: 'account:load',
  loadSet: 'set:load',
  loadToken: 'token:load',
  openExternal: 'shell:open-external',
  saveToken: 'token:save',
  startJob: 'job:start',
} as const;
