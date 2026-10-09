export const isAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
