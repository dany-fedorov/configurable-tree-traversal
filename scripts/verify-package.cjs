const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ctt-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
try {
  const pack = JSON.parse(
    execFileSync(
      npm,
      ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
      { cwd: root, encoding: 'utf8' },
    ),
  )[0];
  const consumer = path.join(temporary, 'consumer');
  const install = path.join(
    consumer,
    'node_modules',
    'configurable-tree-traversal',
  );
  fs.mkdirSync(install, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    path.join(temporary, pack.filename),
    '-C',
    install,
    '--strip-components=1',
  ]);
  // Use already installed runtime dependencies; resolution of the package itself
  // is isolated from this checkout, and requires neither source aliases nor ts-node.
  for (const name of Object.keys(
    require('../package.json').dependencies || {},
  )) {
    fs.symlinkSync(
      path.join(root, 'node_modules', name),
      path.join(consumer, 'node_modules', name),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'commonjs' }),
  );
  fs.writeFileSync(
    path.join(consumer, 'consumer.cjs'),
    `
    const assert = require('node:assert/strict');
    const lib = require('configurable-tree-traversal');
    const core = require('configurable-tree-traversal/core');
    const depth = require('configurable-tree-traversal/traversals/depth-first-traversal');
    const breadth = require('configurable-tree-traversal/traversals/breadth-first-traversal');
    const dag = require('configurable-tree-traversal/traversals/dag-traversal');
    const objectTree = require('configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree');
    const rewrite = require('configurable-tree-traversal/tools/rewrite-object');
    const vertex = require('configurable-tree-traversal/core/Vertex');
    const explicitVertex = require('configurable-tree-traversal/core/Vertex.js');
    const depthRunner = require('configurable-tree-traversal/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner');
    const dagRunner = require('configurable-tree-traversal/traversals/dag-traversal/lib/DagTraversalRunner');
    assert.equal(core.Vertex, lib.core.Vertex);
    assert.equal(depth.DepthFirstTraversal, lib.DepthFirstTraversal);
    assert.equal(breadth.BreadthFirstTraversal, lib.BreadthFirstTraversal);
    assert.equal(depth.AsyncDepthFirstTraversal, lib.AsyncDepthFirstTraversal);
    assert.equal(breadth.AsyncBreadthFirstTraversal, lib.AsyncBreadthFirstTraversal);
    assert.equal(dag.DagTraversal, lib.DagTraversal);
    assert.equal(dag.AsyncDagTraversal, lib.AsyncDagTraversal);
    assert.equal(objectTree.TraversableObjectTree, lib.TraversableObjectTree);
    assert.equal(rewrite.rewriteObject, lib.rewriteObject.rewriteObject);
    assert.equal(vertex.Vertex, lib.core.Vertex);
    assert.equal(explicitVertex.Vertex, lib.core.Vertex);
    assert.equal(depthRunner.DepthFirstTraversalRunner, depth.DepthFirstTraversalRunner);
    assert.equal(dagRunner.DagTraversalRunner, dag.DagTraversalRunner);
    assert.equal(depth.traverseDepthFirst, lib.traverseDepthFirst);
    assert.equal(depth.traverseDepthFirstAsync, lib.traverseDepthFirstAsync);
    assert.equal(breadth.traverseBreadthFirst, lib.traverseBreadthFirst);
    assert.equal(breadth.traverseBreadthFirstAsync, lib.traverseBreadthFirstAsync);
    assert.equal(dag.traverseDag, lib.traverseDag);
    assert.equal(dag.traverseDagAsync, lib.traverseDagAsync);
    assert.equal(lib.TraversalRunnerStatus.FAILED, 'FAILED');

    const tree = new lib.TraversableObjectTree({ a: { b: 1 }, c: 2 });
    const depthVisits = [...new lib.DepthFirstTraversal({ traversableTree: tree }).makeRunner().getIterable({
      iterateOver: [lib.DepthFirstTraversalOrder.POST_ORDER],
    })].map(event => event.vertex.getData().key).slice(0, -1);
    assert.deepEqual(depthVisits, ['b', 'a', 'c']);
    const breadthVisits = [...new lib.BreadthFirstTraversal({ traversableTree: tree }).makeRunner().getIterable()]
      .map(event => event.vertex.getData().key).slice(1);
    assert.deepEqual(breadthVisits, ['a', 'c', 'b']);
    assert.deepEqual(lib.rewriteObject.rewriteObject({ a: 1 }).outputObject, { a: 1 });
    assert.equal(lib.rewriteObject.rewriteObject(null).outputObject, null);
  `,
  );
  execFileSync(process.execPath, ['consumer.cjs'], {
    cwd: consumer,
    stdio: 'inherit',
  });
  fs.writeFileSync(
    path.join(consumer, 'consumer.mjs'),
    `
    import assert from 'node:assert/strict';
    import lib, { AsyncDepthFirstTraversal as RootAsyncDepthFirstTraversal } from 'configurable-tree-traversal';
    import { DepthFirstTraversal } from 'configurable-tree-traversal/traversals/depth-first-traversal';
    import { BreadthFirstTraversal } from 'configurable-tree-traversal/traversals/breadth-first-traversal';
    import { AsyncDagTraversal, DagTraversal, DagTraversalOrder } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { TraversableObjectTree } from 'configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree';
    import { rewriteObject } from 'configurable-tree-traversal/tools/rewrite-object';
    import { Vertex } from 'configurable-tree-traversal/core/Vertex';
    import { Vertex as ExplicitVertex } from 'configurable-tree-traversal/core/Vertex.js';
    assert.equal(RootAsyncDepthFirstTraversal, lib.AsyncDepthFirstTraversal);
    assert.equal(DepthFirstTraversal, lib.DepthFirstTraversal);
    assert.equal(BreadthFirstTraversal, lib.BreadthFirstTraversal);
    assert.equal(DagTraversal, lib.DagTraversal);
    assert.equal(AsyncDagTraversal, lib.AsyncDagTraversal);
    assert.equal(TraversableObjectTree, lib.TraversableObjectTree);
    assert.equal(rewriteObject, lib.rewriteObject.rewriteObject);
    assert.equal(Vertex, lib.core.Vertex);
    assert.equal(ExplicitVertex, lib.core.Vertex);

    const runner = new AsyncDagTraversal({
      traversableGraph: {
        makeRoot: async () => ({
          vertexId: 'root', vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: async () => ({ vertexContent: null }),
      },
    }).makeRunner();
    const orders = [];
    for await (const event of runner.getIterable()) orders.push(event.order);
    assert.deepEqual(orders, [DagTraversalOrder.ON_READY, DagTraversalOrder.ON_COMPLETE]);
    const inspection = runner.inspect();
    assert.equal(inspection.execution, 'async');
    assert.equal(inspection.inFlightCallbackCount, 0);
    assert.equal(inspection.bufferedEventCount, 0);
    assert.equal(Object.isFrozen(inspection), true);
  `,
  );
  execFileSync(process.execPath, ['consumer.mjs'], {
    cwd: consumer,
    stdio: 'inherit',
  });
  fs.writeFileSync(
    path.join(consumer, 'consumer.ts'),
    `
    import { AsyncBreadthFirstTraversal, AsyncDagTraversal, AsyncDepthFirstTraversal, DepthFirstTraversal, DepthFirstTraversalOrder, BreadthFirstTraversal, DagTraversal, DagTraversalOrder, TraversableObjectTree, TraversalRunnerStatus, TraversalVisitorCommandName, core, rewriteObject, traverseBreadthFirstAsync, traverseDag, traverseDagAsync, traverseDepthFirst, traverseDepthFirstAsync } from 'configurable-tree-traversal';
    import type { AsyncTraversableGraph, ChildSlot, CoreInspection, GraphEdge, GraphVertex, GraphVertexStatus, HintVertexId, MaybePromise, ResolvedGraph, TraversalRunner, TraversableGraph, TraversableTree, TreeTypeParameters, TraversalVisitorCommand, VertexId } from 'configurable-tree-traversal';
    import type { ChildSlot as CoreChildSlot, GraphEdge as CoreGraphEdge, GraphVertex as CoreGraphVertex, GraphVertexStatus as CoreGraphVertexStatus, HintVertexId as CoreHintVertexId, MaybePromise as CoreMaybePromise, VertexId as CoreVertexId } from 'configurable-tree-traversal/core';
    import type { DepthFirstTraversalRunnerIterableConfigInput } from 'configurable-tree-traversal/traversals/depth-first-traversal';
    import type { DagTraversalRunnerIterableConfigInput } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { Vertex } from 'configurable-tree-traversal/core/Vertex';
    import { Vertex as ExplicitVertex } from 'configurable-tree-traversal/core/Vertex.js';

    type Node = { $d: string; $c: (Node | null)[] };
    type Tree = TreeTypeParameters<string, Node | null>;
    const abstractRoot: Node = { $d: 'root', $c: [{ $d: 'leaf', $c: [] }] };
    const abstractTree: TraversableTree<Tree> = {
      makeRoot: () => ({ vertexContent: abstractRoot }),
      makeVertex: hint => ({ vertexContent: hint }),
    };
    const abstractTraversal = new DepthFirstTraversal({ traversableTree: abstractTree });
    abstractTraversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => ({
      commands: [{
        commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
        commandArguments: { newData: 'changed' },
      }],
    }));
    const runnerInterface: TraversalRunner<DepthFirstTraversalOrder, Tree, Tree> = abstractTraversal.makeRunner();
    runnerInterface.getIterable();
    runnerInterface.run({ iterateOver: [] });
    const command: TraversalVisitorCommand<Tree> = {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: 'typed' },
    };
    if (command.commandName === TraversalVisitorCommandName.REWRITE_VERTEX_DATA) {
      const rewritten: string = command.commandArguments.newData;
      void rewritten;
    }
    const convenience = traverseDepthFirst(abstractTree, {
      postOrderVisitor: vertex => { const data: string = vertex.getData(); void data; },
    });

    const tree = new TraversableObjectTree({ a: 1 });
    const config: DepthFirstTraversalRunnerIterableConfigInput = { iterateOver: [] };
    const runner = new DepthFirstTraversal({ traversableTree: tree }).makeRunner().run(config);
    const status: TraversalRunnerStatus = runner.getStatus();
    const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;
    const value: number | null = rewriteObject.rewriteObject(1).outputObject;
    const bfs = new BreadthFirstTraversal({ traversableTree: tree }).makeRunner();
    for (const { vertex } of bfs.getIterable()) { const key: string | number | symbol = vertex.getData().key; void key; }
    const graph: TraversableGraph<Tree> = {
      makeRoot: () => ({ vertexId: 'root', vertexContent: abstractRoot }),
      makeVertex: hint => ({ vertexId: hint, vertexContent: hint }),
      getVertexIdFromHint: hint => ({ vertexId: hint }),
    };
    const asyncGraph: AsyncTraversableGraph<Tree> = graph;
    const dagConfig: DagTraversalRunnerIterableConfigInput = { iterateOver: [DagTraversalOrder.ON_READY] };
    const dag = new DagTraversal({ traversableGraph: graph }).makeRunner();
    const resolvedGraph: ResolvedGraph<Tree> = dag.run(dagConfig).getResolvedGraph();
    const asyncDepth = new AsyncDepthFirstTraversal({ traversableTree: abstractTree }).makeRunner();
    const asyncBreadth = new AsyncBreadthFirstTraversal({ traversableTree: abstractTree }).makeRunner();
    const asyncDag = new AsyncDagTraversal({ traversableGraph: asyncGraph, concurrency: 2 }).makeRunner();
    const inspection: CoreInspection = asyncDag.inspect();
    const publicTypes: [VertexId, HintVertexId, MaybePromise<string>, GraphVertexStatus, GraphEdge<Tree> | null, ChildSlot<Tree> | null, GraphVertex<Tree> | null, CoreVertexId, CoreHintVertexId, CoreMaybePromise<string>, CoreGraphVertexStatus, CoreGraphEdge<Tree> | null, CoreChildSlot<Tree> | null, CoreGraphVertex<Tree> | null] = ['id', { vertexId: 'id' }, 'value', 'READY', null, null, null, 'core-id', { vertexId: 'core-id' }, Promise.resolve('value'), 'COMPLETE', null, null, null];
    const asyncRuns: Promise<unknown>[] = [
      asyncDepth.run(), asyncBreadth.run(), asyncDag.run(),
      traverseDepthFirstAsync(abstractTree, null),
      traverseBreadthFirstAsync(abstractTree, null),
      traverseDagAsync({ traversableGraph: asyncGraph }, null),
    ];
    const syncDag = traverseDag({ traversableGraph: graph }, null);
    void [Vertex, ExplicitVertex, core.Vertex, value, status, failedStatus, convenience, resolvedGraph, inspection, publicTypes, asyncRuns, syncDag];
  `,
  );
  for (const resolution of ['node', 'node16']) {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules/typescript/bin/tsc'),
        '--strict',
        '--noEmit',
        '--target',
        'ES2020',
        '--module',
        resolution === 'node16' ? 'Node16' : 'commonjs',
        '--moduleResolution',
        resolution,
        'consumer.ts',
      ],
      { cwd: consumer, stdio: 'inherit' },
    );
  }
  for (const expected of [
    'README.md',
    'Sorted_binary_tree_ALL_RGB.svg.png',
    'CHANGELOG.md',
    'LICENSE',
    'docs/testing.md',
    'dist/index.js',
    'dist/index.d.ts',
    'dist/core/index.js',
    'dist/core/index.d.ts',
    'dist/core/Vertex.js',
    'dist/core/Vertex.d.ts',
    'dist/traversals/depth-first-traversal/index.js',
    'dist/traversals/depth-first-traversal/index.d.ts',
    'dist/traversals/breadth-first-traversal/index.js',
    'dist/traversals/breadth-first-traversal/index.d.ts',
    'dist/traversals/dag-traversal/index.js',
    'dist/traversals/dag-traversal/index.d.ts',
    'dist/traversals/dag-traversal/lib/DagTraversalRunner.js',
    'dist/traversals/dag-traversal/lib/DagTraversalRunner.d.ts',
    'dist/traversable-tree-implementations/traversable-object-tree/index.js',
    'dist/traversable-tree-implementations/traversable-object-tree/index.d.ts',
    'dist/tools/rewrite-object/index.js',
    'dist/tools/rewrite-object/index.d.ts',
  ]) {
    assert(
      pack.files.some((file) => file.path === expected),
      `${expected} was not packed`,
    );
  }
  assert(
    !pack.files.some(
      (file) => file.path.startsWith('tests/') || file.path.startsWith('src/'),
    ),
  );
  assert.deepEqual(
    fs.readFileSync(path.join(install, 'Sorted_binary_tree_ALL_RGB.svg.png')),
    fs.readFileSync(path.join(root, 'Sorted_binary_tree_ALL_RGB.svg.png')),
    'The packaged traversal diagram must match the README image',
  );
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(install, 'package.json'), 'utf8'))
      .version,
    '0.8.0',
  );
  console.log(
    `Verified packed package: CommonJS, ESM, TypeScript node/node16, and historical deep imports (${pack.entryCount} files).`,
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
