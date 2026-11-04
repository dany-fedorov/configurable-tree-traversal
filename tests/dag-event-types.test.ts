import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
} from '../src/traversals/dag-traversal';

const identities = [undefined, null, NaN, { name: 'task' }, Symbol('task')];

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each(identities)(
    `${Constructor.name} keeps exact event identity %p and committed phase timing`,
    async (id) => {
      type G = VertexDataAndChildHintTypes<string, never>;
      const runner = new Constructor<G, G, typeof id>({
        workCompletionPolicy: 'requireExternalWorkSettlement',
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: id,
              vertexContentInput: {
                $vertexData: 'task',
                $childDiscoveryHints: [],
              },
            },
          }),
          resolveChildVertexFromHint: () => ({
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted',
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      const before = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
        before.push(event);
      expect(before).toEqual([]);
      const record =
        runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
      runner.settleDeferredWork(
        id,
        { kind: 'workCompleted' },
        record.settlementToken,
      );
      const events = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
        expect(event).toHaveProperty('vertexId');
        expect(event.vertexId).toBe(id);
        expect(event.vertexHandle.getCurrentVertexView()).toBe(event.vertex);
        expect(
          runner.getLiveResolvedGraphView().requireVertexId(event.vertexHandle),
        ).toBe(id);
        expect(event).not.toHaveProperty('order');
        expect(event).not.toHaveProperty('phase');
        events.push(event.eventKind);
      }
      expect(events).toEqual([
        'workCompletionCommitted',
        'subgraphCompletionCommitted',
      ]);
    },
  );

  test(`${Constructor.name} seeded work emits only the selected completion event`, async () => {
    type G = VertexDataAndChildHintTypes<string, never>;
    const runner = new Constructor<G, G, string>({
      acceptedCompletedWorkVertexIds: new Set(['task']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'task',
            vertexContentInput: {
              $vertexData: 'task',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: ['subgraphCompletionCommitted'],
      },
    )) {
      events.push([event.vertexId, event.eventKind]);
    }
    expect(events).toEqual([['task', 'subgraphCompletionCommitted']]);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} tree-source events retain generated identity`, async () => {
    type G = VertexDataAndChildHintTypes<string, never>;
    const runner = new Constructor<G>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'task',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const ids = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      expect(event.vertexId).toBe(
        runner.getLiveResolvedGraphView().requireVertexId(event.vertexHandle),
      );
      ids.push(event.vertexId);
    }
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} separates readiness callbacks from committed work observations`, async () => {
    type G = VertexDataAndChildHintTypes<string, never>;
    const calls: string[] = [];
    const runner = new Constructor<G, G, string>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'task',
            vertexContentInput: {
              $vertexData: 'task',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
      },
      visitors: {
        [DagVisitorPhase.ON_WORK_READY]: (_vertex, context) => {
          expect(context.visitorPhase).toBe(DagVisitorPhase.ON_WORK_READY);
          expect(context.visitorCallbackIndexInPhaseChain).toBe(0);
          expect(context.phaseVisitorChainAdmissionIndex).toBe(0);
          expect(
            context.previousCommittedVisitVertexHandleForSamePhase,
          ).toBeNull();
          expect(context.visitorRegistrationMetadata).toHaveProperty(
            'descendingExecutionPriorityWithinGroup',
          );
          expect(context).not.toHaveProperty('order');
          expect(
            runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
          ).toEqual([]);
          calls.push('ready');
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: ['workCompletionCommitted'],
      },
    )) {
      expect(calls).toEqual(['ready']);
      expect(event.eventKind).toBe('workCompletionCommitted');
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['task']);
      calls.push(event.eventKind);
    }
    expect(calls).toEqual(['ready', 'workCompletionCommitted']);
    expect(
      runner.captureExecutionSnapshot().executionOptions.deliveredEventKinds,
    ).toEqual(['workCompletionCommitted']);
  });
}
