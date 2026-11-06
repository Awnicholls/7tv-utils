/**
Accepts a 7TV user id or a 7tv.app profile URL.
*/
export const parseUserId = (input: string): string => {
  const value = input.trim();
  const match = /users\/([\dA-Za-z]+)/.exec(value);
  if (match) {
    return match[1];
  }
  const last = (value.split('/').pop() ?? '').split(/[?#]/, 1)[0].trim();
  return /^[\dA-Za-z]+$/.test(last) ? last : '';
};
