import { treeResolution } from './source-result-fixtures';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { ObjectPropertyTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree';
import {
  AsyncDepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase as Order,
  DepthFirstTreeTraversalBuilder,
} from '../src/traversals/depth-first-traversal';
import { ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import type { DepthFirstChildBoundaryVisitOptions } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  createInternalAsyncDepthFirstTreeRunner,
  runnerInternals,
} from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
type Tree = VertexDataAndChildHintTypes<string, Node | null>;
const node = (
  $vertexData: string,
  ...$childDiscoveryHints: (Node | null)[]
): Node => ({
  $vertexData,
  $childDiscoveryHints,
});

function traversal(
  root: Node | null = node('root', node('A'), node('B')),
  maxConcurrentCallbackInvocations = Infinity,
) {
  return new AsyncDepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: {
      resolveRootVertex: () => treeResolution(root),
      resolveChildVertexFromHint: async (hint) => treeResolution(hint),
    },
    maxConcurrentCallbackInvocations,
  });
}

async function values(
  runner: ReturnType<
    ReturnType<typeof traversal>['createIndependentRunnerFromCurrentOptions']
  >,
  order: Order,
): Promise<string[]> {
  const seen: string[] = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: [order] },
  )) {
    seen.push(event.vertex.getVertexData());
  }
  return seen;
}

test('exposes asynchronous depth-first post-order traversal', async () => {
  const traversal = new AsyncDepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['A', 'B'],
          },
        },
      }),
      resolveChildVertexFromHint: async (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
    maxConcurrentCallbackInvocations: 2,
  });
  const seen: string[] = [];
  for await (const event of traversal
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Order.AFTER_CHILD_SUBTREES],
    })) {
    seen.push(event.vertex.getVertexData());
    expect(event.isTreeRoot).toBe(event.vertex.getVertexData() === 'root');
    expect(event.isTreeRoot).toBe(event.vertex.getVertexData() === 'root');
  }
  expect(seen).toEqual(['A', 'B', 'root']);
});

const inOrderCases: Array<
  [Partial<DepthFirstChildBoundaryVisitOptions>, string[]]
> = [
  [{}, ['a', 'root', 'b', 'root', 'c']],
  [
    { visitAfterChildIndices: { indices: [0, 2] } },
    ['a', 'root', 'b', 'c', 'root'],
  ],
  [
    {
      visitAfterChildIndices: { indices: [99] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-1] },
    },
    ['a', 'b', 'c', 'root'],
  ],
  [{ visitAfterChildIndices: { indices: [-2] } }, ['a', 'b', 'root', 'c']],
];

test.each(inOrderCases)(
  'preserves in-order range configuration %#',
  async (config, expected) => {
    const t = traversal(
      node('root', node('a'), node('b'), node('c')),
    ).patchOptionsForFutureRunners({
      childBoundaryVisits: config,
    });
    await expect(
      values(
        t.createIndependentRunnerFromCurrentOptions(),
        Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      ),
    ).resolves.toEqual(expected);
  },
);

test('preserves one-child and null-slot in-order options', async () => {
  await expect(
    values(
      traversal(node('root', node('only')))
        .patchOptionsForFutureRunners({
          childBoundaryVisits: { alsoVisitAfterOnlyChild: false },
        })
        .createIndependentRunnerFromCurrentOptions(),
      Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
    ),
  ).resolves.toEqual(['only']);
  await expect(
    values(
      traversal(
        node('root', null, node('a')),
      ).createIndependentRunnerFromCurrentOptions(),
      Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
    ),
  ).resolves.toEqual(['root', 'a']);
  await expect(
    values(
      traversal(node('root', null, node('a')))
        .patchOptionsForFutureRunners({
          childBoundaryVisits: {
            allowBoundaryVisitsAfterOmittedChildSlots: false,
          },
        })
        .createIndependentRunnerFromCurrentOptions(),
      Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
    ),
  ).resolves.toEqual(['a']);
  await expect(
    values(
      traversal(
        node('root', null, null),
      ).createIndependentRunnerFromCurrentOptions(),
      Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
    ),
  ).resolves.toEqual(['root']);
});

test('resumes repeated mid-chain halts without repeating visitors', async () => {
  const t = traversal(node('root', node('leaf')));
  const visits: string[] = [];
  t.registerVisitorCallbackForPhase(Order.BEFORE_CHILD_EXPANSION, (vertex) => {
    visits.push(`halt:${vertex.getVertexData()}`);
    return {
      commands: [
        { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
      ],
    };
  });
  t.registerVisitorCallbackForPhase(
    Order.BEFORE_CHILD_EXPANSION,
    async (vertex) => {
      visits.push(`after:${vertex.getVertexData()}`);
    },
  );
  const runner = t.createIndependentRunnerFromCurrentOptions();

  await expect(
    runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] }),
  ).resolves.toBe(runner);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(visits).toEqual(['halt:root']);
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(visits).toEqual(['halt:root', 'after:root', 'halt:leaf']);
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  expect(visits).toEqual([
    'halt:root',
    'after:root',
    'halt:leaf',
    'after:leaf',
  ]);
});

test('uses new iterator filters when resuming after consumer closure', async () => {
  const runner = traversal(
    node('root', node('leaf')),
  ).createIndependentRunnerFromCurrentOptions();
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: [Order.BEFORE_CHILD_EXPANSION],
    },
  )) {
    expect(event.vertex.getVertexData()).toBe('root');
    break;
  }
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(runner.isSuspended()).toBe(true);
  await expect(values(runner, Order.AFTER_CHILD_SUBTREES)).resolves.toEqual([
    'leaf',
    'root',
  ]);
});

test('supports promised sorting and tree runner graph and vertex queries', async () => {
  const runner = traversal(node('root', node('a'), node('b')))
    .patchOptionsForFutureRunners({
      transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
    })
    .createIndependentRunnerFromCurrentOptions();
  await expect(values(runner, Order.BEFORE_CHILD_EXPANSION)).resolves.toEqual([
    'root',
    'b',
    'a',
  ]);
  const graph = runner.getLiveResolvedGraphView();
  const root = graph.getDesignatedRootHandleOrNull();
  if (root === null) throw new Error('Expected a root');
  const children =
    graph.getVertexSnapshotOrNull(root)?.orderedChildDiscoverySlots;
  if (children?.[0]?.kind !== 'linkedToVertex')
    throw new Error('Expected a child');
  expect(runner.isTreeRootVertex(root)).toBe(true);
  expect(runner.isTreeRootVertex(root)).toBe(true);
  expect(runner.hasSkippedPendingChildDiscovery(root)).toBe(false);
  expect(
    !children[0].childVertexHandle
      .getCurrentVertexView()
      .hasChildDiscoveryHints(),
  ).toBe(true);
});

test('retains saved original tree data through asynchronous mutations', async () => {
  const t = traversal(node('root', node('leaf'))).patchOptionsForFutureRunners({
    retainDiscoveredTreeBeforeVisitorCommands: true,
  });
  t.registerVisitorCallbackForPhase(
    Order.BEFORE_CHILD_EXPANSION,
    async (vertex) => ({
      commands: [
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: {
            replacementVertexData: vertex.getVertexData().toUpperCase(),
          },
        },
      ],
    }),
  );
  const runner = await t
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(
    runner
      .getLiveResolvedTreeView()
      .getRootVertexHandleOrNull()
      ?.getCurrentVertexView()
      .getVertexData(),
  ).toBe('ROOT');
  const saved =
    runnerInternals(runner).resolvedTreesContainer.preCommandDiscoveredTreeView;
  expect(
    saved?.getRootVertexReferenceOrNull()?.getReferencedValue().getVertexData(),
  ).toBe('root');
  expect(
    saved
      ?.getDetachedChildReferenceListOrNull(
        saved.getRootVertexReferenceOrNull()!,
      )?.[0]
      ?.getReferencedValue()
      .getVertexData(),
  ).toBe('leaf');
});

test('accepts the existing synchronous object-tree adapter', async () => {
  const runner = new AsyncDepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource({ a: 1, b: { c: 2 } }),
  }).createIndependentRunnerFromCurrentOptions();
  const keys: Array<string | number | symbol> = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: [Order.BEFORE_CHILD_EXPANSION],
    },
  )) {
    keys.push(event.vertex.getVertexData().propertyKey);
  }
  expect(keys).toEqual([
    '__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__',
    'a',
    'b',
    'c',
  ]);
});

test('builder visitor operations are stable and runner snapshots are isolated', async () => {
  const ranges: {
    ranges: Array<{ fromInclusive: number; throughInclusive: number }>;
  } = {
    ranges: [{ fromInclusive: 0, throughInclusive: 0 }],
  };
  const t = traversal(
    node('root', node('a'), node('b')),
  ).patchOptionsForFutureRunners({
    childBoundaryVisits: { visitAfterChildIndices: ranges },
  });
  const seen: string[] = [];
  t.replaceVisitorDefinitionsForPhase(Order.BEFORE_CHILD_EXPANSION, [
    {
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: async () => {
        seen.push('first');
      },
    },
  ]);
  t.registerVisitorCallbackForPhase(Order.BEFORE_CHILD_EXPANSION, async () => {
    seen.push('second');
  });
  expect(
    t.getDetachedVisitorRegistrationRecordsForPhase(
      Order.BEFORE_CHILD_EXPANSION,
    ),
  ).toHaveLength(2);
  const runner = t.createIndependentRunnerFromCurrentOptions();
  ranges.ranges[0]!.fromInclusive = 1;
  t.registerVisitorCallbackForPhase(Order.BEFORE_CHILD_EXPANSION, async () => {
    seen.push('late');
  });
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(seen).toEqual([
    'first',
    'second',
    'first',
    'second',
    'first',
    'second',
  ]);
  expect(
    runnerInternals(runner).icfg.childBoundaryVisits.visitAfterChildIndices,
  ).toEqual({
    ranges: [{ fromInclusive: 0, throughInclusive: 0 }],
  });
});

test('reuses injected tree storage and state objects', async () => {
  const first = await traversal(node('root', node('child')))
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const state = runnerInternals(
    traversal().createIndependentRunnerFromCurrentOptions(),
  ).state;
  const root = first.getLiveResolvedTreeView().getRootVertexHandleOrNull();
  const second = createInternalAsyncDepthFirstTreeRunner<Tree>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: (hint) => treeResolution(hint),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
      state,
    },
  });
  expect(runnerInternals(second).state.visitorsState).toBe(state.visitorsState);
  expect(runnerInternals(second).state.subtreeTraversalDisabledRefs).toBe(
    state.subtreeTraversalDisabledRefs,
  );
  await expect(values(second, Order.BEFORE_CHILD_EXPANSION)).resolves.toEqual([
    'root',
    'child',
  ]);
  expect(second.getLiveResolvedTreeView().getRootVertexHandleOrNull()).toBe(
    root,
  );
});

test.each([null, undefined])(
  'rethrows an original %p failure on every attempted rerun',
  async (failure) => {
    const runner = new AsyncDepthFirstTreeTraversalBuilder<TestGraph>({
      treeDiscoverySource: {
        resolveRootVertex: async () => {
          throw failure;
        },
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
    await expect(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
    ).rejects.toBe(failure);
  },
);

test('preserves an original consumer exception and allows resumption', async () => {
  const consumerError = { source: 'consumer' };
  const runner = traversal(
    node('root', node('leaf')),
  ).createIndependentRunnerFromCurrentOptions();
  let caught: unknown;
  try {
    for await (const _event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      throw consumerError;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(consumerError);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  await expect(runner.runUntilSuspendedOrTerminal()).resolves.toBe(runner);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

test('directly exposes session one-active-iterator and synchronous close control', async () => {
  const runner = traversal().createIndependentRunnerFromCurrentOptions();
  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const firstEvent = await first.next();
  expect(firstEvent.done).toBe(false);
  const second =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(second.next()).rejects.toThrow('Another active iterator');
  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
});

test('validates and inspects concurrency without advancing traversal', () => {
  const runner = traversal(
    undefined,
    2,
  ).createIndependentRunnerFromCurrentOptions();
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    callbackExecutionMode: 'async',
    traversalAlgorithm: 'depth-first',
    maxConcurrentCallbackInvocations: 2,
    inFlightInvocationCount: 0,
    bufferedDeliveryEventCount: 0,
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.NOT_STARTED);
  expect(() => traversal(undefined, 0)).toThrow(TypeError);
  expect(() => traversal(undefined, 1.5)).toThrow(TypeError);
});

test('exports recursively frozen asynchronous defaults', () => {
  expect(
    Object.isFrozen(ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG),
  ).toBe(true);
  expect(
    Object.isFrozen(
      ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.childBoundaryVisits,
    ),
  ).toBe(true);
});

test('matches synchronous DFS for timing-independent generated trees', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    let value = seed;
    const random = () =>
      ((value = (value * 48271) % 2147483647) - 1) / 2147483646;
    const make = (depth: number, label: string): Node =>
      node(
        label,
        ...(depth === 0
          ? []
          : Array.from({ length: Math.floor(random() * 4) }, (_, index) =>
              random() < 0.25 ? null : make(depth - 1, `${label}.${index}`),
            )),
      );
    const root = make(4, 'root');
    const tree = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: { vertexContentInput: root },
      }),
      resolveChildVertexFromHint: (hint: Node | null) => treeResolution(hint),
    };
    const sync = new DepthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: tree,
    });
    const asyncTraversal = new AsyncDepthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: tree,
      maxConcurrentCallbackInvocations: 3,
    });
    for (const order of Object.values(Order)) {
      const expected = Array.from(
        sync
          .createIndependentRunnerFromCurrentOptions()
          .runAndIterateObservationEventsUntilSuspendedOrTerminal({
            deliveredEventKinds: [order],
          }),
        (event) => event.vertex.getVertexData(),
      );
      await expect(
        values(
          asyncTraversal.createIndependentRunnerFromCurrentOptions(),
          order,
        ),
      ).resolves.toEqual(expected);
    }
  }
});
