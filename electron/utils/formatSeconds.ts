export const formatSeconds = (ms: number): string => {
  const s = Math.ceil(ms / 1000);
  return s >= 90 ? `${Math.ceil(s / 60)} min` : `${s}s`;
};
