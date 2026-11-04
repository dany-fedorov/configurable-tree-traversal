import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');

const retiredExports = [
  'DEFER_READY',
  'TraversalVisitorFunctionResolutionStyle',
  'TreeTraversal',
  'TreeTraversalRunner',
  'TreeTraversalIterable',
  'AbstractTreeSource',
  'materializeDagSourceFromRecords',
  'materializeDagSourceFromRoots',
  'materializeDagSourceFromRecordsAsync',
  'materializeDagSourceFromRootsAsync',
];
const routes = [
  '',
  '/core',
  '/dag-input-materialization',
  '/traversals/depth-first-traversal',
  '/traversals/breadth-first-traversal',
  '/traversals/dag-traversal',
  '/traversals/graph-walk',
  '/traversable-tree-implementations/traversable-object-tree',
  '/tools/rewrite-object',
];
for (const route of routes) {
  const specifier = 'configurable-tree-traversal' + route;
  const imported = await import(specifier);
  for (const api of [require(specifier), imported]) {
    for (const name of retiredExports)
      assert.equal(name in api, false, specifier + ':' + name);
  }
}
for (const api of [esm, cjs]) {
  const sources = require('configurable-tree-traversal/dag-input-materialization');
  for (const suffix of [
    'FromRecords',
    'FromRoots',
    'FromRecordsAsync',
    'FromRootsAsync',
  ]) {
    const materializerNames = {
      FromRecords: 'materializeMultiEntryDagInputFromRecordCatalog',
      FromRoots: 'materializeDagInputFromRootRecords',
      FromRecordsAsync: 'materializeMultiEntryDagInputFromRecordCatalogAsync',
      FromRootsAsync: 'materializeDagInputFromRootRecordsAsync',
    };
    const factory = api[materializerNames[suffix]];
    assert.equal(factory, sources[materializerNames[suffix]]);
    const firstId = { opaque: true };
    const leaf = {
      id: undefined,
      children: [],
      work: [firstId],
      completion: [],
    };
    const first = { id: firstId, children: [leaf], work: [], completion: [] };
    const detached = { id: NaN, children: [], work: [], completion: [firstId] };
    const items = [first, leaf, detached];
    const input = await factory(items, {
      selectVertexId: (item) => item.id,
      [suffix.includes('Roots')
        ? 'selectStructuralChildRecords'
        : 'selectStructuralChildVertexIds']: suffix.includes('Roots')
        ? (item) => item.children
        : (item) => item.children.map((child) => child.id),
      selectWorkPrerequisiteVertexIds: (item) => item.work,
      selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.completion,
    });
    assert.deepEqual(Object.keys(input).sort(), [
      'dagDiscoverySource',
      'sourceRootIsHiddenEntryHolder',
    ]);
    assert.equal(input.sourceRootIsHiddenEntryHolder, true);
    // Async materialization returns an ordinary synchronous discovery adapter.
    assert.equal(
      input.dagDiscoverySource.resolveRootVertex().kind,
      'vertexResolved',
    );
    assert.equal(
      input.dagDiscoverySource.resolvePrerequisiteByVertexId(firstId)
        .resolvedVertexInput.vertexContentInput.$vertexData,
      first,
    );
    first.children.length = 0;
    leaf.work.length = 0;
    detached.completion.length = 0;
    items.length = 0;
    first.label = 'caller mutation';
    const runner = new api.DagTraversalBuilder(input)
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    assert.equal(graph.getVertexHandles().length, 3);
    const firstRef = graph.getVertexHandleByIdOrNull(firstId);
    const leafRef = graph.getVertexHandleByIdOrNull(undefined);
    assert.equal(firstRef.getCurrentVertexView().getVertexData(), first);
    assert.equal(
      firstRef.getCurrentVertexView().getVertexData().label,
      'caller mutation',
    );
    assert.deepEqual(graph.getDistinctStructuralParentHandlesOrNull(leafRef), [
      firstRef,
    ]);
    assert.deepEqual(
      graph.getVertexSnapshotOrNull(leafRef).workWaitsForWorkOf,
      [firstId],
    );
    assert.deepEqual(
      graph.getVertexSnapshotOrNull(graph.getVertexHandleByIdOrNull(NaN))
        .workWaitsForSubgraphCompletionOf,
      [firstId],
    );
    assert.equal(runner.getTraversalLifecycleStatus(), 'FINISHED');
  }
  // Canonical family deletion executes through both loader namespaces.
  for (const [helper, phase, commandName] of [
    [
      'runTreeDepthFirstUntilSuspendedOrTerminal',
      'BEFORE_CHILD_EXPANSION',
      api.TraversalVisitorCommandName
        .DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
    ],
    [
      'traverseDag',
      'ON_WORK_READY',
      api.TraversalVisitorCommandName
        .DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
    ],
  ]) {
    const deleted = api[helper]({
      treeDiscoverySource: new api.ObjectPropertyTreeSource({ child: 1 }),
      visitors: { [phase]: () => ({ commands: [{ commandName }] }) },
    });
    assert.equal(
      deleted.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
      null,
    );
  }
  for (const visitorCommandCommitTiming of [
    'afterEachVisitorCallback',
    'afterContiguousVisitorBatch',
  ]) {
    const seen = [];
    const state = { opaque: true };
    const chain = new api.DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new api.ObjectPropertyTreeSource(1),
    });
    chain.appendVisitorGroupForPhase(
      api.DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      {
        visitorCommandCommitTiming,
        visitors: [
          (_vertex, context) => {
            seen.push(context.currentVertexPhaseChainState);
            return {
              commands: [
                {
                  commandName:
                    api.TraversalVisitorCommandName
                      .SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
                  commandArguments: { phaseChainState: state },
                },
              ],
            };
          },
          (_vertex, context) => {
            seen.push(context.currentVertexPhaseChainState);
          },
        ],
      },
    );
    chain.registerVisitorForPhase(
      api.DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
      (_vertex, context) => {
        seen.push(context.currentVertexPhaseChainState);
      },
    );
    chain
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    assert.deepEqual(seen, [
      null,
      visitorCommandCommitTiming === 'afterEachVisitorCallback' ? state : null,
      null,
    ]);
  }
  const expansion = new api.DagTraversalBuilder({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['left', 'right'],
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: id,
          vertexContentInput: {
            $vertexData: id,
            $childDiscoveryHints:
              id === 'left' || id === 'right' ? ['shared'] : [],
          },
        },
      }),
    },
    visitors: {
      ON_WORK_READY: (vertex) =>
        vertex.getVertexData() === 'left'
          ? {
              commands: [
                {
                  commandName:
                    api.TraversalVisitorCommandName
                      .SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
                },
              ],
            }
          : undefined,
    },
  });
  const expanded = expansion
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  assert.equal(
    expanded.getLiveResolvedGraphView().getVertexHandles().length,
    4,
  );
  const shared = expanded
    .getLiveResolvedGraphView()
    .getVertexHandleByIdOrNull('shared');
  assert.deepEqual(
    expanded
      .getLiveResolvedGraphView()
      .getDistinctStructuralParentHandlesOrNull(shared)
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
    ['right'],
  );
  expansion.patchOptionsForFutureRunners({
    discoveryTiming: 'completeBeforeAnyVisitor',
  });
  assert.throws(
    () =>
      expansion
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    TypeError,
  );
  const walkSource = api.materializeGraphWalkSourceFromVertexRecords([1], {
    getVertexId: (v) => v,
    enumerateOutgoingLinks: () => [],
    rootVertexIds: [1],
  });
  assert.equal(typeof walkSource.enumerateRootTargets, 'function');
  assert.equal('dagDiscoverySource' in walkSource, false);
  assert.equal(
    api.materializeGraphWalkSourceFromVertexRecords,
    require('configurable-tree-traversal/traversals/graph-walk')
      .materializeGraphWalkSourceFromVertexRecords,
  );
  const Command = api.TraversalVisitorCommandName;
  for (const name of [
    'DELETE_VERTEX',
    'DISABLE_SUBTREE_TRAVERSAL',
    'SET_VERTEX_VISITORS_CHAIN_STATE',
    'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
  ])
    assert.equal(name in Command, false);
  assert.equal(
    'getRootPropertyFromInputObjectDefault' in api.ObjectPropertyTreeSource,
    false,
  );
  const vertex = new api.Vertex({
    $vertexData: 'root',
    $childDiscoveryHints: [],
  });
  for (const key of ['$d', '$c']) assert.equal(key in vertex, false);
  assert.equal('getId' in new api.MutableValueReference(vertex), false);
  const source = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: { vertexContentInput: vertex },
    }),
    resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
  };
  const tree = new api.DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: source,
  });
  for (const key of [
    'iterateOver',
    'enableVisitorFunctionsFor',
    'disableVisitorFunctionsFor',
  ])
    assert.throws(
      () =>
        tree
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal({ [key]: [] }),
      TypeError,
    );
  assert.throws(
    () =>
      tree.registerVisitorForPhase(
        api.DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        {
          visitor() {},
          resolutionStyle: 'CONCURRENT',
        },
      ),
    TypeError,
  );
  assert.throws(
    () => new api.ObjectPropertyTreeSource({}, { makeVertexHook() {} }),
    TypeError,
  );
  assert.throws(
    () =>
      api.runTreeDepthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: new api.ObjectPropertyTreeSource(
          { x: 1 },
          { resolveChildPropertyOrUseDefault: () => ({ returnMe: vertex }) },
        ),
      }),
    TypeError,
  );
  for (const name of [
    'runTreeDepthFirstUntilSuspendedOrTerminal',
    'runTreeBreadthFirstUntilSuspendedOrTerminal',
    'traverseDag',
    'runTreeDepthFirstUntilSuspendedOrTerminalAsync',
    'runTreeBreadthFirstUntilSuspendedOrTerminalAsync',
    'traverseDagAsync',
  ])
    assert.throws(
      () => api[name]({ treeDiscoverySource: source }, null),
      TypeError,
    );
  for (const key of ['rootDependencies', 'implicitParentDependency'])
    assert.throws(
      () =>
        new api.DagTraversalBuilder({
          treeDiscoverySource: source,
          [key]: undefined,
        }),
      TypeError,
    );
  for (const commandName of [
    'DELETE_VERTEX',
    'DISABLE_SUBTREE_TRAVERSAL',
    'SET_VERTEX_VISITORS_CHAIN_STATE',
    'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
  ])
    assert.throws(
      () =>
        api.runTreeDepthFirstUntilSuspendedOrTerminal({
          treeDiscoverySource: source,
          visitors: {
            BEFORE_CHILD_EXPANSION: () => ({ commands: [{ commandName }] }),
          },
        }),
      TypeError,
    );
  const dag = new api.DagTraversalBuilder({
    treeDiscoverySource: source,
    workCompletionPolicy: 'requireExternalWorkSettlement',
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const work = dag.captureProgressSnapshot().workAwaitingSettlement[0];
  for (const outcome of [{ ok: true }, { ok: false, error: 'failure' }])
    assert.throws(
      () =>
        dag.settleDeferredWork(work.vertexId, outcome, work.settlementToken),
      TypeError,
    );
  assert.equal(
    dag.settleDeferredWork(
      work.vertexId,
      { kind: 'workCompleted' },
      work.settlementToken,
    ),
    true,
  );
  const graph = dag.getLiveResolvedGraphView();
  for (const key of ['getIdOf', 'getVertexById', 'getStatusOf'])
    assert.equal(key in graph, false);
  assert.equal(
    'delete' in
      tree
        .createIndependentRunnerFromCurrentOptions()
        .getLiveResolvedTreeView(),
    false,
  );
  for (const result of [
    { vertexContentInput: vertex },
    { vertexContentInput: null },
  ])
    assert.throws(
      () =>
        new api.DepthFirstTreeTraversalBuilder({
          treeDiscoverySource: { ...source, resolveRootVertex: () => result },
        })
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal(),
      TypeError,
    );
  assert.throws(
    () =>
      api.copyAndNormalizeDagDefinition({
        entry: { kind: 'forest', entryDiscoverySlots: [] },
        vertexDeclarations: [],
      }),
    TypeError,
  );
}
console.log(
  'Verified idiomatic API envelopes, identity, copied topology and retired runtime surface through all nine packed routes.',
);

for (const api of [esm, cjs]) {
  const traversal = new api.DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new api.ObjectPropertyTreeSource(['a', 'b', 'c', 'd']),
    childBoundaryVisits: { visitAfterChildIndices: { indices: [0, 2] } },
  });
  traversal.patchOptionsForFutureRunners({
    treeDiscoverySource: undefined,
    childBoundaryVisits: { visitAfterChildIndices: undefined },
  });
  assert.equal(
    [
      ...traversal
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [
            api.DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
          ],
        }),
    ].length,
    6,
  );
  assert.throws(
    () =>
      traversal.patchOptionsForFutureRunners({
        childBoundaryVisits: { visitAfterChildIndices: [0, 2] },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      traversal.patchOptionsForFutureRunners({
        [Symbol('unsupported')]: undefined,
      }),
    TypeError,
  );
  assert.equal(
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getTraversalLifecycleStatus(),
    api.TraversalRunnerStatus.FINISHED,
  );
}

for (const api of [esm, cjs]) {
  const runner = new api.DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new api.ObjectPropertyTreeSource(1),
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const view = runner.getLiveResolvedTreeView();
  const root = view.getRootVertexHandleOrNull();
  assert.deepEqual(
    view.requireStructuralAncestorPathTo(root, {
      includeDesignatedRoot: undefined,
    }),
    [root],
  );
  assert.throws(
    () => view.requireStructuralAncestorPathTo(root, { noRot: true }),
    TypeError,
  );
}
