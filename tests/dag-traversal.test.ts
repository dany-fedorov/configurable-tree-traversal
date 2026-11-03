import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { ObjectPropertyTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';

type Node = { id: string; children: string[]; workWaitsForWorkOf?: string[] };
type TestGraph = VertexDataAndChildHintTypes<string, string>;

function graphAdapter(
  nodes: Record<string, Node> = {
    root: { id: 'root', children: ['A', 'B', 'join'] },
    A: { id: 'A', children: ['join'] },
    B: { id: 'B', children: ['join'] },
    join: { id: 'join', children: [], workWaitsForWorkOf: ['A', 'B'] },
  },
): DagDiscoverySource<TestGraph> {
  const make = (id: string) => {
    const node = nodes[id]!;
    return {
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: node.id,
          $childDiscoveryHints: node.children,
        },
        vertexId: node.id,
        ...(node.workWaitsForWorkOf === undefined
          ? {}
          : { workWaitsForWorkOf: node.workWaitsForWorkOf }),
      },
    };
  };
  return {
    resolveRootVertex: () => make('root'),
    resolveChildHint: (hint) => make(hint),
    tryGetVertexIdentityFromHint: (hint) => ({ vertexId: hint }),
  };
}

test('visits a shared join once after both prerequisites', () => {
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter(),
  }).createIndependentRunnerFromCurrentOptions();
  const values = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    }),
  ].map(({ vertex }) => vertex.getVertexData());
  expect(values).toEqual(['root', 'A', 'B', 'join']);
  const graph = runner.getLiveResolvedGraphView();
  const join = graph.getVertexHandleByIdOrNull('join')!;
  expect(graph.getDistinctStructuralParentHandlesOrNull(join)).toHaveLength(3);
  expect(graph.getVertexVisitSchedulingStageOrNull(join)).toBe(
    'COMPLETION_VISIT_COMMITTED',
  );
});

test('defaults to both orders and keeps initial and completion work in one FIFO', () => {
  const events = [
    ...new DagTraversalBuilder<TestGraph>({
      dagDiscoverySource: graphAdapter(),
    })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ].map(({ vertex, eventKind }) => `${eventKind}:${vertex.getVertexData()}`);

  expect(events).toEqual([
    'workCompletionCommitted:root',
    'workCompletionCommitted:A',
    'workCompletionCommitted:B',
    'workCompletionCommitted:join',
    'subgraphCompletionCommitted:join',
    'subgraphCompletionCommitted:A',
    'subgraphCompletionCommitted:B',
    'subgraphCompletionCommitted:root',
  ]);
});

test('retains the graph root flag without an independent traversal root', () => {
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter(),
  }).createIndependentRunnerFromCurrentOptions();
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    }),
  ];
  expect(events.map(({ isVisibleSourceRoot }) => isVisibleSourceRoot)).toEqual([
    true,
    false,
    false,
    false,
  ]);
  expect(events.map((event) => 'isTraversalRoot' in event)).toEqual([
    false,
    false,
    false,
    false,
  ]);
  expect(runner.isVisibleSourceRootVertex(events[0]!.vertexHandle)).toBe(true);
  expect(runner.isVisibleSourceRootVertex(events[0]!.vertexHandle)).toBe(true);
});

test('finishes an empty graph', () => {
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();

  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  expect(
    runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
  ).toBeNull();
});

test.each([
  ['missing dependency', ['absent']],
  ['dependency cycle', ['child']],
] as const)(
  'fails a synchronous %s as a stall',
  (_name, workWaitsForWorkOf) => {
    const runner = new DagTraversalBuilder<TestGraph>({
      dagDiscoverySource: graphAdapter({
        root: { id: 'root', children: ['child'] },
        child: {
          id: 'child',
          children: [],
          workWaitsForWorkOf: [...workWaitsForWorkOf],
        },
      }),
    }).createIndependentRunnerFromCurrentOptions();

    expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(/stall.*child/i);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  },
);

test('reports hostile object dependency ids without coercing them', () => {
  let coercions = 0;
  const hostileId = {
    toString() {
      coercions += 1;
      throw new Error('must not coerce vertex ids');
    },
  };
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['blocked'],
          },
          vertexId: 'root',
        },
      }),
      resolveChildHint: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'blocked',
            $childDiscoveryHints: [],
          },
          vertexId: 'blocked',
          workWaitsForWorkOf: [hostileId],
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();

  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
    /DAG traversal stalled: "blocked", reference#1/,
  );
  expect(coercions).toBe(0);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
});

test('rejects discovery cycles found through known-id hints', () => {
  const resolutions: string[] = [];
  const adapter = graphAdapter({
    root: { id: 'root', children: ['child'] },
    child: { id: 'child', children: ['root'] },
  });
  const resolveChild = adapter.resolveChildHint;
  adapter.resolveChildHint = (hint, options) => {
    resolutions.push(hint);
    return resolveChild(hint, options);
  };
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: adapter,
  }).createIndependentRunnerFromCurrentOptions();

  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
    /discovery cycle/i,
  );
  expect(resolutions).toEqual(['child']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
});

test('omission satisfies dependents without retaining the omitted vertex', () => {
  const adapter: DagDiscoverySource<TestGraph> = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['missing', 'dependent'],
        },
        vertexId: 'root',
      },
    }),
    resolveChildHint: (hint) =>
      hint === 'missing'
        ? {
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
            omittedVertexIdentity: { vertexId: 'missing' },
          }
        : {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'dependent',
                $childDiscoveryHints: [],
              },
              vertexId: 'dependent',
              workWaitsForWorkOf: ['missing'],
            },
          },
  };
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: adapter,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();

  expect(
    runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('missing'),
  ).toBeNull();
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull('dependent')!
      .getCurrentVertexView()
      .getVertexData(),
  ).toBe('dependent');
});

test('applies rewrite, disable, and delete commands with tombstones', () => {
  const adapter = graphAdapter({
    root: { id: 'root', children: ['rewrite', 'disabled', 'deleted'] },
    rewrite: { id: 'rewrite', children: [] },
    disabled: { id: 'disabled', children: ['hidden'] },
    hidden: { id: 'hidden', children: [] },
    deleted: { id: 'deleted', children: ['late'] },
    late: { id: 'late', children: [] },
  });
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: adapter,
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
    switch (vertex.getVertexData()) {
      case 'rewrite':
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'rewritten' },
            },
          ],
        };
      case 'disabled':
        return {
          commands: [
            {
              commandName:
                Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
            },
          ],
        };
      case 'deleted':
        return {
          commands: [
            {
              commandName:
                Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        };
    }
    return undefined;
  });
  const runner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const graph = runner.getLiveResolvedGraphView();

  expect(
    graph
      .getVertexHandleByIdOrNull('rewrite')!
      .getCurrentVertexView()
      .getVertexData(),
  ).toBe('rewritten');
  expect(graph.getVertexHandleByIdOrNull('hidden')).toBeNull();
  expect(graph.getVertexHandleByIdOrNull('deleted')).toBeNull();
  expect(graph.getVertexHandleByIdOrNull('late')).toBeNull();
});

test('rewrites hints at ON_WORK_READY and rejects the same command at ON_SUBGRAPH_COMPLETION_READY', () => {
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { id: 'root', children: ['old'] },
      old: { id: 'old', children: [] },
      replacement: { id: 'replacement', children: [] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'root'
      ? {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: ['replacement'] },
            },
          ],
        }
      : undefined,
  );
  const runner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(
    runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('old'),
  ).toBeNull();
  expect(
    runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('replacement'),
  ).not.toBeNull();

  const invalid = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({ root: { id: 'root', children: [] } }),
  });
  invalid.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    () =>
      ({
        commands: [
          {
            commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            commandArguments: { replacementChildHints: [] },
          },
        ],
      } as never),
  );
  expect(() =>
    invalid
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow(/only.*ON_WORK_READY|pre-order/i);
});

test('captures a structural graph snapshot before rewrite and delete', () => {
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
    retainDiscoveredGraphBeforeVisitorCommands: true,
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'child'
      ? {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'changed' },
            },
            {
              commandName:
                Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        }
      : undefined,
  );
  const runner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const snapshot = runner.preCommandDiscoveredGraphView;

  expect(
    runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('child'),
  ).toBeNull();
  const child = snapshot!.getVertexHandleByIdOrNull('child')!;
  expect(child.getCurrentVertexView().getVertexData()).toBe('child');
  expect(
    snapshot!.getDistinctStructuralParentHandlesOrNull(child),
  ).toHaveLength(1);
  expect('getVertexVisitSchedulingStageOrNull' in snapshot!).toBe(false);
});

test('halts synchronously and resumes without repeating a visitor', () => {
  const visits: string[] = [];
  let halted = false;
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
    visits.push(vertex.getVertexData());
    if (!halted) {
      halted = true;
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    }
    return undefined;
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();

  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  expect(runner.isSuspended()).toBe(true);
  runner.runUntilSuspendedOrTerminal();
  expect(visits).toEqual(['root', 'child']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

test('tree source receives a real tree context and graph visitors', () => {
  type TreeNode = { name: string; children: TreeNode[] };
  type Tree = VertexDataAndChildHintTypes<string, TreeNode>;
  const nodes = {
    root: { name: 'root', children: ['child'] },
    child: { name: 'child', children: [] },
  };
  let sawParent = false;
  const tree: TreeDiscoverySource<Tree> = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: [nodes.child],
        },
      },
    }),
    resolveChildVertexFromHint: (hint, options) => {
      sawParent = options.liveResolvedTreeView.containsVertexHandle(
        options.childDiscoveryContext.parentVertexHandle,
      );
      return {
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: hint.name,
            $childDiscoveryHints: hint.children,
          },
        },
      };
    },
  };
  const traversal = new DagTraversalBuilder<Tree>({
    treeDiscoverySource: tree,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    (_vertex, options) => {
      expect(options.liveResolvedGraphView).toBeDefined();
      expect(options).not.toHaveProperty('resolvedTree');
    },
  );

  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(sawParent).toBe(true);
});

test('runs ObjectTreeSource with its real ancestor context', () => {
  const input = { branch: { leaf: 1 } };
  const runner = new DagTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource(input),
  }).createIndependentRunnerFromCurrentOptions();

  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: ['workCompletionCommitted'],
      }),
    ].map(({ vertex }) => vertex.getVertexData().propertyKey),
  ).toEqual(['__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__', 'branch', 'leaf']);
  expect(runner.getLiveResolvedGraphView().getVertexHandles()).toHaveLength(3);
});

test('tree source rejects graph metadata', () => {
  const tree = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        vertexId: 'root',
      },
    }),
    resolveChildVertexFromHint: () => ({
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted' as const,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
    }),
  };
  const runner = new DagTraversalBuilder<TestGraph>({
    // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
    treeDiscoverySource: tree,
  }).createIndependentRunnerFromCurrentOptions();

  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
    /tree source.*metadata/i,
  );
});

test.each([false, true])(
  'sorts copied hints before resolution with hint identity %s',
  (identifyHints) => {
    const hints = ['b', 'a'];
    const adapter: DagDiscoverySource<TestGraph> = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: hints,
          },
          vertexId: 'root',
        },
      }),
      resolveChildHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          vertexId: hint,
        },
      }),
      ...(identifyHints
        ? {
            tryGetVertexIdentityFromHint: (hint: string) => ({
              vertexId: hint,
            }),
          }
        : {}),
    };
    const events = [
      ...new DagTraversalBuilder<TestGraph>({
        dagDiscoverySource: adapter,
        transformChildHintsBeforeResolution: (children) => children.reverse(),
      })
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: ['workCompletionCommitted'],
        }),
    ];

    expect(events.map(({ vertex }) => vertex.getVertexData())).toEqual([
      'root',
      'a',
      'b',
    ]);
    expect(hints).toEqual(['b', 'a']);
  },
);

test('tracks visitor metadata and concurrent-to-sequential chain state', () => {
  const seen: Array<[string, number, number, string | null, unknown]> = [];
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    () => ({
      commands: [
        {
          commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
          commandArguments: { phaseChainState: 'shared' },
        },
      ],
    }),
    { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    (vertex, options) => {
      seen.push([
        vertex.getVertexData(),
        options.phaseVisitorChainAdmissionIndex,
        options.visitorCallbackIndexInPhaseChain,
        options.previousCommittedVisitVertexHandleForSamePhase
          ?.getCurrentVertexView()
          .getVertexData() ?? null,
        options.currentVertexPhaseChainState,
      ]);
    },
  );

  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen).toEqual([
    ['root', 0, 1, null, 'shared'],
    ['child', 1, 1, 'root', 'shared'],
  ]);
});

test('exposes lifecycle statuses while each visitor chain runs', () => {
  const statuses: string[] = [];
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({ root: { id: 'root', children: [] } }),
  });
  for (const order of [
    Order.ON_WORK_READY,
    Order.ON_SUBGRAPH_COMPLETION_READY,
  ]) {
    traversal.registerVisitorCallbackForPhase(order, (_vertex, options) => {
      statuses.push(
        options.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
          options.vertexHandle,
        )!,
      );
    });
  }

  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(statuses).toEqual([
    'INITIAL_VISIT_STARTED',
    'COMPLETION_VISIT_ELIGIBLE',
  ]);
});

test('tombstones deleted ids and closes later arrivals', () => {
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { id: 'root', children: ['victim', 'survivor'] },
      victim: { id: 'victim', children: [] },
      survivor: { id: 'survivor', children: ['victim'] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'victim'
      ? {
          commands: [
            {
              commandName:
                Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        }
      : undefined,
  );
  const graph = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal()
    .getLiveResolvedGraphView();
  const survivor = graph.getVertexHandleByIdOrNull('survivor')!;

  expect(graph.getVertexHandleByIdOrNull('victim')).toBeNull();
  expect(
    graph.getVertexSnapshotOrNull(survivor)!.orderedChildDiscoverySlots,
  ).toEqual([{ kind: 'targetDeleted', childDiscoveryHint: 'victim' }]);
});

test('deleting the graph root empties the graph', () => {
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter(),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'root'
      ? {
          commands: [
            {
              commandName:
                Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        }
      : undefined,
  );
  const runner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();

  expect(
    runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
  ).toBeNull();
  expect(runner.getLiveResolvedGraphView().getVertexHandles()).toEqual([]);
});

test('rejects thenables and retains callback failures', () => {
  const error = new Error('visitor failed');
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { id: 'root', children: [] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
    throw error;
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(error);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(error);

  const promised = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () =>
        Promise.resolve({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }) as never,
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => promised.runUntilSuspendedOrTerminal()).toThrow(
    /synchronous.*thenable/i,
  );
});

test('enforces one iterator and resumes after consumer close', () => {
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter(),
  }).createIndependentRunnerFromCurrentOptions();
  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['workCompletionCommitted'],
  });
  expect(first.next().value?.vertex.getVertexData()).toBe('root');
  const second =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect(() => second.next()).toThrow(/one active iterator/i);
  first.return?.(undefined);
  expect(runner.isSuspended()).toBe(true);

  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: ['workCompletionCommitted'],
      }),
    ].map(({ vertex }) => vertex.getVertexData()),
  ).toEqual(['A', 'B', 'join']);
});
