/** Canonical fixture adapter for nullable tree content, retaining caller identities. */
export function treeResolution<D, H>(
  content: { $vertexData: D; $childDiscoveryHints: H[] } | null,
) {
  return content === null
    ? { kind: 'vertexIntentionallyOmitted' as const }
    : { kind: 'vertexResolved' as const, resolvedVertexInput: { vertexContentInput: content } };
}

/** Graph acknowledgement belongs only to graph omissions. */
export function graphResolution<V extends object>(
  result: { kind: 'vertexResolved'; resolvedVertexInput: V } | { kind: 'vertexIntentionallyOmitted'; resolvedVertexInput?: never },
) {
  return result.kind === 'vertexIntentionallyOmitted'
    ? {
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }
    : result;
}
