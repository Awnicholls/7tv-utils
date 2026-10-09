export const withJitter = (ms: number): number =>
  Math.round(ms * (1 + Math.random() * 0.15));
