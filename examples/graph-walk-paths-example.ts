import assert from 'node:assert/strict';
import { GraphWalk, GraphWalkPhase, walkSourceFrom } from '../src';

const source = walkSourceFrom(
  [
    { id: 'claim', links: ['evidence', 'evidence'] }, // Distinct provenance links.
    { id: 'evidence', links: ['claim'] },
  ],
  {
    id: (item) => item.id,
    outgoing: (item) =>
      item.links.map((to) => ({ to, data: { kind: 'cites' } })),
    roots: ['claim'],
  },
);
for (const revisit of ['simplePaths', 'walks'] as const) {
  const runner = new GraphWalk({
    source,
    revisit,
    limits: { maxDepth: 2 },
  }).makeRunner();
  const paths = [...runner.getIterable({ emitPhases: [GraphWalkPhase.PATH] })];
  // Paths include the zero-edge root and every admitted prefix, not only leaves.
  assert.equal(paths[0]!.depth, 0);
  assert.equal(paths[1]!.edges[0]!.index, 0);
  assert.equal(paths[2]!.edges[0]!.index, 1);
  assert.equal(paths.length, revisit === 'simplePaths' ? 3 : 5);
  const outcome = runner.summary().outcome;
  assert.deepEqual(
    outcome,
    revisit === 'simplePaths'
      ? { kind: 'exhausted' }
      : { kind: 'limited', reasons: ['maxDepth'] },
  );
  console.log(
    revisit,
    paths.map((path) => path.vertices.map((vertex) => vertex.vertexId)),
    outcome,
  );
}
// A step budget also terminates repeated walks; truncation is part of the result.
const capped = new GraphWalk({
  source,
  revisit: 'walks',
  limits: { maxSteps: 4 },
})
  .makeRunner()
  .run();
assert.deepEqual(capped.summary().outcome, {
  kind: 'limited',
  reasons: ['maxSteps'],
});
console.log('Step budget:', capped.summary());
