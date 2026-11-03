import type { DepthFirstChildBoundaryVisitOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { normalizeRange } from '@depth-first-traversal/in-order-helpers/normalizeRange';
import { isInRange } from '@depth-first-traversal/in-order-helpers/isInRange';
import type { ZeroBasedOrEndRelativeChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';

export function shouldVisitParentOnInOrder(
  childBoundaryVisits: DepthFirstChildBoundaryVisitOptions,
  justVisitedIndex: number,
  allSiblingsCount: number,
): boolean {
  const normalize = (selection: ZeroBasedOrEndRelativeChildIndexSelection) =>
    (selection.indices !== undefined
      ? selection.indices.map(
          (index): number | readonly [number, number] => index,
        )
      : selection.ranges.map((range): readonly [number, number] => [
          range.fromInclusive,
          range.throughInclusive,
        ])
    )
      .map((range) => normalizeRange(range, allSiblingsCount))
      .filter((range): range is [number, number] => range !== null);
  const visitParentAfterRanges = normalize(
    childBoundaryVisits.visitAfterChildIndices,
  );
  const visitParentAfterFallbackRanges = normalize(
    childBoundaryVisits.visitAfterChildIndicesWhenPrimarySelectionIsEmpty,
  );
  return (
    (justVisitedIndex === allSiblingsCount - 1 &&
      allSiblingsCount === 1 &&
      childBoundaryVisits.alsoVisitAfterOnlyChild) ||
    visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)) ||
    (visitParentAfterRanges.length === 0 &&
      visitParentAfterFallbackRanges.some((r) =>
        isInRange(r, justVisitedIndex),
      ))
  );
}
