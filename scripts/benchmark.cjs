const { performance } = require('node:perf_hooks');
const {
  DepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
} = require('../dist');
const count = Number(process.argv[2] ?? 50000);
if (!Number.isSafeInteger(count) || count < 1) {
  throw new TypeError('Provide a positive integer vertex count');
}
const deep = { $data: 0, $childHints: [] };
let tail = deep;
for (let i = 1; i < count; i++) {
  const child = { $data: i, $childHints: [] };
  tail.$childHints.push(child);
  tail = child;
}
const wide = {
  $data: 0,
  $childHints: Array.from({ length: count - 1 }, (_, i) => ({
    $data: i + 1,
    $childHints: [],
  })),
};
const results = [];
for (const [shape, root] of [
  ['deep', deep],
  ['wide', wide],
]) {
  for (const Strategy of [DepthFirstTreeTraversal, BreadthFirstTreeTraversal]) {
    const tree = {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: root } }),
      resolveChild: (hint) => ({
        kind: 'found',
        vertex: { vertexContent: hint },
      }),
    };
    const start = performance.now();
    new Strategy({ traversableTree: tree })
      .createRunner()
      .run({ emitEvents: [] });
    results.push({
      shape,
      strategy: Strategy.name,
      vertices: count,
      milliseconds: Math.round(performance.now() - start),
    });
  }
}
console.table(results);
