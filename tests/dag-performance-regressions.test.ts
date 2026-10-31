import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { MutableRef } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { InternalVertexRef } from '../src/core/graph/types';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as Order,
  type DagSummary,
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
      $data: 'root',
      $childHints: ['a', 'duplicate', 'omit', 'deleted'],
    },
  })!;
  const context = (
    index: number,
    parent: InternalVertexRef<TestGraph> = root,
  ) => ({
    parentVertexRef: parent,
    parentVertex: parent.getValue(),
    depth: 1,
    hintIndex: index,
    vertexHint: parent.getValue().getChildHints()[index]!,
  });
  return { container, scheduling, root, context };
}

test('narrow graph reads detach records and preserve depth, ID and declaration identity', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = new MutableRef(
    new Vertex<TestGraph>({ $data: 'root', $childHints: ['a'] }),
  );
  const child = new MutableRef(
    new Vertex<TestGraph>({ $data: 'a', $childHints: [] }),
  );
  const dependency = {};
  store.insertVertex({
    ref: root,
    id: undefined,
    dependsOnWork: [dependency],
    depth: 4,
  });
  store.insertVertex({ ref: child, id: NaN, dependsOnWork: [], depth: 5 });
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
  scheduling.prepareSlots(root, root.getValue().getChildHints());
  const a = scheduling.acceptVertex(context(0), {
    vertexId: 'a',
    dependsOnWork: [],
    vertexContent: { $data: 'a', $childHints: [] },
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
  const previous = container.resolvedGraphView.get(root)!;
  scheduling.deleteVertex(a);
  expect(scheduling.isDiscoveryComplete()).toBe(true);
  expect(previous.slots[0]).toMatchObject({ kind: 'linked', childRef: a });
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
  scheduling.prepareSlots(root, root.getValue().getChildHints());
  scheduling.validateDiscoveredGraph();
  expect(scheduling.diagnoseTopology([root])).toBeNull();
  scheduling.markPreVisited(root);
  root.setValue(root.getValue().clone({ $data: 'rewritten' }));
  expect(scheduling.diagnoseTopology([root])).toBeNull();
  const bad = scheduling.acceptVertex(context(0), {
    vertexId: 'bad',
    dependsOnWork: ['missing'],
    vertexContent: { $data: 'bad', $childHints: [] },
  })!;
  expect(
    scheduling.diagnoseTopology([root, bad])!.unknownPrerequisiteIds,
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
    scheduling.diagnoseTopology([root])!.dependencyCycleComponents,
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
  scheduling.prepareSlots(root, root.getValue().getChildHints());
  expect(scheduling.diagnoseTopology([root])).not.toBeNull();
  const child = new MutableRef(
    new Vertex<TestGraph>({ $data: 'child', $childHints: [] }),
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

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} lazy summaries expose seeded original cycles before discovery closes`, async () => {
    const snapshots: DagSummary[] = [];
    const traversal = new Constructor<TestGraph>({
      completedWork: new Set(['root', 'a']),
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['a'],
            vertexContent: { $data: 'root', $childHints: ['a'] },
          },
        }),
        resolveChild: (id) => {
          if (id === 'probe') snapshots.push(runner.summary());
          return id === 'probe'
            ? {
                identity: null,
                kind: 'omitted' as const,
                satisfiesDependencies: true as const,
              }
            : {
                kind: 'found' as const,
                vertex: {
                  vertexId: 'a',
                  dependsOnWork: ['root'],
                  vertexContent: { $data: 'a', $childHints: ['probe'] },
                },
              };
        },
      },
    });
    const runner = traversal.createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycleComponents: [['root', 'a']] },
    });
    expect(snapshots[0]!.discovery.complete).toBe(false);
    expect(snapshots[0]!.diagnostics!.dependencyCycleComponents).toEqual([
      ['root', 'a'],
    ]);
  });

  test(`${Constructor.name} eager deletion after seeded success and settlement preserves prior summaries`, async () => {
    const traversal = new Constructor<TestGraph>({
      discovery: 'eager',
      syntheticRoot: true,
      completedWork: new Set(['seed']),
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: {
              $data: '',
              $childHints: ['seed', 'gate', 'remove', 'dependent'],
            },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork:
              id === 'gate'
                ? ['seed']
                : id === 'remove'
                ? ['gate']
                : id === 'dependent'
                ? ['remove']
                : [],
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
      vertex.getData() === 'gate'
        ? {
            commands: [
              { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
            ],
          }
        : { commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }] },
    );
    const runner = traversal.createRunner();
    await runner.run();
    const before = runner.summary();
    const gate = before.vertices.get('gate')!.generation!;
    expect(before.readyOrDeferredIds).toEqual(['gate']);
    expect(runner.settle('gate', { kind: 'workCompleted' }, gate)).toBe(true);
    await runner.run();
    const after = runner.summary();
    expect(after.completedWorkIds).toEqual(['seed', 'gate']);
    expect(after.counts.discovered).toBe(2);
    expect(after.diagnostics).toBeNull();
    expect(before.completedWorkIds).toEqual(['seed']);
    expect(before.readyOrDeferredIds).toEqual(['gate']);
    expect(before.vertices.get('dependent')!.unmetPrerequisiteIds).toEqual([
      'remove',
    ]);
  });
}
