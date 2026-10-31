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
  '/sources',
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
  const sources = require('configurable-tree-traversal/sources');
  for (const suffix of [
    'FromRecords',
    'FromRoots',
    'FromRecordsAsync',
    'FromRootsAsync',
  ]) {
    const factory = api['materializeDagInput' + suffix];
    assert.equal(factory, sources['materializeDagInput' + suffix]);
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
      id: (item) => item.id,
      children: suffix.includes('Roots')
        ? (item) => item.children
        : (item) => item.children.map((child) => child.id),
      dependsOnWork: (item) => item.work,
      dependsOnSubgraphCompletion: (item) => item.completion,
    });
    assert.deepEqual(Object.keys(input).sort(), [
      'syntheticRoot',
      'traversableGraph',
    ]);
    assert.equal(input.syntheticRoot, true);
    // Async materialization returns an ordinary synchronous discovery adapter.
    assert.equal(input.traversableGraph.resolveRoot().kind, 'found');
    assert.equal(
      input.traversableGraph.resolvePrerequisite(firstId).vertex.vertexContent
        .$data,
      first,
    );
    first.children.length = 0;
    leaf.work.length = 0;
    detached.completion.length = 0;
    items.length = 0;
    first.label = 'caller mutation';
    const runner = new api.DagTraversal(input).createRunner().run();
    const graph = runner.getResolvedGraphView();
    assert.equal(graph.getVertexRefs().length, 3);
    const firstRef = graph.getVertexRefById(firstId);
    const leafRef = graph.getVertexRefById(undefined);
    assert.equal(firstRef.getValue().getData(), first);
    assert.equal(firstRef.getValue().getData().label, 'caller mutation');
    assert.deepEqual(graph.getParentsOf(leafRef), [firstRef]);
    assert.deepEqual(graph.get(leafRef).dependsOnWork, [firstId]);
    assert.deepEqual(
      graph.get(graph.getVertexRefById(NaN)).dependsOnSubgraphCompletion,
      [firstId],
    );
    assert.equal(runner.getStatus(), 'FINISHED');
  }
  // Canonical family deletion executes through both loader namespaces.
  for (const [helper, phase, commandName] of [
    [
      'traverseTreeDepthFirst',
      'PRE_ORDER',
      api.TraversalVisitorCommandName.DELETE_TREE_SUBTREE,
    ],
    [
      'traverseDag',
      'ON_WORK_READY',
      api.TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE,
    ],
  ]) {
    const deleted = api[helper]({
      traversableTree: new api.ObjectTreeSource({ child: 1 }),
      visitors: { [phase]: () => ({ commands: [{ commandName }] }) },
    });
    assert.equal(deleted.getResolvedTreeView().getRoot(), null);
  }
  for (const commandCommitMode of ['afterEachVisitor', 'afterGroup']) {
    const seen = [];
    const state = { opaque: true };
    const chain = new api.DepthFirstTreeTraversal({
      traversableTree: new api.ObjectTreeSource(1),
    });
    chain.addVisitorGroupFor(api.DepthFirstPhase.PRE_ORDER, {
      commandCommitMode,
      visitors: [
        (_vertex, context) => {
          seen.push(context.visitorChainState);
          return {
            commands: [
              {
                commandName:
                  api.TraversalVisitorCommandName.SET_VISITOR_CHAIN_STATE,
                commandArguments: { state },
              },
            ],
          };
        },
        (_vertex, context) => {
          seen.push(context.visitorChainState);
        },
      ],
    });
    chain.addVisitorFor(api.DepthFirstPhase.POST_ORDER, (_vertex, context) => {
      seen.push(context.visitorChainState);
    });
    chain.createRunner().run();
    assert.deepEqual(seen, [
      null,
      commandCommitMode === 'afterEachVisitor' ? state : null,
      null,
    ]);
  }
  const expansion = new api.DagTraversal({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['left', 'right'] },
        },
      }),
      resolveChild: (id) => ({
        kind: 'found',
        vertex: {
          vertexId: id,
          vertexContent: {
            $data: id,
            $childHints: id === 'left' || id === 'right' ? ['shared'] : [],
          },
        },
      }),
    },
    visitors: {
      ON_WORK_READY: (vertex) =>
        vertex.getData() === 'left'
          ? {
              commands: [
                {
                  commandName:
                    api.TraversalVisitorCommandName.SKIP_REMAINING_CHILDREN,
                },
              ],
            }
          : undefined,
    },
  });
  const expanded = expansion.createRunner().run();
  assert.equal(expanded.getResolvedGraphView().getVertexRefs().length, 4);
  const shared = expanded.getResolvedGraphView().getVertexRefById('shared');
  assert.deepEqual(
    expanded
      .getResolvedGraphView()
      .getParentsOf(shared)
      .map((ref) => ref.getValue().getData()),
    ['right'],
  );
  expansion.configure({ discovery: 'eager' });
  assert.throws(() => expansion.createRunner().run(), TypeError);
  const walkSource = api.materializeWalkSourceFromRecords([1], {
    id: (v) => v,
    outgoing: () => [],
    roots: [1],
  });
  assert.equal(typeof walkSource.roots, 'function');
  assert.equal('traversableGraph' in walkSource, false);
  assert.equal(
    api.materializeWalkSourceFromRecords,
    require('configurable-tree-traversal/traversals/graph-walk')
      .materializeWalkSourceFromRecords,
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
    'getRootPropertyFromInputObjectDefault' in api.ObjectTreeSource,
    false,
  );
  const vertex = new api.Vertex({ $data: 'root', $childHints: [] });
  for (const key of ['$d', '$c']) assert.equal(key in vertex, false);
  assert.equal('getId' in new api.MutableRef(vertex), false);
  const source = {
    resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: vertex } }),
    resolveChild: () => ({ kind: 'omitted' }),
  };
  const tree = new api.DepthFirstTreeTraversal({ traversableTree: source });
  for (const key of [
    'iterateOver',
    'enableVisitorFunctionsFor',
    'disableVisitorFunctionsFor',
  ])
    assert.throws(() => tree.createRunner().run({ [key]: [] }), TypeError);
  assert.throws(
    () =>
      tree.addVisitorFor(api.DepthFirstPhase.PRE_ORDER, {
        visitor() {},
        resolutionStyle: 'CONCURRENT',
      }),
    TypeError,
  );
  assert.throws(
    () => new api.ObjectTreeSource({}, { makeVertexHook() {} }),
    TypeError,
  );
  assert.throws(
    () =>
      api.traverseTreeDepthFirst({
        traversableTree: new api.ObjectTreeSource(
          { x: 1 },
          { resolveChildHook: () => ({ returnMe: vertex }) },
        ),
      }),
    TypeError,
  );
  for (const name of [
    'traverseTreeDepthFirst',
    'traverseTreeBreadthFirst',
    'traverseDag',
    'traverseTreeDepthFirstAsync',
    'traverseTreeBreadthFirstAsync',
    'traverseDagAsync',
  ])
    assert.throws(
      () => api[name]({ traversableTree: source }, null),
      TypeError,
    );
  for (const key of ['rootDependencies', 'implicitParentDependency'])
    assert.throws(
      () => new api.DagTraversal({ traversableTree: source, [key]: undefined }),
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
        api.traverseTreeDepthFirst({
          traversableTree: source,
          visitors: { PRE_ORDER: () => ({ commands: [{ commandName }] }) },
        }),
      TypeError,
    );
  const dag = new api.DagTraversal({
    traversableTree: source,
    workCompletion: 'externalSettlement',
  })
    .createRunner()
    .run();
  const work = dag.summary().awaitingSettlement[0];
  for (const outcome of [{ ok: true }, { ok: false, error: 'failure' }])
    assert.throws(
      () => dag.settle(work.vertexId, outcome, work.generation),
      TypeError,
    );
  assert.equal(
    dag.settle(work.vertexId, { kind: 'workCompleted' }, work.generation),
    true,
  );
  const graph = dag.getResolvedGraphView();
  for (const key of ['getIdOf', 'getVertexById', 'getStatusOf'])
    assert.equal(key in graph, false);
  assert.equal('delete' in tree.createRunner().getResolvedTreeView(), false);
  for (const result of [{ vertexContent: vertex }, { vertexContent: null }])
    assert.throws(
      () =>
        new api.DepthFirstTreeTraversal({
          traversableTree: { ...source, resolveRoot: () => result },
        })
          .createRunner()
          .run(),
      TypeError,
    );
  assert.throws(
    () => api.defineDag({ entry: { kind: 'forest', slots: [] }, vertices: [] }),
    TypeError,
  );
}
console.log(
  'Verified idiomatic API envelopes, identity, copied topology and retired runtime surface through all nine packed routes.',
);

for (const api of [esm, cjs]) {
  const traversal = new api.DepthFirstTreeTraversal({
    traversableTree: new api.ObjectTreeSource(['a', 'b', 'c', 'd']),
    inOrder: { afterChildIndices: { indices: [0, 2] } },
  });
  traversal.configure({
    traversableTree: undefined,
    inOrder: { afterChildIndices: undefined },
  });
  assert.equal(
    [
      ...traversal
        .createRunner()
        .iterateEvents({ emitEvents: [api.DepthFirstPhase.IN_ORDER] }),
    ].length,
    6,
  );
  assert.throws(
    () => traversal.configure({ inOrder: { afterChildIndices: [0, 2] } }),
    TypeError,
  );
  assert.throws(
    () => traversal.configure({ [Symbol('unsupported')]: undefined }),
    TypeError,
  );
  assert.equal(
    traversal.createRunner().run().getStatus(),
    api.TraversalRunnerStatus.FINISHED,
  );
}

for (const api of [esm, cjs]) {
  const runner = new api.DepthFirstTreeTraversal({
    traversableTree: new api.ObjectTreeSource(1),
  })
    .createRunner()
    .run();
  const view = runner.getResolvedTreeView();
  const root = view.getRoot();
  assert.deepEqual(view.requirePathTo(root, { noRoot: undefined }), [root]);
  assert.throws(() => view.requirePathTo(root, { noRot: true }), TypeError);
}
