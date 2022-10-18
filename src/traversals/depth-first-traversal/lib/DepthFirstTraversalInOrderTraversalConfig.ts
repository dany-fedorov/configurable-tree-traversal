import type { IndexRange } from '@depth-first-traversal/in-order-helpers/IndexRange';

export type DepthFirstTraversalInOrderTraversalConfig = {
  visitParentAfterChildren: IndexRange | number | { ranges: IndexRange[] };
  visitParentAfterChildrenAllRangesOutOfBoundsFallback:
    | IndexRange
    | number
    | { ranges: IndexRange[] };
  visitUpOneChildParents: boolean;
  considerVisitAfterNullContentVertices: boolean;
};
