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
    assert.equal(core.Vertex, lib.core.Vertex);
    assert.equal(core.MutableRef, lib.MutableRef);
    assert.equal(core.TreeVertexRecord, lib.TreeVertexRecord);
    assert.equal(rewrite.rewriteObject, lib.objectRewrite.rewriteObject);
    assert.equal(depth.DepthFirstTreeTraversal, lib.DepthFirstTreeTraversal);
    assert.equal(breadth.BreadthFirstTreeTraversal, lib.BreadthFirstTreeTraversal);
    assert.equal(depth.AsyncDepthFirstTreeTraversal, lib.AsyncDepthFirstTreeTraversal);
    assert.equal(breadth.AsyncBreadthFirstTreeTraversal, lib.AsyncBreadthFirstTreeTraversal);
    assert.equal(dag.DagTraversalStallError, lib.DagTraversalStallError);
    assert.equal(dag.DagFragmentValidationError, lib.DagFragmentValidationError);
    assert.equal(core.DagTraversalStallError, lib.DagTraversalStallError);
    assert.equal('DEFER_READY' in dag, false);
    assert.equal(lib.TraversalVisitorCommandName.DEFER_WORK_COMPLETION, 'DEFER_WORK_COMPLETION');
    assert.equal(dag.DagTraversal, lib.DagTraversal);
    assert.equal(dag.AsyncDagTraversal, lib.AsyncDagTraversal);
    assert.equal(objectTree.ObjectTreeSource, lib.ObjectTreeSource);
    assert.equal(rewrite.rewriteObject, lib.rewriteObject);
    assert.equal(core.Vertex, lib.Vertex);
    assert.equal('DepthFirstTreeRunner' in depth, false);
    assert.equal('InternalDepthFirstTreeRunner' in depth, false);
    assert.equal('DagTraversalRunner' in dag, false);
    assert.equal('InternalDagTraversalRunner' in dag, false);
    assert.equal(depth.traverseTreeDepthFirst, lib.traverseTreeDepthFirst);
    assert.equal(depth.traverseTreeDepthFirstAsync, lib.traverseTreeDepthFirstAsync);
    assert.equal(breadth.traverseTreeBreadthFirst, lib.traverseTreeBreadthFirst);
    assert.equal(breadth.traverseTreeBreadthFirstAsync, lib.traverseTreeBreadthFirstAsync);
    assert.equal(dag.traverseDag, lib.traverseDag);
    assert.equal(dag.traverseDagAsync, lib.traverseDagAsync);
    assert.equal(lib.TraversalRunnerStatus.FAILED, 'FAILED');
    const reference = new core.MutableRef('first');
    const referenceId = reference.getRefId();
    assert.match(referenceId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    reference.setValue('replacement');
    assert.equal(reference.getRefId(), referenceId);
    assert.equal(reference.getValue(), 'replacement');
    assert.notEqual(new core.MutableRef('other').getRefId(), referenceId);


    const progress = new dag.DagTraversal({
      discovery: 'eager', syntheticRoot: true, completedWork: new Set(['design']),
      traversableGraph: {
        resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: { $data: '', $childHints: ['design', 'build'] } } }),
        resolveChild: id => ({ kind: 'found', vertex: { vertexId: id, dependsOnWork: id === 'build' ? ['design'] : [], vertexContent: { $data: id, $childHints: [] } } }),
      },
    });
    progress.addVisitorFor(dag.DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: lib.TraversalVisitorCommandName.DEFER_WORK_COMPLETION }] }));
    const progressRunner = progress.createRunner().run();
    assert.deepEqual(progressRunner.summary().readyOrDeferredIds, ['build']);
    const generation = progressRunner.summary().vertices.get('build').generation;
    assert.equal(progressRunner.settle('build', { kind: 'workCompleted' }, generation), true);
    progressRunner.run();
    assert.equal(progressRunner.getStatus(), 'FINISHED');
    assert.equal(progressRunner.settle('build', { kind: 'workCompleted' }, generation), false);

    const completion = new dag.DagTraversal({ traversableGraph: {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'root', vertexContent: { $data: 'root', $childHints: ['join', 'bundle'] } } }),
      resolveChild: id => ({ kind: 'found', vertex: { vertexId: id, ...(id === 'join' ? { dependsOnSubgraphCompletion: ['bundle'] } : {}), vertexContent: { $data: id, $childHints: id === 'bundle' ? ['compile'] : [] } } }),
    } });
    const completeEvents = [];
    completion.addVisitorFor(dag.DagVisitorPhase.ON_WORK_READY, v => { completeEvents.push('W:' + v.getData()); });
    completion.addVisitorFor(dag.DagVisitorPhase.ON_SUBGRAPH_READY, v => { completeEvents.push('C:' + v.getData()); });
    const completionRunner = completion.createRunner().run();
    assert(completeEvents.indexOf('W:join') > completeEvents.indexOf('C:bundle'));
    assert(completeEvents.indexOf('C:bundle') > completeEvents.indexOf('C:compile'));
    assert.deepEqual(completionRunner.summary().vertices.get('join').unmetSubgraphPrerequisiteIds, []);
    assert.deepEqual(completionRunner.getResolvedGraph().get(completionRunner.getResolvedGraph().getVertexRefById('join')).dependsOnSubgraphCompletion, ['bundle']);

    const lookupCalls = [];
    const lookupRunner = new dag.DagTraversal({ traversableGraph: {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'app', dependsOnSubgraphCompletion: ['parser'], vertexContent: { $data: 'app', $childHints: [] } } }),
      resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      resolvePrerequisite: id => { lookupCalls.push(id); return { kind: 'found', vertex: { dependsOnWork: id === 'parser' ? ['lexer'] : [], vertexContent: { $data: id, $childHints: [] } } }; },
    } }).createRunner().run();
    assert.deepEqual(lookupCalls, ['parser', 'lexer']);
    const parser = lookupRunner.getResolvedGraph().getVertexRefById('parser');
    assert.deepEqual(lookupRunner.getResolvedGraph().getParentsOf(parser), []);
    assert.equal(lookupRunner.summary().counts.subgraphCompleted, 3);

    const tree = new lib.ObjectTreeSource({ a: { b: 1 }, c: 2 });
    const depthVisits = [...new lib.DepthFirstTreeTraversal({ traversableTree: tree }).createRunner().iterateEvents({
      emitEvents: [lib.DepthFirstPhase.POST_ORDER],
    })].map(event => event.vertex.getData().key).slice(0, -1);
    assert.deepEqual(depthVisits, ['b', 'a', 'c']);
    const breadthVisits = [...new lib.BreadthFirstTreeTraversal({ traversableTree: tree }).createRunner().iterateEvents()]
      .map(event => event.vertex.getData().key).slice(1);
    assert.deepEqual(breadthVisits, ['a', 'c', 'b']);
    assert.deepEqual(lib.rewriteObject({ a: 1 }).outputAtReturn, { a: 1 });
    assert.equal(lib.rewriteObject(null).outputAtReturn, null);
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
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const cjs = require('configurable-tree-traversal');
    for (const specifier of ${JSON.stringify([
      'configurable-tree-traversal',
      ...Object.keys(require('../package.json').exports)
        .filter(
          (key) =>
            key !== '.' && !key.includes('*') && key !== './package.json',
        )
        .map((key) => 'configurable-tree-traversal' + key.slice(1)),
    ])}) {
      assert.match(import.meta.resolve(specifier), /\\.mjs$/, specifier + ' must resolve to native ESM');
      assert.match(require.resolve(specifier), /\\.js$/, specifier + ' must resolve to CommonJS');
      const imported = await import(specifier);
      const required = require(specifier);
      assert.equal(imported.default, required, specifier + ' default namespace identity');
      assert.deepEqual(Object.keys(imported).sort(), [
        ...Object.keys(required).filter(name => name !== '__esModule' && name !== 'default'),
        'default',
      ].sort(), specifier + ' export parity');
      for (const name of Object.keys(imported).filter(name => name !== 'default')) {
        assert.equal(imported[name], required[name], specifier + ' / ' + name);
      }
    }
    import * as esm from 'configurable-tree-traversal';
    import lib, { AsyncDepthFirstTreeTraversal as RootAsyncDepthFirstTraversal } from 'configurable-tree-traversal';
    import { DepthFirstTreeTraversal } from 'configurable-tree-traversal/traversals/depth-first-traversal';
    import { BreadthFirstTreeTraversal } from 'configurable-tree-traversal/traversals/breadth-first-traversal';
    import { AsyncDagTraversal, DagTraversal, DagVisitorPhase, DagTraversalStallError, DagFragmentValidationError } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { ObjectTreeSource } from 'configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree';
    import { rewriteObject } from 'configurable-tree-traversal/tools/rewrite-object';
    import { Vertex } from 'configurable-tree-traversal';
    import { Vertex as CoreVertex } from 'configurable-tree-traversal/core';
    assert.equal(RootAsyncDepthFirstTraversal, lib.AsyncDepthFirstTreeTraversal);
    assert.equal(DepthFirstTreeTraversal, lib.DepthFirstTreeTraversal);
    assert.equal(BreadthFirstTreeTraversal, lib.BreadthFirstTreeTraversal);
    assert.equal(DagTraversalStallError, lib.DagTraversalStallError);
    assert.equal(DagFragmentValidationError, lib.DagFragmentValidationError);
    assert.equal(DagTraversal, lib.DagTraversal);
    assert.equal(AsyncDagTraversal, lib.AsyncDagTraversal);
    assert.equal(ObjectTreeSource, lib.ObjectTreeSource);
    assert.equal(rewriteObject, lib.rewriteObject);
    assert.equal(Vertex, lib.core.Vertex);
    assert.equal(CoreVertex, lib.core.Vertex);

    assert.equal(lib, cjs);
    assert.equal(lib.core, cjs.core);
    assert.equal(lib.rewriteObject, cjs.rewriteObject);
    assert.equal(lib.objectRewrite, cjs.objectRewrite);
    assert.equal(esm.MutableRef, cjs.MutableRef);
    assert.equal(esm.TreeVertexRecord, cjs.TreeVertexRecord);
    assert(new esm.MutableRef(1) instanceof cjs.MutableRef);
    assert.equal(lib.rewriteObject, lib.objectRewrite.rewriteObject);
    const treeInstance = new ObjectTreeSource({ value: 1 });
    assert(treeInstance instanceof cjs.ObjectTreeSource);
    assert(new DepthFirstTreeTraversal({ traversableTree: treeInstance }) instanceof cjs.DepthFirstTreeTraversal);
    assert(new Vertex({ $data: 'vertex', $childHints: [] }) instanceof cjs.core.Vertex);

    // Opposite-loader command enums must defer real runners and release completion gates.
    for (const [implementation, sentinel] of [[cjs, esm.TraversalVisitorCommandName.DEFER_WORK_COMPLETION], [esm, cjs.TraversalVisitorCommandName.DEFER_WORK_COMPLETION]]) {
      for (const mode of ['sync', 'async']) {
        const calls = [];
        const events = [];
        const resolved = id => {
          calls.push(id);
          return { kind: 'found', vertex: { vertexId: id, vertexContent: { $data: id, $childHints: [] } } };
        };
        const graph = {
          resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'app', dependsOnSubgraphCompletion: ['build'], vertexContent: { $data: 'app', $childHints: ['seed'] } } }),
          resolveChild: id => ({ kind: 'found', vertex: { vertexId: id, vertexContent: { $data: id, $childHints: [] } } }),
          resolvePrerequisite: mode === 'async' ? async id => resolved(id) : resolved,
        };
        const Constructor = mode === 'async' ? implementation.AsyncDagTraversal : implementation.DagTraversal;
        const traversal = new Constructor({ discovery: 'eager', completedWork: new Set(['seed']), traversableGraph: graph });
        traversal.addVisitorFor(implementation.DagVisitorPhase.ON_WORK_READY, vertex => {
          events.push('W:' + vertex.getData());
          if (vertex.getData() === 'build') return { commands: [{ commandName: sentinel }] };
        });
        traversal.addVisitorFor(implementation.DagVisitorPhase.ON_SUBGRAPH_READY, vertex => { events.push('C:' + vertex.getData()); });
        const runner = traversal.createRunner();
        const CjsBuilder = cjs[mode === 'async' ? 'AsyncDagTraversal' : 'DagTraversal'];
        const counterpart = new CjsBuilder({ traversableGraph: graph }).createRunner();
        assert.equal(Object.getPrototypeOf(runner), Object.getPrototypeOf(counterpart));
        assert.equal('DagTraversalRunner' in implementation, false);
        assert.equal('AsyncDagTraversalRunner' in implementation, false);
        await runner.run();
        assert.deepEqual(calls, ['build']);
        assert.deepEqual(events.filter(event => event.startsWith('W:')), ['W:build']);
        assert.deepEqual(runner.summary().deferredWorkIds, ['build']);
        assert.deepEqual(runner.summary().vertices.get('app').unmetSubgraphPrerequisiteIds, ['build']);
        const generation = runner.summary().vertices.get('build').generation;
        assert.equal(runner.settle('build', { kind: 'workCompleted' }, generation), true);
        await runner.run();
        assert(events.indexOf('W:app') > events.indexOf('C:build'));
        assert.equal(runner.getStatus(), 'FINISHED');
        assert.equal(runner.settle('build', { kind: 'workCompleted' }, generation), false);
        assert.deepEqual(runner.summary().vertices.get('app').unmetSubgraphPrerequisiteIds, []);
        assert.equal(runner.summary().counts.subgraphCompleted, 3);
      }
    }

    const deferredTraversal = new AsyncDagTraversal({ traversableGraph: { resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'task', vertexContent: { $data: 'task', $childHints: [] } } }), resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }) } });
    deferredTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: esm.TraversalVisitorCommandName.DEFER_WORK_COMPLETION }] }));
    const deferredRunner = deferredTraversal.createRunner();
    await deferredRunner.run();
    assert.deepEqual(deferredRunner.summary().deferredWorkIds, ['task']);
    deferredRunner.settle('task', { kind: 'workCompleted' }, deferredRunner.summary().vertices.get('task').generation);
    await deferredRunner.run();
    assert.equal(deferredRunner.getStatus(), 'FINISHED');

    const lookupEvents = [];
    const lookupTraversal = new AsyncDagTraversal({ traversableGraph: {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'app', dependsOnWork: ['parser'], vertexContent: { $data: 'app', $childHints: [] } } }),
      resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      resolvePrerequisite: async id => ({ kind: 'found', vertex: { vertexId: id, vertexContent: { $data: id, $childHints: [] } } }),
    } });
    lookupTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, v => { lookupEvents.push(v.getData()); });
    await lookupTraversal.createRunner().run();
    assert.deepEqual(lookupEvents, ['parser', 'app']);

    const completionEvents = [];
    const completionTraversal = new AsyncDagTraversal({ discovery: 'eager', traversableGraph: {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'bundle', dependsOnSubgraphCompletion: ['compile'], vertexContent: { $data: 'bundle', $childHints: ['compile'] } } }),
      resolveChild: id => ({ kind: 'found', vertex: { vertexId: id, dependsOnWork: [], vertexContent: { $data: id, $childHints: [] } } }),
    } });
    completionTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, v => { completionEvents.push('W:' + v.getData()); });
    completionTraversal.addVisitorFor(DagVisitorPhase.ON_SUBGRAPH_READY, async v => { await Promise.resolve(); completionEvents.push('C:' + v.getData()); });
    await completionTraversal.createRunner().run();
    assert.deepEqual(completionEvents, ['W:compile', 'C:compile', 'W:bundle', 'C:bundle']);

    const runner = new AsyncDagTraversal({
      traversableGraph: {
        resolveRoot: async () => ({ kind: 'found', vertex: {
          vertexId: 'root', vertexContent: { $data: 'root', $childHints: [] },
        } }),
        resolveChild: async () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).createRunner();
    const orders = [];
    for await (const event of runner.iterateEvents()) orders.push(event.kind);
    assert.deepEqual(orders, ['workCompleted', 'subgraphCompleted']);
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
    import { AsyncBreadthFirstTreeTraversal, AsyncDagTraversal, AsyncDepthFirstTreeTraversal, DepthFirstTreeTraversal, DepthFirstPhase, BreadthFirstTreeTraversal, DagTraversal, DagVisitorPhase, ObjectTreeSource, TraversalRunnerStatus, TraversalVisitorCommandName, core, objectRewrite, rewriteObject, traverseTreeBreadthFirstAsync, traverseDag, traverseDagAsync, traverseTreeDepthFirst, traverseTreeDepthFirstAsync } from 'configurable-tree-traversal';
    import type { AsyncDagDiscoverySource, ChildSlot, TreeDagExecutionInspection, StructuralChildEdge, ResolvedGraphVertex, ResolvedVisitStage, HintVertexId, MaybePromise, ResolvedGraph, DepthFirstTreeRunner, DagDiscoverySource, TreeSource, VertexTypes, TraversalVisitorCommand, VertexId } from 'configurable-tree-traversal';
    import type { ChildSlot as CoreChildSlot, StructuralChildEdge as CoreGraphEdge, ResolvedGraphVertex as CoreGraphVertex, ResolvedVisitStage as CoreGraphVertexStatus, HintVertexId as CoreHintVertexId, MaybePromise as CoreMaybePromise, VertexId as CoreVertexId } from 'configurable-tree-traversal/core';
    import type { TraversalExecutionOptions, DepthFirstTreeOptions, DepthFirstTreeOptionsPatch } from 'configurable-tree-traversal';
    import { TraversalVisitorCommandName as Command } from 'configurable-tree-traversal';
    import type { DagSummary, DagSettlementGeneration, DagSettlementOutcome, DagVertexProgress, DagWorkState } from 'configurable-tree-traversal';
    import type { DagSummary as SubpathSummary } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { Vertex } from 'configurable-tree-traversal';
    import { Vertex as CoreVertex } from 'configurable-tree-traversal/core';

    const stall: import('configurable-tree-traversal').DagTraversalStallDiagnostics = {
      dependencies: [], unknownPrerequisiteIds: [], dependencyCycleComponents: [], dependencyEdges: [], dependencyBlockedIds: [], structurallyIncompleteIds: [],
    };
    const typedStall: import('configurable-tree-traversal/traversals/dag-traversal').DagTraversalStallError = new core.DagTraversalStallError(stall);
    const milestone: import('configurable-tree-traversal').DagMilestone<'root'> = { vertexId: 'root', milestone: 'work' };
    const dependencyEdge: import('configurable-tree-traversal/core').DagWaitEdge<'root'> = { waiter: milestone, prerequisite: milestone, reason: 'workDependency' };
    const subpathEdge: import('configurable-tree-traversal/traversals/dag-traversal').DagWaitEdge<'root'> = dependencyEdge;
    const edgeId: 'root' = subpathEdge.prerequisite.vertexId;
    void [typedStall, edgeId];
    type Node = { $data: string; $childHints: (Node | null)[] };
    type Tree = VertexTypes<string, Node | null>;
    const abstractRoot: Node = { $data: 'root', $childHints: [{ $data: 'leaf', $childHints: [] }] };
    const abstractTree: TreeSource<Tree> = {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: abstractRoot } }),
      resolveChild: hint => hint === null ? { kind: 'omitted' } : { kind: 'found', vertex: { vertexContent: hint } },
    };
    const abstractTraversal = new DepthFirstTreeTraversal({ traversableTree: abstractTree });
    abstractTraversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({
      commands: [{
        commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
        commandArguments: { newData: 'changed' },
      }],
    }));
    const requiredSource: DepthFirstTreeOptions<Tree> = { traversableTree: abstractTree };
    const partialOptions: DepthFirstTreeOptionsPatch<Tree> = { visitors: {} };
    abstractTraversal.configure(partialOptions);
    // @ts-expect-error standalone construction requires a source
    new DepthFirstTreeTraversal({});
    // @ts-expect-error normalized engine state is not a public configuration port
    abstractTraversal.configure({ traversalRunnerInternalObjects: {} });
    // @ts-expect-error builder state is private
    abstractTraversal.icfg;
    const runnerInterface: DepthFirstTreeRunner<Tree, Tree> = abstractTraversal.createRunner();
    // @ts-expect-error raw engine state is private
    abstractTraversal.createRunner().state;
    // @ts-expect-error runners are capabilities and expose no normalized constructor
    new (null as unknown as typeof import('configurable-tree-traversal')).DepthFirstTreeRunner({});
    void requiredSource;
    runnerInterface.iterateEvents();
    runnerInterface.run({ emitEvents: [] });
    const command: TraversalVisitorCommand<Tree> = {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: 'typed' },
    };
    if (command.commandName === TraversalVisitorCommandName.REWRITE_VERTEX_DATA) {
      const rewritten: string = command.commandArguments.newData;
      void rewritten;
    }
    const convenience = traverseTreeDepthFirst({ traversableTree: abstractTree, visitors: { POST_ORDER: vertex => { const data: string = vertex.getData(); void data; } }, });

    const tree = new ObjectTreeSource({ a: 1 });
    const config: TraversalExecutionOptions<DepthFirstPhase> = { emitEvents: [] };
    const runner = new DepthFirstTreeTraversal({ traversableTree: tree }).createRunner().run(config);
    const status: TraversalRunnerStatus = runner.getStatus();
    const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;
    const value: number | null = objectRewrite.rewriteObjectAs<number>(1).outputAtReturn;
    const bfs = new BreadthFirstTreeTraversal({ traversableTree: tree }).createRunner();
    for (const { vertex } of bfs.iterateEvents()) { const key: string | number | symbol = vertex.getData().key; void key; }
    const graph: DagDiscoverySource<Tree> = {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'root', dependsOnSubgraphCompletion: [] as readonly VertexId[], vertexContent: abstractRoot } }),
      resolveChild: hint => hint === null ? { kind: 'omitted', satisfiesDependencies: true } : { kind: 'found', vertex: { vertexId: hint, vertexContent: hint } },
      getVertexIdFromHint: hint => ({ vertexId: hint }),
      resolvePrerequisite: id => id === undefined ? { kind: 'missing' } : { kind: 'found', vertex: { vertexId: id, vertexContent: abstractRoot } },
    };
    const asyncGraph: AsyncDagDiscoverySource<Tree> = { ...graph, resolvePrerequisite: id => Promise.resolve(graph.resolvePrerequisite!(id)) };
    const dagConfig: TraversalExecutionOptions<DagVisitorPhase> = { emitEvents: ['workCompleted'] };
    const dag = new DagTraversal({ traversableGraph: graph }).createRunner();
    const resolvedGraph: ResolvedGraph<Tree> = dag.run(dagConfig).getResolvedGraph();
    const asyncDepth = new AsyncDepthFirstTreeTraversal({ traversableTree: abstractTree }).createRunner();
    const asyncBreadth = new AsyncBreadthFirstTreeTraversal({ traversableTree: abstractTree }).createRunner();
    const asyncDag = new AsyncDagTraversal({ traversableGraph: asyncGraph, concurrency: 2 }).createRunner();
    const progressTraversal = new DagTraversal({ traversableGraph: graph, completedWork: new Set<VertexId>(), discovery: 'eager', syntheticRoot: true });
    progressTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] }));
    const progressRunner = progressTraversal.createRunner();
    const summary: DagSummary = progressRunner.summary();
    const subpathSummary: SubpathSummary = asyncDag.summary();
    const entry: DagVertexProgress | undefined = summary.vertices.get('root');
    const completeGates: readonly VertexId[] | undefined = entry?.unmetSubgraphPrerequisiteIds;
    const completeDeclaration: readonly VertexId[] | undefined = dag.getResolvedGraph().get(dag.getResolvedGraph().getRoot()!)?.dependsOnSubgraphCompletion;
    const legacyProgress: DagVertexProgress = { vertexId: 'old', work: 'pending', subgraphComplete: false, unmetPrerequisiteIds: [], unmetWorkPrerequisiteIds: [], unmetSubgraphPrerequisiteIds: [] };
    void [completeGates, completeDeclaration, legacyProgress];
    const state: DagWorkState | undefined = entry?.work;
    const generation: DagSettlementGeneration = Symbol();
    const outcome: DagSettlementOutcome = { kind: 'traversalFailed', error: undefined };
    const settlement: boolean = progressRunner.settle('root', outcome, generation);
    const asyncSettlement: boolean = asyncDag.settle('root', { kind: 'workCompleted' }, generation);
    // @ts-expect-error tree visitor return types remain narrow
    abstractTraversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({ commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] }));
    void [subpathSummary, state, settlement, asyncSettlement];
    const inspection: TreeDagExecutionInspection = asyncDag.inspect();
    const publicTypes: [VertexId, HintVertexId, MaybePromise<string>, ResolvedVisitStage, StructuralChildEdge<Tree> | null, ChildSlot<Tree> | null, ResolvedGraphVertex<Tree> | null, CoreVertexId, CoreHintVertexId, CoreMaybePromise<string>, CoreGraphVertexStatus, CoreGraphEdge<Tree> | null, CoreChildSlot<Tree> | null, CoreGraphVertex<Tree> | null] = ['id', { vertexId: 'id' }, 'value', 'INITIAL_VISIT_ELIGIBLE', null, null, null, 'core-id', { vertexId: 'core-id' }, Promise.resolve('value'), 'COMPLETE', null, null, null];
    const asyncRuns: Promise<unknown>[] = [
      asyncDepth.run(), asyncBreadth.run(), asyncDag.run(),
      traverseTreeDepthFirstAsync({ traversableTree: abstractTree,  }),
      traverseTreeBreadthFirstAsync({ traversableTree: abstractTree,  }),
      traverseDagAsync({ ...{ traversableGraph: asyncGraph },  }),
    ];
    const syncDag = traverseDag({ ...{ traversableGraph: graph },  });
    void [Vertex, CoreVertex, core.Vertex, value, status, failedStatus, convenience, resolvedGraph, inspection, publicTypes, asyncRuns, syncDag];
  `,
  );
  fs.writeFileSync(
    path.join(consumer, 'consumer.cts'),
    fs.readFileSync(path.join(consumer, 'consumer.ts')),
  );
  fs.writeFileSync(
    path.join(consumer, 'consumer.mts'),
    `
    import namespace, { DagFragmentValidationError, DagTraversalStallError, AsyncDagTraversal, DagTraversal, DagVisitorPhase, TraversalVisitorCommandName as Command, DepthFirstTreeTraversal, DepthFirstPhase, ObjectTreeSource, core } from 'configurable-tree-traversal';
    import cjs = require('configurable-tree-traversal');
    import dagCjs = require('configurable-tree-traversal/traversals/dag-traversal');
    import { DagTraversal as SubpathDag } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { Vertex } from 'configurable-tree-traversal';
    import { Vertex as CoreVertex } from 'configurable-tree-traversal/core';
    import vertexCjs = require('configurable-tree-traversal/core');
    import type { DagTraversalRunner } from 'configurable-tree-traversal/traversals/dag-traversal';
    import type { AsyncDagDiscoverySource, DagSummary, DagDiscoverySource, VertexTypes, VertexId } from 'configurable-tree-traversal';
    import type { DagSummary as CjsSummary } from 'configurable-tree-traversal/traversals/dag-traversal';
    type Tree = VertexTypes<string, string>;
    const esmFragmentError: dagCjs.DagFragmentValidationError<'root'> = new DagFragmentValidationError<'root'>([]);
    const cjsFragmentError: DagFragmentValidationError<'root'> = new cjs.DagFragmentValidationError<'root'>([]);
    const fragmentConstructor: typeof DagFragmentValidationError = dagCjs.DagFragmentValidationError;
    const stallConstructor: typeof DagTraversalStallError = cjs.core.DagTraversalStallError;
    const esmStallError: dagCjs.DagTraversalStallError<'root'> = new DagTraversalStallError<'root'>({
      dependencies: [], unknownPrerequisiteIds: [], dependencyCycleComponents: [], dependencyBlockedIds: [], structurallyIncompleteIds: [],
    });
    const cjsStallError: DagTraversalStallError<'root'> = new dagCjs.DagTraversalStallError<'root'>(esmStallError.diagnostics);
    void [esmFragmentError, cjsFragmentError, fragmentConstructor, stallConstructor, esmStallError, cjsStallError];
    const esmCommands: typeof cjs.TraversalVisitorCommandName = Command;
    const cjsCommands: typeof Command = cjs.TraversalVisitorCommandName;
    const defaultCommands: typeof Command = namespace.TraversalVisitorCommandName;
    const graph: DagDiscoverySource<Tree> = {
      resolveRoot: () => ({ kind: 'found', vertex: { vertexId: 'app', dependsOnSubgraphCompletion: ['build'] as readonly VertexId[], vertexContent: { $data: 'app', $childHints: [] } } }),
      resolveChild: id => ({ kind: 'found', vertex: { vertexId: id, vertexContent: { $data: id, $childHints: [] } } }),
      resolvePrerequisite: id => ({ kind: 'found', vertex: { vertexId: id, vertexContent: { $data: String(id), $childHints: [] } } }),
    };
    const asyncGraph: AsyncDagDiscoverySource<Tree> = { ...graph, resolvePrerequisite: async id => graph.resolvePrerequisite!(id) };
    const fromEsm: cjs.DagTraversal<Tree> = new DagTraversal({ traversableGraph: graph });
    const fromCjs: DagTraversal<Tree> = new cjs.DagTraversal({ traversableGraph: graph });
    const fromSubpath: DagTraversal<Tree> = new SubpathDag({ traversableGraph: graph });
    const fromDefault: cjs.DagTraversal<Tree> = new namespace.DagTraversal({ traversableGraph: graph });
    const esmRunner: dagCjs.DagTraversalRunner<Tree> = fromEsm.createRunner();
    const cjsRunner: DagTraversalRunner<Tree> = fromCjs.createRunner();
    const summary: DagSummary = cjsRunner.summary();
    const cjsSummary: CjsSummary = esmRunner.summary();
    const fromEsmVertex: vertexCjs.Vertex<Tree> = new Vertex<Tree>({ $data: '', $childHints: [] });
    const fromCjsVertex: CoreVertex<Tree> = new vertexCjs.Vertex<Tree>({ $data: '', $childHints: [] });
    const coreVertex: core.Vertex<Tree> = fromCjsVertex;
    fromCjs.addVisitorFor(cjs.DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] }));
    fromEsm.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: cjs.TraversalVisitorCommandName.DEFER_WORK_COMPLETION }] }));
    const asyncEsm: cjs.AsyncDagTraversal<Tree> = new AsyncDagTraversal({ traversableGraph: asyncGraph });
    const asyncCjs: AsyncDagTraversal<Tree> = new cjs.AsyncDagTraversal({ traversableGraph: asyncGraph });
    asyncEsm.addVisitorFor(DagVisitorPhase.ON_WORK_READY, async () => ({ commands: [{ commandName: cjs.TraversalVisitorCommandName.DEFER_WORK_COMPLETION }] }));
    // @ts-expect-error sync resolvers cannot return promises
    const invalidGraph: DagDiscoverySource<Tree> = { ...graph, resolvePrerequisite: async id => graph.resolvePrerequisite!(id) };
    // @ts-expect-error arbitrary symbols are not visitor command results
    fromEsm.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => Symbol('DEFER_READY'));
    // @ts-expect-error sync visitors cannot return promises
    fromEsm.addVisitorFor(DagVisitorPhase.ON_WORK_READY, async () => ({ commands: [{ commandName: cjs.TraversalVisitorCommandName.DEFER_WORK_COMPLETION }] }));
    const treeTraversal = new DepthFirstTreeTraversal({ traversableTree: new ObjectTreeSource({ a: 1 }) });
    // @ts-expect-error tree visitors cannot defer DAG work
    treeTraversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({ commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] }));
    void [esmCommands, cjsCommands, defaultCommands, fromSubpath, fromDefault, summary, cjsSummary, fromEsmVertex, coreVertex, asyncEsm, asyncCjs, invalidGraph];
  `,
  );
  // Keep uniform-API contracts in reviewable fixtures, separate from the
  // public-path and loader-identity consumers above. Fixtures run only against
  // the extracted package, never this checkout's source aliases.
  const typeFixtures = [
    'supported-exports',
    'uniform-api',
    'rewrite-output',
    'source-hint-contracts',
    'materialized-rewrite-capability',
    'execution-capabilities',
    'idiomatic-execution',
    'idiomatic-diagnostics',
    'idiomatic-api',
    'graph-id-types',
    'dag-preparation',
    'dag-milestone-diagnostics',
    'agent-api-foundations',
    'dag-inspection',
    'dag-fragments',
    'dag-revisions',
    'graph-walk',
  ];
  for (const name of typeFixtures) {
    for (const extension of ['ts', 'cts', 'mts']) {
      fs.copyFileSync(
        path.join(root, 'scripts/package-consumers', name + '.ts'),
        path.join(consumer, name + '.' + extension),
      );
    }
  }
  for (const file of [
    'supported-exports.mjs',
    'idiomatic-diagnostics.mjs',
    'idiomatic-api.mjs',
    'uniform-api.mjs',
    'composable-api.mjs',
    'agent-api-foundations.mjs',
    'dag-inspection.mjs',
    'dag-fragments.mjs',
    'dag-revisions.mjs',
    'graph-walk.mjs',
  ]) {
    fs.copyFileSync(
      path.join(root, 'scripts/package-consumers', file),
      path.join(consumer, file),
    );
    execFileSync(process.execPath, [file], { cwd: consumer, stdio: 'inherit' });
  }
  const compiler =
    process.env.CTT_TYPESCRIPT_COMPILER ||
    path.join(root, 'node_modules/typescript/bin/tsc');
  console.log(
    'Packed type consumers: ' +
      execFileSync(process.execPath, [compiler, '--version'], {
        encoding: 'utf8',
      }).trim(),
  );
  for (const resolution of ['node', 'node16']) {
    execFileSync(
      process.execPath,
      [
        compiler,
        '--strict',
        '--exactOptionalPropertyTypes',
        '--noUncheckedIndexedAccess',
        '--noEmit',
        '--target',
        'ES2020',
        '--module',
        resolution === 'node16' ? 'Node16' : 'commonjs',
        '--moduleResolution',
        resolution,
        ...(resolution === 'node16'
          ? [
              'consumer.ts',
              'consumer.cts',
              'consumer.mts',
              ...typeFixtures.flatMap((name) =>
                ['ts', 'cts', 'mts'].map((extension) => name + '.' + extension),
              ),
            ]
          : ['consumer.ts', ...typeFixtures.map((name) => name + '.ts')]),
      ],
      { cwd: consumer, stdio: 'inherit' },
    );
  }
  console.log(
    'Verified supported and denied type imports: node (.ts), node16 (.ts/.cts/.mts).',
  );
  const optionalCommands = 'walking-optional-commands.ts';
  fs.copyFileSync(
    path.join(root, 'scripts/package-consumers', optionalCommands),
    path.join(consumer, optionalCommands),
  );
  for (const resolution of ['node', 'node16']) {
    execFileSync(
      process.execPath,
      [
        compiler,
        '--strict',
        '--noEmit',
        '--target',
        'ES2020',
        '--module',
        resolution === 'node16' ? 'Node16' : 'commonjs',
        '--moduleResolution',
        resolution,
        optionalCommands,
      ],
      { cwd: consumer, stdio: 'inherit' },
    );
  }
  console.log(
    'Verified composable CJS/ESM runtime contracts and strict node/node16 .ts/.cts/.mts fixtures.',
  );
  // Validate navigation in both the checkout and actual packed guides.
  const guides = [
    'README.md',
    'CHANGELOG.md',
    'docs/index.md',
    'docs/agent-workflows.md',
    'docs/reference.md',
    'docs/migration-uniform-api.md',
    'docs/migration-api-clarity.md',
    'docs/migration-idiomatic-api.md',
    'docs/testing.md',
  ];
  const anchors = (markdown) => {
    const result = new Set();
    const seen = new Map();
    for (const match of markdown.matchAll(/^#{1,6} (.+)$/gm)) {
      const base = match[1]
        .toLowerCase()
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
        .replace(/ /g, '-');
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      result.add(base + (count ? '-' + count : ''));
    }
    for (const match of markdown.matchAll(/<a\s+id="([^"]+)"/g))
      result.add(match[1]);
    return result;
  };
  let guideCount = 0;
  for (const directory of [root, install]) {
    for (const guide of directory === root
      ? [...guides, 'AGENTS.md']
      : guides) {
      const markdown = fs.readFileSync(path.join(directory, guide), 'utf8');
      for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const link = match[1];
        if (/^[a-z]+:/i.test(link)) continue;
        const [relative, fragment] = link.split('#');
        const target = path.resolve(
          directory,
          path.dirname(guide),
          relative || path.basename(guide),
        );
        assert(
          fs.existsSync(target),
          `${guide}: missing ${link} in ${directory}`,
        );
        if (fragment)
          assert(
            anchors(fs.readFileSync(target, 'utf8')).has(
              decodeURIComponent(fragment),
            ),
            `${guide}: missing fragment ${link} in ${directory}`,
          );
      }
      for (const match of markdown.matchAll(/<img[^>]+src="([^"]+)"/g)) {
        assert(
          fs.existsSync(path.resolve(directory, path.dirname(guide), match[1])),
          `${guide}: missing image ${match[1]}`,
        );
      }
      if (directory !== install) continue;
      for (const match of markdown.matchAll(
        /<!-- standalone -->\s*```ts\n([\s\S]*?)```/g,
      )) {
        const imports = [];
        const body = match[1].replace(/^import\s[\s\S]*?;/gm, (statement) => {
          imports.push(statement);
          return '';
        });
        const filename = `guide-${guideCount++}.ts`;
        fs.writeFileSync(
          path.join(consumer, filename),
          imports.join('\n') +
            '\nasync function main() {\n' +
            body +
            '\n}\nvoid main();\n',
        );
        execFileSync(
          process.execPath,
          [
            compiler,
            '--strict',
            '--target',
            'ES2020',
            '--module',
            'commonjs',
            '--moduleResolution',
            'node',
            filename,
          ],
          { cwd: consumer, stdio: 'inherit' },
        );
        execFileSync(process.execPath, [filename.replace(/\.ts$/, '.js')], {
          cwd: consumer,
          stdio: 'pipe',
        });
      }
    }
  }
  console.log(
    `Verified guide navigation in checkout and tarball, and ${guideCount} standalone snippets.`,
  );
  for (const expected of [
    'README.md',
    'Sorted_binary_tree_ALL_RGB.svg.png',
    'CHANGELOG.md',
    'LICENSE',
    'docs/testing.md',
    'docs/index.md',
    'docs/agent-workflows.md',
    'docs/reference.md',
    'docs/migration-uniform-api.md',
    'docs/migration-api-clarity.md',
    'docs/migration-idiomatic-api.md',
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
    'dist/traversals/graph-walk/index.js',
    'dist/traversals/graph-walk/index.d.ts',
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
  for (const file of pack.files.filter(
    (file) => file.path.startsWith('dist/') && file.path.endsWith('.js'),
  )) {
    for (const extension of ['.mjs', '.d.mts']) {
      const expected = file.path.slice(0, -3) + extension;
      assert(
        pack.files.some((file) => file.path === expected),
        expected + ' was not packed',
      );
    }
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
    require('../package.json').version,
  );
  console.log(
    `Verified packed package on ${
      process.versions.bun
        ? 'Bun ' + process.versions.bun
        : 'Node ' + process.version
    }: shared CommonJS/native ESM, mixed TypeScript node/node16 (.ts/.cts/.mts), supported public imports and denied internal paths (${
      pack.entryCount
    } files).`,
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
