import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import {
  createDagWorkSession,
  createAsyncDagWorkSession,
  type DagWorkBoundary,
  type DagWorkTicket,
} from '../src/traversals/dag-traversal/coordinateDag';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { materializeDagSourceFromRecords, prepareDag } from '../src';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexTypes<string, string>;
const source = {
  resolveRoot: () => ({
    vertexId: 'holder',
    vertexContent: { $data: '', $childHints: ['a', 'b'] },
  }),
  resolveChild: (id: string) => ({
    vertexId: id,
    dependsOn: id === 'b' ? ['a'] : [],
    vertexContent: { $data: id, $childHints: [] },
  }),
};
const options = {
  traversableGraph: source,
  syntheticRoot: true,
  workCompletion: 'externalSettlement' as const,
};
function frontier<ID>(boundary: DagWorkBoundary<ID>) {
  if (boundary.kind !== 'awaitingSettlement') throw Error('Expected work');
  return boundary.frontier;
}

for (const async of [false, true]) {
  const label = async ? 'async' : 'sync';
  const create = (input = options) =>
    async
      ? createAsyncDagWorkSession(
          new AsyncDagTraversal<G, G, string>(input).createRunner(),
        )
      : createDagWorkSession(new DagTraversal<G, G, string>(input).createRunner());

  test(`${label} observes work and accepts repeated completions without advancing it`, async () => {
    const coordinator = create();
    expect(coordinator.summary().counts.discovered).toBe(0);
    const ticket = frontier(await coordinator.advance())[0]!;
    expect(ticket.vertexId).toBe('a');
    const repeated = frontier(await coordinator.advance())[0]!;
    expect(coordinator.complete(ticket)).toEqual({ kind: 'accepted' });
    expect(coordinator.complete(repeated)).toEqual({ kind: 'alreadyAccepted' });
    expect(coordinator.summary().deferredIds).toEqual([]);
    const second = frontier(await coordinator.advance())[0]!;
    expect(second.vertexId).toBe('b');
    expect(coordinator.complete(second)).toEqual({ kind: 'accepted' });
    expect(await coordinator.advance()).toEqual({ kind: 'finished' });
    expect(await coordinator.advance()).toEqual({ kind: 'finished' });
    expect(coordinator.complete(ticket)).toEqual({ kind: 'alreadyAccepted' });
  });

  test(`${label} rejects foreign and forged tickets without consuming work`, async () => {
    const first = create();
    const second = create();
    const ticket = frontier(await first.advance())[0]!;
    await second.advance();
    for (const forged of [ticket, { ...ticket }, null, 0]) {
      expect(() => second.complete(forged as DagWorkTicket<string>)).toThrow(
        TypeError,
      );
      expect(() =>
        second.failTraversal(forged as DagWorkTicket<string>, null),
      ).toThrow(TypeError);
    }
    expect(second.summary().deferredIds).toEqual(['a']);
    expect(first.complete(ticket)).toEqual({ kind: 'accepted' });
    expect(() => first.failTraversal(ticket, null)).toThrow(/Conflicting/);
  });

  test.each([undefined, null, NaN, { reason: 'failed' }])(
    `${label} preserves exact fatal errors and repeated failure acceptance: %p`,
    async (error) => {
      const coordinator = create();
      const ticket = frontier(await coordinator.advance())[0]!;
      expect(coordinator.failTraversal(ticket, error)).toEqual({
        kind: 'accepted',
      });
      expect(coordinator.failTraversal(ticket, error)).toEqual({
        kind: 'alreadyAccepted',
      });
      expect(() => coordinator.complete(ticket)).toThrow(/Conflicting/);
      expect(() => coordinator.failTraversal(ticket, {})).toThrow(
        /Conflicting/,
      );
      await expect(async () => coordinator.advance()).rejects.toBe(error);
      await expect(async () => coordinator.advance()).rejects.toBe(error);
    },
  );

  test(`${label} exposes detached summaries and empty finished boundaries`, async () => {
    const coordinator = create();
    const before = coordinator.summary();
    await coordinator.advance();
    expect(before.deferredIds).toEqual([]);
    const observed = coordinator.summary();
    (observed.deferredIds as string[]).push('forged');
    (observed.vertices as Map<string, unknown>).clear();
    expect(coordinator.summary().deferredIds).toEqual(['a']);
    expect(coordinator.summary().vertices.size).toBe(2);
    const empty = create({
      ...options,
      traversableGraph: {
        ...source,
        resolveRoot: () => ({
          vertexId: 'holder',
          vertexContent: { $data: '', $childHints: [] },
        }),
      },
    });
    expect(empty.requestPause()).toBe(false);
    expect(await empty.advance()).toEqual({ kind: 'finished' });
    expect(empty.requestPause()).toBe(false);
  });
}

test('wrapping requires external settlement and does not claim or run the runner', () => {
  for (const workCompletion of [undefined, 'visitorReturn'] as const) {
    const input = {
      traversableGraph: source,
      syntheticRoot: true,
      ...(workCompletion === undefined ? {} : { workCompletion }),
    };
    expect(() =>
      createDagWorkSession(new DagTraversal<G>(input).createRunner()),
    ).toThrow(TypeError);
    expect(() =>
      createAsyncDagWorkSession(new AsyncDagTraversal<G>(input).createRunner()),
    ).toThrow(TypeError);
  }
  const runner = new DagTraversal<G, G, string>(options).createRunner();
  const first = createDagWorkSession(runner);
  const second = createDagWorkSession(runner);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.INITIAL);
  runner.prepare();
  const ticket = frontier(first.advance())[0]!;
  expect(() => second.complete(ticket)).toThrow(TypeError);
  const other = frontier(second.advance())[0]!;
  expect(second.complete(other)).toEqual({ kind: 'accepted' });
  expect(first.complete(ticket)).toEqual({ kind: 'alreadyAccepted' });
});

test('sync cooperative pause preserves callback continuation', () => {
  const traversal = new DagTraversal<G, G, string>(options);
  const visited: string[] = [];
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    visited.push(vertex.getData());
    expect(coordinator.requestPause()).toBe(true);
    expect(coordinator.requestPause()).toBe(false);
  });
  const coordinator = createDagWorkSession(traversal.createRunner());
  expect(coordinator.advance()).toEqual({ kind: 'paused' });
  expect(visited).toEqual(['a']);
  expect(frontier(coordinator.advance())[0]!.vertexId).toBe('a');
});

test('async pause drains admitted callbacks and concurrent advance keeps runner ownership', async () => {
  const entered = deferred<void>();
  const release = deferred<void>();
  const traversal = new AsyncDagTraversal<G, G, string>(options);
  traversal.addVisitorFor(Order.ON_READY, async () => {
    entered.resolve();
    await release.promise;
  });
  const coordinator = createAsyncDagWorkSession(traversal.createRunner());
  const advancing = coordinator.advance();
  await entered.promise;
  await expect(coordinator.advance()).rejects.toThrow(/active/);
  expect(coordinator.requestPause()).toBe(true);
  let ended = false;
  void advancing.then(() => {
    ended = true;
  });
  await eventLoopTurn();
  expect(ended).toBe(false);
  release.resolve();
  expect(await advancing).toEqual({ kind: 'paused' });
  expect(frontier(await coordinator.advance())[0]!.vertexId).toBe('a');
});

test('deleted work rejects previously issued tickets as stale', () => {
  const traversal = new DagTraversal<G, G, string>({
    ...options,
    traversableGraph: {
      resolveRoot: () => ({
        vertexId: 'holder',
        vertexContent: { $data: '', $childHints: ['parent', 'gate'] },
      }),
      resolveChild: (id) => ({
        vertexId: id,
        dependsOn: id === 'parent' ? ['gate'] : [],
        vertexContent: {
          $data: id,
          $childHints: id === 'parent' ? ['child'] : [],
        },
      }),
    },
    discovery: 'eager',
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'parent'
      ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
      : undefined,
  );
  const coordinator = createDagWorkSession(traversal.createRunner());
  const tickets = frontier(coordinator.advance());
  const child = tickets.find((ticket) => ticket.vertexId === 'child')!;
  coordinator.complete(tickets.find((ticket) => ticket.vertexId === 'gate')!);
  expect(coordinator.advance()).toEqual({ kind: 'finished' });
  expect(() => coordinator.complete(child)).toThrow(/stale/);
});

for (const async of [false, true]) {
  test.each([undefined, null, NaN, Symbol('id'), { id: 'object' }])(
    `${async ? 'async' : 'sync'} tickets preserve arbitrary ID identity: %p`,
    async (id) => {
      const input = {
        workCompletion: 'externalSettlement' as const,
        traversableGraph: {
          resolveRoot: () => ({
            vertexId: id,
            vertexContent: { $data: 'work', $childHints: [] },
          }),
          resolveChild: () => ({ vertexContent: null }),
        },
      };
      const coordinator = async
        ? createAsyncDagWorkSession(new AsyncDagTraversal<G>(input).createRunner())
        : createDagWorkSession(new DagTraversal<G>(input).createRunner());
      const ticket = frontier(await coordinator.advance())[0]!;
      expect(ticket.vertexId).toBe(id);
      expect(Object.isFrozen(ticket)).toBe(true);
      if (typeof id === 'object' && id !== null)
        expect(Object.isFrozen(id)).toBe(false);
      expect(() => coordinator.complete({ ...ticket })).toThrow(TypeError);
      expect(coordinator.complete(ticket)).toEqual({ kind: 'accepted' });
      expect(await coordinator.advance()).toEqual({ kind: 'finished' });
    },
  );

  test(`${
    async ? 'async' : 'sync'
  } forwards source and callback failures exactly`, async () => {
    const error = { failed: 'callback' };
    for (const fromSource of [true, false]) {
      const input = {
        ...options,
        traversableGraph: {
          ...source,
          resolveRoot: () => {
            if (fromSource) throw error;
            return source.resolveRoot();
          },
        },
      };
      const traversal = async
        ? new AsyncDagTraversal<G>(input)
        : new DagTraversal<G>(input);
      traversal.addVisitorFor(Order.ON_READY, () => {
        throw error;
      });
      const coordinator =
        traversal instanceof AsyncDagTraversal
          ? createAsyncDagWorkSession(traversal.createRunner())
          : createDagWorkSession(traversal.createRunner());
      await expect(async () => coordinator.advance()).rejects.toBe(error);
    }
  });
}

for (const async of [false, true]) {
  test(`${
    async ? 'async' : 'sync'
  } prepared sessions explain blockers without advancing or exposing tickets`, async () => {
    const result = prepareDag(
      materializeDagSourceFromRecords(
        [
          { id: 'a', dependencies: [] as string[] },
          { id: 'b', dependencies: ['a'] },
        ],
        { id: (item) => item.id, dependsOn: (item) => item.dependencies },
      ),
    );
    if (result.kind !== 'valid') throw Error('Expected prepared DAG');
    const session = async
      ? await result.dag.createAsyncWorkSession()
      : result.dag.createWorkSession();
    const before = session.summary();
    expect(session.getStatus()).toBe(TraversalRunnerStatus.HALTED);
    expect(session.getStopReason()).toBe('prepared');
    expect(session.isHalted()).toBe(true);
    expect(session.inspect().status).toBe(TraversalRunnerStatus.HALTED);
    const captured = session.inspectMilestones();
    expect(
      captured.prerequisitesOf({ vertexId: 'b', milestone: 'work' }).milestones,
    ).toContainEqual({ vertexId: 'a', milestone: 'work' });
    expect(session.summary()).toEqual(before);
    const ticket = frontier(await session.advance())[0]!;
    expect(session.getStopReason()).toBe('awaitingSettlement');
    expect(session.isHalted()).toBe(true);
    expect(
      session.inspectMilestones().explain({ vertexId: 'b', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: false });
    session.complete(ticket);
    expect(
      session.inspectMilestones().explain({ vertexId: 'a', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: true });
    expect(
      captured.explain({ vertexId: 'a', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: false });
  });

  test.each([null, undefined, { fatal: true }])(
    `${
      async ? 'async' : 'sync'
    } failTraversal is the sole fatal settlement method: %p`,
    async (error) => {
      const session = async
        ? createAsyncDagWorkSession(
            new AsyncDagTraversal<G, G, string>(options).createRunner(),
          )
        : createDagWorkSession(new DagTraversal<G, G, string>(options).createRunner());
      const ticket = frontier(await session.advance())[0]!;
      expect('fail' in session).toBe(false);
      expect(session.failTraversal(ticket, error)).toEqual({
        kind: 'accepted',
      });
      expect(session.failTraversal(ticket, error)).toEqual({
        kind: 'alreadyAccepted',
      });
      await expect(async () => session.advance()).rejects.toBe(error);
      expect(session.getStatus()).toBe(TraversalRunnerStatus.FAILED);
      expect(session.inspect().status).toBe(TraversalRunnerStatus.FAILED);
    },
  );
}
