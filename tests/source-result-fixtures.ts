/** Canonical fixture adapter for nullable tree content, retaining caller identities. */
export function treeResolution<D, H>(
  content: { $data: D; $childHints: H[] } | null,
) {
  return content === null
    ? { kind: 'omitted' as const }
    : { kind: 'found' as const, vertex: { vertexContent: content } };
}

/** Graph acknowledgement belongs only to graph omissions. */
export function graphResolution<V extends object>(
  result: { kind: 'found'; vertex: V } | { kind: 'omitted'; vertex?: never },
) {
  return result.kind === 'omitted'
    ? { kind: 'omitted' as const, satisfiesDependencies: true as const }
    : result;
}
