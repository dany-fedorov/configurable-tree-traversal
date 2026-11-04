import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { MutableValueReference } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { InternalVertexRef } from '../src/core/graph/types';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
  type DagProgressSnapshot,
} from '../src/traversals/dag-traversal';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';

function setup() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const root = scheduling.acceptRoot({
    vertexId: 'root',
    vertexContent: {
      $vertexData: 'root',
      $childDiscoveryHints: ['a', 'duplicate', 'omit', 'deleted'],
    },
  })!;
  const context = (
    index: number,
    parent: InternalVertexRef<TestGraph> = root,
  ) => ({
    parentVertexReference: parent,
    parentVertexAtChildResolution: parent.getReferencedValue(),
    discoveryDepthInEdges: 1,
    parentChildHintIndex: index,
    childDiscoveryHint: parent
      .getReferencedValue()
      .getMutableChildDiscoveryHints()[index]!,
  });
  return { container, scheduling, root, context };
}

test('narrow graph reads detach records and preserve depth, ID and declaration identity', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'root', $childDiscoveryHints: ['a'] }),
  );
  const child = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'a', $childDiscoveryHints: [] }),
  );
  const dependency = {};
  store.insertVertex({
    ref: root,
    id: undefined,
    workWaitsForWorkOf: [dependency],
    depth: 4,
  });
  store.insertVertex({ ref: child, id: NaN, workWaitsForWorkOf: [], depth: 5 });
  expect(store.getTraversalSlot(root, 0)).toBeUndefined();
  store.prepareSlots(root, ['a']);
  const slot = store.getTraversalSlot(root, 0)!;
  const slots = store.getTraversalSlots(root)!;
  const graph = store.graph.get(root)!;
  const declarations = store.getDeclaredDependencies(root);
  expect(store.getDiscoveryDepth(root)).toBe(4);
  expect(store.graph.requireVertexId(root)).toBeUndefined();
  expect(declarations[0]).toBe(dependency);
  declarations.length = 0;
  (slot as { hint: string }).hint = 'changed';
  (slots[0] as { hint: string }).hint = 'also changed';
  expect(store.getTraversalSlot(root, 0)).toEqual({
    kind: 'pending',
    hint: 'a',
  });
  expect(store.getDeclaredDependencies(root)).toEqual([dependency]);
  store.linkSlot(root, 0, child);
  const linked = store.graph.get(root)!;
  store.removeVertices(new Set([child]));
  expect(graph.slots).toEqual([{ kind: 'pending', hint: 'a' }]);
  expect(linked.slots).toEqual([
    { kind: 'linked', hint: 'a', childRef: child },
  ]);
  expect(store.getTraversalSlot(root, 0)).toEqual({
    kind: 'deleted',
    hint: 'a',
  });
  expect(() => store.getDiscoveryDepth(child)).toThrow(
    'Unknown vertex reference',
  );
});

test('discovery accounting survives duplicates, omissions, deleted arrivals and reconstruction', () => {
  const { container, scheduling, root, context } = setup();
  expect(scheduling.isDiscoveryComplete()).toBe(false);
  scheduling.prepareSlots(
    root,
    root.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  const a = scheduling.acceptVertex(context(0), {
    vertexId: 'a',
    workWaitsForWorkOf: [],
    vertexContent: { $vertexData: 'a', $childDiscoveryHints: [] },
  })!;
  expect(
    scheduling.acceptVertex(context(1), { vertexContent: null, vertexId: 'a' }),
  ).toBe(a);
  scheduling.acceptVertex(context(2), {
    vertexContent: null,
    vertexId: 'omitted',
  });
  container.store.markDeleted('deleted');
  scheduling.acceptVertex(context(3), {
    vertexContent: null,
    vertexId: 'deleted',
  });
  scheduling.closeExpansion(root);
  scheduling.closeExpansion(root);
  expect(scheduling.isDiscoveryComplete()).toBe(false);
  const previous = container.liveResolvedGraphView.get(root)!;
  scheduling.deleteVertex(a);
  expect(scheduling.isDiscoveryComplete()).toBe(true);
  expect(previous.slots[0]).toMatchObject({
    kind: 'linked',
    childRef: a,
  });
  scheduling.takeReady();
  scheduling.markPreVisited(root);
  const restored = new GraphScheduling(container);
  restored.restoreDagSeed(scheduling.inspectEligible());
  expect(restored.isDiscoveryComplete()).toBe(true);
  expect(restored.takeCompleting()).toBe(root);
  restored.markComplete(root);
  restored.restoreDagSeed([]);
  expect(restored.isDiscoveryComplete()).toBe(true);
  restored.deleteVertex(root);
  expect(restored.isDiscoveryComplete()).toBe(true);
});

test('reconstructed unprepared discovery stays open until its resumed expansion closes', () => {
  const { container, scheduling, root } = setup();
  const restored = new GraphScheduling(container);
  restored.restoreDagSeed(scheduling.inspectEligible());
  expect(restored.isDiscoveryComplete()).toBe(false);
  expect(restored.takeReady()).toBe(root);
  restored.markPreVisited(root);
  restored.prepareSlots(root, []);
  expect(restored.isDiscoveryComplete()).toBe(false);
  restored.closeExpansion(root);
  expect(restored.isDiscoveryComplete()).toBe(true);
  expect(restored.takeCompleting()).toBe(root);
  restored.deleteVertex(root);
  expect(restored.isDiscoveryComplete()).toBe(true);
});

test('topology validation is reused through progress but invalidated by later declarations and deletion', () => {
  const { container, scheduling, root, context } = setup();
  scheduling.prepareSlots(
    root,
    root.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  scheduling.validateDiscoveredGraph();
  expect(scheduling.diagnoseTopology([root])).toBeNull();
  scheduling.markPreVisited(root);
  root.replaceReferencedValue(
    root
      .getReferencedValue()
      .createEditableShallowCloneWithContentOverrides({
        $vertexData: 'rewritten',
      }),
  );
  expect(scheduling.diagnoseTopology([root])).toBeNull();
  const bad = scheduling.acceptVertex(context(0), {
    vertexId: 'bad',
    workWaitsForWorkOf: ['missing'],
    vertexContent: { $vertexData: 'bad', $childDiscoveryHints: [] },
  })!;
  expect(
    scheduling.diagnoseTopology([root, bad])!.unresolvedPrerequisiteVertexIds,
  ).toEqual(['missing']);
  expect(() => scheduling.validateDiscoveredGraph()).toThrow();
  scheduling.acceptVertex(context(1), {
    vertexContent: null,
    vertexId: 'missing',
  });
  scheduling.validateDiscoveredGraph();
  expect(scheduling.diagnoseTopology([root, bad])).toBeNull();
  scheduling.deleteVertex(bad);
  expect(
    scheduling.diagnoseTopology([root])!.milestoneCycleVertexIdComponents,
  ).toEqual([]);
  scheduling.validateDiscoveredGraph();
  container.store.markOmitted('unused');
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
});

test('topology reads do not certify validation and structural edits invalidate successful evidence', () => {
  const { container, scheduling, root, context } = setup();
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  scheduling.validateDiscoveredGraph();
  scheduling.prepareSlots(
    root,
    root.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  const child = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'child', $childDiscoveryHints: [] }),
  );
  container.acceptVertex(child, 'child', [], context(0));
  scheduling.validateDiscoveredGraph();
  container.acceptEdge(root, 0, child);
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  scheduling.validateDiscoveredGraph();
  container.acceptEdge(root, 0, child);
  expect(scheduling.diagnoseTopology([root])).toBeNull();
  scheduling.closeSlot(root, 1, 'disabled');
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  scheduling.validateDiscoveredGraph();
  container.store.markDeleted('tombstone');
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  scheduling.validateDiscoveredGraph();
  container.store.removeVertices(new Set());
  expect(scheduling.diagnoseTopology([root])).toBeNull();
  scheduling.deleteVertex(child);
  expect(scheduling.isDiscoveryComplete()).toBe(false);
  scheduling.closeSlot(root, 2, 'omitted');
  scheduling.closeSlot(root, 3, 'deleted');
  scheduling.closeExpansion(root);
  expect(scheduling.isDiscoveryComplete()).toBe(true);
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} lazy summaries expose seeded original cycles before discovery closes`, async () => {
    const snapshots: DagProgressSnapshot[] = [];
    const traversal = new Constructor<TestGraph>({
      acceptedCompletedWorkVertexIds: new Set(['root', 'a']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['a'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a'],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => {
          if (id === 'probe') snapshots.push(runner.captureProgressSnapshot());
          return id === 'probe'
            ? {
                omittedVertexIdentity: null,
                kind: 'vertexIntentionallyOmitted' as const,
                satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              }
            : {
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexId: 'a',
                  workWaitsForWorkOf: ['root'],
                  vertexContentInput: {
                    $vertexData: 'a',
                    $childDiscoveryHints: ['probe'],
                  },
                },
              };
        },
      },
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: { milestoneCycleVertexIdComponents: [['root', 'a']] },
    });
    expect(snapshots[0]!.discovery.complete).toBe(false);
    expect(
      snapshots[0]!.invalidDependencyTopologyDiagnostics!
        .milestoneCycleVertexIdComponents,
    ).toEqual([['root', 'a']]);
  });

  test(`${Constructor.name} eager deletion after seeded success and settlement preserves prior summaries`, async () => {
    const traversal = new Constructor<TestGraph>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      acceptedCompletedWorkVertexIds: new Set(['seed']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['seed', 'gate', 'remove', 'dependent'],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf:
              id === 'gate'
                ? ['seed']
                : id === 'remove'
                ? ['gate']
                : id === 'dependent'
                ? ['remove']
                : [],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) =>
      vertex.getVertexData() === 'gate'
        ? {
            commands: [
              {
                commandName:
                  VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
              },
            ],
          }
        : {
            commands: [
              {
                commandName:
                  Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
              },
            ],
          },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const before = runner.captureProgressSnapshot();
    const gate = before.progressByVertexId.get('gate')!.settlementToken!;
    expect(before.workVisitorReadyOrWorkCompletionDeferredVertexIds).toEqual([
      'gate',
    ]);
    expect(
      runner.settleDeferredWork('gate', { kind: 'workCompleted' }, gate),
    ).toBe(true);
    await runner.runUntilSuspendedOrTerminal();
    const after = runner.captureProgressSnapshot();
    expect(after.workCompletionCommittedVertexIds).toEqual(['seed', 'gate']);
    expect(after.counts.retainedLiveVertices).toBe(2);
    expect(after.invalidDependencyTopologyDiagnostics).toBeNull();
    expect(before.workCompletionCommittedVertexIds).toEqual(['seed']);
    expect(before.workVisitorReadyOrWorkCompletionDeferredVertexIds).toEqual([
      'gate',
    ]);
    expect(
      before.progressByVertexId.get('dependent')!.unmetPrerequisiteVertexIds,
    ).toEqual(['remove']);
  });
}
