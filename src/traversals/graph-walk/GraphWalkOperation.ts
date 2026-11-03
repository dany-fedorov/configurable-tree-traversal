/** Pending source, predicate, visitor, or iterator-close invocation. */
export type GraphWalkPendingInvocationOperation =
  | 'enumerateRootTargets'
  | 'readNextRootTarget'
  | 'resolveVertexDataById'
  | 'enumerateOutgoingLinks'
  | 'readNextOutgoingLinkOrCachedReplay'
  | 'shouldAdmitOutgoingLinkTarget'
  | 'shouldExpandVertexOccurrence'
  | 'invokeVisitorCallback'
  | 'returnSourceIteratorForDisposal';
