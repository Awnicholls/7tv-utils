const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/**
Sorts emote names the way people expect: case-insensitive, 2 before 10.
*/
export const compareNames = (a: string, b: string): number =>
  collator.compare(a, b) || a.localeCompare(b);
