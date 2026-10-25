import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
for (const name of [
  'defineDag',
  'prepareDagDefinition',
  'defineDagFragment',
  'instantiateDagFragment',
  'composeDag',
]) {
  for (const entry of [cjs, dag, cjsDag, esm.dagTraversal])
    assert.equal(esm[name], entry[name]);
}
const definition = cjs.defineDag({
  vertices: [
    {
      vertexId: 'start',
      data: { task: 'build' },
      slots: [],
      dependsOn: [],
      dependsOnComplete: [],
    },
    {
      vertexId: 'finish',
      data: { task: 'review' },
      slots: [],
      dependsOn: ['start'],
      dependsOnComplete: [],
    },
  ],
  omittedIds: [],
  entry: {
    kind: 'forest',
    slots: [
      { kind: 'vertex', vertexId: 'start' },
      { kind: 'vertex', vertexId: 'finish' },
    ],
  },
});
const fragment = dag.defineDagFragment(definition, {
  start: 'start',
  finish: 'finish',
});
const first = cjs.instantiateDagFragment(fragment, {
  mapId: (local) => ({ run: 'first', local }),
});
const second = esm.instantiateDagFragment(fragment, {
  mapId: (local) => ({ run: 'second', local }),
});
const result = cjsDag.composeDag([first, second], {
  dependencies: [
    {
      dependent: second.ports.start,
      prerequisite: { vertexId: first.ports.finish, milestone: 'completion' },
    },
  ],
});
assert.equal(result.kind, 'valid');
assert.equal(
  result.dag.definition.vertices[2].dependsOnComplete[0],
  first.ports.finish,
);
for (const runner of [
  result.dag.createRunner(),
  await result.dag.createAsyncRunner(),
]) {
  const seen = [];
  for await (const event of runner.getIterable())
    seen.push([event.vertexId, event.kind]);
  assert.equal(seen[0][0], first.ports.start);
  assert.equal(seen[3][0], first.ports.finish);
  assert.equal(seen[3][1], 'subgraphCompleted');
  assert.equal(seen[4][0], second.ports.start);
  assert.equal(seen[7][0], second.ports.finish);
  assert.equal(runner.summary().counts.subtreeCompleted, 4);
}
assert.throws(() => esm.composeDag([first, first]), TypeError);
assert.equal(
  dag.composeDag([first, second], {
    dependencies: [
      {
        dependent: first.ports.start,
        prerequisite: {
          vertexId: second.ports.finish,
          milestone: 'completion',
        },
      },
      {
        dependent: second.ports.start,
        prerequisite: { vertexId: first.ports.finish, milestone: 'completion' },
      },
    ],
  }).kind,
  'invalid',
);
console.log('Packed DAG fragment consumers passed');
