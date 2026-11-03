import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as root from 'configurable-tree-traversal';
import * as walking from 'configurable-tree-traversal/traversals/graph-walk';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsWalking = require('configurable-tree-traversal/traversals/graph-walk');
const entries = [root, cjs, walking, cjsWalking, root.graphWalk, cjs.graphWalk];
const Phase = root.GraphWalkObservationKind;
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
    'GraphWalkBuilder',
    'AsyncGraphWalkBuilder',
    'GraphWalkObservationKind',
    'createAndRunGraphWalkUntilSuspendedOrTerminal',
    'createAndRunGraphWalkUntilSuspendedOrTerminalAsync',
    'materializeGraphWalkSourceFromVertexRecords',
    'materializeSynchronousGraphWalkSourceFromAsyncRecords',
    'materializeGraphWalkSourceFromDagDeclarationRelations',
  ])
    assert.equal(entry[name], root[name]);
}

const objectId = {};
const symbolId = Symbol('symbol');
const ids = [objectId, symbolId, undefined, null, NaN, -0];
const relation = { kind: 'reference' };
const items = ids.map((id, index) => ({ id, index }));
const catalog = walking.materializeGraphWalkSourceFromVertexRecords(items, {
  getVertexId: (item) => item.id,
  enumerateOutgoingLinks: (item) =>
    Array.from({ length: item.index === 0 ? 2 : 1 }, () => ({
      toVertexId: ids[(item.index + 1) % ids.length],
      edgeData: relation,
    })),
  rootVertexIds: [objectId],
});
const mixed = [
  ...new root.GraphWalkBuilder({ graphWalkDiscoverySource: catalog })
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        Phase.VERTEX_OCCURRENCE,
        Phase.ADMITTED_EDGE_OCCURRENCE,
      ],
    }),
];
assert.deepEqual(
  mixed
    .filter((event) => event.eventKind === 'vertexOccurrence')
    .map((event) => event.vertex.vertexId),
  ids,
);
assert.equal(
  mixed.filter((event) => event.eventKind === 'admittedEdgeOccurrence').length,
  7,
);
assert(
  mixed
    .filter((event) => event.eventKind === 'admittedEdgeOccurrence')
    .every((event) => event.edge.edgeData === relation),
);
assert.deepEqual(
  mixed.slice(0, 5).map((event) => event.eventKind),
  [
    'vertexOccurrence',
    'admittedEdgeOccurrence',
    'vertexOccurrence',
    'admittedEdgeOccurrence',
    'admittedEdgeOccurrence',
  ],
);
const sync = cjsWalking.createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: catalog,
});
for (const entry of entries)
  assert.equal(
    Object.getPrototypeOf(sync),
    Object.getPrototypeOf(
      new entry.GraphWalkBuilder({
        graphWalkDiscoverySource: catalog,
      }).createIndependentRunnerFromCurrentOptions(),
    ),
  );
assert.equal(
  sync.captureProgressSnapshot().terminalOutcome.kind,
  'sourceRoutesExhausted',
);
assert.equal(
  sync.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  6,
);
assert.equal(
  (
    await root.createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
      graphWalkDiscoverySource: catalog,
    })
  ).captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  6,
);

for (const Factory of [
  cjsWalking.GraphWalkBuilder,
  walking.AsyncGraphWalkBuilder,
]) {
  for (const predicate of [
    'shouldAdmitOutgoingLinkTarget',
    'shouldExpandVertexOccurrence',
  ]) {
    const walk = new Factory({
      graphWalkDiscoverySource: catalog,
      [predicate]: () => false,
    });
    const filtered = walk.createIndependentRunnerFromCurrentOptions();
    await filtered.runUntilSuspendedOrTerminal();
    assert.equal(
      filtered.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
      1,
    );
    walk.patchOptionsForFutureRunners({ [predicate]: undefined });
    const retained = walk.createIndependentRunnerFromCurrentOptions();
    await retained.runUntilSuspendedOrTerminal();
    assert.equal(
      retained.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
      1,
    );
    walk.patchOptionsForFutureRunners({ [predicate]: null });
    const reset = walk.createIndependentRunnerFromCurrentOptions();
    await reset.runUntilSuspendedOrTerminal();
    assert.equal(
      reset.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
      6,
    );
  }
}

const stream = new walking.AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
    async *enumerateRootTargets() {
      yield {
        kind: 'inlineResolution',
        vertexId: objectId,
        resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'A' },
      };
    },
    async *enumerateOutgoingLinks(vertex) {
      if (vertex.vertexId === objectId) {
        yield {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution',
            vertexId: symbolId,
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found',
              vertexData: 'B',
            },
          },
          edgeData: relation,
        };
        yield {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution',
            vertexId: undefined,
            resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' },
          },
          edgeData: relation,
        };
      } else {
        yield {
          targetToResolveOnAdmission: {
            kind: 'previouslyAdmittedVertex',
            vertexId: objectId,
          },
          edgeData: relation,
        };
      }
    },
  },
}).createIndependentRunnerFromCurrentOptions();
const streamed = [];
for await (const event of stream.runAndIterateObservationEventsUntilSuspendedOrTerminal(
  {
    deliveredEventKinds: [
      Phase.VERTEX_OCCURRENCE,
      Phase.ADMITTED_EDGE_OCCURRENCE,
    ],
  },
))
  streamed.push(event);
for (const entry of entries)
  assert.equal(
    Object.getPrototypeOf(stream),
    Object.getPrototypeOf(
      new entry.AsyncGraphWalkBuilder({
        graphWalkDiscoverySource: catalog,
      }).createIndependentRunnerFromCurrentOptions(),
    ),
  );
assert.deepEqual(
  streamed
    .filter((event) => event.eventKind === 'vertexOccurrence')
    .map((event) => event.vertex.vertexData),
  ['A', 'B'],
);
assert.deepEqual(
  streamed
    .filter((event) => event.eventKind === 'admittedEdgeOccurrence')
    .map((event) => event.targetResolution.kind),
  ['found', 'omitted', 'found'],
);
assert.equal(
  stream.captureProgressSnapshot().counts.resolvedOmittedVertexIdCount,
  1,
);

const routes = [];
const self = walking.materializeGraphWalkSourceFromVertexRecords(
  [{ id: symbolId }],
  {
    getVertexId: (item) => item.id,
    enumerateOutgoingLinks: (item) => [
      { toVertexId: item.id, edgeData: relation },
    ],
    rootVertexIds: [symbolId],
  },
);
const bounded = walking.createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: self,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
  limits: { maxRouteHopDepth: 2 },
  visitorsByObservationKind: {
    [Phase.ROUTE_PREFIX]: (event) => {
      routes.push(
        event.verticesInRootToTargetOrder.map((vertex) => vertex.vertexId),
      );
    },
  },
});
assert.deepEqual(routes, [
  [symbolId],
  [symbolId, symbolId],
  [symbolId, symbolId, symbolId],
]);
assert.deepEqual(bounded.captureProgressSnapshot().terminalOutcome, {
  kind: 'traversalLimitsReached',
  reachedLimits: ['maxRouteHopDepth'],
});

// Iterator return pauses; explicit close alone releases retained source cursors.
for (const asynchronous of [false, true]) {
  const cleanup = [];
  const source = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
    *enumerateRootTargets() {
      try {
        yield {
          kind: 'inlineResolution',
          vertexId: objectId,
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found',
            vertexData: 'root',
          },
        };
        yield {
          kind: 'inlineResolution',
          vertexId: symbolId,
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found',
            vertexData: 'later',
          },
        };
      } finally {
        cleanup.push('roots');
      }
    },
    enumerateOutgoingLinks: () => [],
  };
  const runner = asynchronous
    ? new cjs.AsyncGraphWalkBuilder({
        graphWalkDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions()
    : new walking.GraphWalkBuilder({
        graphWalkDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  assert.equal((await iterator.next()).value.eventKind, 'vertexOccurrence');
  await iterator.return(undefined);
  assert.equal(runner.getTraversalStopReason(), 'paused');
  assert.deepEqual(cleanup, []);
  await runner.closePermanentlyAndDisposeSourceIterators();
  await runner.closePermanentlyAndDisposeSourceIterators();
  assert.deepEqual(cleanup, ['roots']);
  assert.equal(
    runner.captureProgressSnapshot().terminalOutcome.kind,
    'permanentlyClosedByCaller',
  );
}

const callbacks = [];
const paused = await root.createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: self,
  visitorsByObservationKind: {
    [Phase.VERTEX_OCCURRENCE]: [
      async () => {
        callbacks.push('halt');
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      },
      async () => {
        callbacks.push('tail');
      },
    ],
  },
});
assert.equal(paused.getTraversalStopReason(), 'paused');
assert.deepEqual(callbacks, ['halt']);
await paused.runUntilSuspendedOrTerminal();
assert.deepEqual(callbacks, ['halt', 'tail']);

const materialized =
  await walking.materializeSynchronousGraphWalkSourceFromAsyncRecords(
    (async function* () {
      yield items[0];
    })(),
    {
      getVertexId: async (item) => item.id,
      enumerateOutgoingLinks: async (item) => [
        { toVertexId: item.id, edgeData: relation },
      ],
      rootVertexIds: [objectId],
    },
  );
const asyncHelper =
  await walking.createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
    graphWalkDiscoverySource: materialized,
  });
assert.equal(
  Object.getPrototypeOf(asyncHelper),
  Object.getPrototypeOf(
    new cjs.AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: materialized,
    }).createIndependentRunnerFromCurrentOptions(),
  ),
);
assert.equal(
  walking
    .createAndRunGraphWalkUntilSuspendedOrTerminal({
      graphWalkDiscoverySource: materialized,
    })
    .captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  1,
);

const projected = walking.materializeGraphWalkSourceFromDagDeclarationRelations(
  root.copyAndNormalizeDagDefinition({
    vertexDeclarations: [
      {
        vertexId: objectId,
        data: 'task',
        childDiscoverySlots: [
          { kind: 'vertex', vertexId: objectId },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: symbolId } },
        ],
        workWaitsForWorkOf: [objectId],
        workWaitsForSubgraphCompletionOf: [symbolId],
      },
    ],
    omittedVertexIds: [symbolId],
    entry: { kind: 'root', vertexId: objectId },
  }),
  {
    includeDeclarationRelations: [
      'dependentToSubgraphCompletionPrerequisites',
      'parentToChildSlots',
      'dependentToWorkPrerequisites',
    ],
  },
);
const relations = [];
const dagWalk =
  await walking.createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
    graphWalkDiscoverySource: projected,
    visitorsByObservationKind: {
      [Phase.ADMITTED_EDGE_OCCURRENCE]: (event) => {
        relations.push([event.edge.edgeData, event.targetResolution.kind]);
      },
    },
  });
assert.deepEqual(relations, [
  [{ kind: 'structuralChildSlot', childSlotIndex: 0 }, 'found'],
  [{ kind: 'structuralChildSlot', childSlotIndex: 1 }, 'omitted'],
  [{ kind: 'workPrerequisite' }, 'found'],
  [{ kind: 'subgraphCompletionPrerequisite' }, 'omitted'],
]);
assert.equal(
  dagWalk.captureProgressSnapshot().terminalOutcome.kind,
  'sourceRoutesExhausted',
);
const syncDagWalk = cjsWalking.createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: projected,
});
assert.equal(
  syncDagWalk.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  1,
);
assert.equal(
  syncDagWalk.captureProgressSnapshot().counts.resolvedOmittedVertexIdCount,
  1,
);
console.log('Packed graph walking consumers passed');

assert.equal(
  catalog.vertexResolutionMode,
  'resolverWithOptionalInlineResolution',
);
assert.equal(self.vertexResolutionMode, 'resolverWithOptionalInlineResolution');
for (const Factory of [
  root.GraphWalkBuilder,
  cjsWalking.AsyncGraphWalkBuilder,
]) {
  assert.throws(
    () =>
      new Factory({
        graphWalkDiscoverySource: {
          enumerateRootTargets: () => [],
          enumerateOutgoingLinks: () => [],
        },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      new Factory({
        graphWalkDiscoverySource: {
          vertexResolutionMode: 'resolverWithOptionalInlineResolution',
          enumerateRootTargets: () => [],
          enumerateOutgoingLinks: () => [],
        },
      }),
    TypeError,
  );
  const previouslyAdmittedVertex = new Factory({
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
      enumerateRootTargets: () => [
        {
          kind: 'inlineResolution',
          vertexId: objectId,
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found',
            vertexData: 'root',
          },
        },
      ],
      enumerateOutgoingLinks: () => [
        {
          targetToResolveOnAdmission: {
            kind: 'previouslyAdmittedVertex',
            vertexId: objectId,
          },
          edgeData: relation,
        },
      ],
    },
  }).createIndependentRunnerFromCurrentOptions();
  await previouslyAdmittedVertex.runUntilSuspendedOrTerminal();
  assert.equal(
    previouslyAdmittedVertex.captureProgressSnapshot().counts
      .resolvedFoundVertexIdCount,
    1,
  );
  assert.equal(
    previouslyAdmittedVertex.captureProgressSnapshot().counts
      .freshSourceOutgoingLinkCount,
    1,
  );
}
