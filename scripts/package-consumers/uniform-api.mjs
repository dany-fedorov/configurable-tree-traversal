import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');

assert.equal(esm.TraversalVisitorCommandName, cjs.TraversalVisitorCommandName);
assert.equal(esm.core.Vertex, cjs.core.Vertex);
assert.equal(esm.DEFER_READY, cjs.DEFER_READY);

for (const [api, other] of [
  [cjs, esm],
  [esm, cjs],
]) {
  const { TraversalVisitorCommandName: Command, DagTraversalOrder: Order } =
    api;
  const legacyVertex = new api.core.Vertex({ $d: 'legacy', $c: [] });
  assert(legacyVertex instanceof other.core.Vertex);
  assert.deepEqual({ ...legacyVertex }, { $data: 'legacy', $childHints: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(legacyVertex)), {
    $data: 'legacy',
    $childHints: [],
  });
  assert.equal(legacyVertex.$d, legacyVertex.$data);
  assert.equal(legacyVertex.$c, legacyVertex.$childHints);
  assert.equal(legacyVertex.clone({ $data: undefined }).getData(), undefined);
  assert.throws(() => new api.core.Vertex({ $data: '', $c: [] }), TypeError);

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
    makeRoot: () => treeFound('root', ['leaf', 'skip']),
    makeVertex: (id) =>
      id === 'skip'
        ? { kind: 'omitted', satisfiesDependencies: true }
        : treeFound(id),
  };
  const graphTree = {
    makeRoot: () => found('root', ['leaf']),
    makeVertex: (id) => found(id),
  };
  const families = [
    ['traverseDepthFirst', api.DepthFirstTraversalOrder.POST_ORDER],
    ['traverseBreadthFirst', api.BreadthFirstTraversalOrder.LEVEL_ORDER],
    ['traverseDag', Order.ON_READY],
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
      assert.deepEqual(
        visits,
        helper === 'traverseDepthFirst' ? ['leaf', 'root'] : ['root', 'leaf'],
      );
      const legacyVisitors =
        helper === 'traverseDepthFirst'
          ? { postOrderVisitor: () => {} }
          : helper === 'traverseDag'
          ? { onReadyVisitor: () => {} }
          : () => {};
      const legacySource =
        helper === 'traverseDag' ? { traversableTree: tree } : tree;
      assert.equal(
        (await api[helper + suffix](legacySource, legacyVisitors)).getStatus(),
        'FINISHED',
      );
    }
  }

  for (const asyncMode of [false, true]) {
    const Traversal = asyncMode ? api.AsyncDagTraversal : api.DagTraversal;
    // The ordinary root's W applies even without seeds, eager discovery or lookup.
    const blocked = new Traversal({
      traversableGraph: {
        makeRoot: () => found('root', [], { dependsOn: ['absent'] }),
        makeVertex: (id) => found(id),
      },
    }).makeRunner();
    if (asyncMode)
      await assert.rejects(blocked.run(), api.DagTraversalStallError);
    else assert.throws(() => blocked.run(), api.DagTraversalStallError);
    const ignored = new Traversal({
      rootDependencies: 'ignore',
      traversableGraph: {
        makeRoot: () => found('root', [], { dependsOn: ['absent'] }),
        makeVertex: (id) => found(id),
      },
    }).makeRunner();
    await ignored.run();
    assert.equal(ignored.getStatus(), 'FINISHED');

    for (const inherit of [false, true]) {
      const traversal = new Traversal({
        implicitParentDependency: inherit,
        traversableGraph: graphTree,
      });
      traversal.addVisitorFor(Order.ON_READY, () => ({
        commands: [
          { commandName: other.TraversalVisitorCommandName.DEFER_READY },
        ],
      }));
      const runner = traversal.makeRunner();
      await runner.run();
      assert.deepEqual(
        runner.summary().readyIds,
        inherit ? ['root'] : ['root', 'leaf'],
      );
      const generation = runner.summary().vertices.get('root').generation;
      assert.equal(
        runner.settle('root', { kind: 'workCompleted' }, generation),
        true,
      );
      assert.equal(runner.settle('root', { ok: true }, generation), false);
      assert.equal(runner.summary().vertices.get('root').work, 'completed');
      await runner.run();
      const leafGeneration = runner.summary().vertices.get('leaf').generation;
      runner.settle('leaf', { ok: true }, leafGeneration);
      await runner.run();
      assert.equal(runner.getStatus(), 'FINISHED');
    }

    const events = [];
    const batched = new Traversal({
      traversableGraph: {
        makeRoot: () => found('root'),
        makeVertex: (id) => found(id),
      },
    });
    batched.addVisitorFor(
      Order.ON_READY,
      (vertex) => {
        events.push(vertex.getData());
      },
      { priority: 1000 },
    );
    batched.addVisitorFor(
      Order.ON_READY,
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
      Order.ON_READY,
      (vertex) => {
        events.push(vertex.getData());
      },
      {
        resolutionStyle: api.TraversalVisitorFunctionResolutionStyle.CONCURRENT,
        priority: 0,
      },
    );
    await batched.makeRunner().run();
    assert.deepEqual(events, ['root', 'group', 'root']);

    // Consumers that intend group-first execution express explicit ordered groups.
    const [high, ...low] = batched.listVisitorsFor(Order.ON_READY);
    batched.setVisitorsFor(Order.ON_READY, {
      groups: [
        {
          commandCommitMode: 'afterGroup',
          visitors: low.map(({ visitor, priority }) => ({ visitor, priority })),
        },
        { visitors: [{ visitor: high.visitor, priority: high.priority }] },
      ],
    });
    batched.setVisitorsFor(Order.ON_READY, batched.listVisitorsFor(Order.ON_READY));
    events.length = 0;
    await batched.makeRunner().run();
    assert.deepEqual(events, ['group', 'root', 'changed']);

    const fatal = new Traversal({
      traversableGraph: {
        makeRoot: () => found('fatal'),
        makeVertex: (id) => found(id),
      },
    });
    fatal.addVisitorFor(Order.ON_READY, () => other.DEFER_READY);
    const fatalRunner = fatal.makeRunner();
    await fatalRunner.run();
    const generation = fatalRunner.summary().vertices.get('fatal').generation;
    const error = { exact: 'value' };
    fatalRunner.settle('fatal', { kind: 'traversalFailed', error }, generation);
    assert.equal(
      fatalRunner.settle('fatal', { ok: false, error }, generation),
      false,
    );
    let caught;
    try {
      await fatalRunner.run();
    } catch (value) {
      caught = value;
    }
    assert.equal(caught, error);

    const lookup = new Traversal({
      traversableGraph: {
        makeRoot: () =>
          found('app', [], {
            dependsOn: ['optional'],
            dependsOnComplete: ['optional'],
          }),
        makeVertex: (id) => found(id),
        resolvePrerequisite: () => ({
          kind: 'omitted',
          satisfiesDependencies: true,
        }),
      },
    }).makeRunner();
    await lookup.run();
    assert.equal(lookup.summary().vertices.get('app').work, 'completed');
  }

  for (const commandName of [
    Command.REWRITE_CHILD_HINTS,
    Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
  ]) {
    const visits = [];
    api.traverseDepthFirst({
      traversableTree: tree,
      visitors: {
        [api.DepthFirstTraversalOrder.PRE_ORDER]: (vertex) => {
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
