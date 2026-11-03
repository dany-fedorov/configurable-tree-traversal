import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { inspectInternalDagState } from './internal-runner-fixtures';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagTraversalStallError,
  DagVisitorPhase as Order,
  captureDagMilestoneSnapshot,
  materializeMultiEntryDagInputFromRecordCatalog,
} from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  createInternalAsyncDagTraversal,
  createInternalAsyncDagTraversalRunner,
  createInternalDagTraversal,
  createInternalDagTraversalFor,
  createInternalDagTraversalRunner,
  runnerInternals,
} from './internal-runner-fixtures';

import { captureDagTerminalObservation } from '../src/traversals/dag-traversal/lib/DagTerminalObservation';

type G = VertexDataAndChildHintTypes<string, string>;

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const scenario of [
    'finished',
    'ready failure',
    'completion failure',
    'child source failure',
    'root source failure',
  ] as const) {
    test(`${Constructor.name} retains terminal observation facts after ${scenario}`, async () => {
      const failure = scenario === 'ready failure' ? undefined : { scenario };
      let sourceCalls = 0;
      let visits = 0;
      const dagDiscoverySource = {
        resolveRootVertex: () => {
          sourceCalls++;
          if (scenario === 'root source failure') throw failure;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'a',
              vertexContentInput: {
                $vertexData: 'a',
                $childDiscoveryHints:
                  scenario === 'child source failure' ? ['b'] : [],
              },
            },
          };
        },
        resolveChildHint: (hint: string) => {
          sourceCalls++;
          if (scenario === 'child source failure') throw failure;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: hint,
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          };
        },
      };
      const traversal = new Constructor<G>({ dagDiscoverySource });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
        visits++;
        if (scenario === 'ready failure') throw failure;
      });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_SUBGRAPH_COMPLETION_READY,
        () => {
          visits++;
          if (scenario === 'completion failure') throw failure;
        },
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      if (scenario === 'finished') await runner.runUntilSuspendedOrTerminal();
      else
        await expect(
          (async () => runner.runUntilSuspendedOrTerminal())(),
        ).rejects.toBe(failure);
      const expectedStatus =
        scenario === 'finished' ? Status.FINISHED : Status.FAILED;
      const before = { sourceCalls, visits };
      const original = captureDagMilestoneSnapshot(runner);
      for (const state of [
        runnerInternals(runner).state,
        new DagTraversalRunnerState(runnerInternals(runner).state),
        { ...runnerInternals(runner).state },
        Object.assign({}, runnerInternals(runner).state),
      ]) {
        const restored = (
          Constructor === DagTraversalBuilder
            ? createInternalDagTraversal
            : createInternalAsyncDagTraversal
        )<G>({
          dagDiscoverySource,
          traversalRunnerInternalObjects: {
            state,
            resolvedGraphsContainer:
              runnerInternals(runner).resolvedGraphsContainer,
          },
        }).createIndependentRunnerFromCurrentOptions();
        const captured = captureDagMilestoneSnapshot(restored);
        for (const milestone of [
          'workCompletion',
          'subgraphCompletion',
        ] as const) {
          const result = captured.explainMilestone({
            vertexId: 'a',
            milestone,
          });
          expect(result).toEqual(
            original.explainMilestone({ vertexId: 'a', milestone }),
          );
          if (scenario === 'root source failure')
            expect(result).toMatchObject({
              kind: 'unresolved',
              discoveryComplete: false,
            });
          else
            expect(result).toMatchObject({
              kind: 'live',
              milestoneSatisfied:
                scenario === 'finished' ||
                (milestone === 'workCompletion' &&
                  scenario !== 'ready failure'),
              discoveryComplete:
                scenario === 'finished' || scenario === 'completion failure',
            });
        }
        expect(restored.captureProgressSnapshot()).toEqual(
          runner.captureProgressSnapshot(),
        );
        expect(inspectInternalDagState(restored)).toEqual(
          inspectInternalDagState(runner),
        );
        expect(restored.getTraversalLifecycleStatus()).toBe(expectedStatus);
        expect(restored.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
        if (scenario === 'finished')
          await restored.runUntilSuspendedOrTerminal();
        else
          await expect(
            (async () => restored.runUntilSuspendedOrTerminal())(),
          ).rejects.toBe(failure);
        expect({ sourceCalls, visits }).toEqual(before);
        expect(runner.getTraversalLifecycleStatus()).toBe(expectedStatus);
        const captureProgressSnapshot = restored.captureProgressSnapshot();
        (
          captureProgressSnapshot.workCompletionCommittedVertexIds as unknown[]
        ).push('corruption');
        (
          captureProgressSnapshot.progressByVertexId as Map<unknown, unknown>
        ).clear();
        const facts = inspectInternalDagState(restored);
        (facts.identityStates as unknown[]).pop();
        (facts.schedulingStates as unknown[]).pop();
        expect(restored.captureProgressSnapshot()).toEqual(
          runner.captureProgressSnapshot(),
        );
        expect(inspectInternalDagState(restored)).toEqual(
          inspectInternalDagState(runner),
        );
        expect(
          captured.explainMilestone({
            vertexId: 'a',
            milestone: 'workCompletion',
          }),
        ).toEqual(
          original.explainMilestone({
            vertexId: 'a',
            milestone: 'workCompletion',
          }),
        );
      }
    });
  }
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} retains terminal tree-source milestone identities`, async () => {
    let calls = 0;
    const treeDiscoverySource = {
      resolveRootVertex: () => {
        calls++;
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['child'],
            },
          },
        };
      },
      resolveChildVertexFromHint: (hint: string) => {
        calls++;
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    };
    const runner = new Constructor<G>({
      treeDiscoverySource,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const restored = (
      Constructor === DagTraversalBuilder
        ? createInternalDagTraversal
        : createInternalAsyncDagTraversal
    )<G>({
      treeDiscoverySource,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState(runnerInternals(runner).state),
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }).createIndependentRunnerFromCurrentOptions();
    const captured = captureDagMilestoneSnapshot(restored);
    const graph = runner.getLiveResolvedGraphView();
    for (const ref of graph.getVertexHandles()) {
      for (const milestone of [
        'workCompletion',
        'subgraphCompletion',
      ] as const) {
        expect(
          captured.explainMilestone({
            vertexId: graph.requireVertexId(ref),
            milestone,
          }),
        ).toMatchObject({
          kind: 'live',
          milestoneSatisfied: true,
          discoveryComplete: true,
        });
      }
    }
    expect(restored.captureProgressSnapshot()).toEqual(
      runner.captureProgressSnapshot(),
    );
    expect(calls).toBe(2);
  });

  test(`${Constructor.name} retains failed preparation diagnostics and owns every copied observation wrapper`, async () => {
    const first = { name: 'first' };
    const second = { name: 'second' };
    const source = materializeMultiEntryDagInputFromRecordCatalog(
      [
        { id: first, complete: [second] },
        { id: second, complete: [first] },
      ],
      {
        selectVertexId: (item) => item.id,
        selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.complete,
      },
    );
    const runner = new Constructor(
      source,
    ).createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => runner.discoverValidateAndFreezeTopology())(),
    ).rejects.toBeInstanceOf(DagTraversalStallError);
    const restored = createInternalDagTraversalFor(Constructor, {
      dagDiscoverySource: source.dagDiscoverySource,
      traversalRunnerInternalObjects: {
        state: runnerInternals(runner).state,
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }).createIndependentRunnerFromCurrentOptions();
    const before = restored.captureProgressSnapshot();
    const expected = runner.captureProgressSnapshot();
    expect(before).toEqual(expected);
    const original = captureDagMilestoneSnapshot(runner).explainMilestone({
      vertexId: first,
      milestone: 'subgraphCompletion',
    });
    expect(original).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      discoveryComplete: true,
    });
    expect(
      captureDagMilestoneSnapshot(restored).explainMilestone({
        vertexId: first,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(original);
    expect(before.progressByVertexId.get(first)!.vertexId).toBe(first);
    const progress = before.progressByVertexId.get(first)!;
    (progress.unmetPrerequisiteVertexIds as unknown[]).pop();
    (progress.unmetWorkMilestoneVertexIds as unknown[]).push('changed');
    (progress.unmetSubgraphCompletionMilestoneVertexIds as unknown[]).pop();
    (progress as { workState: string }).workState = 'completed';
    (before.discovery as { complete: boolean }).complete = false;
    (
      before.counts as { retainedLiveVertices: number }
    ).retainedLiveVertices = 99;
    for (const values of [
      before.workVisitorReadyOrWorkCompletionDeferredVertexIds,
      before.workCompletionDeferredVertexIds,
      before.admittedVisitorChainVertexIds,
      before.workCompletionCommittedVertexIds,
      before.subgraphCompletionCommittedVertexIds,
      before.unmatchedCompletedWorkSeedVertexIds,
    ])
      (values as unknown[]).push('changed');
    const diagnostics = before.invalidDependencyTopologyDiagnostics!;
    diagnostics.blockedVertexPrerequisiteReports[0]!.prerequisiteVertexIdsInReport.pop();
    diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId =
      'changed' as unknown as typeof first;
    diagnostics.unresolvedPrerequisiteVertexIds.push({ name: 'changed' });
    diagnostics.milestoneCycleVertexIdComponents[0]!.pop();
    diagnostics.originalMilestoneConstraints[0]!.waitingMilestone.vertexId = {
      name: 'changed',
    };
    diagnostics.originalMilestoneConstraints[0]!.prerequisiteMilestone.vertexId =
      { name: 'changed' };
    diagnostics.nonCyclePrerequisiteBlockedVertexIds.pop();
    diagnostics.incompleteVertexIdsWithoutUnmetPrerequisites.push({
      name: 'changed',
    });
    const facts = inspectInternalDagState(restored);
    (facts.identityStates[0] as { kind: string }).kind = 'deleted';
    (
      facts.schedulingStates[0] as { initialCommitted: boolean }
    ).initialCommitted = true;
    expect(restored.captureProgressSnapshot()).toEqual(expected);
    expect(inspectInternalDagState(restored)).toEqual(
      inspectInternalDagState(runner),
    );
    expect(
      captureDagMilestoneSnapshot(restored).explainMilestone({
        vertexId: first,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(original);
    expect(Object.isFrozen(first)).toBe(false);
  });

  test(`${Constructor.name} retains deferred work and earlier commits when a later visitor fails`, async () => {
    const source = materializeMultiEntryDagInputFromRecordCatalog(
      [{ id: 'done' }, { id: 'deferred' }, { id: 'failed' }],
      { selectVertexId: (item) => item.id },
    );
    const traversal = new Constructor({
      ...source,
      discoveryTiming: 'completeBeforeAnyVisitor',
      ...(Constructor === AsyncDagTraversalBuilder
        ? { maxConcurrentCallbackInvocations: 1 }
        : {}),
    });
    const failure = { problem: 'later visitor' };
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      if (vertex.getVertexData().id === 'deferred')
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      if (vertex.getVertexData().id === 'failed') throw failure;
      return undefined;
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => runner.runUntilSuspendedOrTerminal())(),
    ).rejects.toBe(failure);
    const restored = createInternalDagTraversalFor(Constructor, {
      dagDiscoverySource: source.dagDiscoverySource,
      traversalRunnerInternalObjects: {
        state: runnerInternals(runner).state,
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }).createIndependentRunnerFromCurrentOptions();
    expect(restored.captureProgressSnapshot()).toEqual(
      runner.captureProgressSnapshot(),
    );
    expect(
      captureDagMilestoneSnapshot(restored).explainMilestone({
        vertexId: 'done',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: true });
    expect(
      captureDagMilestoneSnapshot(restored).explainMilestone({
        vertexId: 'deferred',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      progress: { workState: 'workCompletionDeferred' },
    });
    expect(
      captureDagMilestoneSnapshot(restored).explainMilestone({
        vertexId: 'failed',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: false });
    const captureProgressSnapshot = restored.captureProgressSnapshot();
    (
      captureProgressSnapshot.workAwaitingSettlement[0] as { vertexId: string }
    ).vertexId = 'changed';
    expect(restored.captureProgressSnapshot()).toEqual(
      runner.captureProgressSnapshot(),
    );
  });
}

test('terminal async observations stay stable after an invalidated callback settles', async () => {
  let reject!: (error: unknown) => void;
  let release!: () => void;
  let bothStarted!: () => void;
  const failing = new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  const late = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    bothStarted = resolve;
  });
  const source = materializeMultiEntryDagInputFromRecordCatalog(
    [{ id: 'a' }, { id: 'b' }],
    {
      selectVertexId: (item) => item.id,
    },
  );
  const traversal = new AsyncDagTraversalBuilder({
    ...source,
    maxConcurrentCallbackInvocations: 2,
    discoveryTiming: 'completeBeforeAnyVisitor',
  });
  let callbacks = 0;
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      callbacks++;
      if (vertex.getVertexData().id === 'a') await failing;
      else {
        bothStarted();
        await late;
      }
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await started;
  const failure = { error: 'failed first' };
  reject(failure);
  await expect(running).rejects.toBe(failure);
  const restored = createInternalAsyncDagTraversalRunner({
    dagDiscoverySource: source.dagDiscoverySource,
    traversalRunnerInternalObjects: {
      state: runnerInternals(runner).state,
      resolvedGraphsContainer: runnerInternals(runner).resolvedGraphsContainer,
    },
  });
  const captured = captureDagMilestoneSnapshot(restored);
  expect(
    captured.explainMilestone({ vertexId: 'a', milestone: 'workCompletion' }),
  ).toMatchObject({
    kind: 'live',
    milestoneSatisfied: false,
  });
  expect(
    captured.explainMilestone({ vertexId: 'b', milestone: 'workCompletion' }),
  ).toMatchObject({
    kind: 'live',
    milestoneSatisfied: false,
  });
  release();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(restored.captureProgressSnapshot()).toEqual(
    runner.captureProgressSnapshot(),
  );
  expect(inspectInternalDagState(restored)).toEqual(
    inspectInternalDagState(runner),
  );
  expect(
    captureDagMilestoneSnapshot(runner).explainMilestone({
      vertexId: 'b',
      milestone: 'workCompletion',
    }),
  ).toEqual(
    captured.explainMilestone({ vertexId: 'b', milestone: 'workCompletion' }),
  );
  await expect(restored.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
  expect(callbacks).toBe(2);
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} explains unavailable history for fabricated terminal state without changing lifecycle`, async () => {
    let calls = 0;
    const dagDiscoverySource = {
      resolveRootVertex: () => {
        calls++;
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        };
      },
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
    };
    const original = new Constructor<G>({
      dagDiscoverySource,
    }).createIndependentRunnerFromCurrentOptions();
    await original.runUntilSuspendedOrTerminal();
    for (const status of [Status.FINISHED, Status.FAILED]) {
      const error = { status };
      const state = new DagTraversalRunnerState<G>({
        status,
        failure: { error },
      });
      const restored = (
        Constructor === DagTraversalBuilder
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        dagDiscoverySource,
        traversalRunnerInternalObjects: {
          state,
          resolvedGraphsContainer:
            runnerInternals(original).resolvedGraphsContainer,
        },
      }).createIndependentRunnerFromCurrentOptions();
      expect(() => captureDagMilestoneSnapshot(restored)).toThrow(
        /terminal DAG observation.*unavailable/i,
      );
      expect(() => restored.captureProgressSnapshot()).toThrow(
        /terminal DAG observation.*unavailable/i,
      );
      expect(restored.getTraversalLifecycleStatus()).toBe(status);
      if (status === Status.FAILED)
        await expect(
          (async () => restored.runUntilSuspendedOrTerminal())(),
        ).rejects.toBe(error);
      else await restored.runUntilSuspendedOrTerminal();
      const empty = (
        Constructor === DagTraversalBuilder
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        dagDiscoverySource,
        traversalRunnerInternalObjects: { state },
      }).createIndependentRunnerFromCurrentOptions();
      expect(
        captureDagMilestoneSnapshot(empty).explainMilestone({
          vertexId: 'a',
          milestone: 'workCompletion',
        }),
      ).toMatchObject({ kind: 'unresolved', discoveryComplete: false });
      expect(calls).toBe(1);
    }
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const outcome of ['success', 'failure'] as const) {
    for (const shape of [
      'sealed class',
      'nonextensible class',
      'sealed structural',
      'locked metadata',
    ] as const) {
      test(`${Constructor.name} preserves ${outcome} and observations with ${shape} state`, async () => {
        const initial = new DagTraversalRunnerState<G>();
        const state =
          shape === 'sealed structural'
            ? Object.seal({
                status: initial.status,
                traversalRootVertexRef: initial.traversalRootVertexRef,
                subtreeTraversalDisabledRefs:
                  initial.subtreeTraversalDisabledRefs,
                visitorsState: initial.visitorsState,
                dependencyEligiblePhaseVisits:
                  initial.dependencyEligiblePhaseVisits,
                expansionQueue: initial.expansionQueue,
                failure: initial.failure,
              })
            : initial;
        if (shape === 'sealed class') Object.seal(state);
        if (shape === 'nonextensible class') Object.preventExtensions(state);
        if (shape === 'locked metadata') {
          for (const symbol of Object.getOwnPropertySymbols(state)) {
            Object.defineProperty(state, symbol, {
              writable: false,
              configurable: false,
            });
          }
        }
        const extensible = Object.isExtensible(state);
        const descriptors = Object.getOwnPropertySymbols(state).map(
          (symbol) =>
            [symbol, Object.getOwnPropertyDescriptor(state, symbol)!] as const,
        );
        let calls = 0;
        const dagDiscoverySource = {
          resolveRootVertex: () => {
            calls++;
            return {
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexId: 'a',
                vertexContentInput: {
                  $vertexData: 'a',
                  $childDiscoveryHints: [],
                },
              },
            };
          },
          resolveChildHint: () => ({
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          }),
        };
        const traversal = (
          Constructor === DagTraversalBuilder
            ? createInternalDagTraversal
            : createInternalAsyncDagTraversal
        )<G>({
          dagDiscoverySource,
          traversalRunnerInternalObjects: { state },
        });
        const failure = undefined;
        traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
          calls++;
          if (outcome === 'failure') throw failure;
        });
        const runner = traversal.createIndependentRunnerFromCurrentOptions();
        if (outcome === 'success') await runner.runUntilSuspendedOrTerminal();
        else
          await expect(
            (async () => runner.runUntilSuspendedOrTerminal())(),
          ).rejects.toBe(failure);
        const status = outcome === 'success' ? Status.FINISHED : Status.FAILED;
        expect(runner.getTraversalLifecycleStatus()).toBe(status);
        expect(Object.isExtensible(state)).toBe(extensible);
        for (const [symbol, descriptor] of descriptors) {
          const after = Object.getOwnPropertyDescriptor(state, symbol)!;
          expect({ ...after, value: undefined }).toEqual({
            ...descriptor,
            value: undefined,
          });
        }
        const copies = [state, new DagTraversalRunnerState(state)];
        if (shape === 'sealed class' || shape === 'nonextensible class')
          copies.push({ ...state }, Object.assign({}, state));
        for (const copied of copies) {
          const restored = (
            Constructor === DagTraversalBuilder
              ? createInternalDagTraversal
              : createInternalAsyncDagTraversal
          )<G>({
            dagDiscoverySource,
            traversalRunnerInternalObjects: {
              state: copied,
              resolvedGraphsContainer:
                runnerInternals(runner).resolvedGraphsContainer,
            },
          }).createIndependentRunnerFromCurrentOptions();
          for (const milestone of [
            'workCompletion',
            'subgraphCompletion',
          ] as const) {
            expect(
              captureDagMilestoneSnapshot(restored).explainMilestone({
                vertexId: 'a',
                milestone,
              }),
            ).toMatchObject({
              kind: 'live',
              milestoneSatisfied: outcome === 'success',
            });
          }
          expect(restored.captureProgressSnapshot()).toEqual(
            runner.captureProgressSnapshot(),
          );
          expect(restored.getTraversalLifecycleStatus()).toBe(status);
          if (outcome === 'success')
            await restored.runUntilSuspendedOrTerminal();
          else
            await expect(
              (async () => restored.runUntilSuspendedOrTerminal())(),
            ).rejects.toBe(failure);
        }
        expect(calls).toBe(2);
      });
    }
  }
}

test('retaining a terminal observation again preserves an immutable metadata descriptor', () => {
  const runner = new DagTraversalBuilder<G>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'a',
          vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
        },
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  for (const symbol of Object.getOwnPropertySymbols(
    runnerInternals(runner).state,
  ))
    Object.defineProperty(runnerInternals(runner).state, symbol, {
      writable: false,
      configurable: false,
    });
  const before = Object.getOwnPropertyDescriptors(
    runnerInternals(runner).state,
  );
  expect(() =>
    captureDagTerminalObservation(runnerInternals(runner).state, {
      inspectDagState: () => inspectInternalDagState(runner),
      captureProgressSnapshot: () => runner.captureProgressSnapshot(),
    }),
  ).not.toThrow();
  expect(
    Object.getOwnPropertyDescriptors(runnerInternals(runner).state),
  ).toEqual(before);
  const restored = createInternalDagTraversalRunner<G>({
    dagDiscoverySource: runnerInternals(runner).icfg.dagDiscoverySource!,
    traversalRunnerInternalObjects: {
      state: new DagTraversalRunnerState(runnerInternals(runner).state),
      resolvedGraphsContainer: runnerInternals(runner).resolvedGraphsContainer,
    },
  });
  expect(
    captureDagMilestoneSnapshot(restored).explainMilestone({
      vertexId: 'a',
      milestone: 'subgraphCompletion',
    }),
  ).toMatchObject({ kind: 'live', milestoneSatisfied: true });
});
