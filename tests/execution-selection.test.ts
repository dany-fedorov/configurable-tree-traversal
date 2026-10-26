import { emissionKind } from '../src/core/normalizeTraversalExecutionOptions';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import {
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  DepthFirstPhase as DFS,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstPhase as BFS,
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase as DAG,
  TraversalVisitorCommandName as Command,
  makeEffectiveDepthFirstTraversalRunnerIterableConfig as makeDFS,
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig as makeBFS,
  makeEffectiveDagTraversalRunnerIterableConfig as makeDAG,
  DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDFS,
  BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultBFS,
  DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDAG,
} from '../src';
import type {
  CoreInspection,
  Vertex,
  TraversalRunnerIterableConfig,
  TraversalIterableConfigInput,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';

type Event = { phase?: string; kind?: string; vertex: { getData(): string } };
type Runner = {
  iterateEvents(
    config?: unknown,
  ): Generator<Event> | AsyncGenerator<Event, void, unknown>;
  run(config?: unknown): unknown;
  inspect(): CoreInspection;
};
const tree = {
  resolveRoot: () => ({ vertexContent: { $data: 'root', $childHints: [] } }),
  resolveChild: (_hint: string) => ({ vertexContent: null }),
};
const graph = {
  ...tree,
  resolveRoot: () => ({ ...tree.resolveRoot(), vertexId: 'root' }),
};
const families = [
  {
    name: 'sync DFS',
    phase: DFS.PRE_ORDER,
    make: () =>
      new DepthFirstTreeTraversal<TestGraph>({ traversableTree: tree }),
  },
  {
    name: 'async DFS',
    phase: DFS.PRE_ORDER,
    make: () =>
      new AsyncDepthFirstTreeTraversal<TestGraph>({ traversableTree: tree }),
  },
  {
    name: 'sync BFS',
    phase: BFS.LEVEL_ORDER,
    make: () =>
      new BreadthFirstTreeTraversal<TestGraph>({ traversableTree: tree }),
  },
  {
    name: 'async BFS',
    phase: BFS.LEVEL_ORDER,
    make: () =>
      new AsyncBreadthFirstTreeTraversal<TestGraph>({ traversableTree: tree }),
  },
  {
    name: 'sync DAG',
    phase: DAG.ON_WORK_READY,
    make: () => new DagTraversal<TestGraph>({ traversableGraph: graph }),
  },
  {
    name: 'async DAG',
    phase: DAG.ON_WORK_READY,
    make: () => new AsyncDagTraversal<TestGraph>({ traversableGraph: graph }),
  },
];

// Each adapter and callback executes the real public runner. The common harness
// accepts deliberately malformed runtime inputs; compiler cases live separately.
function create(family: typeof families[number], halt = false) {
  const calls: string[] = [];
  const traversal = family.make();
  const phase = family.phase;
  const add = traversal.addVisitorFor.bind(traversal) as (
    phase: string,
    visitor: (
      vertex: Vertex<TestGraph>,
    ) => void | { commands: { commandName: Command.PAUSE_TRAVERSAL }[] },
  ) => unknown;
  add(phase, (vertex) => {
    calls.push(vertex.getData());
    if (halt) return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
    return undefined;
  });
  if (halt)
    add(phase, () => {
      calls.push('continued');
    });
  return { runner: traversal.createRunner() as unknown as Runner, calls };
}
async function events(runner: Runner, config?: unknown) {
  const result: string[] = [];
  for await (const event of runner.iterateEvents(config))
    result.push(event.kind ?? event.phase!);
  return result;
}

describe.each(families)('$name execution selection', (family) => {
  test.each([
    ['all', true],
    [{ include: [] }, false],
    [{ exclude: [] }, true],
  ])(
    'selects callbacks with %j independently of empty emission',
    async (visitorPhases, enabled) => {
      const { runner, calls } = create(family);
      expect(await events(runner, { emitEvents: [], visitorPhases })).toEqual(
        [],
      );
      expect(calls).toEqual(enabled ? ['root'] : []);
    },
  );

  test('public legacy helper results and defaults remain reusable runner inputs', async () => {
    const configs =
      family.phase === DFS.PRE_ORDER
        ? [makeDFS(), defaultDFS]
        : family.phase === BFS.LEVEL_ORDER
        ? [makeBFS(), defaultBFS]
        : [makeDAG(), defaultDAG];
    for (const config of configs) {
      const { runner, calls } = create(family);
      expect(await events(runner, config)).toContain(
        emissionKind(family.phase),
      );
      expect(calls).toEqual(['root']);
    }
  });

  test('includes and excludes actual family phases', async () => {
    for (const [visitorPhases, want] of [
      [{ include: [family.phase] }, ['root']],
      [{ exclude: [family.phase] }, []],
    ] as const) {
      const { runner, calls } = create(family);
      expect(
        await events(runner, {
          emitEvents: [emissionKind(family.phase)],
          visitorPhases,
        }),
      ).toEqual([emissionKind(family.phase)]);
      expect(calls).toEqual(want);
    }
  });

  test('legacy non-null enable wins over contradictory disable', async () => {
    const { runner, calls } = create(family);
    await runner.run({
      enableVisitorFunctionsFor: [family.phase],
      disableVisitorFunctionsFor: [family.phase],
    });
    expect(calls).toEqual(['root']);
  });

  test('emission-only resume retains disabled callbacks and snapshots caller arrays', async () => {
    const { runner, calls } = create(family);
    const include: string[] = [];
    const emit = [emissionKind(family.phase)];
    const iterator = runner.iterateEvents({
      emitEvents: emit,
      visitorPhases: { include },
    });
    expect((await iterator.next()).done).toBe(false);
    include.push(family.phase);
    emit.length = 0;
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [emissionKind(family.phase)],
      visitorPhases: { include: [] },
    });
    await iterator.return(undefined);
    await runner.run({ emitEvents: [] });
    expect(calls).toEqual([]);
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [],
      visitorPhases: { include: [] },
    });
  });

  test('legacy patches retain dormant disable until enable is cleared', async () => {
    const { runner, calls } = create(family, true);
    await runner.run({
      enableVisitorFunctionsFor: [family.phase],
      disableVisitorFunctionsFor: [family.phase],
    });
    await runner.run({ enableVisitorFunctionsFor: null, iterateOver: [] });
    expect(calls).toEqual(['root', 'continued']);
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [],
      visitorPhases: { exclude: [family.phase] },
    });
  });

  test('a disable-only legacy patch retains the prior enable selection', async () => {
    const { runner } = create(family, true);
    await runner.run({ enableVisitorFunctionsFor: [family.phase] });
    await runner.run({ disableVisitorFunctionsFor: [family.phase] });
    expect(runner.inspect().iterableConfig).toMatchObject({
      visitorPhases: { include: [family.phase] },
      enableVisitorFunctionsFor: [family.phase],
      disableVisitorFunctionsFor: [family.phase],
    });
  });

  test('active chains retain admitted selection across a resume patch', async () => {
    const { runner, calls } = create(family, true);
    await runner.run({ emitEvents: [emissionKind(family.phase)] });
    expect(calls).toEqual(['root']);
    expect(runner.inspect().chains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          config: expect.objectContaining({
            emitEvents: [emissionKind(family.phase)],
            visitorPhases: 'all',
          }),
        }),
      ]),
    );
    expect(
      await events(runner, { emitEvents: [], visitorPhases: { include: [] } }),
    ).toEqual([emissionKind(family.phase)]);
    expect(calls).toEqual(['root', 'continued']);
  });

  test.each([
    { emitEvents: ['WRONG_PHASE'] },
    { emitPhases: [] },
    { typo: [] },
    { emitEvents: new Array(1) },
    { iterateOver: ['WRONG_PHASE'] },
    { visitorPhases: { include: ['WRONG_PHASE'] } },
    { visitorPhases: { exclude: ['WRONG_PHASE'] } },
    { enableVisitorFunctionsFor: ['WRONG_PHASE'] },
    { disableVisitorFunctionsFor: ['WRONG_PHASE'] },
    { visitorPhases: { include: [], exclude: [] } },
    { visitorPhases: { include: [], extra: [] } },
    { visitorPhases: [] },
    { visitorPhases: { exclude: undefined } },
    { visitorPhases: {} },
    { visitorPhases: null },
    { visitorPhases: 'none' },
    { visitorPhases: { include: null } },
    { emitEvents: null },
    { emitEvents: [], iterateOver: [] },
    { emitEvents: undefined, iterateOver: undefined },
    null,
    false,
    'invalid',
    [],
    { visitorPhases: 'all', enableVisitorFunctionsFor: null },
    { visitorPhases: 'all', disableVisitorFunctionsFor: [] },
  ])(
    'rejects malformed input before changing configuration: %j',
    async (input) => {
      const { runner, calls } = create(family);
      const before = runner.inspect();
      await expect(
        Promise.resolve().then(() => runner.run(input)),
      ).rejects.toThrow(TypeError);
      expect(runner.inspect().iterableConfig).toEqual(before.iterableConfig);
      expect(calls).toEqual([]);
      await runner.run({ emitEvents: [] });
      expect(calls).toEqual(['root']);
    },
  );

  test('reads and detaches caller option accessors exactly once before execution', async () => {
    const { runner, calls } = create(family);
    let emissionReads = 0;
    let selectionReads = 0;
    let includeReads = 0;
    const input = {
      get emitEvents() {
        emissionReads += 1;
        if (emissionReads > 1) throw new Error('emission reread');
        return [];
      },
      get visitorPhases() {
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
    await runner.run(input);
    expect(calls).toEqual(['root']);
    expect([emissionReads, selectionReads, includeReads]).toEqual([1, 1, 1]);
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [],
      visitorPhases: { include: [family.phase] },
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
    expect(await events(runner, { emitEvents: phases })).toEqual([
      emissionKind(family.phase),
    ]);
    expect(reads).toBe(1);
    expect(calls).toEqual(['root']);
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [emissionKind(family.phase)],
    });
  });

  test('preserves exact caller getter errors and permits a valid retry', async () => {
    const { runner, calls } = create(family);
    const error = { caller: 'options' };
    const before = runner.inspect();
    await expect(
      Promise.resolve().then(() =>
        runner.run({
          get emitEvents() {
            throw error;
          },
        }),
      ),
    ).rejects.toBe(error);
    expect(runner.inspect()).toEqual(before);
    expect(calls).toEqual([]);
    await runner.run({ emitEvents: [] });
    expect(calls).toEqual(['root']);
  });

  test('callback-only and omitted resumes preserve emission selection', async () => {
    const { runner, calls } = create(family, true);
    await runner.run({ emitEvents: [] });
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [],
      visitorPhases: 'all',
    });
    await runner.run({ visitorPhases: { exclude: [] } });
    await runner.run();
    expect(runner.inspect().iterableConfig).toMatchObject({
      emitEvents: [],
      visitorPhases: { exclude: [] },
    });
    expect(calls).toEqual(['root', 'continued']);
  });

  test('unrelated aliases coexist and omitted fields retain defaults', async () => {
    const { runner, calls } = create(family);
    expect(
      await events(runner, {
        iterateOver: [family.phase],
        visitorPhases: { exclude: [] },
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
  const emit = [emissionKind(phase)];
  const exclude = [phase];
  const initial = make({ emitEvents: emit, visitorPhases: { exclude } });
  emit.length = 0;
  exclude.length = 0;
  expect(initial.iterateOver).toEqual([phase]);
  expect(initial.disableVisitorFunctionsFor).toEqual([phase]);
  const patched = make({ emitEvents: [] }, initial);
  expect(patched.iterateOver).toEqual([]);
  expect(patched.disableVisitorFunctionsFor).toEqual([phase]);
  expect(make(undefined, patched)).toEqual(patched);
  const all = make({ visitorPhases: 'all' }, patched);
  expect(all.iterateOver).toEqual([]);
  expect(all.enableVisitorFunctionsFor).toBeNull();
  expect(all.disableVisitorFunctionsFor).toBeNull();
}

test('family config helpers share defaults, detachment, and independent patches', () => {
  checkHelper<DFS>(DFS.PRE_ORDER, makeDFS);
  checkHelper<BFS>(BFS.LEVEL_ORDER, makeBFS);
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
        traversableGraph: graph,
        traversalRunnerInternalObjects: {
          state: new DagTraversalRunnerState<TestGraph>(),
          resolvedGraphsContainer: container,
        },
      };
      return isAsync
        ? new AsyncDagTraversal<TestGraph>(input).createRunner()
        : new DagTraversal<TestGraph>(input).createRunner();
    };
    const runner = make();
    const before = runner.inspect();
    const error = { options: 'getter failed' };
    await expect(
      Promise.resolve().then(async () => {
        await runner.run({
          get emitEvents(): [] {
            throw error;
          },
        });
      }),
    ).rejects.toBe(error);
    expect(runner.inspect()).toEqual(before);
    const competitor = make();
    await competitor.run({ emitEvents: [] });
    expect(competitor.getResolvedGraph().getRoot()?.unref().getData()).toBe(
      'root',
    );
  },
);
