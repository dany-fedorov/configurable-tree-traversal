import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { inspectInternalDagState } from './internal-runner-fixtures';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalStallError,
  DagVisitorPhase as Order,
  inspectDagMilestones,
  materializeDagInputFromRecords,
} from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  createInternalAsyncDagTraversal,
  createInternalAsyncDagTraversalRunner,
  createInternalDagTraversal,
  createInternalDagTraversalFor,
  createInternalDagTraversalRunner,
  runnerInternals,
} from './internal-runner-fixtures';

import { captureDagTerminalObservation } from '../src/traversals/dag-traversal/lib/DagTerminalObservation';

type G = VertexTypes<string, string>;

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
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
      const traversableGraph = {
        resolveRoot: () => {
          sourceCalls++;
          if (scenario === 'root source failure') throw failure;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: 'a',
              vertexContent: {
                $data: 'a',
                $childHints: scenario === 'child source failure' ? ['b'] : [],
              },
            },
          };
        },
        resolveChild: (hint: string) => {
          sourceCalls++;
          if (scenario === 'child source failure') throw failure;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: hint,
              vertexContent: { $data: hint, $childHints: [] },
            },
          };
        },
      };
      const traversal = new Constructor<G>({ traversableGraph });
      traversal.addVisitorFor(Order.ON_WORK_READY, () => {
        visits++;
        if (scenario === 'ready failure') throw failure;
      });
      traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, () => {
        visits++;
        if (scenario === 'completion failure') throw failure;
      });
      const runner = traversal.createRunner();
      if (scenario === 'finished') await runner.run();
      else await expect((async () => runner.run())()).rejects.toBe(failure);
      const expectedStatus =
        scenario === 'finished' ? Status.FINISHED : Status.FAILED;
      const before = { sourceCalls, visits };
      const original = inspectDagMilestones(runner);
      for (const state of [
        runnerInternals(runner).state,
        new DagTraversalRunnerState(runnerInternals(runner).state),
        { ...runnerInternals(runner).state },
        Object.assign({}, runnerInternals(runner).state),
      ]) {
        const restored = (
          Constructor === DagTraversal
            ? createInternalDagTraversal
            : createInternalAsyncDagTraversal
        )<G>({
          traversableGraph,
          traversalRunnerInternalObjects: {
            state,
            resolvedGraphsContainer:
              runnerInternals(runner).resolvedGraphsContainer,
          },
        }).createRunner();
        const captured = inspectDagMilestones(restored);
        for (const milestone of ['work', 'subgraphCompletion'] as const) {
          const result = captured.explain({ vertexId: 'a', milestone });
          expect(result).toEqual(
            original.explain({ vertexId: 'a', milestone }),
          );
          if (scenario === 'root source failure')
            expect(result).toMatchObject({
              kind: 'unknown',
              discoveryComplete: false,
            });
          else
            expect(result).toMatchObject({
              kind: 'known',
              satisfied:
                scenario === 'finished' ||
                (milestone === 'work' && scenario !== 'ready failure'),
              discoveryComplete:
                scenario === 'finished' || scenario === 'completion failure',
            });
        }
        expect(restored.summary()).toEqual(runner.summary());
        expect(inspectInternalDagState(restored)).toEqual(
          inspectInternalDagState(runner),
        );
        expect(restored.getStatus()).toBe(expectedStatus);
        expect(restored.requestPause()).toBe(false);
        if (scenario === 'finished') await restored.run();
        else await expect((async () => restored.run())()).rejects.toBe(failure);
        expect({ sourceCalls, visits }).toEqual(before);
        expect(runner.getStatus()).toBe(expectedStatus);
        const summary = restored.summary();
        (summary.completedWorkIds as unknown[]).push('corruption');
        (summary.vertices as Map<unknown, unknown>).clear();
        const facts = inspectInternalDagState(restored);
        (facts.identityStates as unknown[]).pop();
        (facts.schedulingStates as unknown[]).pop();
        expect(restored.summary()).toEqual(runner.summary());
        expect(inspectInternalDagState(restored)).toEqual(
          inspectInternalDagState(runner),
        );
        expect(captured.explain({ vertexId: 'a', milestone: 'work' })).toEqual(
          original.explain({ vertexId: 'a', milestone: 'work' }),
        );
      }
    });
  }
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} retains terminal tree-source milestone identities`, async () => {
    let calls = 0;
    const traversableTree = {
      resolveRoot: () => {
        calls++;
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
        };
      },
      resolveChild: (hint: string) => {
        calls++;
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: hint, $childHints: [] } },
        };
      },
    };
    const runner = new Constructor<G>({ traversableTree }).createRunner();
    await runner.run();
    const restored = (
      Constructor === DagTraversal
        ? createInternalDagTraversal
        : createInternalAsyncDagTraversal
    )<G>({
      traversableTree,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState(runnerInternals(runner).state),
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }).createRunner();
    const captured = inspectDagMilestones(restored);
    const graph = runner.getResolvedGraph();
    for (const ref of graph.getVertexRefs()) {
      for (const milestone of ['work', 'subgraphCompletion'] as const) {
        expect(
          captured.explain({ vertexId: graph.getVertexId(ref), milestone }),
        ).toMatchObject({
          kind: 'known',
          satisfied: true,
          discoveryComplete: true,
        });
      }
    }
    expect(restored.summary()).toEqual(runner.summary());
    expect(calls).toBe(2);
  });

  test(`${Constructor.name} retains failed preparation diagnostics and owns every copied observation wrapper`, async () => {
    const first = { name: 'first' };
    const second = { name: 'second' };
    const source = materializeDagInputFromRecords(
      [
        { id: first, complete: [second] },
        { id: second, complete: [first] },
      ],
      {
        id: (item) => item.id,
        dependsOnSubgraphCompletion: (item) => item.complete,
      },
    );
    const runner = new Constructor(source).createRunner();
    await expect((async () => runner.prepare())()).rejects.toBeInstanceOf(
      DagTraversalStallError,
    );
    const restored = createInternalDagTraversalFor(Constructor, {
      traversableGraph: source.traversableGraph,
      traversalRunnerInternalObjects: {
        state: runnerInternals(runner).state,
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }).createRunner();
    const before = restored.summary();
    const expected = runner.summary();
    expect(before).toEqual(expected);
    const original = inspectDagMilestones(runner).explain({
      vertexId: first,
      milestone: 'subgraphCompletion',
    });
    expect(original).toMatchObject({
      kind: 'known',
      satisfied: false,
      discoveryComplete: true,
    });
    expect(
      inspectDagMilestones(restored).explain({
        vertexId: first,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(original);
    expect(before.vertices.get(first)!.vertexId).toBe(first);
    const progress = before.vertices.get(first)!;
    (progress.unmetPrerequisiteIds as unknown[]).pop();
    (progress.unmetWorkPrerequisiteIds as unknown[]).push('changed');
    (progress.unmetSubgraphPrerequisiteIds as unknown[]).pop();
    (progress as { work: string }).work = 'completed';
    (before.discovery as { complete: boolean }).complete = false;
    (before.counts as { discovered: number }).discovered = 99;
    for (const values of [
      before.readyOrDeferredIds,
      before.deferredWorkIds,
      before.activeVisitorVertexIds,
      before.completedWorkIds,
      before.completedSubgraphIds,
      before.unusedCompletedWorkIds,
    ])
      (values as unknown[]).push('changed');
    const diagnostics = before.diagnostics!;
    diagnostics.dependencies[0]!.unmet.pop();
    diagnostics.dependencies[0]!.id = 'changed' as unknown as typeof first;
    diagnostics.unknownPrerequisiteIds.push({ name: 'changed' });
    diagnostics.dependencyCycleComponents[0]!.pop();
    diagnostics.dependencyEdges[0]!.waiter.vertexId = { name: 'changed' };
    diagnostics.dependencyEdges[0]!.prerequisite.vertexId = { name: 'changed' };
    diagnostics.dependencyBlockedIds.pop();
    diagnostics.structurallyIncompleteIds.push({ name: 'changed' });
    const facts = inspectInternalDagState(restored);
    (facts.identityStates[0] as { kind: string }).kind = 'deleted';
    (
      facts.schedulingStates[0] as { initialCommitted: boolean }
    ).initialCommitted = true;
    expect(restored.summary()).toEqual(expected);
    expect(inspectInternalDagState(restored)).toEqual(
      inspectInternalDagState(runner),
    );
    expect(
      inspectDagMilestones(restored).explain({
        vertexId: first,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(original);
    expect(Object.isFrozen(first)).toBe(false);
  });

  test(`${Constructor.name} retains deferred work and earlier commits when a later visitor fails`, async () => {
    const source = materializeDagInputFromRecords(
      [{ id: 'done' }, { id: 'deferred' }, { id: 'failed' }],
      { id: (item) => item.id },
    );
    const traversal = new Constructor({
      ...source,
      discovery: 'eager',
      ...(Constructor === AsyncDagTraversal ? { concurrency: 1 } : {}),
    });
    const failure = { problem: 'later visitor' };
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      if (vertex.getData().id === 'deferred')
        return {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        };
      if (vertex.getData().id === 'failed') throw failure;
      return undefined;
    });
    const runner = traversal.createRunner();
    await expect((async () => runner.run())()).rejects.toBe(failure);
    const restored = createInternalDagTraversalFor(Constructor, {
      traversableGraph: source.traversableGraph,
      traversalRunnerInternalObjects: {
        state: runnerInternals(runner).state,
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }).createRunner();
    expect(restored.summary()).toEqual(runner.summary());
    expect(
      inspectDagMilestones(restored).explain({
        vertexId: 'done',
        milestone: 'work',
      }),
    ).toMatchObject({ kind: 'known', satisfied: true });
    expect(
      inspectDagMilestones(restored).explain({
        vertexId: 'deferred',
        milestone: 'work',
      }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      progress: { work: 'deferred' },
    });
    expect(
      inspectDagMilestones(restored).explain({
        vertexId: 'failed',
        milestone: 'work',
      }),
    ).toMatchObject({ kind: 'known', satisfied: false });
    const summary = restored.summary();
    (summary.awaitingSettlement[0] as { vertexId: string }).vertexId =
      'changed';
    expect(restored.summary()).toEqual(runner.summary());
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
  const source = materializeDagInputFromRecords([{ id: 'a' }, { id: 'b' }], {
    id: (item) => item.id,
  });
  const traversal = new AsyncDagTraversal({
    ...source,
    concurrency: 2,
    discovery: 'eager',
  });
  let callbacks = 0;
  traversal.addVisitorFor(Order.ON_WORK_READY, async (vertex) => {
    callbacks++;
    if (vertex.getData().id === 'a') await failing;
    else {
      bothStarted();
      await late;
    }
  });
  const runner = traversal.createRunner();
  const running = runner.run();
  await started;
  const failure = { error: 'failed first' };
  reject(failure);
  await expect(running).rejects.toBe(failure);
  const restored = createInternalAsyncDagTraversalRunner({
    traversableGraph: source.traversableGraph,
    traversalRunnerInternalObjects: {
      state: runnerInternals(runner).state,
      resolvedGraphsContainer: runnerInternals(runner).resolvedGraphsContainer,
    },
  });
  const captured = inspectDagMilestones(restored);
  expect(captured.explain({ vertexId: 'a', milestone: 'work' })).toMatchObject({
    kind: 'known',
    satisfied: false,
  });
  expect(captured.explain({ vertexId: 'b', milestone: 'work' })).toMatchObject({
    kind: 'known',
    satisfied: false,
  });
  release();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(restored.summary()).toEqual(runner.summary());
  expect(inspectInternalDagState(restored)).toEqual(
    inspectInternalDagState(runner),
  );
  expect(
    inspectDagMilestones(runner).explain({ vertexId: 'b', milestone: 'work' }),
  ).toEqual(captured.explain({ vertexId: 'b', milestone: 'work' }));
  await expect(restored.run()).rejects.toBe(failure);
  expect(callbacks).toBe(2);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} explains unavailable history for fabricated terminal state without changing lifecycle`, async () => {
    let calls = 0;
    const traversableGraph = {
      resolveRoot: () => {
        calls++;
        return {
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            vertexContent: { $data: 'a', $childHints: [] },
          },
        };
      },
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
    };
    const original = new Constructor<G>({ traversableGraph }).createRunner();
    await original.run();
    for (const status of [Status.FINISHED, Status.FAILED]) {
      const error = { status };
      const state = new DagTraversalRunnerState<G>({
        status,
        failure: { error },
      });
      const restored = (
        Constructor === DagTraversal
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        traversableGraph,
        traversalRunnerInternalObjects: {
          state,
          resolvedGraphsContainer:
            runnerInternals(original).resolvedGraphsContainer,
        },
      }).createRunner();
      expect(() => inspectDagMilestones(restored)).toThrow(
        /terminal DAG observation.*unavailable/i,
      );
      expect(() => restored.summary()).toThrow(
        /terminal DAG observation.*unavailable/i,
      );
      expect(restored.getStatus()).toBe(status);
      if (status === Status.FAILED)
        await expect((async () => restored.run())()).rejects.toBe(error);
      else await restored.run();
      const empty = (
        Constructor === DagTraversal
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        traversableGraph,
        traversalRunnerInternalObjects: { state },
      }).createRunner();
      expect(
        inspectDagMilestones(empty).explain({
          vertexId: 'a',
          milestone: 'work',
        }),
      ).toMatchObject({ kind: 'unknown', discoveryComplete: false });
      expect(calls).toBe(1);
    }
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
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
                readyVisits: initial.readyVisits,
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
        const traversableGraph = {
          resolveRoot: () => {
            calls++;
            return {
              kind: 'found' as const,
              vertex: {
                vertexId: 'a',
                vertexContent: { $data: 'a', $childHints: [] },
              },
            };
          },
          resolveChild: () => ({
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          }),
        };
        const traversal = (
          Constructor === DagTraversal
            ? createInternalDagTraversal
            : createInternalAsyncDagTraversal
        )<G>({
          traversableGraph,
          traversalRunnerInternalObjects: { state },
        });
        const failure = undefined;
        traversal.addVisitorFor(Order.ON_WORK_READY, () => {
          calls++;
          if (outcome === 'failure') throw failure;
        });
        const runner = traversal.createRunner();
        if (outcome === 'success') await runner.run();
        else await expect((async () => runner.run())()).rejects.toBe(failure);
        const status = outcome === 'success' ? Status.FINISHED : Status.FAILED;
        expect(runner.getStatus()).toBe(status);
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
            Constructor === DagTraversal
              ? createInternalDagTraversal
              : createInternalAsyncDagTraversal
          )<G>({
            traversableGraph,
            traversalRunnerInternalObjects: {
              state: copied,
              resolvedGraphsContainer:
                runnerInternals(runner).resolvedGraphsContainer,
            },
          }).createRunner();
          for (const milestone of ['work', 'subgraphCompletion'] as const) {
            expect(
              inspectDagMilestones(restored).explain({
                vertexId: 'a',
                milestone,
              }),
            ).toMatchObject({
              kind: 'known',
              satisfied: outcome === 'success',
            });
          }
          expect(restored.summary()).toEqual(runner.summary());
          expect(restored.getStatus()).toBe(status);
          if (outcome === 'success') await restored.run();
          else
            await expect((async () => restored.run())()).rejects.toBe(failure);
        }
        expect(calls).toBe(2);
      });
    }
  }
}

test('retaining a terminal observation again preserves an immutable metadata descriptor', () => {
  const runner = new DagTraversal<G>({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'a',
          vertexContent: { $data: 'a', $childHints: [] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
    },
  }).createRunner();
  runner.run();
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
      summary: () => runner.summary(),
    }),
  ).not.toThrow();
  expect(
    Object.getOwnPropertyDescriptors(runnerInternals(runner).state),
  ).toEqual(before);
  const restored = createInternalDagTraversalRunner<G>({
    traversableGraph: runnerInternals(runner).icfg.traversableGraph!,
    traversalRunnerInternalObjects: {
      state: new DagTraversalRunnerState(runnerInternals(runner).state),
      resolvedGraphsContainer: runnerInternals(runner).resolvedGraphsContainer,
    },
  });
  expect(
    inspectDagMilestones(restored).explain({
      vertexId: 'a',
      milestone: 'subgraphCompletion',
    }),
  ).toMatchObject({ kind: 'known', satisfied: true });
});
