import type { ErrorKind, GqlError } from '../types/copier.js';

export const classifyErrors = (errors: GqlError[]): ErrorKind => {
  const text = errors.map((e) => e.message ?? '').join(' ');
  const codes = new Set(errors.map((e) => e.extensions?.code));
  const statuses = new Set(errors.map((e) => e.extensions?.status));

  if (
    codes.has('RATE_LIMIT_EXCEEDED') ||
    statuses.has(429) ||
    /rate.?limit/i.test(text)
  ) {
    return 'rate';
  }
  if (codes.has('LOGIN_REQUIRED') || statuses.has(401)) {
    return 'auth';
  }
  if (/at capacity|capacity reached|set is full/i.test(text)) {
    return 'capacity';
  }
  if (/conflicting name|name conflict|already/i.test(text)) {
    return 'conflict';
  }
  if (codes.has('LACKING_PRIVILEGES') || statuses.has(403)) {
    return 'forbidden';
  }
  if (
    codes.has('TRANSACTION_ERROR') ||
    codes.has('MISSING_CONTEXT') ||
    [...statuses].some((s) => s !== undefined && s >= 500) ||
    /timed? ?out|mutex|transaction|try again/i.test(text)
  ) {
    return 'transient';
  }
  return 'other';
};
