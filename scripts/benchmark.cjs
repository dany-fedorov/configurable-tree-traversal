const { performance } = require('node:perf_hooks');
const {
  DepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
} = require('../dist');
const count = Number(process.argv[2] ?? 50000);
if (!Number.isSafeInteger(count) || count < 1) {
  throw new TypeError('Provide a positive integer vertex count');
}
const deep = { $vertexData: 0, $childDiscoveryHints: [] };
let tail = deep;
for (let i = 1; i < count; i++) {
  const child = { $vertexData: i, $childDiscoveryHints: [] };
  tail.$childDiscoveryHints.push(child);
  tail = child;
}
const wide = {
  $vertexData: 0,
  $childDiscoveryHints: Array.from({ length: count - 1 }, (_, i) => ({
    $vertexData: i + 1,
    $childDiscoveryHints: [],
  })),
};
const results = [];
for (const [shape, root] of [
  ['deep', deep],
  ['wide', wide],
]) {
  for (const Strategy of [
    DepthFirstTreeTraversalBuilder,
    BreadthFirstTreeTraversalBuilder,
  ]) {
    const tree = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: { vertexContentInput: root },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved',
        resolvedVertexInput: { vertexContentInput: hint },
      }),
    };
    const start = performance.now();
    new Strategy({ treeDiscoverySource: tree })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    results.push({
      shape,
      strategy: Strategy.name,
      vertices: count,
      milliseconds: Math.round(performance.now() - start),
    });
  }
}
console.table(results);
