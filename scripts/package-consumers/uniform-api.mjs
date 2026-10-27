import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');

assert.equal(esm.TraversalVisitorCommandName, cjs.TraversalVisitorCommandName);
assert.equal(esm.core.Vertex, cjs.core.Vertex);
assert.equal('DEFER_READY' in esm, false);
assert.equal('DEFER_READY' in cjs, false);

for (const [api, other] of [
  [cjs, esm],
  [esm, cjs],
]) {
  const { TraversalVisitorCommandName: Command, DagVisitorPhase: Order } = api;
  const legacyVertex = new api.core.Vertex({
    $data: 'legacy',
    $childHints: [],
  });
  assert(legacyVertex instanceof other.core.Vertex);
  assert.deepEqual({ ...legacyVertex }, { $data: 'legacy', $childHints: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(legacyVertex)), {
    $data: 'legacy',
    $childHints: [],
  });
  assert.equal(legacyVertex.$data, legacyVertex.$data);
  assert.equal(legacyVertex.$childHints, legacyVertex.$childHints);
  assert.equal(legacyVertex.clone({ $data: undefined }).getData(), undefined);
  assert.throws(() => new api.core.Vertex({ $data: '', $c: [] }), TypeError);
  assert.throws(() => new api.core.Vertex({ $d: 'old', $c: [] }), TypeError);

  const found = (id, hints = [], declarations = {}) => ({
    kind: 'found',
    vertex: {
      vertexId: id,
      vertexContent: { $data: id, $childHints: hints },
      ...declarations,
    },
  });
  const treeFound = (id, hints = []) => ({
    kind: 'found',
    vertex: { vertexContent: { $data: id, $childHints: hints } },
  });
  const tree = {
    resolveRoot: () => treeFound('root', ['leaf', 'skip']),
    resolveChild: (id) => (id === 'skip' ? { kind: 'omitted' } : treeFound(id)),
  };
  const graphTree = {
    resolveRoot: () => found('root', ['leaf']),
    resolveChild: (id) => found(id),
  };
  const families = [
    ['traverseTreeDepthFirst', api.DepthFirstPhase.POST_ORDER],
    ['traverseTreeBreadthFirst', api.BreadthFirstPhase.LEVEL_ORDER],
    ['traverseDag', Order.ON_WORK_READY],
  ];
  for (const [helper, phase] of families) {
    for (const suffix of ['', 'Async']) {
      const visits = [];
      const options = {
        traversableTree: tree,
        visitors: {
          [phase]: (vertex) => {
            visits.push(vertex.getData());
          },
        },
      };
      const runner = await api[helper + suffix](options);
      assert.equal(runner.getStatus(), 'FINISHED');
      assert.equal(runner.getStopReason(), 'finished');
      assert.equal(runner.inspect().stopReason, 'finished');
      const view = runner.getResolvedTreeView();
      assert.equal(view, runner.getResolvedTreeView());
      assert.equal(typeof view.add, 'undefined');
      const root = view.getRoot();
      const detached = view.getChildrenOf(root);
      detached.length = 0;
      assert.equal(view.getChildrenOf(root).length, 1);
      const child = view.getChildrenOf(root)[0];
      const context = view.getResolutionContextOf(child);
      context.depth = 100;
      assert.notEqual(view.getResolutionContextOf(child).depth, 100);
      assert.equal(root.getRefId(), root.getRefId());

      assert.deepEqual(
        visits,
        helper === 'traverseTreeDepthFirst'
          ? ['leaf', 'root']
          : ['root', 'leaf'],
      );
      const groupCalls = [];
      await api[helper + suffix]({
        ...options,
        visitors: {
          [phase]: {
            groups: [
              {
                visitors: [
                  {
                    visitor: () => {
                      groupCalls.push('first');
                    },
                    priority: 1,
                  },
                ],
                commandCommitMode: 'afterGroup',
              },
              { visitors: [] },
              {
                visitors: [
                  {
                    visitor: () => {
                      groupCalls.push('second');
                    },
                    priority: 1000,
                  },
                ],
              },
            ],
          },
        },
      });
      assert.deepEqual(groupCalls, ['first', 'second', 'first', 'second']);
      const legacyVisitors =
        helper === 'traverseTreeDepthFirst'
          ? { postOrderVisitor: () => {} }
          : helper === 'traverseDag'
          ? { onReadyVisitor: () => {} }
          : () => {};
      const legacySource =
        helper === 'traverseDag' ? { traversableTree: tree } : tree;
      assert.throws(
        () => api[helper + suffix](legacySource, legacyVisitors),
        TypeError,
      );
    }
  }

  for (const asyncMode of [false, true]) {
    const TreeTraversal = asyncMode ? api.AsyncDagTraversal : api.DagTraversal;
    // The ordinary root's W applies even without seeds, eager discovery or lookup.
    const blocked = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () => found('root', [], { dependsOnWork: ['absent'] }),
        resolveChild: (id) => found(id),
      },
    }).createRunner();
    if (asyncMode)
      await assert.rejects(blocked.run(), api.DagTraversalStallError);
    else assert.throws(() => blocked.run(), api.DagTraversalStallError);
    const ignored = new TreeTraversal({
      rootDependencies: 'ignore',
      traversableGraph: {
        resolveRoot: () => found('root', [], { dependsOnWork: ['absent'] }),
        resolveChild: (id) => found(id),
      },
    }).createRunner();
    await ignored.run();
    assert.equal(ignored.getStatus(), 'FINISHED');

    for (const inherit of [false, true]) {
      const traversal = new TreeTraversal({
        implicitParentDependency: inherit,
        traversableGraph: graphTree,
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
        commands: [
          {
            commandName:
              other.TraversalVisitorCommandName.DEFER_WORK_COMPLETION,
          },
        ],
      }));
      const runner = traversal.createRunner();
      await runner.run();
      assert.deepEqual(
        runner.summary().readyOrDeferredIds,
        inherit ? ['root'] : ['root', 'leaf'],
      );
      const generation = runner.summary().vertices.get('root').generation;
      assert.equal(
        runner.settle('root', { kind: 'workCompleted' }, generation),
        true,
      );
      assert.equal(
        runner.settle('root', { kind: 'workCompleted' }, generation),
        false,
      );
      assert.equal(runner.summary().vertices.get('root').work, 'completed');
      await runner.run();
      const leafGeneration = runner.summary().vertices.get('leaf').generation;
      runner.settle('leaf', { kind: 'workCompleted' }, leafGeneration);
      await runner.run();
      assert.equal(runner.getStatus(), 'FINISHED');
    }

    for (const entry of ['constructor', 'configure']) {
      let reads = 0;
      const input = {
        traversableGraph: {
          resolveRoot: () => found('owned'),
          resolveChild: (id) => found(id),
        },
        get workCompletion() {
          return ++reads === 1 ? 'externalSettlement' : 'visitorReturn';
        },
      };
      const traversal =
        entry === 'constructor'
          ? new TreeTraversal(input)
          : new TreeTraversal({ traversableGraph: input.traversableGraph });
      if (entry === 'configure') traversal.configure(input);
      assert.equal('DagTraversalRunner' in api, false);
      assert.equal('AsyncDagTraversalRunner' in api, false);
      const runner = traversal.createRunner();
      await runner.run();
      assert.deepEqual(runner.summary().completedWorkIds, []);
      assert.deepEqual(runner.summary().deferredWorkIds, ['owned']);
      assert.equal(runner.getStopReason(), 'awaitingSettlement');
      assert.equal(reads, 1);
    }

    const external = new TreeTraversal({
      workCompletion: 'externalSettlement',
      retainOriginalGraphStructure: true,
      traversableGraph: {
        resolveRoot: () => found(undefined),
        resolveChild: (id) => found(id),
      },
    }).createRunner();
    const deferredEvents = [];
    for await (const event of external.iterateEvents({
      emitEvents: ['workCompleted'],
      visitorPhases: { include: [] },
    }))
      deferredEvents.push(event);
    assert.deepEqual(deferredEvents, []);
    assert.equal(external.getStopReason(), 'awaitingSettlement');
    assert.equal(external.inspect().stopReason, 'awaitingSettlement');
    assert.equal(external.getResolvedTreeView(), null);
    const graph = external.getResolvedGraph();
    const ref = graph.getVertexRefById(undefined);
    assert.equal(ref, graph.getVertexRefById(undefined));
    assert.equal(graph.getVertexId(ref), graph.getVertexId(ref));
    const saved = external.originalGraphView;
    const savedRef = saved.getVertexRefById(undefined);
    assert.equal(saved.getVertexId(savedRef), undefined);
    assert.equal(savedRef, saved.getVertexRefById(undefined));
    const token = external.summary().vertices.get(undefined).generation;
    external.settle(undefined, { kind: 'workCompleted' }, token);
    assert.equal(external.getStopReason(), 'awaitingSettlement');
    // Emission-only update retains callback selection; ON_WORK_READY now emits.
    for await (const event of external.iterateEvents({
      emitEvents: ['workCompleted'],
    }))
      deferredEvents.push(event);
    assert.equal(deferredEvents.length, 1);
    assert.equal(external.getStopReason(), 'finished');

    const selectedCalls = [];
    const selected = new TreeTraversal({
      traversableTree: tree,
      visitors: {
        [Order.ON_WORK_READY]: {
          visitor: () => {
            selectedCalls.push('ready');
          },
          priority: 1,
        },
      },
    }).createRunner();
    await selected.run({ emitEvents: [], visitorPhases: { exclude: [] } });
    assert.deepEqual(selectedCalls, ['ready', 'ready']);
    const legacySelected = new TreeTraversal({
      traversableTree: tree,
      visitors: {
        [Order.ON_WORK_READY]: () => {
          selectedCalls.push('legacy');
        },
      },
    }).createRunner();
    await legacySelected.run({
      emitEvents: [],
      visitorPhases: { include: [Order.ON_WORK_READY] },
    });
    assert.deepEqual(selectedCalls, ['ready', 'ready', 'legacy', 'legacy']);

    const events = [];
    const batched = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () => found('root'),
        resolveChild: (id) => found(id),
      },
    });
    batched.addVisitorFor(
      Order.ON_WORK_READY,
      (vertex) => {
        events.push(vertex.getData());
      },
      { priority: 1000 },
    );
    batched.addVisitorFor(
      Order.ON_WORK_READY,
      () => {
        events.push('group');
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'changed' },
            },
          ],
        };
      },
      { commandCommitMode: 'afterGroup', priority: 1 },
    );
    batched.addVisitorFor(
      Order.ON_WORK_READY,
      (vertex) => {
        events.push(vertex.getData());
      },
      {
        commandCommitMode: 'afterGroup',
        priority: 0,
      },
    );
    await batched.createRunner().run();
    assert.deepEqual(events, ['root', 'group', 'root']);

    // Consumers that intend group-first execution express explicit ordered groups.
    const [high, ...low] = batched.listVisitorsFor(Order.ON_WORK_READY);
    batched.setVisitorsFor(Order.ON_WORK_READY, {
      groups: [
        {
          commandCommitMode: 'afterGroup',
          visitors: low.map(({ visitor, priority }) => ({ visitor, priority })),
        },
        { visitors: [{ visitor: high.visitor, priority: high.priority }] },
      ],
    });
    batched.setVisitorsFor(
      Order.ON_WORK_READY,
      batched.listVisitorsFor(Order.ON_WORK_READY),
    );
    events.length = 0;
    await batched.createRunner().run();
    assert.deepEqual(events, ['group', 'root', 'changed']);

    const fatal = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () => found('fatal'),
        resolveChild: (id) => found(id),
      },
    });
    fatal.addVisitorFor(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName: other.TraversalVisitorCommandName.DEFER_WORK_COMPLETION,
        },
      ],
    }));
    const fatalRunner = fatal.createRunner();
    await fatalRunner.run();
    const generation = fatalRunner.summary().vertices.get('fatal').generation;
    const error = { exact: 'value' };
    fatalRunner.settle('fatal', { kind: 'traversalFailed', error }, generation);
    assert.equal(
      fatalRunner.settle(
        'fatal',
        { kind: 'traversalFailed', error },
        generation,
      ),
      false,
    );
    let caught;
    try {
      await fatalRunner.run();
    } catch (value) {
      caught = value;
    }
    assert.equal(caught, error);

    const lookup = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () =>
          found('app', [], {
            dependsOnWork: ['optional'],
            dependsOnSubgraphCompletion: ['optional'],
          }),
        resolveChild: (id) => found(id),
        resolvePrerequisite: () => ({
          kind: 'omitted',
          satisfiesDependencies: true,
        }),
      },
    }).createRunner();
    await lookup.run();
    assert.equal(lookup.summary().vertices.get('app').work, 'completed');
  }

  assert.throws(
    () => new api.ObjectTreeSource({}, { makeVertexHook: () => ({}) }),
    TypeError,
  );
  for (const hook of [
    {
      resolveVertexHook: (hint) =>
        hint.key === 'skip' ? { kind: 'omitted' } : { kind: 'useDefault' },
    },
    {
      resolveVertexHook: (hint) =>
        hint.key === 'skip' ? { kind: 'omitted' } : { kind: 'useDefault' },
    },
  ]) {
    const result = api.rewriteObject(
      { keep: 1, skip: 2 },
      {
        ...hook,
        rewrite: ({ key }) =>
          key === 'keep' ? { rewrite: { value: undefined } } : undefined,
      },
    );
    assert.deepEqual(result.outputAtReturn, { keep: undefined });
  }
  assert.throws(
    () =>
      api.rewriteObject(
        { a: 1 },
        {
          rewrite: () => ({ rewrite: undefined }),
        },
      ),
    TypeError,
  );
  for (const field of [
    'vertexId',
    'dependsOnWork',
    'dependsOnSubgraphCompletion',
    'satisfiesDependencies',
  ]) {
    assert.throws(
      () =>
        api.traverseTreeDepthFirst({
          traversableTree: {
            resolveRoot: () => ({
              kind: 'found',
              vertex: {
                [field]: undefined,
                vertexContent: { $data: '', $childHints: [] },
              },
            }),
            resolveChild: () => treeFound('unused'),
          },
        }),
      TypeError,
    );
  }

  for (const commandName of [
    Command.REWRITE_CHILD_HINTS,
    Command.REWRITE_CHILD_HINTS,
  ]) {
    const visits = [];
    api.traverseTreeDepthFirst({
      traversableTree: tree,
      visitors: {
        [api.DepthFirstPhase.PRE_ORDER]: (vertex) => {
          visits.push(vertex.getData());
          return {
            commands: [{ commandName, commandArguments: { newHints: [] } }],
          };
        },
      },
    });
    assert.deepEqual(visits, ['root']);
  }
}
