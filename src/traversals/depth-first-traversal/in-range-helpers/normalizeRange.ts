import type { IndexRange } from '@depth-first-traversal/in-range-helpers/IndexRange';

export function normalizeRange(
  r: IndexRange,
  arrLength: number,
): [number, number] | null {
  const rr = (Array.isArray(r) ? r : [r, r]).map((n, i) => {
    if (n < 0) {
      if (n < -arrLength) {
        if (i === 0) {
          return 0;
        } else {
          return null;
        }
      } else {
        return arrLength + n;
      }
    } /* if (n >= 0) */ else {
      if (n > arrLength - 1) {
        if (i === 0) {
          return null;
        } else {
          return arrLength - 1;
        }
      } else {
        return n;
      }
    }
  });
  if (
    rr[0] === null ||
    rr[1] === null ||
    (rr[0] as number) > (rr[1] as number)
  ) {
    return null;
  }
  return rr as [number, number];
}
