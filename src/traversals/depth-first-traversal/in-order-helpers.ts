function normalizeRange(
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

function shouldVisitParentOnInOrder(
  inOrderTraversalConfig: DepthFirstTraversalInstanceConfig_InOrderTraversalConfig,
  justVisitedIndex: number,
  allSiblingsCount: number,
): boolean {
  const cfg = inOrderTraversalConfig.visitParentAfterChildren;
  const fallback =
    inOrderTraversalConfig.visitParentAfterChildrenAllRangesOutOfBoundsFallback;
  const visitParentAfterRanges = (
    Array.isArray(cfg) || typeof cfg === 'number' ? [cfg] : cfg.ranges
  )
    .map((r) => normalizeRange(r, allSiblingsCount))
    .filter(Boolean) as [number, number][];
  const visitParentAfterFallbackRanges = (
    Array.isArray(fallback) || typeof fallback === 'number'
      ? [fallback]
      : fallback.ranges
  )
    .map((r) => normalizeRange(r, allSiblingsCount))
    .filter(Boolean) as [number, number][];
  // console.log(justVisitedIndex, visitParentAfterRanges, visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)), visitParentAfterFallbackRanges, visitParentAfterRanges.length === 0 && visitParentAfterFallbackRanges.some((r) => isInRange(r, justVisitedIndex),),);
  return (
    (justVisitedIndex === allSiblingsCount - 1 &&
      allSiblingsCount === 1 &&
      inOrderTraversalConfig.visitUpOneChildParents) ||
    visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)) ||
    (visitParentAfterRanges.length === 0 &&
      visitParentAfterFallbackRanges.some((r) =>
        isInRange(r, justVisitedIndex),
      ))
  );
}

function isInRange(r: [number, number], x: number) {
  return x >= r[0] && x <= r[1];
}
