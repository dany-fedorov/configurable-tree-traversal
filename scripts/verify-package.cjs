const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ctt-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
try {
  execFileSync(
    process.execPath,
    [path.join(root, 'scripts/build-api-index.cjs'), '--check'],
    { cwd: root, stdio: 'inherit' },
  );
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
    assert.equal(core.MutableValueReference, lib.MutableValueReference);
    assert.equal(core.MutableTreeVertexTopologyRecord, lib.MutableTreeVertexTopologyRecord);
    assert.equal(rewrite.rewriteObject, lib.objectRewrite.rewriteObject);
    assert.equal(depth.DepthFirstTreeTraversalBuilder, lib.DepthFirstTreeTraversalBuilder);
    assert.equal(breadth.BreadthFirstTreeTraversalBuilder, lib.BreadthFirstTreeTraversalBuilder);
    assert.equal(depth.AsyncDepthFirstTreeTraversalBuilder, lib.AsyncDepthFirstTreeTraversalBuilder);
    assert.equal(breadth.AsyncBreadthFirstTreeTraversalBuilder, lib.AsyncBreadthFirstTreeTraversalBuilder);
    assert.equal(dag.DagTraversalStallError, lib.DagTraversalStallError);
    assert.equal(dag.DagFragmentValidationError, lib.DagFragmentValidationError);
    assert.equal(core.DagTraversalStallError, lib.DagTraversalStallError);
    assert.equal('DEFER_READY' in dag, false);
    assert.equal(lib.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION, "END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION");
    assert.equal(dag.DagTraversalBuilder, lib.DagTraversalBuilder);
    assert.equal(dag.AsyncDagTraversalBuilder, lib.AsyncDagTraversalBuilder);
    assert.equal(objectTree.ObjectPropertyTreeSource, lib.ObjectPropertyTreeSource);
    assert.equal(rewrite.rewriteObject, lib.rewriteObject);
    assert.equal(core.Vertex, lib.Vertex);
    assert.equal('DepthFirstTreeRunner' in depth, false);
    assert.equal('InternalDepthFirstTreeRunner' in depth, false);
    assert.equal('DagTraversalRunner' in dag, false);
    assert.equal('InternalDagTraversalRunner' in dag, false);
    assert.equal(depth.runTreeDepthFirstUntilSuspendedOrTerminal, lib.runTreeDepthFirstUntilSuspendedOrTerminal);
    assert.equal(depth.runTreeDepthFirstUntilSuspendedOrTerminalAsync, lib.runTreeDepthFirstUntilSuspendedOrTerminalAsync);
    assert.equal(breadth.runTreeBreadthFirstUntilSuspendedOrTerminal, lib.runTreeBreadthFirstUntilSuspendedOrTerminal);
    assert.equal(breadth.runTreeBreadthFirstUntilSuspendedOrTerminalAsync, lib.runTreeBreadthFirstUntilSuspendedOrTerminalAsync);
    assert.equal(dag.traverseDag, lib.traverseDag);
    assert.equal(dag.traverseDagAsync, lib.traverseDagAsync);
    assert.equal(lib.TraversalRunnerStatus.FAILED, 'FAILED');
    const reference = new core.MutableValueReference('first');
    const referenceId = reference.getReferenceIdentity();
    assert.match(referenceId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    reference.replaceReferencedValue('replacement');
    assert.equal(reference.getReferenceIdentity(), referenceId);
    assert.equal(reference.getReferencedValue(), 'replacement');
    assert.notEqual(new core.MutableValueReference('other').getReferenceIdentity(), referenceId);


    const progress = new dag.DagTraversalBuilder({
      discoveryTiming: "completeBeforeAnyVisitor", sourceRootIsHiddenEntryHolder: true, acceptedCompletedWorkVertexIds: new Set(['design']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexContentInput: { $vertexData: '', $childDiscoveryHints: ['design', 'build'] } } }),
        resolveChildVertexFromHint: id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, workWaitsForWorkOf: id === 'build' ? ['design'] : [], vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } }),
      },
    });
    progress.registerVisitorForPhase(dag.DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: lib.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    const progressRunner = progress.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    assert.deepEqual(progressRunner.captureProgressSnapshot().workVisitorReadyOrWorkCompletionDeferredVertexIds, ['build']);
    const settlementToken = progressRunner.captureProgressSnapshot().progressByVertexId.get('build').settlementToken;
    assert.equal(progressRunner.settleDeferredWork('build', { kind: 'workCompleted' }, settlementToken), true);
    progressRunner.runUntilSuspendedOrTerminal();
    assert.equal(progressRunner.getTraversalLifecycleStatus(), 'FINISHED');
    assert.equal(progressRunner.settleDeferredWork('build', { kind: 'workCompleted' }, settlementToken), false);

    const completion = new dag.DagTraversalBuilder({ dagDiscoverySource: {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'root', vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: ['join', 'bundle'] } } }),
      resolveChildVertexFromHint: id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, ...(id === 'join' ? { workWaitsForSubgraphCompletionOf: ['bundle'] } : {}), vertexContentInput: { $vertexData: id, $childDiscoveryHints: id === 'bundle' ? ['compile'] : [] } } }),
    } });
    const completeEvents = [];
    completion.registerVisitorForPhase(dag.DagVisitorPhase.ON_WORK_READY, v => { completeEvents.push('W:' + v.getVertexData()); });
    completion.registerVisitorForPhase(dag.DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY, v => { completeEvents.push('C:' + v.getVertexData()); });
    const completionRunner = completion.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    assert(completeEvents.indexOf('W:join') > completeEvents.indexOf('C:bundle'));
    assert(completeEvents.indexOf('C:bundle') > completeEvents.indexOf('C:compile'));
    assert.deepEqual(completionRunner.captureProgressSnapshot().progressByVertexId.get('join').unmetSubgraphCompletionMilestoneVertexIds, []);
    assert.deepEqual(completionRunner.getLiveResolvedGraphView().getVertexSnapshotOrNull(completionRunner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('join')).workWaitsForSubgraphCompletionOf, ['bundle']);

    const lookupCalls = [];
    const lookupRunner = new dag.DagTraversalBuilder({ dagDiscoverySource: {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'app', workWaitsForSubgraphCompletionOf: ['parser'], vertexContentInput: { $vertexData: 'app', $childDiscoveryHints: [] } } }),
      resolveChildVertexFromHint: () => ({ omittedVertexIdentity: null, kind: "vertexIntentionallyOmitted", satisfiesWorkAndSubgraphCompletionPrerequisites: true }),
      resolvePrerequisiteByVertexId: id => { lookupCalls.push(id); return { kind: "vertexResolved", resolvedVertexInput: { workWaitsForWorkOf: id === 'parser' ? ['lexer'] : [], vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } }; },
    } }).createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    assert.deepEqual(lookupCalls, ['parser', 'lexer']);
    const parser = lookupRunner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('parser');
    assert.deepEqual(lookupRunner.getLiveResolvedGraphView().getDistinctStructuralParentHandlesOrNull(parser), []);
    assert.equal(lookupRunner.captureProgressSnapshot().counts.subgraphCompletionCommittedVertices, 3);

    const tree = new lib.ObjectPropertyTreeSource({ a: { b: 1 }, c: 2 });
    const depthVisits = [...new lib.DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree }).createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [lib.DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES],
    })].map(event => event.vertex.getVertexData().propertyKey).slice(0, -1);
    assert.deepEqual(depthVisits, ['b', 'a', 'c']);
    const breadthVisits = [...new lib.BreadthFirstTreeTraversalBuilder({ treeDiscoverySource: tree }).createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal()]
      .map(event => event.vertex.getVertexData().propertyKey).slice(1);
    assert.deepEqual(breadthVisits, ['a', 'c', 'b']);
    assert.deepEqual(lib.rewriteObject({ a: 1 }).capturedOutputResultAtReturn, { kind: 'present', value: { a: 1 } });
    assert.deepEqual(lib.rewriteObject(null).capturedOutputResultAtReturn, { kind: 'present', value: null });
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
    import lib, { AsyncDepthFirstTreeTraversalBuilder as RootAsyncDepthFirstTraversal } from 'configurable-tree-traversal';
    import { DepthFirstTreeTraversalBuilder } from 'configurable-tree-traversal/traversals/depth-first-traversal';
    import { BreadthFirstTreeTraversalBuilder } from 'configurable-tree-traversal/traversals/breadth-first-traversal';
    import { AsyncDagTraversalBuilder, DagTraversalBuilder, DagVisitorPhase, DagTraversalStallError, DagFragmentValidationError } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { ObjectPropertyTreeSource } from 'configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree';
    import { rewriteObject } from 'configurable-tree-traversal/tools/rewrite-object';
    import { Vertex } from 'configurable-tree-traversal';
    import { Vertex as CoreVertex } from 'configurable-tree-traversal/core';
    assert.equal(RootAsyncDepthFirstTraversal, lib.AsyncDepthFirstTreeTraversalBuilder);
    assert.equal(DepthFirstTreeTraversalBuilder, lib.DepthFirstTreeTraversalBuilder);
    assert.equal(BreadthFirstTreeTraversalBuilder, lib.BreadthFirstTreeTraversalBuilder);
    assert.equal(DagTraversalStallError, lib.DagTraversalStallError);
    assert.equal(DagFragmentValidationError, lib.DagFragmentValidationError);
    assert.equal(DagTraversalBuilder, lib.DagTraversalBuilder);
    assert.equal(AsyncDagTraversalBuilder, lib.AsyncDagTraversalBuilder);
    assert.equal(ObjectPropertyTreeSource, lib.ObjectPropertyTreeSource);
    assert.equal(rewriteObject, lib.rewriteObject);
    assert.equal(Vertex, lib.core.Vertex);
    assert.equal(CoreVertex, lib.core.Vertex);

    assert.equal(lib, cjs);
    assert.equal(lib.core, cjs.core);
    assert.equal(lib.rewriteObject, cjs.rewriteObject);
    assert.equal(lib.objectRewrite, cjs.objectRewrite);
    assert.equal(esm.MutableValueReference, cjs.MutableValueReference);
    assert.equal(esm.MutableTreeVertexTopologyRecord, cjs.MutableTreeVertexTopologyRecord);
    assert(new esm.MutableValueReference(1) instanceof cjs.MutableValueReference);
    assert.equal(lib.rewriteObject, lib.objectRewrite.rewriteObject);
    const treeInstance = new ObjectPropertyTreeSource({ value: 1 });
    assert(treeInstance instanceof cjs.ObjectPropertyTreeSource);
    assert(new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: treeInstance }) instanceof cjs.DepthFirstTreeTraversalBuilder);
    assert(new Vertex({ $vertexData: 'vertex', $childDiscoveryHints: [] }) instanceof cjs.core.Vertex);

    // Opposite-loader command enums must defer real runners and release completion gates.
    for (const [implementation, sentinel] of [[cjs, esm.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION], [esm, cjs.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION]]) {
      for (const mode of ['sync', 'async']) {
        const calls = [];
        const events = [];
        const resolved = id => {
          calls.push(id);
          return { kind: "vertexResolved", resolvedVertexInput: { vertexId: id, vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } };
        };
        const graph = {
          resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'app', workWaitsForSubgraphCompletionOf: ['build'], vertexContentInput: { $vertexData: 'app', $childDiscoveryHints: ['seed'] } } }),
          resolveChildVertexFromHint: id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } }),
          resolvePrerequisiteByVertexId: mode === 'async' ? async id => resolved(id) : resolved,
        };
        const Constructor = mode === 'async' ? implementation.AsyncDagTraversalBuilder : implementation.DagTraversalBuilder;
        const traversal = new Constructor({ discoveryTiming: 'completeBeforeAnyVisitor', acceptedCompletedWorkVertexIds: new Set(['seed']), dagDiscoverySource: graph });
        traversal.registerVisitorForPhase(implementation.DagVisitorPhase.ON_WORK_READY, vertex => {
          events.push('W:' + vertex.getVertexData());
          if (vertex.getVertexData() === 'build') return { commands: [{ commandName: sentinel }] };
        });
        traversal.registerVisitorForPhase(implementation.DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY, vertex => { events.push('C:' + vertex.getVertexData()); });
        const runner = traversal.createIndependentRunnerFromCurrentOptions();
        const CjsBuilder = cjs[mode === 'async' ? 'AsyncDagTraversalBuilder' : 'DagTraversalBuilder'];
        const counterpart = new CjsBuilder({ dagDiscoverySource: graph }).createIndependentRunnerFromCurrentOptions();
        assert.equal(Object.getPrototypeOf(runner), Object.getPrototypeOf(counterpart));
        assert.equal('DagTraversalRunner' in implementation, false);
        assert.equal('AsyncDagTraversalRunner' in implementation, false);
        await runner.runUntilSuspendedOrTerminal();
        assert.deepEqual(calls, ['build']);
        assert.deepEqual(events.filter(event => event.startsWith('W:')), ['W:build']);
        assert.deepEqual(runner.captureProgressSnapshot().workCompletionDeferredVertexIds, ['build']);
        assert.deepEqual(runner.captureProgressSnapshot().progressByVertexId.get('app').unmetSubgraphCompletionMilestoneVertexIds, ['build']);
        const settlementToken = runner.captureProgressSnapshot().progressByVertexId.get('build').settlementToken;
        assert.equal(runner.settleDeferredWork('build', { kind: 'workCompleted' }, settlementToken), true);
        await runner.runUntilSuspendedOrTerminal();
        assert(events.indexOf('W:app') > events.indexOf('C:build'));
        assert.equal(runner.getTraversalLifecycleStatus(), 'FINISHED');
        assert.equal(runner.settleDeferredWork('build', { kind: 'workCompleted' }, settlementToken), false);
        assert.deepEqual(runner.captureProgressSnapshot().progressByVertexId.get('app').unmetSubgraphCompletionMilestoneVertexIds, []);
        assert.equal(runner.captureProgressSnapshot().counts.subgraphCompletionCommittedVertices, 3);
      }
    }

    const deferredTraversal = new AsyncDagTraversalBuilder({ dagDiscoverySource: { resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'task', vertexContentInput: { $vertexData: 'task', $childDiscoveryHints: [] } } }), resolveChildVertexFromHint: () => ({ omittedVertexIdentity: null, kind: "vertexIntentionallyOmitted", satisfiesWorkAndSubgraphCompletionPrerequisites: true }) } });
    deferredTraversal.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: esm.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    const deferredRunner = deferredTraversal.createIndependentRunnerFromCurrentOptions();
    await deferredRunner.runUntilSuspendedOrTerminal();
    assert.deepEqual(deferredRunner.captureProgressSnapshot().workCompletionDeferredVertexIds, ['task']);
    deferredRunner.settleDeferredWork('task', { kind: 'workCompleted' }, deferredRunner.captureProgressSnapshot().progressByVertexId.get('task').settlementToken);
    await deferredRunner.runUntilSuspendedOrTerminal();
    assert.equal(deferredRunner.getTraversalLifecycleStatus(), 'FINISHED');

    const lookupEvents = [];
    const lookupTraversal = new AsyncDagTraversalBuilder({ dagDiscoverySource: {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'app', workWaitsForWorkOf: ['parser'], vertexContentInput: { $vertexData: 'app', $childDiscoveryHints: [] } } }),
      resolveChildVertexFromHint: () => ({ omittedVertexIdentity: null, kind: "vertexIntentionallyOmitted", satisfiesWorkAndSubgraphCompletionPrerequisites: true }),
      resolvePrerequisiteByVertexId: async id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } }),
    } });
    lookupTraversal.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, v => { lookupEvents.push(v.getVertexData()); });
    await lookupTraversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    assert.deepEqual(lookupEvents, ['parser', 'app']);

    const completionEvents = [];
    const completionTraversal = new AsyncDagTraversalBuilder({ discoveryTiming: "completeBeforeAnyVisitor", dagDiscoverySource: {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'bundle', workWaitsForSubgraphCompletionOf: ['compile'], vertexContentInput: { $vertexData: 'bundle', $childDiscoveryHints: ['compile'] } } }),
      resolveChildVertexFromHint: id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, workWaitsForWorkOf: [], vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } }),
    } });
    completionTraversal.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, v => { completionEvents.push('W:' + v.getVertexData()); });
    completionTraversal.registerVisitorForPhase(DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY, async v => { await Promise.resolve(); completionEvents.push('C:' + v.getVertexData()); });
    await completionTraversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    assert.deepEqual(completionEvents, ['W:compile', 'C:compile', 'W:bundle', 'C:bundle']);

    const runner = new AsyncDagTraversalBuilder({
      dagDiscoverySource: {
        resolveRootVertex: async () => ({ kind: "vertexResolved", resolvedVertexInput: {
          vertexId: 'root', vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        } }),
        resolveChildVertexFromHint: async () => ({ omittedVertexIdentity: null, kind: "vertexIntentionallyOmitted", satisfiesWorkAndSubgraphCompletionPrerequisites: true }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const orders = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) orders.push(event.eventKind);
    assert.deepEqual(orders, ['workCompletionCommitted', 'subgraphCompletionCommitted']);
    const inspection = runner.captureExecutionSnapshot();
    assert.equal(inspection.callbackExecutionMode, 'async');
    assert.equal(inspection.inFlightInvocationCount, 0);
    assert.equal(inspection.bufferedDeliveryEventCount, 0);
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
    import { AsyncBreadthFirstTreeTraversalBuilder, AsyncDagTraversalBuilder, AsyncDepthFirstTreeTraversalBuilder, DepthFirstTreeTraversalBuilder, DepthFirstTreeVisitPhase, BreadthFirstTreeTraversalBuilder, DagTraversalBuilder, DagVisitorPhase, ObjectPropertyTreeSource, TraversalRunnerStatus, TraversalVisitorCommandName, core, objectRewrite, rewriteObject, runTreeBreadthFirstUntilSuspendedOrTerminalAsync, traverseDag, traverseDagAsync, runTreeDepthFirstUntilSuspendedOrTerminal, runTreeDepthFirstUntilSuspendedOrTerminalAsync } from 'configurable-tree-traversal';
    import type { AsyncDagDiscoverySource, ChildDiscoverySlot, TreeOrDagExecutionSnapshot, StructuralChildEdge, ResolvedGraphVertexSnapshot, VertexVisitSchedulingStage, ChildHintVertexIdentity, MaybePromise, LiveResolvedGraphView, DepthFirstTreeRunner, DagDiscoverySource, TreeDiscoverySource, VertexDataAndChildHintTypes, TraversalVisitorCommand, VertexId } from 'configurable-tree-traversal';
    import type { ChildDiscoverySlot as CoreChildSlot, StructuralChildEdge as CoreGraphEdge, ResolvedGraphVertexSnapshot as CoreGraphVertex, VertexVisitSchedulingStage as CoreGraphVertexStatus, ChildHintVertexIdentity as CoreHintVertexId, MaybePromise as CoreMaybePromise, VertexId as CoreVertexId } from 'configurable-tree-traversal/core';
    import type { TraversalExecutionSelectionPatch, DepthFirstTreeTraversalBuilderOptions, DepthFirstTreeTraversalBuilderOptionsPatch } from 'configurable-tree-traversal';
    import { TraversalVisitorCommandName as Command } from 'configurable-tree-traversal';
    import type { DagProgressSnapshot, DagWorkSettlementToken, DagSettlementOutcome, DagVertexProgress, DagWorkState } from 'configurable-tree-traversal';
    import type { DagProgressSnapshot as SubpathSummary } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { Vertex } from 'configurable-tree-traversal';
    import { Vertex as CoreVertex } from 'configurable-tree-traversal/core';

    const stall: import('configurable-tree-traversal').DagTraversalStallDiagnostics = {
      blockedVertexPrerequisiteReports: [], unresolvedPrerequisiteVertexIds: [], milestoneCycleVertexIdComponents: [], originalMilestoneConstraints: [], nonCyclePrerequisiteBlockedVertexIds: [], incompleteVertexIdsWithoutUnmetPrerequisites: [],
    };
    const typedStall: import('configurable-tree-traversal/traversals/dag-traversal').DagTraversalStallError = new core.DagTraversalStallError(stall);
    const milestone: import('configurable-tree-traversal').DagMilestone<'root'> = { vertexId: 'root', milestone: "workCompletion" };
    const dependencyEdge: import('configurable-tree-traversal/core').DagMilestoneConstraint<'root'> = { waitingMilestone: milestone, prerequisiteMilestone: milestone, reason: 'workDependency' };
    const subpathEdge: import('configurable-tree-traversal/traversals/dag-traversal').DagMilestoneConstraint<'root'> = dependencyEdge;
    const edgeId: 'root' = subpathEdge.prerequisiteMilestone.vertexId;
    void [typedStall, edgeId];
    type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
    type Tree = VertexDataAndChildHintTypes<string, Node | null>;
    const abstractRoot: Node = { $vertexData: 'root', $childDiscoveryHints: [{ $vertexData: 'leaf', $childDiscoveryHints: [] }] };
    const abstractTree: TreeDiscoverySource<Tree> = {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexContentInput: abstractRoot } }),
      resolveChildVertexFromHint: hint => hint === null ? { kind: "vertexIntentionallyOmitted" } : { kind: "vertexResolved", resolvedVertexInput: { vertexContentInput: hint } },
    };
    const abstractTraversal = new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: abstractTree });
    abstractTraversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, () => ({
      commands: [{
        commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: 'changed' },
      }],
    }));
    const requiredSource: DepthFirstTreeTraversalBuilderOptions<Tree> = { treeDiscoverySource: abstractTree };
    const partialOptions: DepthFirstTreeTraversalBuilderOptionsPatch<Tree> = { visitors: {} };
    abstractTraversal.patchOptionsForFutureRunners(partialOptions);
    // @ts-expect-error standalone construction requires a source
    new DepthFirstTreeTraversalBuilder({});
    // @ts-expect-error normalized engine state is not a public configuration port
    abstractTraversal.patchOptionsForFutureRunners({ traversalRunnerInternalObjects: {} });
    // @ts-expect-error builder state is private
    abstractTraversal.icfg;
    const runnerInterface: DepthFirstTreeRunner<Tree, Tree> = abstractTraversal.createIndependentRunnerFromCurrentOptions();
    // @ts-expect-error raw engine state is private
    abstractTraversal.createIndependentRunnerFromCurrentOptions().state;
    // @ts-expect-error runners are capabilities and expose no normalized constructor
    new (null as unknown as typeof import('configurable-tree-traversal')).DepthFirstTreeRunner({});
    void requiredSource;
    runnerInterface.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    runnerInterface.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    const command: TraversalVisitorCommand<Tree> = {
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: { replacementVertexData: 'typed' },
    };
    if (command.commandName === TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA) {
      const rewritten: string = command.commandArguments.replacementVertexData;
      void rewritten;
    }
    const convenience = runTreeDepthFirstUntilSuspendedOrTerminal({ treeDiscoverySource: abstractTree, visitors: { AFTER_CHILD_SUBTREES: vertex => { const data: string = vertex.getVertexData(); void data; } }, });

    const tree = new ObjectPropertyTreeSource({ a: 1 });
    const config: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase> = { deliveredEventKinds: [] };
    const runner = new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree }).createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal(config);
    const status: TraversalRunnerStatus = runner.getTraversalLifecycleStatus();
    const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;
    const output = objectRewrite.rewriteObjectWithAssertedOutputType<number>(1).capturedOutputResultAtReturn;
    const value: number | null = output.kind === 'present' ? output.value : null;
    const bfs = new BreadthFirstTreeTraversalBuilder({ treeDiscoverySource: tree }).createIndependentRunnerFromCurrentOptions();
    for (const { vertex } of bfs.runAndIterateObservationEventsUntilSuspendedOrTerminal()) { const key: string | number | symbol = vertex.getVertexData().propertyKey; void key; }
    const graph: DagDiscoverySource<Tree> = {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'root', workWaitsForSubgraphCompletionOf: [] as readonly VertexId[], vertexContentInput: abstractRoot } }),
      resolveChildVertexFromHint: hint => hint === null ? { omittedVertexIdentity: null, kind: "vertexIntentionallyOmitted", satisfiesWorkAndSubgraphCompletionPrerequisites: true } : { kind: "vertexResolved", resolvedVertexInput: { vertexId: hint, vertexContentInput: hint } },
      tryGetVertexIdentityFromHint: hint => ({ vertexId: hint }),
      resolvePrerequisiteByVertexId: id => id === undefined ? { kind: 'missing' } : { kind: "vertexResolved", resolvedVertexInput: { vertexId: id, vertexContentInput: abstractRoot } },
    };
    const asyncGraph: AsyncDagDiscoverySource<Tree> = { ...graph, resolvePrerequisiteByVertexId: id => Promise.resolve(graph.resolvePrerequisiteByVertexId!(id)) };
    const dagConfig: TraversalExecutionSelectionPatch<DagVisitorPhase> = { deliveredEventKinds: ["workCompletionCommitted"] };
    const dag = new DagTraversalBuilder({ dagDiscoverySource: graph }).createIndependentRunnerFromCurrentOptions();
    const liveResolvedGraphView: LiveResolvedGraphView<Tree> = dag.runUntilSuspendedOrTerminal(dagConfig).getLiveResolvedGraphView();
    const asyncDepth = new AsyncDepthFirstTreeTraversalBuilder({ treeDiscoverySource: abstractTree }).createIndependentRunnerFromCurrentOptions();
    const asyncBreadth = new AsyncBreadthFirstTreeTraversalBuilder({ treeDiscoverySource: abstractTree }).createIndependentRunnerFromCurrentOptions();
    const asyncDag = new AsyncDagTraversalBuilder({ dagDiscoverySource: asyncGraph, maxConcurrentCallbackInvocations: 2 }).createIndependentRunnerFromCurrentOptions();
    const progressTraversal = new DagTraversalBuilder({ dagDiscoverySource: graph, acceptedCompletedWorkVertexIds: new Set<VertexId>(), discoveryTiming: "completeBeforeAnyVisitor", sourceRootIsHiddenEntryHolder: true });
    progressTraversal.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    const progressRunner = progressTraversal.createIndependentRunnerFromCurrentOptions();
    const captureProgressSnapshot: DagProgressSnapshot = progressRunner.captureProgressSnapshot();
    const subpathSummary: SubpathSummary = asyncDag.captureProgressSnapshot();
    const entry: DagVertexProgress | undefined = captureProgressSnapshot.progressByVertexId.get('root');
    const completeGates: readonly VertexId[] | undefined = entry?.unmetSubgraphCompletionMilestoneVertexIds;
    const completeDeclaration: readonly VertexId[] | undefined = dag.getLiveResolvedGraphView().getVertexSnapshotOrNull(dag.getLiveResolvedGraphView().getDesignatedRootHandleOrNull()!)?.workWaitsForSubgraphCompletionOf;
    const legacyProgress: DagVertexProgress = { vertexId: 'old', workState: "waitingForPrerequisiteMilestones", subgraphCompletionCommitted: false, unmetPrerequisiteVertexIds: [], unmetWorkMilestoneVertexIds: [], unmetSubgraphCompletionMilestoneVertexIds: [] };
    void [completeGates, completeDeclaration, legacyProgress];
    const state: DagWorkState | undefined = entry?.workState;
    const settlementToken: DagWorkSettlementToken = Symbol();
    const outcome: DagSettlementOutcome = { kind: 'traversalFailed', error: undefined };
    const settlement: boolean = progressRunner.settleDeferredWork('root', outcome, settlementToken);
    const asyncSettlement: boolean = asyncDag.settleDeferredWork('root', { kind: 'workCompleted' }, settlementToken);
    // @ts-expect-error tree visitor return types remain narrow
    abstractTraversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, () => ({ commands: [{ commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    void [subpathSummary, state, settlement, asyncSettlement];
    const inspection: TreeOrDagExecutionSnapshot = asyncDag.captureExecutionSnapshot();
    const publicTypes: [VertexId, ChildHintVertexIdentity, MaybePromise<string>, VertexVisitSchedulingStage, StructuralChildEdge<Tree> | null, ChildDiscoverySlot<Tree> | null, ResolvedGraphVertexSnapshot<Tree> | null, CoreVertexId, CoreHintVertexId, CoreMaybePromise<string>, CoreGraphVertexStatus, CoreGraphEdge<Tree> | null, CoreChildSlot<Tree> | null, CoreGraphVertex<Tree> | null] = ['id', { vertexId: 'id' }, 'value', 'INITIAL_VISIT_ELIGIBLE', null, null, null, 'core-id', { vertexId: 'core-id' }, Promise.resolve('value'), "COMPLETION_VISIT_COMMITTED", null, null, null];
    const asyncRuns: Promise<unknown>[] = [
      asyncDepth.runUntilSuspendedOrTerminal(), asyncBreadth.runUntilSuspendedOrTerminal(), asyncDag.runUntilSuspendedOrTerminal(),
      runTreeDepthFirstUntilSuspendedOrTerminalAsync({ treeDiscoverySource: abstractTree,  }),
      runTreeBreadthFirstUntilSuspendedOrTerminalAsync({ treeDiscoverySource: abstractTree,  }),
      traverseDagAsync({ ...{ dagDiscoverySource: asyncGraph },  }),
    ];
    const syncDag = traverseDag({ ...{ dagDiscoverySource: graph },  });
    void [Vertex, CoreVertex, core.Vertex, value, status, failedStatus, convenience, liveResolvedGraphView, inspection, publicTypes, asyncRuns, syncDag];
  `,
  );
  fs.writeFileSync(
    path.join(consumer, 'consumer.cts'),
    fs.readFileSync(path.join(consumer, 'consumer.ts')),
  );
  fs.writeFileSync(
    path.join(consumer, 'consumer.mts'),
    `
    import namespace, { DagFragmentValidationError, DagTraversalStallError, AsyncDagTraversalBuilder, DagTraversalBuilder, DagVisitorPhase, TraversalVisitorCommandName as Command, DepthFirstTreeTraversalBuilder, DepthFirstTreeVisitPhase, ObjectPropertyTreeSource, core } from 'configurable-tree-traversal';
    import cjs = require('configurable-tree-traversal');
    import dagCjs = require('configurable-tree-traversal/traversals/dag-traversal');
    import { DagTraversalBuilder as SubpathDag } from 'configurable-tree-traversal/traversals/dag-traversal';
    import { Vertex } from 'configurable-tree-traversal';
    import { Vertex as CoreVertex } from 'configurable-tree-traversal/core';
    import vertexCjs = require('configurable-tree-traversal/core');
    import type { DagTraversalRunner } from 'configurable-tree-traversal/traversals/dag-traversal';
    import type { AsyncDagDiscoverySource, DagProgressSnapshot, DagDiscoverySource, VertexDataAndChildHintTypes, VertexId } from 'configurable-tree-traversal';
    import type { DagProgressSnapshot as CjsSummary } from 'configurable-tree-traversal/traversals/dag-traversal';
    type Tree = VertexDataAndChildHintTypes<string, string>;
    const esmFragmentError: dagCjs.DagFragmentValidationError<'root'> = new DagFragmentValidationError<'root'>([]);
    const cjsFragmentError: DagFragmentValidationError<'root'> = new cjs.DagFragmentValidationError<'root'>([]);
    const fragmentConstructor: typeof DagFragmentValidationError = dagCjs.DagFragmentValidationError;
    const stallConstructor: typeof DagTraversalStallError = cjs.core.DagTraversalStallError;
    const esmStallError: dagCjs.DagTraversalStallError<'root'> = new DagTraversalStallError<'root'>({
      blockedVertexPrerequisiteReports: [], unresolvedPrerequisiteVertexIds: [], milestoneCycleVertexIdComponents: [], nonCyclePrerequisiteBlockedVertexIds: [], incompleteVertexIdsWithoutUnmetPrerequisites: [],
    });
    const cjsStallError: DagTraversalStallError<'root'> = new dagCjs.DagTraversalStallError<'root'>(esmStallError.diagnostics);
    void [esmFragmentError, cjsFragmentError, fragmentConstructor, stallConstructor, esmStallError, cjsStallError];
    const esmCommands: typeof cjs.TraversalVisitorCommandName = Command;
    const cjsCommands: typeof Command = cjs.TraversalVisitorCommandName;
    const defaultCommands: typeof Command = namespace.TraversalVisitorCommandName;
    const graph: DagDiscoverySource<Tree> = {
      resolveRootVertex: () => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: 'app', workWaitsForSubgraphCompletionOf: ['build'] as readonly VertexId[], vertexContentInput: { $vertexData: 'app', $childDiscoveryHints: [] } } }),
      resolveChildVertexFromHint: id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] } } }),
      resolvePrerequisiteByVertexId: id => ({ kind: "vertexResolved", resolvedVertexInput: { vertexId: id, vertexContentInput: { $vertexData: String(id), $childDiscoveryHints: [] } } }),
    };
    const asyncGraph: AsyncDagDiscoverySource<Tree> = { ...graph, resolvePrerequisiteByVertexId: async id => graph.resolvePrerequisiteByVertexId!(id) };
    const fromEsm: cjs.DagTraversalBuilder<Tree> = new DagTraversalBuilder({ dagDiscoverySource: graph });
    const fromCjs: DagTraversalBuilder<Tree> = new cjs.DagTraversalBuilder({ dagDiscoverySource: graph });
    const fromSubpath: DagTraversalBuilder<Tree> = new SubpathDag({ dagDiscoverySource: graph });
    const fromDefault: cjs.DagTraversalBuilder<Tree> = new namespace.DagTraversalBuilder({ dagDiscoverySource: graph });
    const esmRunner: dagCjs.DagTraversalRunner<Tree> = fromEsm.createIndependentRunnerFromCurrentOptions();
    const cjsRunner: DagTraversalRunner<Tree> = fromCjs.createIndependentRunnerFromCurrentOptions();
    const captureProgressSnapshot: DagProgressSnapshot = cjsRunner.captureProgressSnapshot();
    const cjsSummary: CjsSummary = esmRunner.captureProgressSnapshot();
    const fromEsmVertex: vertexCjs.Vertex<Tree> = new Vertex<Tree>({ $vertexData: '', $childDiscoveryHints: [] });
    const fromCjsVertex: CoreVertex<Tree> = new vertexCjs.Vertex<Tree>({ $vertexData: '', $childDiscoveryHints: [] });
    const coreVertex: core.Vertex<Tree> = fromCjsVertex;
    fromCjs.registerVisitorForPhase(cjs.DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    fromEsm.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, () => ({ commands: [{ commandName: cjs.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    const asyncEsm: cjs.AsyncDagTraversalBuilder<Tree> = new AsyncDagTraversalBuilder({ dagDiscoverySource: asyncGraph });
    const asyncCjs: AsyncDagTraversalBuilder<Tree> = new cjs.AsyncDagTraversalBuilder({ dagDiscoverySource: asyncGraph });
    asyncEsm.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, async () => ({ commands: [{ commandName: cjs.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    // @ts-expect-error sync resolvers cannot return promises
    const invalidGraph: DagDiscoverySource<Tree> = { ...graph, resolvePrerequisiteByVertexId: async id => graph.resolvePrerequisiteByVertexId!(id) };
    // @ts-expect-error arbitrary symbols are not visitor command results
    fromEsm.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, () => Symbol('DEFER_READY'));
    // @ts-expect-error sync visitors cannot return promises
    fromEsm.registerVisitorForPhase(DagVisitorPhase.ON_WORK_READY, async () => ({ commands: [{ commandName: cjs.TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    const treeTraversal = new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: new ObjectPropertyTreeSource({ a: 1 }) });
    // @ts-expect-error tree visitors cannot defer DAG work
    treeTraversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, () => ({ commands: [{ commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION }] }));
    void [esmCommands, cjsCommands, defaultCommands, fromSubpath, fromDefault, captureProgressSnapshot, cjsSummary, fromEsmVertex, coreVertex, asyncEsm, asyncCjs, invalidGraph];
  `,
  );
  // Keep uniform-API contracts in reviewable fixtures, separate from the
  // public-path and loader-identity consumers above. Fixtures run only against
  // the extracted package, never this checkout's source aliases.
  const typeFixtures = [
    'supported-exports',
    'observation-facets',
    'uniform-api',
    'rewrite-output',
    'source-hint-contracts',
    'materialized-rewrite-capability',
    'execution-capabilities',
    'delivery-selection',
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
    'api-distinctions',
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
    'observation-facets.mjs',
    'idiomatic-diagnostics.mjs',
    'idiomatic-api.mjs',
    'uniform-api.mjs',
    'composable-api.mjs',
    'agent-api-foundations.mjs',
    'dag-inspection.mjs',
    'dag-fragments.mjs',
    'dag-revisions.mjs',
    'graph-walk.mjs',
    'api-distinctions.mjs',
    'delivery-selection.mjs',
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
    'docs/api-index.md',
    'docs/agent-workflows.md',
    'docs/reference.md',
    'docs/migration-uniform-api.md',
    'docs/migration-api-clarity.md',
    'docs/migration-idiomatic-api.md',
    'docs/migration-client-api.md',
    'docs/migration-api-distinctions.md',
    'docs/migration-explicit-api.md',
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
    'docs/api-index.md',
    'docs/agent-workflows.md',
    'docs/reference.md',
    'docs/migration-uniform-api.md',
    'docs/migration-api-clarity.md',
    'docs/migration-idiomatic-api.md',
    'docs/migration-client-api.md',
    'docs/migration-api-distinctions.md',
    'docs/migration-explicit-api.md',
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
