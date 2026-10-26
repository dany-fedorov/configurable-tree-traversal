import { AsyncGraphWalk, GraphWalkPhase as Phase } from '../src';
import type { AsyncGraphWalkSource, GraphWalkPathEvent } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

const policies = ['simplePaths', 'walks'] as const;

it.each(policies)(
  'enumerates async %s diamond prefixes with one resolution/open per identity',
  async (revisit) => {
    const calls: string[] = [];
    const base = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', ['A']],
      ],
    );
    const runner = new AsyncGraphWalk({
      source: {
        async roots() {
          return base.roots();
        },
        async resolveVertex(id) {
          calls.push('resolve:' + id);
          return base.resolveVertex!(id);
        },
        async *outgoing(vertex) {
          calls.push('open:' + vertex.vertexId);
          yield* base.outgoing(vertex);
        },
      },
      revisit,
      limits: { maxDepth: 3 },
      followEdge: async (_edge, context) =>
        context.revisit === revisit && context.path.depth < 3,
      expandVertex: async (_vertex, context) =>
        context.revisit === revisit && context.path.depth >= 0,
    }).makeRunner();
    const paths: string[] = [];
    for await (const path of runner.getIterable({ emitPhases: [Phase.PATH] }))
      paths.push(path.vertices.map((v) => v.vertexId).join(''));
    expect(paths).toEqual(
      revisit === 'simplePaths'
        ? ['A', 'AB', 'AC', 'ABD', 'ACD']
        : ['A', 'AB', 'AC', 'ABD', 'ACD', 'ABDA', 'ACDA'],
    );
    expect(calls).toEqual([
      'resolve:A',
      'open:A',
      'resolve:B',
      'resolve:C',
      'open:B',
      'resolve:D',
      'open:C',
      'open:D',
    ]);
    expect(runner.summary().counts).toMatchObject({
      foundVertices: 4,
      observedLinks: 5,
      steps: 13,
    });
  },
);

it.each(policies)(
  'retains a partially consumed async adjacency across pause and reuses it for another %s prefix',
  async (revisit) => {
    // DFS reaches D twice while its first adjacency frame is suspended. The
    // nested occurrence must replay D->B then physically pull D->E exactly once.
    const adjacency = new Map([
      ['A', ['D']],
      ['D', ['B', 'E']],
      ['B', ['D']],
      ['E', []],
    ]);
    const trace: string[] = [];
    const source: AsyncGraphWalkSource<string, undefined, string> = {
      roots: async function* () {
        yield { vertexId: 'A' };
      },
      async resolveVertex(vertexId) {
        trace.push('resolve:' + vertexId);
        return { kind: 'found', data: vertexId };
      },
      async *outgoing(vertex) {
        trace.push('open:' + vertex.vertexId);
        try {
          for (const vertexId of adjacency.get(vertex.vertexId)!) {
            trace.push(vertex.vertexId + '>' + vertexId);
            yield { target: { vertexId }, data: undefined };
          }
        } finally {
          trace.push('done:' + vertex.vertexId);
        }
      },
    };
    const runner = new AsyncGraphWalk({
      source,
      strategy: 'depthFirst',
      revisit,
      limits: { maxDepth: 5 },
    }).makeRunner();
    const first = runner.getIterable({ emitPhases: [Phase.PATH] });
    const before: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await first.next();
      if (result.done) throw new Error('Expected prefix');
      before.push(result.value.vertices.map((v) => v.vertexId).join(''));
    }
    expect(before).toEqual(['A', 'AD', 'ADB']);
    await first.return();
    expect(trace).toEqual([
      'resolve:A',
      'open:A',
      'A>D',
      'resolve:D',
      'open:D',
      'D>B',
      'resolve:B',
    ]);
    expect(runner.inspect().openSourceIteratorCount).toBe(3);
    const rest: string[] = [];
    for await (const path of runner.getIterable({ emitPhases: [Phase.PATH] }))
      rest.push(path.vertices.map((v) => v.vertexId).join(''));
    expect(rest).toEqual(
      revisit === 'simplePaths'
        ? ['ADE']
        : ['ADBD', 'ADBDB', 'ADBDBD', 'ADBDE', 'ADE'],
    );
    expect(trace.filter((entry) => entry.startsWith('resolve:'))).toEqual([
      'resolve:A',
      'resolve:D',
      'resolve:B',
      'resolve:E',
    ]);
    expect(trace.filter((entry) => entry.startsWith('open:'))).toEqual([
      'open:A',
      'open:D',
      'open:B',
      'open:E',
    ]);
    expect(trace.filter((entry) => entry.includes('>'))).toEqual([
      'A>D',
      'D>B',
      'B>D',
      'D>E',
    ]);
    expect(runner.summary().counts).toMatchObject({
      foundVertices: 4,
      observedLinks: 4,
    });
    expect(runner.inspect().openSourceIteratorCount).toBe(0);
  },
);

it.each(policies)(
  'reuses shared async adjacency after pause for every queued %s prefix',
  async (revisit) => {
    const trace: string[] = [];
    const adjacency = new Map([
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', ['D']],
      ['D', ['E', 'F']],
      ['E', []],
      ['F', []],
    ]);
    const runner = new AsyncGraphWalk({
      source: {
        roots: () => [{ vertexId: 'A' }],
        async resolveVertex(id: string) {
          trace.push('resolve:' + id);
          return { kind: 'found' as const, data: id };
        },
        async *outgoing(vertex) {
          trace.push('open:' + vertex.vertexId);
          for (const id of adjacency.get(vertex.vertexId)!) {
            trace.push(vertex.vertexId + '>' + id);
            yield { target: { vertexId: id }, data: undefined };
          }
        },
      },
      revisit,
      limits: { maxDepth: 4 },
    }).makeRunner();
    const first = runner.getIterable({ emitPhases: [Phase.PATH] });
    const paths: GraphWalkPathEvent<string, undefined, string>[] = [];
    for (let i = 0; i < 6; i++) {
      const next = await first.next();
      if (next.done) throw new Error('Expected path');
      paths.push(next.value);
    }
    expect(
      paths.map((path) => path.vertices.map((v) => v.vertexId).join('')),
    ).toEqual(['A', 'AB', 'AC', 'ABD', 'ACD', 'ABDE']);
    await first.return();
    expect(trace.filter((entry) => entry.startsWith('D>'))).toEqual(['D>E']);
    expect(runner.inspect().openSourceIteratorCount).toBe(1);
    const rest: string[] = [];
    for await (const path of runner.getIterable({ emitPhases: [Phase.PATH] }))
      rest.push(path.vertices.map((v) => v.vertexId).join(''));
    expect(rest).toEqual(['ABDF', 'ACDE', 'ACDF']);
    expect(trace.filter((entry) => entry.startsWith('D>'))).toEqual([
      'D>E',
      'D>F',
    ]);
    expect(trace.filter((entry) => entry.startsWith('open:'))).toEqual([
      'open:A',
      'open:B',
      'open:C',
      'open:D',
      'open:E',
      'open:F',
    ]);
    expect(runner.summary()).toMatchObject({
      counts: { foundVertices: 6, observedLinks: 6, occurrences: 9, steps: 19 },
      outcome: { kind: 'exhausted' },
    });
  },
);

it('closes each physical async iterator once after cached replay hits its step limit', async () => {
  const trace: string[] = [];
  const runner = new AsyncGraphWalk({
    source: {
      roots: async function* () {
        try {
          yield {
            vertexId: 'A',
            resolution: { kind: 'found' as const, data: 'A' },
          };
        } finally {
          trace.push('close:roots');
        }
      },
      outgoing: async function* () {
        try {
          trace.push('pull:A');
          yield { target: { vertexId: 'A' }, data: undefined };
          trace.push('unexpected second pull');
        } finally {
          trace.push('close:A');
        }
      },
    },
    strategy: 'depthFirst',
    revisit: 'walks',
    limits: { maxSteps: 3 },
  }).makeRunner();
  const iterator = runner.getIterable({ emitPhases: [Phase.PATH] });
  const paths: string[] = [];
  for (let i = 0; i < 3; i++) {
    const next = await iterator.next();
    if (next.done) throw new Error('Expected path');
    paths.push(next.value.vertices.map((v) => v.vertexId).join(''));
  }
  expect(paths).toEqual(['A', 'AA', 'AAA']);
  expect(runner.inspect().openSourceIteratorCount).toBe(2);
  expect(trace).toEqual(['pull:A']);
  expect((await iterator.next()).done).toBe(true);
  await runner.close();
  expect(trace).toEqual(['pull:A', 'close:A', 'close:roots']);
  expect(runner.inspect().openSourceIteratorCount).toBe(0);
  expect(runner.summary()).toMatchObject({
    counts: { steps: 3, occurrences: 3, foundVertices: 1, observedLinks: 1 },
    outcome: { kind: 'limited', reasons: ['maxSteps'] },
  });
});

it.each(policies)(
  'validates async %s bounds atomically before source I/O',
  async (revisit) => {
    const source = idGraph(['A'], [['A', ['A']]]);
    // @ts-expect-error Runtime callers must also provide a route exploration bound.
    expect(() => new AsyncGraphWalk({ source, revisit })).toThrow(TypeError);
    const factory = new AsyncGraphWalk({ source });
    expect(() => factory.configure({ revisit })).toThrow(TypeError);
    expect((await factory.makeRunner().run()).summary().outcome).toEqual({
      kind: 'exhausted',
    });
    factory.configure({ limits: { maxDepth: 1 } }).configure({ revisit });
    expect(() => factory.configure({ limits: { maxOccurrences: 5 } })).toThrow(
      TypeError,
    );
    const runner = await factory.makeRunner().run();
    expect(runner.summary().counts.occurrences).toBe(
      revisit === 'walks' ? 2 : 1,
    );
  },
);

it.each(policies)(
  'keeps async %s admission and I/O independent of selectors at an occurrence limit',
  async (revisit) => {
    const results = [];
    for (const emitPhases of [
      [],
      [Phase.PATH],
      [Phase.VERTEX, Phase.EDGE],
      [Phase.EDGE, Phase.PATH],
    ]) {
      const calls: string[] = [];
      const source = idGraph(
        ['A'],
        [
          ['A', ['B', 'B']],
          ['B', ['A']],
        ],
      );
      const runner = new AsyncGraphWalk({
        source: {
          ...source,
          async resolveVertex(id) {
            calls.push('resolve:' + id);
            return source.resolveVertex!(id);
          },
          async *outgoing(vertex) {
            calls.push('open:' + vertex.vertexId);
            yield* source.outgoing(vertex);
          },
        },
        revisit,
        limits: { maxDepth: 4, maxOccurrences: 3 },
      }).makeRunner();
      for await (const event of runner.getIterable({ emitPhases }))
        expect(emitPhases).toContain(event.kind);
      results.push({ summary: runner.summary(), calls });
    }
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]).toMatchObject({
      summary: {
        counts: {
          steps: 4,
          occurrences: 3,
          foundVertices: 2,
          observedLinks: 2,
        },
        outcome: { kind: 'limited', reasons: ['maxOccurrences'] },
      },
      calls: ['resolve:A', 'open:A', 'resolve:B'],
    });
  },
);

it.each(policies)(
  'performs no async source I/O at zero %s global bounds',
  async (revisit) => {
    for (const limits of [
      { maxSteps: 0 },
      { maxDepth: 2, maxOccurrences: 0 },
    ]) {
      const calls: string[] = [];
      const runner = await new AsyncGraphWalk({
        source: {
          async roots() {
            calls.push('roots');
            return [];
          },
          outgoing: () => [],
        },
        revisit,
        limits,
      })
        .makeRunner()
        .run();
      expect(calls).toEqual([]);
      expect(runner.summary().counts).toMatchObject({
        steps: 0,
        occurrences: 0,
      });
    }
  },
);

it.each(policies)(
  'bounds filtered async %s links and awaits partial-stream cleanup',
  async (revisit) => {
    const calls: string[] = [];
    const runner = await new AsyncGraphWalk({
      source: {
        roots: () => [
          { vertexId: 'A', resolution: { kind: 'found' as const, data: 'A' } },
        ],
        async *outgoing() {
          try {
            for (const vertexId of ['B', 'C', 'D']) {
              calls.push(vertexId);
              yield { target: { vertexId }, data: undefined };
            }
          } finally {
            await Promise.resolve();
            calls.push('closed');
          }
        },
      },
      revisit,
      limits: { maxSteps: 4 },
      followEdge: async () => false,
    })
      .makeRunner()
      .run();
    expect(calls).toEqual(['B', 'C', 'closed']);
    expect(runner.summary()).toMatchObject({
      counts: { steps: 4, occurrences: 1, foundVertices: 1, observedLinks: 2 },
      outcome: { kind: 'limited', reasons: ['maxSteps'] },
    });
    expect(runner.inspect().openSourceIteratorCount).toBe(0);
  },
);
