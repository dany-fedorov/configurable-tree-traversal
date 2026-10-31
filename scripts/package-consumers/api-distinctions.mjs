import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as c from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
import * as walk from 'configurable-tree-traversal/traversals/graph-walk';
const require = createRequire(import.meta.url),
  cjs = require('configurable-tree-traversal');
assert.equal(c.bindDagWorkSession, cjs.bindDagWorkSession);
assert.equal(c.mapDagFragmentIds, dag.mapDagFragmentIds);
assert.equal(c.GraphWalk, walk.GraphWalk);
assert.equal(c.createDagWorkSession, undefined);
assert.equal(c.instantiateDagFragment, undefined);
const hint = { id: 1 },
  data = { value: 1 },
  input = [hint];
const vertex = new c.Vertex({ $data: data, $childHints: input });
vertex.clone().getChildHints().push({ id: 2 });
assert.deepEqual(vertex.getChildHints(), [hint]);
assert.notEqual(vertex.getChildHints(), input);
assert.equal(vertex.getChildHints()[0], hint);
assert.equal(vertex.getData(), data);
assert.deepEqual(c.rewriteObject(null).getOutputResult(), {
  kind: 'present',
  value: null,
});
assert.deepEqual(c.rewriteObject(undefined).getOutputResult(), {
  kind: 'present',
  value: undefined,
});
assert.deepEqual(
  c.rewriteObject(1, { rewrite: () => ({ kind: 'delete' }) }).getOutputResult(),
  { kind: 'absent' },
);
const source = {
  hydration: 'resolver',
  roots: () => [{ vertexId: 0 }],
  resolveVertex: (id) => ({ kind: 'found', data: id }),
  outgoing: (v) =>
    v.vertexId === 0 ? [{ target: { vertexId: 1 }, data: 'edge' }] : [],
};
const builder = new c.GraphWalk({ source, limits: { maxAdmittedTargets: 1 } });
assert.equal([...builder.createRunner().iterateEvents()].length, 1);
assert.throws(() => builder.configure({ limits: undefined }), TypeError);
builder.configure({ replaceLimits: { maxDepth: 1 } });
const events = [
  ...builder.createRunner().iterateEvents({ emitEvents: ['vertex', 'edge'] }),
];
assert.equal(events.filter((e) => e.kind === 'vertex').length, 2);
assert.deepEqual(events.find((e) => e.kind === 'edge').fromVertex, {
  vertexId: 0,
  data: 0,
});
const definition = c.defineDag({
  vertices: [
    {
      vertexId: 'a',
      data: 1,
      slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
      dependsOnWork: [undefined],
      dependsOnSubgraphCompletion: [],
    },
  ],
  omittedIds: [undefined],
  entry: { kind: 'root', vertexId: 'a' },
});
const prepared = c.prepareDagDefinition(definition);
assert.equal(prepared.kind, 'valid');
assert.deepEqual(prepared.dag.liveVertexSummaries[0].children, []);
assert.equal(prepared.dag.definition.vertices[0].slots.length, 1);
const runner = prepared.dag.createRunner({
    workCompletion: 'externalSettlement',
  }),
  session = c.bindDagWorkSession(runner);
const boundary = session.advance();
assert.equal(boundary.kind, 'awaitingSettlement');
assert.ok(Array.isArray(session.inspect().chains));
assert.equal(
  session
    .inspectMilestones()
    .explain({ vertexId: undefined, milestone: 'work' }).kind,
  'omitted',
);
assert.equal(
  session
    .inspectMilestones()
    .explain({ vertexId: 'missing', milestone: 'work' }).kind,
  'unresolved',
);
const graph = runner.getResolvedGraphView(),
  root = graph.getVertexRefById('a');
assert.equal(graph.requireVertexId(root), 'a');
assert.deepEqual(graph.requirePathsTo(root), [[root]]);
const foreign = new c.MutableRef(new c.Vertex({ $data: 0, $childHints: [] }));
assert.equal(graph.getChildrenOf(foreign), null);
assert.throws(() => graph.requireVertexId(foreign));
session.completeWork(boundary.workTickets[0]);
assert.equal(session.advance().kind, 'finished');
const fragment = c.defineDagFragment(definition, { start: 'a' }),
  mapped = c.mapDagFragmentIds(fragment, { mapId: (id) => ({ id }) });
assert.deepEqual(mapped.ports.start, { id: 'a' });
const error = new c.DagTraversalStallError({
  dependencies: [{ vertexId: 'a', unmetPrerequisiteIds: ['b'] }],
  unknownPrerequisiteIds: ['b'],
  dependencyCycleComponents: [],
  dependencyBlockedIds: ['a'],
  structurallyIncompleteIds: [],
});
assert.deepEqual(error.diagnostics.dependencies, [
  { vertexId: 'a', unmetPrerequisiteIds: ['b'] },
]);
const cycle = new c.DagDiscoveryCycleError(['a', 'a']);
assert.deepEqual(cycle.cycleWitnessVertexIds, ['a', 'a']);
