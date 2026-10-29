import { AsyncGraphWalk, GraphWalk, GraphWalkPhase as Phase } from '../src';

it.each([
  {},
  { hydration: 'resolver' },
  { hydration: 'unknown', resolveVertex: () => ({ kind: 'omitted' }) },
  { hydration: 'inlineOrCached', resolveVertex: () => ({ kind: 'omitted' }) },
])('rejects invalid hydration declarations before discovery %#', (mode) => {
  const roots = jest.fn(() => []);
  const source = { roots, outgoing: () => [], ...mode } as any;
  expect(() => new GraphWalk({ source })).toThrow(TypeError);
  expect(() => new AsyncGraphWalk({ source })).toThrow(TypeError);
  expect(roots).not.toHaveBeenCalled();
});

it.each(['sync', 'async'] as const)(
  'admits cached self/backedges and first inline omissions (%s)',
  async (execution) => {
    const root = {};
    const omitted = Symbol('omitted');
    const source = {
      hydration: 'inlineOrCached',
      roots: () => [
        {
          kind: 'inline',
          vertexId: root,
          resolution: { kind: 'found', data: 'root' },
        },
      ],
      outgoing: () => [
        { target: { kind: 'cached', vertexId: root }, data: 'self' },
        {
          target: {
            kind: 'inline',
            vertexId: omitted,
            resolution: { kind: 'omitted' },
          },
          data: 'omit',
        },
        {
          target: {
            kind: 'inline',
            vertexId: omitted,
            get resolution() {
              throw new Error('must keep first');
            },
          },
          data: 'again',
        },
        {
          target: { kind: 'cached', vertexId: omitted },
          data: 'cached omission',
        },
      ],
    } as any;
    const runner =
      execution === 'sync'
        ? new GraphWalk({ source }).createRunner()
        : new AsyncGraphWalk({ source }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents({
      emitEvents: [Phase.EDGE],
    }))
      events.push(event);
    expect(
      events.map((event) =>
        event.kind === 'edge' ? event.target.kind : event.kind,
      ),
    ).toEqual(['found', 'omitted', 'omitted', 'omitted']);
    expect(runner.summary().counts).toMatchObject({
      uniqueFoundVertices: 1,
      uniqueOmittedVertices: 1,
    });
  },
);

it.each(['sync', 'async'] as const)(
  'rejects first-use cached targets at admission and ignores rejected inline links (%s)',
  async (execution) => {
    const source = {
      hydration: 'inlineOrCached',
      roots: () => [
        {
          kind: 'inline',
          vertexId: 'a',
          resolution: { kind: 'found', data: 'a' },
        },
      ],
      outgoing: () => [
        {
          target: {
            kind: 'inline',
            vertexId: 'b',
            resolution: { kind: 'found', data: 'rejected' },
          },
          data: 'reject',
        },
        { target: { kind: 'cached', vertexId: 'b' }, data: 'accept' },
      ],
    } as any;
    const options = {
      source,
      shouldFollowEdge: (edge: { data: unknown }) => edge.data !== 'reject',
    };
    const runner =
      execution === 'sync'
        ? new GraphWalk(options).createRunner()
        : new AsyncGraphWalk(options).createRunner();
    await expect(
      (async () => {
        for await (const event of runner.iterateEvents()) void event;
      })(),
    ).rejects.toThrow('Cached walking target has no admitted resolution');
    expect(runner.summary().counts.uniqueFoundVertices).toBe(1);
  },
);

it('awaits async resolver roots and links without eagerly resolving inline targets', async () => {
  const resolveVertex = jest.fn(async (vertexId: string) => ({
    kind: 'found',
    data: vertexId,
  }));
  const runner = new AsyncGraphWalk({
    source: {
      hydration: 'resolver',
      roots: async () =>
        (async function* () {
          yield {
            vertexId: 'a',
            resolution: { kind: 'found', data: 'inline' },
          };
        })(),
      resolveVertex,
      outgoing: async (vertex: { vertexId: string }) =>
        (async function* () {
          if (vertex.vertexId === 'a')
            yield { target: { vertexId: 'b' }, data: null };
        })(),
    } as any,
  }).createRunner();
  expect(resolveVertex).not.toHaveBeenCalled();
  await runner.run();
  expect(resolveVertex).toHaveBeenCalledTimes(1);
  expect(resolveVertex).toHaveBeenCalledWith('b');
});

it.each(['sync', 'async'] as const)(
  'validates inlineOrCached target tags without accepting legacy targets (%s)',
  async (execution) => {
    for (const target of [
      { vertexId: 'a' },
      { kind: 'other', vertexId: 'a' },
      { kind: 'inline', vertexId: 'a' },
    ]) {
      const source = {
        hydration: 'inlineOrCached',
        roots: () => [target],
        outgoing: () => [],
      } as any;
      const runner =
        execution === 'sync'
          ? new GraphWalk({ source }).createRunner()
          : new AsyncGraphWalk({ source }).createRunner();
      await expect(
        (async () => {
          for await (const event of runner.iterateEvents()) void event;
        })(),
      ).rejects.toThrow(TypeError);
    }
  },
);

it('awaits promised async iterables in inlineOrCached mode and retains backedges', async () => {
  const source = {
    hydration: 'inlineOrCached' as const,
    roots: async () =>
      (async function* () {
        yield {
          kind: 'inline' as const,
          vertexId: 'a',
          resolution: { kind: 'found' as const, data: 'first' },
        };
      })(),
    outgoing: async (vertex: { vertexId: string }) =>
      (async function* () {
        if (vertex.vertexId === 'a')
          yield {
            target: {
              kind: 'inline' as const,
              vertexId: 'b',
              resolution: { kind: 'found' as const, data: 'second' },
            },
            data: 'forward',
          };
        else
          yield {
            target: { kind: 'cached' as const, vertexId: 'a' },
            data: 'back',
          };
      })(),
  };
  const runner = new AsyncGraphWalk({ source }).createRunner();
  const events = [];
  for await (const event of runner.iterateEvents({ emitEvents: [Phase.EDGE] }))
    events.push(event);
  expect(events.map((event) => [event.edge.from, event.edge.to])).toEqual([
    ['a', 'b'],
    ['b', 'a'],
  ]);
  expect(runner.summary().counts.uniqueFoundVertices).toBe(2);
});

it.each(['sync', 'async'] as const)(
  'treats captured undefined resolver fields and getters as no resolver (%s)',
  async (execution) => {
    for (const accessor of [false, true]) {
      let reads = 0;
      const source = {
        hydration: 'inlineOrCached' as const,
        roots: () => [
          {
            kind: 'inline' as const,
            vertexId: 'a',
            resolution: { kind: 'found' as const, data: 'a' },
          },
        ],
        outgoing: () => [
          { target: { kind: 'cached' as const, vertexId: 'a' }, data: null },
        ],
        resolveVertex: undefined,
      };
      if (accessor) {
        Object.defineProperty(source, 'resolveVertex', {
          get() {
            reads++;
            return undefined;
          },
        });
      }
      const factory =
        execution === 'sync'
          ? new GraphWalk({ source })
          : new AsyncGraphWalk({ source });
      const runner = factory.createRunner();
      await runner.run();
      expect(reads).toBe(accessor ? 1 : 0);
      expect(runner.summary().counts.uniqueFoundVertices).toBe(1);
    }
  },
);
