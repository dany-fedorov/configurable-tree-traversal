import type { VertexView } from '../src';
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
  TraversalVisitorCommandName as C,
} from '../src';

type T = { VertexData: string; ChildHint: string };
type Shape = 'empty' | 'single' | 'flat' | 'grouped';
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
      ...treeDiscoverySource.resolveRootVertex().resolvedVertexInput,
    },
  }),
  resolveChildVertexFromHint: () => ({
    omittedVertexIdentity: null,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};

function definitions(calls: string[], shape: Shape) {
  const rewrite = (label: string) => (vertex: VertexView<T>) => {
    calls.push(`${label}:${vertex.getVertexData()}`);
    return {
      commands: [
        {
          commandName: C.REPLACE_CURRENT_VERTEX_DATA as const,
          commandArguments: { replacementVertexData: label },
        },
      ],
    };
  };
  const high = {
    visitor: rewrite('high'),
    descendingExecutionPriorityWithinGroup: 30,
  };
  const middle = {
    visitor: rewrite('middle'),
    descendingExecutionPriorityWithinGroup: 20,
  };
  const low = {
    visitor: rewrite('low'),
    descendingExecutionPriorityWithinGroup: 10,
  };
  if (shape === 'empty') return [];
  if (shape === 'single') return [high];
  if (shape === 'grouped') {
    return {
      groups: [
        { visitors: [high] },
        {
          visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
          visitors: [low, middle],
        },
      ],
    };
  }
  return [
    {
      ...low,
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    },
    high,
    {
      ...middle,
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    },
  ];
}

// Each closure retains its concrete builder, visitor signature and phase.
const families = [
  {
    name: 'DepthFirstTreeTraversalBuilder',
    create(calls: string[], shape: Shape) {
      const traversal = new DepthFirstTreeTraversalBuilder<T>({
        treeDiscoverySource,
        visitors: { [F.BEFORE_CHILD_EXPANSION]: definitions(calls, shape) },
      });
      return {
        list: () =>
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            F.BEFORE_CHILD_EXPANSION,
          ),
        runUntilSuspendedOrTerminal: () =>
          traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal(),
        roundTrip: () =>
          traversal.replaceVisitorDefinitionsForPhase(
            F.BEFORE_CHILD_EXPANSION,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              F.BEFORE_CHILD_EXPANSION,
            ),
          ),
        replace: () =>
          traversal.patchOptionsForFutureRunners({
            visitors: {
              [F.BEFORE_CHILD_EXPANSION]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.registerVisitorForPhase(
            F.BEFORE_CHILD_EXPANSION,
            () => {
              calls.push('added');
            },
          ),
      };
    },
  },
  {
    name: 'AsyncDepthFirstTreeTraversalBuilder',
    create(calls: string[], shape: Shape) {
      const traversal = new AsyncDepthFirstTreeTraversalBuilder<T>({
        treeDiscoverySource,
        visitors: { [F.BEFORE_CHILD_EXPANSION]: definitions(calls, shape) },
      });
      return {
        list: () =>
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            F.BEFORE_CHILD_EXPANSION,
          ),
        runUntilSuspendedOrTerminal: () =>
          traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal(),
        roundTrip: () =>
          traversal.replaceVisitorDefinitionsForPhase(
            F.BEFORE_CHILD_EXPANSION,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              F.BEFORE_CHILD_EXPANSION,
            ),
          ),
        replace: () =>
          traversal.patchOptionsForFutureRunners({
            visitors: {
              [F.BEFORE_CHILD_EXPANSION]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.registerVisitorForPhase(
            F.BEFORE_CHILD_EXPANSION,
            () => {
              calls.push('added');
            },
          ),
      };
    },
  },
  {
    name: 'BreadthFirstTreeTraversalBuilder',
    create(calls: string[], shape: Shape) {
      const traversal = new BreadthFirstTreeTraversalBuilder<T>({
        treeDiscoverySource,
        visitors: { [B.AT_LEVEL_ORDER_VERTEX]: definitions(calls, shape) },
      });
      return {
        list: () =>
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            B.AT_LEVEL_ORDER_VERTEX,
          ),
        runUntilSuspendedOrTerminal: () =>
          traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal(),
        roundTrip: () =>
          traversal.replaceVisitorDefinitionsForPhase(
            B.AT_LEVEL_ORDER_VERTEX,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              B.AT_LEVEL_ORDER_VERTEX,
            ),
          ),
        replace: () =>
          traversal.patchOptionsForFutureRunners({
            visitors: {
              [B.AT_LEVEL_ORDER_VERTEX]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.registerVisitorForPhase(
            B.AT_LEVEL_ORDER_VERTEX,
            () => {
              calls.push('added');
            },
          ),
      };
    },
  },
  {
    name: 'AsyncBreadthFirstTreeTraversalBuilder',
    create(calls: string[], shape: Shape) {
      const traversal = new AsyncBreadthFirstTreeTraversalBuilder<T>({
        treeDiscoverySource,
        visitors: { [B.AT_LEVEL_ORDER_VERTEX]: definitions(calls, shape) },
      });
      return {
        list: () =>
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            B.AT_LEVEL_ORDER_VERTEX,
          ),
        runUntilSuspendedOrTerminal: () =>
          traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal(),
        roundTrip: () =>
          traversal.replaceVisitorDefinitionsForPhase(
            B.AT_LEVEL_ORDER_VERTEX,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              B.AT_LEVEL_ORDER_VERTEX,
            ),
          ),
        replace: () =>
          traversal.patchOptionsForFutureRunners({
            visitors: {
              [B.AT_LEVEL_ORDER_VERTEX]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.registerVisitorForPhase(
            B.AT_LEVEL_ORDER_VERTEX,
            () => {
              calls.push('added');
            },
          ),
      };
    },
  },
  {
    name: 'DagTraversalBuilder',
    create(calls: string[], shape: Shape) {
      const traversal = new DagTraversalBuilder<T, T, string>({
        dagDiscoverySource,
        visitors: { [D.ON_WORK_READY]: definitions(calls, shape) },
      });
      return {
        list: () =>
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            D.ON_WORK_READY,
          ),
        runUntilSuspendedOrTerminal: () =>
          traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal(),
        roundTrip: () =>
          traversal.replaceVisitorDefinitionsForPhase(
            D.ON_WORK_READY,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              D.ON_WORK_READY,
            ),
          ),
        replace: () =>
          traversal.patchOptionsForFutureRunners({
            visitors: {
              [D.ON_WORK_READY]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.registerVisitorForPhase(D.ON_WORK_READY, () => {
            calls.push('added');
          }),
      };
    },
  },
  {
    name: 'AsyncDagTraversalBuilder',
    create(calls: string[], shape: Shape) {
      const traversal = new AsyncDagTraversalBuilder<T, T, string>({
        dagDiscoverySource,
        visitors: { [D.ON_WORK_READY]: definitions(calls, shape) },
      });
      return {
        list: () =>
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            D.ON_WORK_READY,
          ),
        runUntilSuspendedOrTerminal: () =>
          traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal(),
        roundTrip: () =>
          traversal.replaceVisitorDefinitionsForPhase(
            D.ON_WORK_READY,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              D.ON_WORK_READY,
            ),
          ),
        replace: () =>
          traversal.patchOptionsForFutureRunners({
            visitors: {
              [D.ON_WORK_READY]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.registerVisitorForPhase(D.ON_WORK_READY, () => {
            calls.push('added');
          }),
      };
    },
  },
] as const;

for (const { name, create } of families) {
  describe(`${name} visitor query ownership`, () => {
    test('editing a listed array preserves future callback order and batching', async () => {
      const calls: string[] = [];
      const traversal = create(calls, 'flat');
      const records = traversal.list();
      records.reverse();
      records.splice(0, 1);
      await traversal.runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['high:root', 'middle:high', 'low:high']);
      expect(records).toHaveLength(2);
      expect(traversal.list()).toHaveLength(3);
    });

    test.each([
      'callback',
      'descendingExecutionPriorityWithinGroup',
      'mode',
    ] as const)(
      'editing a listed %s preserves execution and earlier snapshots',
      async (field) => {
        const calls: string[] = [];
        const traversal = create(calls, 'flat');
        const earlier = traversal.list();
        const records = traversal.list();
        if (field === 'callback')
          records[1]!.visitor = () => {
            calls.push('replacement');
          };
        if (field === 'descendingExecutionPriorityWithinGroup')
          records[1]!.descendingExecutionPriorityWithinGroup = -100;
        if (field === 'mode') {
          records[1]!.visitorCommandCommitTiming = 'afterEachVisitorCallback';
          records[1]!.visitorCommandCommitTiming = 'afterEachVisitorCallback';
        }
        await traversal.runUntilSuspendedOrTerminal();
        expect(calls).toEqual(['high:root', 'middle:high', 'low:high']);
        const fresh = traversal.list();
        expect(fresh).not.toBe(earlier);
        for (let index = 0; index < fresh.length; index++) {
          expect(fresh[index]).not.toBe(earlier[index]);
          expect(fresh[index]!.visitor).toBe(earlier[index]!.visitor);
        }
        expect(earlier[1]!.descendingExecutionPriorityWithinGroup).toBe(20);
        expect(earlier[1]!.visitorCommandCommitTiming).toBe(
          'afterContiguousVisitorBatch',
        );
        expect(earlier[1]!.visitorCommandCommitTiming).toBe(
          'afterContiguousVisitorBatch',
        );
        if (field === 'callback')
          expect(fresh[1]!.visitor).not.toBe(records[1]!.visitor);
        expect(fresh[1]!.descendingExecutionPriorityWithinGroup).toBe(20);
        expect(fresh[1]!.visitorCommandCommitTiming).toBe(
          'afterContiguousVisitorBatch',
        );
      },
    );

    test('explicit group metadata survives detached list/set round trips and still controls batching', async () => {
      const calls: string[] = [];
      const traversal = create(calls, 'grouped');
      const before = traversal.list();
      traversal.roundTrip();
      const after = traversal.list();
      expect(after).not.toBe(before);
      for (let index = 0; index < after.length; index++) {
        expect(after[index]).not.toBe(before[index]);
        expect(after[index]!.visitor).toBe(before[index]!.visitor);
        expect(after[index]!.visitorGroup).toBe(before[index]!.visitorGroup);
        expect(after[index]!.visitorGroup!.groupIdentity).toBe(
          before[index]!.visitorGroup!.groupIdentity,
        );
        expect(Object.isFrozen(after[index]!.visitorGroup)).toBe(true);
      }
      expect(after[0]!.visitorGroup).not.toBe(after[1]!.visitorGroup);
      expect(after[1]!.visitorGroup).toBe(after[2]!.visitorGroup);
      expect(after[1]!.visitorGroup!.isExplicitlyDeclaredGroup).toBe(true);
      after[1]!.visitorCommandCommitTiming = 'afterEachVisitorCallback';
      after[1]!.visitor = () => {
        calls.push('replacement');
      };
      await traversal.runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['high:root', 'middle:high', 'low:high']);
    });

    test('empty and single-record snapshots stay independent through validated updates', async () => {
      const calls: string[] = [];
      const empty = create(calls, 'empty');
      const emptySnapshot = empty.list();
      expect(emptySnapshot).not.toBe(empty.list());
      empty.add();
      expect(emptySnapshot).toEqual([]);
      await empty.runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['added']);
      calls.length = 0;
      const single = create(calls, 'single');
      const earlier = single.list();
      single.list().splice(0, 1);
      await single.runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['high:root']);
      calls.length = 0;
      single.replace();
      await single.runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['configured']);
      expect(earlier).toHaveLength(1);
      expect(single.list()[0]!.visitor).not.toBe(earlier[0]!.visitor);
    });
  });
}
