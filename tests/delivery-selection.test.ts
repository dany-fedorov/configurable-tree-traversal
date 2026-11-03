import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  AsyncGraphWalkBuilder,
  BreadthFirstTreeVisitPhase,
  DagTraversalBuilder,
  DagVisitorPhase,
  DepthFirstTreeVisitPhase,
  GraphWalkBuilder,
  TraversalRunnerStatus,
  type VertexDataAndChildHintTypes,
  type VertexView,
} from '../src';
import { deferred } from './helpers/graph-fixtures';
import { idGraph } from './helpers/graph-walk-fixtures';

type Data = VertexDataAndChildHintTypes<string, string>;
const tree = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
const graph = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
};
const families = [
  {
    name: 'DFS',
    phase: DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    kind: DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    make: () =>
      new AsyncDepthFirstTreeTraversalBuilder<Data>({
        treeDiscoverySource: tree,
      }),
  },
  {
    name: 'BFS',
    phase: BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    kind: BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    make: () =>
      new AsyncBreadthFirstTreeTraversalBuilder<Data>({
        treeDiscoverySource: tree,
      }),
  },
  {
    name: 'DAG',
    phase: DagVisitorPhase.ON_WORK_READY,
    kind: 'workCompletionCommitted',
    make: () =>
      new AsyncDagTraversalBuilder<Data>({ dagDiscoverySource: graph }),
  },
];

describe.each(families)('$name buffered delivery', (family) => {
  test.each([false, true])(
    'reselects buffered observations after draining close (selected initially=%s)',
    async (selectedInitially) => {
      const started = deferred<void>();
      const finish = deferred<void>();
      const calls: string[] = [];
      const traversal = family.make();
      const add = traversal.registerVisitorCallbackForPhase.bind(traversal) as (
        phase: string,
        visitor: (vertex: VertexView<Data>) => Promise<void> | void,
      ) => unknown;
      add(family.phase, async () => {
        calls.push('start');
        started.resolve();
        await finish.promise;
      });
      add(family.phase, () => {
        calls.push('drained');
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      // Family fixtures deliberately share a runtime harness; public type cases are separate.
      const iterate =
        runner.runAndIterateObservationEventsUntilSuspendedOrTerminal.bind(
          runner,
        ) as (config?: {
          deliveredEventKinds?: readonly string[];
          admittedVisitorCallbackPhases?: { include: readonly string[] };
        }) => AsyncGenerator<{ eventKind: string }>;
      const iterator = iterate({
        deliveredEventKinds: selectedInitially ? [family.kind] : [],
      });
      const pending = iterator.next();
      await started.promise;
      const closed = iterator.return(undefined);
      finish.resolve();
      expect(await closed).toEqual({ done: true, value: undefined });
      expect(await pending).toEqual({ done: true, value: undefined });
      expect(runner.getTraversalStopReason()).toBe('paused');
      expect(runner.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(
        1,
      );
      expect(calls).toEqual(['start', 'drained']);
      if ('captureProgressSnapshot' in runner)
        expect(
          runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toEqual(['root']);
      const delivered: string[] = [];
      for await (const event of iterate({
        deliveredEventKinds: selectedInitially ? [] : [family.kind],
        admittedVisitorCallbackPhases: { include: [] },
      }))
        delivered.push(event.eventKind);
      expect(delivered).toEqual(selectedInitially ? [] : [family.kind]);
      expect(calls).toEqual(['start', 'drained']);
      expect(runner.getTraversalLifecycleStatus()).toBe(
        TraversalRunnerStatus.FINISHED,
      );
      expect(runner.getTraversalStopReason()).toBe('finished');
      expect(await iterate().next()).toEqual({ done: true, value: undefined });
    },
  );
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([
    { deliveredEventKinds: [] },
    { deliveredEventKinds: ['workCompletionCommitted'] },
    { deliveredEventKinds: ['subgraphCompletionCommitted'] },
  ] as const)(
    `${Constructor.name} settles under empty admission selection and delivers %j`,
    async ({ deliveredEventKinds }) => {
      const calls: string[] = [];
      const traversal = new Constructor<Data>({
        dagDiscoverySource: graph,
        workCompletionPolicy: 'requireExternalWorkSettlement',
      });
      traversal.registerVisitorCallbackForPhase(
        DagVisitorPhase.ON_WORK_READY,
        () => {
          calls.push('work');
        },
      );
      traversal.registerVisitorCallbackForPhase(
        DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY,
        () => {
          calls.push('complete');
        },
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
        admittedVisitorCallbackPhases: {
          include: [DagVisitorPhase.ON_WORK_READY],
        },
      });
      expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
      const ticket =
        runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
      expect(
        runner.settleDeferredWork(
          ticket.vertexId,
          { kind: 'workCompleted' },
          ticket.settlementToken,
        ),
      ).toBe(true);
      expect(
        runner.settleDeferredWork(
          ticket.vertexId,
          { kind: 'workCompleted' },
          ticket.settlementToken,
        ),
      ).toBe(false);
      const delivered: string[] = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
        { deliveredEventKinds },
      ))
        delivered.push(event.eventKind);
      expect(delivered).toEqual(deliveredEventKinds);
      expect(calls).toEqual(['work']);
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['root']);
      expect(runner.getTraversalStopReason()).toBe('finished');
      await runner.runUntilSuspendedOrTerminal({
        deliveredEventKinds: [
          'workCompletionCommitted',
          'subgraphCompletionCommitted',
        ],
      });
      expect(calls).toEqual(['work']);
    },
  );
}

for (const Constructor of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
  test(`${Constructor.name} keeps delivery selection with paused and limited execution`, async () => {
    let calls = 0;
    const traversal = new Constructor({
      graphWalkDiscoverySource: idGraph(
        ['root'],
        [
          ['root', ['child']],
          ['child', []],
        ],
      ),
      limits: { maxRouteHopDepth: 0 },
    });
    const { GraphWalkObservationKind } = await import('../src');
    traversal.addVisitorForObservationKind(
      GraphWalkObservationKind.VERTEX_OCCURRENCE,
      () => {
        calls++;
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const first =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect((await first.next()).value).toMatchObject({
      eventKind: 'vertexOccurrence',
    });
    await first.return();
    expect(runner.getTraversalStopReason()).toBe('paused');
    const delivered: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      { deliveredEventKinds: ['routePrefix'] },
    ))
      delivered.push(event.eventKind);
    expect(delivered).toEqual(['routePrefix']);
    expect(calls).toBe(1);
    expect(runner.captureProgressSnapshot().terminalOutcome).toMatchObject({
      kind: 'traversalLimitsReached',
    });
    expect(runner.getTraversalStopReason()).toBe('finished');
  });
}
