import {
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DepthFirstTreeVisitPhase as F,
  BreadthFirstTreeVisitPhase as B,
  DagVisitorPhase as D,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';

const treeDiscoverySource = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: [] as string[],
      },
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
const dagDiscoverySource = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: [] as string[],
      },
    },
  }),
  resolveChildHint: () => ({
    omittedVertexIdentity: null,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
const families = [
  [
    DepthFirstTreeTraversalBuilder,
    F.BEFORE_CHILD_EXPANSION,
    { treeDiscoverySource },
    runTreeDepthFirstUntilSuspendedOrTerminal,
  ],
  [
    AsyncDepthFirstTreeTraversalBuilder,
    F.BEFORE_CHILD_EXPANSION,
    { treeDiscoverySource },
    runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  ],
  [
    BreadthFirstTreeTraversalBuilder,
    B.AT_LEVEL_ORDER_VERTEX,
    { treeDiscoverySource },
    runTreeBreadthFirstUntilSuspendedOrTerminal,
  ],
  [
    AsyncBreadthFirstTreeTraversalBuilder,
    B.AT_LEVEL_ORDER_VERTEX,
    { treeDiscoverySource },
    runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  ],
  [DagTraversalBuilder, D.ON_WORK_READY, { dagDiscoverySource }, traverseDag],
  [
    AsyncDagTraversalBuilder,
    D.ON_WORK_READY,
    { dagDiscoverySource },
    traverseDagAsync,
  ],
] as const;

// Each public family must normalize the same caller-owned input shapes.
for (const [Ctor, order, source, helper] of families) {
  describe(Ctor.name, () => {
    for (const shape of [
      'callback',
      'definition',
      'array',
      'groups',
    ] as const) {
      test(`accepts ${shape} at constructor, patchOptionsForFutureRunners, replacement and helper boundaries`, async () => {
        const seen: string[] = [];
        const callback = () => {
          seen.push('called');
        };
        const input =
          shape === 'callback'
            ? callback
            : shape === 'definition'
            ? { visitor: callback }
            : shape === 'array'
            ? [callback, { visitor: callback }]
            : { groups: [{ visitors: [callback, { visitor: callback }] }] };
        // Runtime matrix intentionally erases family-specific overloads; the compiler fixture covers them.
        const Constructor = Ctor as unknown as new (input: unknown) => {
          patchOptionsForFutureRunners(input: unknown): unknown;
          replaceVisitorDefinitionsForPhase(
            order: string,
            input: unknown,
          ): unknown;
          createIndependentRunnerFromCurrentOptions(): {
            runUntilSuspendedOrTerminal(): unknown;
          };
        };
        const config = { ...source, visitors: { [order]: input } };
        await new Constructor(config)
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
        const configured = new Constructor(source);
        configured.patchOptionsForFutureRunners(config);
        await configured
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
        const replaced = new Constructor(source);
        replaced.replaceVisitorDefinitionsForPhase(order, input);
        await replaced
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
        await (helper as unknown as (input: unknown) => unknown)(config);
        expect(seen).toEqual(
          Array(shape === 'array' || shape === 'groups' ? 8 : 4).fill('called'),
        );
      });
    }
  });
}

for (const [Ctor, order, source] of families) {
  test(`${Ctor.name}: grouped append and list/set preserve snapshots and empty groups are inert`, async () => {
    const calls: string[] = [];
    const Constructor = Ctor as unknown as new (input: unknown) => {
      registerVisitorCallbackForPhase(
        order: string,
        callback: () => void,
        options?: { descendingExecutionPriorityWithinGroup: number },
      ): unknown;
      appendVisitorGroupForPhase(order: string, input: unknown): unknown;
      replaceVisitorDefinitionsForPhase(order: string, input: unknown): unknown;
      getDetachedVisitorRegistrationRecordsForPhase(order: string): unknown;
      createIndependentRunnerFromCurrentOptions(): {
        runUntilSuspendedOrTerminal(): unknown;
      };
    };
    const t = new Constructor(source);
    t.registerVisitorCallbackForPhase(
      order,
      () => {
        calls.push('low');
      },
      { descendingExecutionPriorityWithinGroup: 1 },
    );
    t.appendVisitorGroupForPhase(order, {
      visitors: [],
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    });
    t.replaceVisitorDefinitionsForPhase(
      order,
      t.getDetachedVisitorRegistrationRecordsForPhase(order),
    );
    t.registerVisitorCallbackForPhase(
      order,
      () => {
        calls.push('high');
      },
      { descendingExecutionPriorityWithinGroup: 1000 },
    );
    t.appendVisitorGroupForPhase(order, {
      visitors: [
        () => {
          calls.push('group');
        },
      ],
    });
    t.registerVisitorCallbackForPhase(
      order,
      () => {
        calls.push('tail');
      },
      { descendingExecutionPriorityWithinGroup: 9999 },
    );
    t.replaceVisitorDefinitionsForPhase(
      order,
      t.getDetachedVisitorRegistrationRecordsForPhase(order),
    );
    const snapshot = t.createIndependentRunnerFromCurrentOptions();
    t.replaceVisitorDefinitionsForPhase(order, () => {
      calls.push('replacement');
    });
    await snapshot.runUntilSuspendedOrTerminal();
    expect(calls).toEqual(['high', 'low', 'group', 'tail']);
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(calls.slice(-1)).toEqual(['replacement']);
    expect(() =>
      t.appendVisitorGroupForPhase(order, {
        visitors: [],
        visitorCommandCommitTiming: 'invalid',
      }),
    ).toThrow(TypeError);
  });
}
