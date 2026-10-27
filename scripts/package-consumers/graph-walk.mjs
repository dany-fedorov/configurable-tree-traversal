import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as root from 'configurable-tree-traversal';
import * as walking from 'configurable-tree-traversal/traversals/graph-walk';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsWalking = require('configurable-tree-traversal/traversals/graph-walk');
const entries = [root, cjs, walking, cjsWalking, root.graphWalk, cjs.graphWalk];
const Phase = root.GraphWalkPhase;
const Command = root.TraversalVisitorCommandName;
assert.equal(Command, cjs.TraversalVisitorCommandName);
assert.equal('DEFER_READY' in root, false);
assert.equal(root.TraversalVisitorCommandName, cjs.TraversalVisitorCommandName);
assert.equal(root.graphWalk, cjs.graphWalk);
for (const entry of entries) {
  for (const name of [
    'GraphWalkRunner',
    'AsyncGraphWalkRunner',
    'InternalGraphWalkRunner',
    'InternalAsyncGraphWalkRunner',
  ])
    assert.equal(name in entry, false);

  for (const name of [
    'GraphWalk',
    'AsyncGraphWalk',
    'GraphWalkPhase',
    'walkGraph',
    'walkGraphAsync',
    'materializeWalkSourceFromRecords',
    'materializeWalkSourceFromRecordsAsync',
    'materializeWalkSourceFromDagDefinition',
  ])
    assert.equal(entry[name], root[name]);
}

const objectId = {};
const symbolId = Symbol('symbol');
const ids = [objectId, symbolId, undefined, null, NaN, -0];
const relation = { kind: 'reference' };
const items = ids.map((id, index) => ({ id, index }));
const catalog = walking.materializeWalkSourceFromRecords(items, {
  id: (item) => item.id,
  outgoing: (item) =>
    Array.from({ length: item.index === 0 ? 2 : 1 }, () => ({
      to: ids[(item.index + 1) % ids.length],
      data: relation,
    })),
  roots: [objectId],
});
const mixed = [
  ...new root.GraphWalk({ source: catalog }).createRunner().iterateEvents({
    emitEvents: [Phase.VERTEX, Phase.EDGE],
  }),
];
assert.deepEqual(
  mixed
    .filter((event) => event.kind === 'vertex')
    .map((event) => event.vertex.vertexId),
  ids,
);
assert.equal(mixed.filter((event) => event.kind === 'edge').length, 7);
assert(
  mixed
    .filter((event) => event.kind === 'edge')
    .every((event) => event.edge.data === relation),
);
assert.deepEqual(
  mixed.slice(0, 5).map((event) => event.kind),
  ['vertex', 'edge', 'vertex', 'edge', 'edge'],
);
const sync = cjsWalking.walkGraph({ source: catalog });
for (const entry of entries)
  assert.equal(
    Object.getPrototypeOf(sync),
    Object.getPrototypeOf(
      new entry.GraphWalk({ source: catalog }).createRunner(),
    ),
  );
assert.equal(sync.summary().outcome.kind, 'exhausted');
assert.equal(sync.summary().counts.uniqueFoundVertices, 6);
assert.equal(
  (await root.walkGraphAsync({ source: catalog })).summary().counts
    .uniqueFoundVertices,
  6,
);

for (const Factory of [cjsWalking.GraphWalk, walking.AsyncGraphWalk]) {
  for (const predicate of ['shouldFollowEdge', 'shouldExpandVertex']) {
    const walk = new Factory({ source: catalog, [predicate]: () => false });
    const filtered = walk.createRunner();
    await filtered.run();
    assert.equal(filtered.summary().counts.uniqueFoundVertices, 1);
    walk.configure({ [predicate]: undefined });
    const retained = walk.createRunner();
    await retained.run();
    assert.equal(retained.summary().counts.uniqueFoundVertices, 1);
    walk.configure({ [predicate]: null });
    const reset = walk.createRunner();
    await reset.run();
    assert.equal(reset.summary().counts.uniqueFoundVertices, 6);
  }
}

const stream = new walking.AsyncGraphWalk({
  source: {
    async *roots() {
      yield { vertexId: objectId, resolution: { kind: 'found', data: 'A' } };
    },
    async *outgoing(vertex) {
      if (vertex.vertexId === objectId) {
        yield {
          target: {
            vertexId: symbolId,
            resolution: { kind: 'found', data: 'B' },
          },
          data: relation,
        };
        yield {
          target: { vertexId: undefined, resolution: { kind: 'omitted' } },
          data: relation,
        };
      } else {
        yield { target: { vertexId: objectId }, data: relation };
      }
    },
  },
}).createRunner();
const streamed = [];
for await (const event of stream.iterateEvents({
  emitEvents: [Phase.VERTEX, Phase.EDGE],
}))
  streamed.push(event);
for (const entry of entries)
  assert.equal(
    Object.getPrototypeOf(stream),
    Object.getPrototypeOf(
      new entry.AsyncGraphWalk({ source: catalog }).createRunner(),
    ),
  );
assert.deepEqual(
  streamed
    .filter((event) => event.kind === 'vertex')
    .map((event) => event.vertex.data),
  ['A', 'B'],
);
assert.deepEqual(
  streamed
    .filter((event) => event.kind === 'edge')
    .map((event) => event.target.kind),
  ['found', 'omitted', 'found'],
);
assert.equal(stream.summary().counts.uniqueOmittedVertices, 1);

const routes = [];
const self = walking.materializeWalkSourceFromRecords([{ id: symbolId }], {
  id: (item) => item.id,
  outgoing: (item) => [{ to: item.id, data: relation }],
  roots: [symbolId],
});
const bounded = walking.walkGraph({
  source: self,
  revisit: 'walks',
  limits: { maxDepth: 2 },
  visitors: {
    [Phase.PATH]: (event) => {
      routes.push(event.vertices.map((vertex) => vertex.vertexId));
    },
  },
});
assert.deepEqual(routes, [
  [symbolId],
  [symbolId, symbolId],
  [symbolId, symbolId, symbolId],
]);
assert.deepEqual(bounded.summary().outcome, {
  kind: 'limited',
  reasons: ['maxDepth'],
});

// Iterator return pauses; explicit close alone releases retained source cursors.
for (const asynchronous of [false, true]) {
  const cleanup = [];
  const source = {
    *roots() {
      try {
        yield {
          vertexId: objectId,
          resolution: { kind: 'found', data: 'root' },
        };
        yield {
          vertexId: symbolId,
          resolution: { kind: 'found', data: 'later' },
        };
      } finally {
        cleanup.push('roots');
      }
    },
    outgoing: () => [],
  };
  const runner = asynchronous
    ? new cjs.AsyncGraphWalk({ source }).createRunner()
    : new walking.GraphWalk({ source }).createRunner();
  const iterator = runner.iterateEvents();
  assert.equal((await iterator.next()).value.kind, 'vertex');
  await iterator.return(undefined);
  assert.equal(runner.getStopReason(), 'paused');
  assert.deepEqual(cleanup, []);
  await runner.close();
  await runner.close();
  assert.deepEqual(cleanup, ['roots']);
  assert.equal(runner.summary().outcome.kind, 'closed');
}

const callbacks = [];
const paused = await root.walkGraphAsync({
  source: self,
  visitors: {
    [Phase.VERTEX]: [
      async () => {
        callbacks.push('halt');
        return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
      },
      async () => {
        callbacks.push('tail');
      },
    ],
  },
});
assert.equal(paused.getStopReason(), 'paused');
assert.deepEqual(callbacks, ['halt']);
await paused.run();
assert.deepEqual(callbacks, ['halt', 'tail']);

const materialized = await walking.materializeWalkSourceFromRecordsAsync(
  (async function* () {
    yield items[0];
  })(),
  {
    id: async (item) => item.id,
    outgoing: async (item) => [{ to: item.id, data: relation }],
    roots: [objectId],
  },
);
const asyncHelper = await walking.walkGraphAsync({ source: materialized });
assert.equal(
  Object.getPrototypeOf(asyncHelper),
  Object.getPrototypeOf(
    new cjs.AsyncGraphWalk({ source: materialized }).createRunner(),
  ),
);
assert.equal(
  walking.walkGraph({ source: materialized }).summary().counts
    .uniqueFoundVertices,
  1,
);

const projected = walking.materializeWalkSourceFromDagDefinition(
  root.defineDag({
    vertices: [
      {
        vertexId: objectId,
        data: 'task',
        slots: [
          { kind: 'vertex', vertexId: objectId },
          { kind: 'omitted', identity: { vertexId: symbolId } },
        ],
        dependsOnWork: [objectId],
        dependsOnSubgraphCompletion: [symbolId],
      },
    ],
    omittedIds: [symbolId],
    entry: { kind: 'root', vertexId: objectId },
  }),
  {
    relations: [
      'subgraphCompletionDependencies',
      'children',
      'workDependencies',
    ],
  },
);
const relations = [];
const dagWalk = await walking.walkGraphAsync({
  source: projected,
  visitors: {
    [Phase.EDGE]: (event) => {
      relations.push([event.edge.data, event.target.kind]);
    },
  },
});
assert.deepEqual(relations, [
  [{ kind: 'child', slotIndex: 0 }, 'found'],
  [{ kind: 'child', slotIndex: 1 }, 'omitted'],
  [{ kind: 'workDependency' }, 'found'],
  [{ kind: 'subgraphCompletionDependency' }, 'omitted'],
]);
assert.equal(dagWalk.summary().outcome.kind, 'exhausted');
const syncDagWalk = cjsWalking.walkGraph({ source: projected });
assert.equal(syncDagWalk.summary().counts.uniqueFoundVertices, 1);
assert.equal(syncDagWalk.summary().counts.uniqueOmittedVertices, 1);
console.log('Packed graph walking consumers passed');
