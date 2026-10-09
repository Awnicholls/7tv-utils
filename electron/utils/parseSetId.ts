export const parseSetId = (input: string): string => {
  const value = input.trim();
  if (!value) {
    return '';
  }
  const match = /emote-sets\/([\dA-Za-z]+)/.exec(value);
  if (match) {
    return match[1];
  }
  return (value.split('/').pop() ?? '')
    .split('?', 1)[0]
    .split('#', 1)[0]
    .trim();
};
