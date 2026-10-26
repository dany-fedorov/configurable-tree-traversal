/** Pending source, predicate, visitor, or iterator-close invocation. */
export type GraphWalkOperation =
  | 'roots'
  | 'rootNext'
  | 'resolveVertex'
  | 'outgoing'
  | 'edgeNext'
  | 'shouldFollowEdge'
  | 'shouldExpandVertex'
  | 'visitor'
  | 'iteratorReturn';
