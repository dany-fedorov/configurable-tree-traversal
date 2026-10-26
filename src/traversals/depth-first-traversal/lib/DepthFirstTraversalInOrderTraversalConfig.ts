import type { ChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';

export type InOrderOptions = {
  afterChildIndices:
    | ChildIndexSelection
    | number
    | { ranges: ChildIndexSelection[] };
  fallbackChildIndices:
    | ChildIndexSelection
    | number
    | { ranges: ChildIndexSelection[] };
  visitSingleChildParent: boolean;
  visitAfterOmittedChildren: boolean;
};
