import type { DepthFirstTraversalInOrderTraversalConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { normalizeRange } from '@depth-first-traversal/in-order-helpers/normalizeRange';
import { isInRange } from '@depth-first-traversal/in-order-helpers/isInRange';
import type { IndexRange } from '@depth-first-traversal/in-order-helpers/IndexRange';

export function shouldVisitParentOnInOrder(
  inOrderTraversalConfig: DepthFirstTraversalInOrderTraversalConfig,
  justVisitedIndex: number,
  allSiblingsCount: number,
): boolean {
  const cfg = inOrderTraversalConfig.visitParentAfterChildren;
  const fallback =
    inOrderTraversalConfig.visitParentAfterChildrenAllRangesOutOfBoundsFallback;
  const visitParentAfterRanges = (
    Array.isArray(cfg) || typeof cfg === 'number' ? [cfg] : cfg.ranges
  )
    .map((r: IndexRange) => normalizeRange(r, allSiblingsCount))
    .filter(Boolean) as [number, number][];
  const visitParentAfterFallbackRanges = (
    Array.isArray(fallback) || typeof fallback === 'number'
      ? [fallback]
      : fallback.ranges
  )
    .map((r: IndexRange) => normalizeRange(r, allSiblingsCount))
    .filter(Boolean) as [number, number][];
  // console.log('shouldVisitParentOnInOrder::',justVisitedIndex, visitParentAfterRanges, visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)), visitParentAfterFallbackRanges, visitParentAfterRanges.length === 0 && visitParentAfterFallbackRanges.some((r) => isInRange(r, justVisitedIndex),),);
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
