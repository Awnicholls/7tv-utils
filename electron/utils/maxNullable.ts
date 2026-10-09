export const maxNullable = (
  a: null | number,
  b: null | number
): null | number => {
  if (a === null) {
    return b;
  }
  if (b === null) {
    return a;
  }
  return Math.max(a, b);
};
