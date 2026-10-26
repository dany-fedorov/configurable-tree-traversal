import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import {
  coordinateDag,
  coordinateDagAsync,
  type DagCoordinationBoundary,
  type DagWorkTicket,
} from '../src/traversals/dag-traversal/coordinateDag';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { graphFrom, prepareDag } from '../src';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = TreeTypeParameters<string, string>;
const source = {
  makeRoot: () => ({
    vertexId: 'holder',
    vertexContent: { $data: '', $childHints: ['a', 'b'] },
  }),
  makeVertex: (id: string) => ({
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
function frontier<ID>(boundary: DagCoordinationBoundary<ID>) {
  if (boundary.kind !== 'awaitingSettlement') throw Error('Expected work');
  return boundary.frontier;
}

for (const async of [false, true]) {
  const label = async ? 'async' : 'sync';
  const create = (input = options) =>
    async
      ? coordinateDagAsync(
          new AsyncDagTraversal<G, G, string>(input).makeRunner(),
        )
      : coordinateDag(new DagTraversal<G, G, string>(input).makeRunner());

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
        makeRoot: () => ({
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
      coordinateDag(new DagTraversal<G>(input).makeRunner()),
    ).toThrow(TypeError);
    expect(() =>
      coordinateDagAsync(new AsyncDagTraversal<G>(input).makeRunner()),
    ).toThrow(TypeError);
  }
  const runner = new DagTraversal<G, G, string>(options).makeRunner();
  const first = coordinateDag(runner);
  const second = coordinateDag(runner);
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
  const coordinator = coordinateDag(traversal.makeRunner());
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
  const coordinator = coordinateDagAsync(traversal.makeRunner());
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
      makeRoot: () => ({
        vertexId: 'holder',
        vertexContent: { $data: '', $childHints: ['parent', 'gate'] },
      }),
      makeVertex: (id) => ({
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
  const coordinator = coordinateDag(traversal.makeRunner());
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
          makeRoot: () => ({
            vertexId: id,
            vertexContent: { $data: 'work', $childHints: [] },
          }),
          makeVertex: () => ({ vertexContent: null }),
        },
      };
      const coordinator = async
        ? coordinateDagAsync(new AsyncDagTraversal<G>(input).makeRunner())
        : coordinateDag(new DagTraversal<G>(input).makeRunner());
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
          makeRoot: () => {
            if (fromSource) throw error;
            return source.makeRoot();
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
          ? coordinateDagAsync(traversal.makeRunner())
          : coordinateDag(traversal.makeRunner());
      await expect(async () => coordinator.advance()).rejects.toBe(error);
    }
  });
}

for (const async of [false, true]) {
  test(`${
    async ? 'async' : 'sync'
  } prepared sessions explain blockers without advancing or exposing tickets`, async () => {
    const result = prepareDag(
      graphFrom(
        [
          { id: 'a', dependencies: [] as string[] },
          { id: 'b', dependencies: ['a'] },
        ],
        { id: (item) => item.id, dependencies: (item) => item.dependencies },
      ),
    );
    if (result.kind !== 'valid') throw Error('Expected prepared DAG');
    const session = async
      ? await result.dag.createAsyncSession()
      : result.dag.createSession();
    const before = session.summary();
    expect(session.getStatus()).toBe(TraversalRunnerStatus.HALTED);
    expect(session.getStopReason()).toBe('prepared');
    expect(session.isHalted()).toBe(true);
    expect(session.inspect().status).toBe(TraversalRunnerStatus.HALTED);
    const captured = session.inspectDag();
    expect(
      captured.prerequisitesOf({ vertexId: 'b', milestone: 'work' }).milestones,
    ).toContainEqual({ vertexId: 'a', milestone: 'work' });
    expect(session.summary()).toEqual(before);
    const ticket = frontier(await session.advance())[0]!;
    expect(session.getStopReason()).toBe('awaitingSettlement');
    expect(session.isHalted()).toBe(true);
    expect(
      session.inspectDag().explain({ vertexId: 'b', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: false });
    session.complete(ticket);
    expect(
      session.inspectDag().explain({ vertexId: 'a', milestone: 'work' }),
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
        ? coordinateDagAsync(
            new AsyncDagTraversal<G, G, string>(options).makeRunner(),
          )
        : coordinateDag(new DagTraversal<G, G, string>(options).makeRunner());
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
