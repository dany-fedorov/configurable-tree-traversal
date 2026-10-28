import type { InOrderOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { normalizeRange } from '@depth-first-traversal/in-order-helpers/normalizeRange';
import { isInRange } from '@depth-first-traversal/in-order-helpers/isInRange';
import type { ChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';

export function shouldVisitParentOnInOrder(
  inOrder: InOrderOptions,
  justVisitedIndex: number,
  allSiblingsCount: number,
): boolean {
  const normalize = (selection: ChildIndexSelection) =>
    (selection.indices !== undefined
      ? selection.indices.map(
          (index): number | readonly [number, number] => index,
        )
      : selection.ranges.map((range): readonly [number, number] => [
          range.from,
          range.through,
        ])
    )
      .map((range) => normalizeRange(range, allSiblingsCount))
      .filter((range): range is [number, number] => range !== null);
  const visitParentAfterRanges = normalize(inOrder.afterChildIndices);
  const visitParentAfterFallbackRanges = normalize(
    inOrder.fallbackChildIndices,
  );
  return (
    (justVisitedIndex === allSiblingsCount - 1 &&
      allSiblingsCount === 1 &&
      inOrder.visitSingleChildParent) ||
    visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)) ||
    (visitParentAfterRanges.length === 0 &&
      visitParentAfterFallbackRanges.some((r) =>
        isInRange(r, justVisitedIndex),
      ))
  );
}
