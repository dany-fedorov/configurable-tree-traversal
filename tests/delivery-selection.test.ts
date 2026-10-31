import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  AsyncGraphWalk,
  BreadthFirstPhase,
  DagTraversal,
  DagVisitorPhase,
  DepthFirstPhase,
  GraphWalk,
  TraversalRunnerStatus,
  type VertexTypes,
  type VertexView,
} from '../src';
import { deferred } from './helpers/graph-fixtures';
import { idGraph } from './helpers/graph-walk-fixtures';

type Data = VertexTypes<string, string>;
const tree = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: 'root', $childHints: [] },
    },
  }),
  resolveChild: () => ({ kind: 'omitted' as const }),
};
const graph = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'root',
      vertexContent: { $data: 'root', $childHints: [] },
    },
  }),
  resolveChild: () => ({
    identity: null,
    kind: 'omitted' as const,
    satisfiesDependencies: true as const,
  }),
};
const families = [
  {
    name: 'DFS',
    phase: DepthFirstPhase.PRE_ORDER,
    kind: DepthFirstPhase.PRE_ORDER,
    make: () =>
      new AsyncDepthFirstTreeTraversal<Data>({ traversableTree: tree }),
  },
  {
    name: 'BFS',
    phase: BreadthFirstPhase.LEVEL_ORDER,
    kind: BreadthFirstPhase.LEVEL_ORDER,
    make: () =>
      new AsyncBreadthFirstTreeTraversal<Data>({ traversableTree: tree }),
  },
  {
    name: 'DAG',
    phase: DagVisitorPhase.ON_WORK_READY,
    kind: 'workCompleted',
    make: () => new AsyncDagTraversal<Data>({ traversableGraph: graph }),
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
      const add = traversal.addVisitorFor.bind(traversal) as (
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
      const runner = traversal.createRunner();
      // Family fixtures deliberately share a runtime harness; public type cases are separate.
      const iterate = runner.iterateEvents.bind(runner) as (config?: {
        emitEvents?: readonly string[];
        visitorPhases?: { include: readonly string[] };
      }) => AsyncGenerator<{ phase?: string; kind?: string }>;
      const iterator = iterate({
        emitEvents: selectedInitially ? [family.kind] : [],
      });
      const pending = iterator.next();
      await started.promise;
      const closed = iterator.return(undefined);
      finish.resolve();
      expect(await closed).toEqual({ done: true, value: undefined });
      expect(await pending).toEqual({ done: true, value: undefined });
      expect(runner.getStopReason()).toBe('paused');
      expect(runner.inspect().bufferedEventCount).toBe(1);
      expect(calls).toEqual(['start', 'drained']);
      if ('summary' in runner)
        expect(runner.summary().completedWorkIds).toEqual(['root']);
      const delivered: string[] = [];
      for await (const event of iterate({
        emitEvents: selectedInitially ? [] : [family.kind],
        visitorPhases: { include: [] },
      }))
        delivered.push(event.kind ?? event.phase!);
      expect(delivered).toEqual(selectedInitially ? [] : [family.kind]);
      expect(calls).toEqual(['start', 'drained']);
      expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
      expect(runner.getStopReason()).toBe('finished');
      expect(await iterate().next()).toEqual({ done: true, value: undefined });
    },
  );
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([
    { emitEvents: [] },
    { emitEvents: ['workCompleted'] },
    { emitEvents: ['subgraphCompleted'] },
  ] as const)(
    `${Constructor.name} settles under empty admission selection and delivers %j`,
    async ({ emitEvents }) => {
      const calls: string[] = [];
      const traversal = new Constructor<Data>({
        traversableGraph: graph,
        workCompletion: 'externalSettlement',
      });
      traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => {
        calls.push('work');
      });
      traversal.addVisitorFor(DagVisitorPhase.ON_SUBGRAPH_READY, () => {
        calls.push('complete');
      });
      const runner = traversal.createRunner();
      await runner.run({
        emitEvents: [],
        visitorPhases: { include: [DagVisitorPhase.ON_WORK_READY] },
      });
      expect(runner.getStopReason()).toBe('awaitingSettlement');
      const ticket = runner.summary().awaitingSettlement[0]!;
      expect(
        runner.settle(
          ticket.vertexId,
          { kind: 'workCompleted' },
          ticket.generation,
        ),
      ).toBe(true);
      expect(
        runner.settle(
          ticket.vertexId,
          { kind: 'workCompleted' },
          ticket.generation,
        ),
      ).toBe(false);
      const delivered: string[] = [];
      for await (const event of runner.iterateEvents({ emitEvents }))
        delivered.push(event.kind);
      expect(delivered).toEqual(emitEvents);
      expect(calls).toEqual(['work']);
      expect(runner.summary().completedWorkIds).toEqual(['root']);
      expect(runner.getStopReason()).toBe('finished');
      await runner.run({ emitEvents: ['workCompleted', 'subgraphCompleted'] });
      expect(calls).toEqual(['work']);
    },
  );
}

for (const Constructor of [GraphWalk, AsyncGraphWalk]) {
  test(`${Constructor.name} keeps delivery selection with paused and limited execution`, async () => {
    let calls = 0;
    const traversal = new Constructor({
      source: idGraph(
        ['root'],
        [
          ['root', ['child']],
          ['child', []],
        ],
      ),
      limits: { maxDepth: 0 },
    });
    const { GraphWalkPhase } = await import('../src');
    traversal.addVisitorFor(GraphWalkPhase.VERTEX, () => {
      calls++;
    });
    const runner = traversal.createRunner();
    const first = runner.iterateEvents();
    expect((await first.next()).value).toMatchObject({ kind: 'vertex' });
    await first.return();
    expect(runner.getStopReason()).toBe('paused');
    const delivered: string[] = [];
    for await (const event of runner.iterateEvents({ emitEvents: ['path'] }))
      delivered.push(event.kind);
    expect(delivered).toEqual(['path']);
    expect(calls).toBe(1);
    expect(runner.summary().outcome).toMatchObject({ kind: 'limited' });
    expect(runner.getStopReason()).toBe('finished');
  });
}
