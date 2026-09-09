const { performance } = require('node:perf_hooks');
const { DepthFirstTraversal, BreadthFirstTraversal } = require('../dist');
const count = Number(process.argv[2] ?? 50000);
if (!Number.isSafeInteger(count) || count < 1) {
  throw new TypeError('Provide a positive integer vertex count');
}
const deep = { $d: 0, $c: [] };
let tail = deep;
for (let i = 1; i < count; i++) {
  const child = { $d: i, $c: [] };
  tail.$c.push(child);
  tail = child;
}
const wide = {
  $d: 0,
  $c: Array.from({ length: count - 1 }, (_, i) => ({ $d: i + 1, $c: [] })),
};
const results = [];
for (const [shape, root] of [
  ['deep', deep],
  ['wide', wide],
]) {
  for (const Strategy of [DepthFirstTraversal, BreadthFirstTraversal]) {
    const tree = {
      makeRoot: () => ({ vertexContent: root }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    };
    const start = performance.now();
    new Strategy({ traversableTree: tree })
      .makeRunner()
      .run({ iterateOver: [] });
    results.push({
      shape,
      strategy: Strategy.name,
      vertices: count,
      milliseconds: Math.round(performance.now() - start),
    });
  }
}
console.table(results);
