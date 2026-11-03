import type { VertexView } from '../src';
import type { TraversalIterableConfigInput } from '../src/core/TraversalRunnerIterableConfig';
import type { TraversalRunnerIterableConfig } from '../src/core/TraversalRunnerIterableConfig';
import { BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultBFS } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDAG } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDFS } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveBreadthFirstTraversalRunnerIterableConfig as makeBFS } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { makeEffectiveDagTraversalRunnerIterableConfig as makeDAG } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig as makeDFS } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type { TreeOrDagExecutionSnapshot } from '../src';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as BFS,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as DAG,
  DepthFirstTreeVisitPhase as DFS,
  DepthFirstTreeTraversalBuilder,
  TraversalVisitorCommandName as Command,
} from '../src';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { emissionKind } from '../src/core/normalizeTraversalExecutionOptions';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  createInternalAsyncDagTraversalRunner,
  createInternalDagTraversalRunner,
} from './internal-runner-fixtures';

type Event = {
  eventKind: string;
  vertex: { getVertexData(): string };
};
type Runner = {
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: unknown,
  ): Generator<Event> | AsyncGenerator<Event, void, unknown>;
  runUntilSuspendedOrTerminal(config?: unknown): unknown;
  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot;
};
const tree = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: (_hint: string) => ({
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
const graph = {
  ...tree,
  resolveChildHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      ...tree.resolveRootVertex().resolvedVertexInput,
      vertexId: 'root',
    },
  }),
};
const families = [
  {
    name: 'sync DFS',
    phase: DFS.BEFORE_CHILD_EXPANSION,
    make: () =>
      new DepthFirstTreeTraversalBuilder<TestGraph>({
        treeDiscoverySource: tree,
      }),
  },
  {
    name: 'async DFS',
    phase: DFS.BEFORE_CHILD_EXPANSION,
    make: () =>
      new AsyncDepthFirstTreeTraversalBuilder<TestGraph>({
        treeDiscoverySource: tree,
      }),
  },
  {
    name: 'sync BFS',
    phase: BFS.AT_LEVEL_ORDER_VERTEX,
    make: () =>
      new BreadthFirstTreeTraversalBuilder<TestGraph>({
        treeDiscoverySource: tree,
      }),
  },
  {
    name: 'async BFS',
    phase: BFS.AT_LEVEL_ORDER_VERTEX,
    make: () =>
      new AsyncBreadthFirstTreeTraversalBuilder<TestGraph>({
        treeDiscoverySource: tree,
      }),
  },
  {
    name: 'sync DAG',
    phase: DAG.ON_WORK_READY,
    make: () =>
      new DagTraversalBuilder<TestGraph>({ dagDiscoverySource: graph }),
  },
  {
    name: 'async DAG',
    phase: DAG.ON_WORK_READY,
    make: () =>
      new AsyncDagTraversalBuilder<TestGraph>({ dagDiscoverySource: graph }),
  },
];

// Each adapter and callback executes the real public runner. The common harness
// accepts deliberately malformed runtime inputs; compiler cases live separately.
function create(family: typeof families[number], halt = false) {
  const calls: string[] = [];
  const traversal = family.make();
  const phase = family.phase;
  const add = traversal.registerVisitorCallbackForPhase.bind(traversal) as (
    phase: string,
    visitor: (vertex: VertexView<TestGraph>) => void | {
      commands: {
        commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY;
      }[];
    },
  ) => unknown;
  add(phase, (vertex) => {
    calls.push(vertex.getVertexData());
    if (halt)
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    return undefined;
  });
  if (halt)
    add(phase, () => {
      calls.push('continued');
    });
  return {
    runner:
      traversal.createIndependentRunnerFromCurrentOptions() as unknown as Runner,
    calls,
  };
}
async function events(runner: Runner, config?: unknown) {
  const result: string[] = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config,
  ))
    result.push(event.eventKind);
  return result;
}

describe.each(families)('$name execution selection', (family) => {
  test.each([
    ['all', true],
    [{ include: [] }, false],
    [{ exclude: [] }, true],
  ])(
    'selects callbacks with %j independently of empty emission',
    async (admittedVisitorCallbackPhases, enabled) => {
      const { runner, calls } = create(family);
      expect(
        await events(runner, {
          deliveredEventKinds: [],
          admittedVisitorCallbackPhases,
        }),
      ).toEqual([]);
      expect(calls).toEqual(enabled ? ['root'] : []);
    },
  );

  test('private normalized defaults reject as public inputs and leave the runner reusable', async () => {
    const configs =
      family.phase === DFS.BEFORE_CHILD_EXPANSION
        ? [makeDFS(), defaultDFS]
        : family.phase === BFS.AT_LEVEL_ORDER_VERTEX
        ? [makeBFS(), defaultBFS]
        : [makeDAG(), defaultDAG];
    for (const config of configs) {
      const { runner, calls } = create(family);
      await expect(events(runner, config)).rejects.toThrow(TypeError);
      expect(calls).toEqual([]);
      expect(
        await events(runner, {
          deliveredEventKinds: [emissionKind(family.phase)],
        }),
      ).toEqual([emissionKind(family.phase)]);
      expect(calls).toEqual(['root']);
    }
  });

  test('includes and excludes actual family phases', async () => {
    for (const [admittedVisitorCallbackPhases, want] of [
      [{ include: [family.phase] }, ['root']],
      [{ exclude: [family.phase] }, []],
    ] as const) {
      const { runner, calls } = create(family);
      expect(
        await events(runner, {
          deliveredEventKinds: [emissionKind(family.phase)],
          admittedVisitorCallbackPhases,
        }),
      ).toEqual([emissionKind(family.phase)]);
      expect(calls).toEqual(want);
    }
  });

  test('rejects legacy enable/disable policies atomically', async () => {
    const { runner, calls } = create(family);
    await expect(
      Promise.resolve().then(() =>
        runner.runUntilSuspendedOrTerminal({
          enableVisitorFunctionsFor: [family.phase],
          disableVisitorFunctionsFor: [family.phase],
        }),
      ),
    ).rejects.toThrow(TypeError);
    expect(calls).toEqual([]);
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { include: [family.phase] },
    });
    expect(calls).toEqual(['root']);
  });

  test('emission-only resume retains disabled callbacks and snapshots caller arrays', async () => {
    const { runner, calls } = create(family);
    const include: string[] = [];
    const emit = [emissionKind(family.phase)];
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: emit,
        admittedVisitorCallbackPhases: { include },
      });
    expect((await iterator.next()).done).toBe(false);
    include.push(family.phase);
    emit.length = 0;
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [emissionKind(family.phase)],
      admittedVisitorCallbackPhases: { include: [] },
    });
    await iterator.return(undefined);
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(calls).toEqual([]);
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: { include: [] },
    });
  });

  test('explicit selection patches replace the prior policy while draining admitted callbacks', async () => {
    const { runner, calls } = create(family, true);
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { include: [family.phase] },
    });
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { exclude: [family.phase] },
      deliveredEventKinds: [],
    });
    expect(calls).toEqual(['root', 'continued']);
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: { exclude: [family.phase] },
    });
  });

  test('an exclude patch replaces a previous include selection', async () => {
    const { runner } = create(family, true);
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { include: [family.phase] },
    });
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { exclude: [family.phase] },
    });
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      admittedVisitorCallbackPhases: { exclude: [family.phase] },
    });
    expect(
      runner.captureExecutionSnapshot().executionOptions,
    ).not.toHaveProperty('iterateOver');
    expect(
      runner.captureExecutionSnapshot().executionOptions,
    ).not.toHaveProperty('enableVisitorFunctionsFor');
  });

  test('active chains retain visitor admission but delivery uses the resume selector', async () => {
    const { runner, calls } = create(family, true);
    await runner.runUntilSuspendedOrTerminal({
      deliveredEventKinds: [emissionKind(family.phase)],
    });
    expect(calls).toEqual(['root']);
    expect(runner.captureExecutionSnapshot().vertexPhaseVisitorChains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          executionSelectionsAtAdmission: expect.objectContaining({
            deliveredEventKinds: [emissionKind(family.phase)],
            admittedVisitorCallbackPhases: 'all',
          }),
        }),
      ]),
    );
    expect(
      await events(runner, {
        deliveredEventKinds: [],
        admittedVisitorCallbackPhases: { include: [] },
      }),
    ).toEqual([]);
    expect(calls).toEqual(['root', 'continued']);
  });

  test('a previously unselected paused chain can emit without replaying callbacks', async () => {
    const { runner, calls } = create(family, true);
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(calls).toEqual(['root']);
    expect(
      await events(runner, {
        deliveredEventKinds: [emissionKind(family.phase)],
        admittedVisitorCallbackPhases: { include: [] },
      }),
    ).toEqual([emissionKind(family.phase)]);
    expect(calls).toEqual(['root', 'continued']);
    expect(await events(runner)).toEqual([]);
    expect(calls).toEqual(['root', 'continued']);
  });

  test.each(['include', 'exclude'])(
    'retains a nested undefined %s selector while resuming',
    async (field) => {
      const { runner, calls } = create(family);
      const iterator =
        runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [emissionKind(family.phase)],
          admittedVisitorCallbackPhases: { include: [] },
        });
      expect((await iterator.next()).done).toBe(false);
      await iterator.return(undefined);
      await runner.runUntilSuspendedOrTerminal({
        admittedVisitorCallbackPhases: { [field]: undefined },
      });
      expect(calls).toEqual([]);
      expect(
        runner.captureExecutionSnapshot().executionOptions
          .admittedVisitorCallbackPhases,
      ).toEqual({
        include: [],
      });
    },
  );

  test.each([
    { deliveredEventKinds: ['WRONG_PHASE'] },
    { emitPhases: [] },
    { typo: [] },
    { deliveredEventKinds: new Array(1) },
    { iterateOver: ['WRONG_PHASE'] },
    { admittedVisitorCallbackPhases: { include: ['WRONG_PHASE'] } },
    { admittedVisitorCallbackPhases: { exclude: ['WRONG_PHASE'] } },
    { enableVisitorFunctionsFor: ['WRONG_PHASE'] },
    { disableVisitorFunctionsFor: ['WRONG_PHASE'] },
    { admittedVisitorCallbackPhases: { include: [], exclude: [] } },
    { admittedVisitorCallbackPhases: { include: [], extra: [] } },
    { admittedVisitorCallbackPhases: [] },
    { admittedVisitorCallbackPhases: {} },
    { admittedVisitorCallbackPhases: null },
    { admittedVisitorCallbackPhases: 'none' },
    { admittedVisitorCallbackPhases: { include: null } },
    { deliveredEventKinds: null },
    { deliveredEventKinds: [], iterateOver: [] },
    { deliveredEventKinds: undefined, iterateOver: undefined },
    null,
    false,
    'invalid',
    [],
    { admittedVisitorCallbackPhases: 'all', enableVisitorFunctionsFor: null },
    { admittedVisitorCallbackPhases: 'all', disableVisitorFunctionsFor: [] },
  ])(
    'rejects malformed input before changing configuration: %j',
    async (input) => {
      const { runner, calls } = create(family);
      const before = runner.captureExecutionSnapshot();
      await expect(
        Promise.resolve().then(() => runner.runUntilSuspendedOrTerminal(input)),
      ).rejects.toThrow(TypeError);
      expect(runner.captureExecutionSnapshot().executionOptions).toEqual(
        before.executionOptions,
      );
      expect(calls).toEqual([]);
      await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
      expect(calls).toEqual(['root']);
    },
  );

  test('reads and detaches caller option accessors exactly once before execution', async () => {
    const { runner, calls } = create(family);
    let emissionReads = 0;
    let selectionReads = 0;
    let includeReads = 0;
    const input = {
      get deliveredEventKinds() {
        emissionReads += 1;
        if (emissionReads > 1) throw new Error('emission reread');
        return [];
      },
      get admittedVisitorCallbackPhases() {
        selectionReads += 1;
        if (selectionReads > 1) throw new Error('selector reread');
        return {
          get include() {
            includeReads += 1;
            if (includeReads > 1) throw new Error('include reread');
            return [family.phase];
          },
        };
      },
    };
    await runner.runUntilSuspendedOrTerminal(input);
    expect(calls).toEqual(['root']);
    expect([emissionReads, selectionReads, includeReads]).toEqual([1, 1, 1]);
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: { include: [family.phase] },
    });
  });

  test('copies array indexes once and validates the same detached values', async () => {
    const { runner, calls } = create(family);
    let reads = 0;
    const phases: string[] = [];
    Object.defineProperty(phases, 0, {
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? emissionKind(family.phase) : 'WRONG_PHASE';
      },
    });
    expect(await events(runner, { deliveredEventKinds: phases })).toEqual([
      emissionKind(family.phase),
    ]);
    expect(reads).toBe(1);
    expect(calls).toEqual(['root']);
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [emissionKind(family.phase)],
    });
  });

  test('preserves exact caller getter errors and permits a valid retry', async () => {
    const { runner, calls } = create(family);
    const error = { caller: 'options' };
    const before = runner.captureExecutionSnapshot();
    await expect(
      Promise.resolve().then(() =>
        runner.runUntilSuspendedOrTerminal({
          get deliveredEventKinds() {
            throw error;
          },
        }),
      ),
    ).rejects.toBe(error);
    expect(runner.captureExecutionSnapshot()).toEqual(before);
    expect(calls).toEqual([]);
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(calls).toEqual(['root']);
  });

  test('callback-only and omitted resumes preserve emission selection', async () => {
    const { runner, calls } = create(family, true);
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: 'all',
    });
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { exclude: [] },
    });
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.captureExecutionSnapshot().executionOptions).toMatchObject({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: { exclude: [] },
    });
    expect(calls).toEqual(['root', 'continued']);
  });

  test('independent canonical selectors coexist and omitted fields retain defaults', async () => {
    const { runner, calls } = create(family);
    expect(
      await events(runner, {
        deliveredEventKinds: [emissionKind(family.phase)],
        admittedVisitorCallbackPhases: { exclude: [] },
      }),
    ).toEqual([emissionKind(family.phase)]);
    expect(calls).toEqual(['root']);
  });
});

function checkHelper<ORDER extends string>(
  phase: ORDER,
  make: (
    input?: TraversalIterableConfigInput<ORDER>,
    previous?: TraversalRunnerIterableConfig<ORDER>,
  ) => TraversalRunnerIterableConfig<ORDER>,
) {
  const included = make({
    admittedVisitorCallbackPhases: { include: [phase] },
  });
  expect(
    make({ deliveredEventKinds: [] }, included).enableVisitorFunctionsFor,
  ).toEqual([phase]);
  const emit = [emissionKind(phase)];
  const exclude = [phase];
  const initial = make({
    deliveredEventKinds: emit,
    admittedVisitorCallbackPhases: { exclude },
  });
  emit.length = 0;
  exclude.length = 0;
  expect(initial.iterateOver).toEqual([phase]);
  expect(initial.disableVisitorFunctionsFor).toEqual([phase]);
  const patched = make({ deliveredEventKinds: [] }, initial);
  expect(patched.iterateOver).toEqual([]);
  expect(patched.disableVisitorFunctionsFor).toEqual([phase]);
  expect(make(undefined, patched)).toEqual(patched);
  const all = make({ admittedVisitorCallbackPhases: 'all' }, patched);
  expect(all.iterateOver).toEqual([]);
  expect(all.enableVisitorFunctionsFor).toBeNull();
  expect(all.disableVisitorFunctionsFor).toBeNull();
}

test('family config helpers share defaults, detachment, and independent patches', () => {
  checkHelper<DFS>(DFS.BEFORE_CHILD_EXPANSION, makeDFS);
  checkHelper<BFS>(BFS.AT_LEVEL_ORDER_VERTEX, makeBFS);
  checkHelper<DAG>(DAG.ON_WORK_READY, makeDAG);
});

test.each([false, true])(
  'rejected option getters leave shared DAG objects unclaimed (async=%s)',
  async (isAsync) => {
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const make = () => {
      const input = {
        dagDiscoverySource: graph,
        traversalRunnerInternalObjects: {
          state: new DagTraversalRunnerState<TestGraph>(),
          resolvedGraphsContainer: container,
        },
      };
      return isAsync
        ? createInternalAsyncDagTraversalRunner<TestGraph>(input)
        : createInternalDagTraversalRunner<TestGraph>(input);
    };
    const runner = make();
    const before = runner.captureExecutionSnapshot();
    const error = { options: 'getter failed' };
    await expect(
      Promise.resolve().then(async () => {
        await runner.runUntilSuspendedOrTerminal({
          get deliveredEventKinds(): [] {
            throw error;
          },
        });
      }),
    ).rejects.toBe(error);
    expect(runner.captureExecutionSnapshot()).toEqual(before);
    const competitor = make();
    await competitor.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(
      competitor
        .getLiveResolvedGraphView()
        .getDesignatedRootHandleOrNull()
        ?.getCurrentVertexView()
        .getVertexData(),
    ).toBe('root');
  },
);
