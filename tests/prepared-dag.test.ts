import { DagDiscoveryCycleError as SubpathCycleError } from '../src/traversals/dag-traversal';
import { DagDiscoveryCycleError } from '../src';
import {
  prepareDag,
  prepareDagAsync,
} from '../src/traversals/dag-traversal/prepareDag';
import { DagTraversalStallError } from '../src/core/errors/DagTraversalStallError';
import type { TraversableGraph } from '../src/core/TraversableGraph';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { graphFrom, forestFrom } from '../src/sources';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';

type T = TreeTypeParameters<{ name: string }, string>;

function source(calls: string[] = []): TraversableGraph<T, T, string> {
  return {
    makeRoot: () => {
      calls.push('root');
      return {
        kind: 'found',
        vertex: {
          vertexId: 'a',
          vertexContent: { $data: { name: 'a' }, $childHints: ['b'] },
        },
      };
    },
    makeVertex: (id) => {
      calls.push(id);
      return {
        kind: 'found',
        vertex: {
          vertexId: id,
          dependsOn: ['a'],
          vertexContent: { $data: { name: id }, $childHints: [] },
        },
      };
    },
  };
}

test('a prepared topology starts independent seeded runners without source I/O', () => {
  const calls: string[] = [];
  const result = prepareDag({ traversableGraph: source(calls) });
  if (result.kind !== 'valid') throw new Error('Expected valid DAG');
  expect(calls).toEqual(['root', 'b']);
  const visited: string[] = [];
  const first = result.dag.createRunner({
    visitors: {
      [Order.ON_READY]: (vertex) => {
        visited.push(vertex.getData().name);
      },
    },
  });
  const second = result.dag.createRunner({ completedWork: new Set(['a']) });
  expect(visited).toEqual([]);
  expect(first.getStopReason()).toBe('prepared');
  expect(first.getResolvedGraph().getRoot()).not.toBe(
    second.getResolvedGraph().getRoot(),
  );
  first.run();
  expect(second.summary().completedWorkIds).toEqual(['a']);
  expect(visited).toEqual(['a', 'b']);
  expect(
    [...second.getIterable()]
      .filter((event) => event.kind === 'workCompleted')
      .map((event) => event.vertexId),
  ).toEqual(['b']);
  expect(calls).toEqual(['root', 'b']);
  expect(
    result.dag.vertices.map((vertex) => [vertex.vertexId, vertex.children]),
  ).toEqual([
    ['a', ['b']],
    ['b', []],
  ]);
});

test('async preparation supports both sync and async independent sessions', async () => {
  const calls: string[] = [];
  const adapter = source(calls);
  const result = await prepareDagAsync({
    traversableGraph: {
      ...adapter,
      makeRoot: async () => adapter.makeRoot(),
    },
    concurrency: 2,
  });
  if (result.kind !== 'valid') throw new Error('Expected valid DAG');
  const first = result.dag.createSession();
  const second = await result.dag.createAsyncSession({
    completedWork: new Set(['a']),
  });
  const work = first.advance();
  const other = await second.advance();
  if (work.kind !== 'awaitingSettlement' || other.kind !== 'awaitingSettlement')
    throw new Error('Expected frontier');
  expect(work.frontier.map((ticket) => ticket.vertexId)).toEqual(['a']);
  expect(other.frontier.map((ticket) => ticket.vertexId)).toEqual(['b']);
  expect(() => first.complete(other.frontier[0]!)).toThrow();
  second.complete(other.frontier[0]!);
  expect(await second.advance()).toEqual({ kind: 'finished' });
  expect(first.summary().completedWorkIds).toEqual([]);
  expect(calls).toEqual(['root', 'b']);
});

test('dependency invalidity is structured while adapter errors keep exact identity', async () => {
  const adapter = source();
  const root = adapter.makeRoot();
  if (!('kind' in root) || root.kind !== 'found')
    throw new Error('Expected found');
  root.vertex.dependsOn = ['missing'];
  const invalid = prepareDag({
    traversableGraph: { ...adapter, makeRoot: () => root },
  });
  expect(invalid).toMatchObject({
    kind: 'invalid',
    issues: [
      {
        kind: 'milestone',
        diagnostics: { unknownPrerequisiteIds: ['missing'] },
      },
    ],
  });
  expect(invalid).not.toHaveProperty('diagnostics');
  const error = new DagTraversalStallError({
    dependencies: [],
    unknownPrerequisiteIds: [],
    dependencyCycles: [],
    dependencyBlockedIds: [],
    structurallyIncompleteIds: [],
  });
  expect(() =>
    prepareDag({
      traversableGraph: {
        ...adapter,
        makeRoot: () => {
          throw error;
        },
      },
    }),
  ).toThrow(error);
  await expect(
    prepareDagAsync({
      traversableGraph: {
        ...adapter,
        makeRoot: async () => {
          throw null;
        },
      },
    }),
  ).rejects.toBeNull();
});

for (const prepare of [prepareDag, prepareDagAsync]) {
  test.each([
    undefined,
    null,
    Symbol('caller error'),
    { reason: 'caller error' },
    new DagDiscoveryCycleError(['caller', 'caller']),
    new DagTraversalStallError({
      dependencies: [],
      unknownPrerequisiteIds: [],
      dependencyCycles: [],
      dependencyBlockedIds: [],
      structurallyIncompleteIds: [],
    }),
  ])(`${prepare.name} preserves exact source failures: %p`, async (error) => {
    await expect(async () =>
      prepare<T, string>({
        traversableGraph: {
          ...source(),
          makeRoot: () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  });

  test(`${prepare.name} retains omitted hints and prerequisite identities across seeds`, async () => {
    const adapter: TraversableGraph<T, T, string> = {
      makeRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: 'a',
          vertexContent: { $data: { name: 'a' }, $childHints: ['skip', 'b'] },
        },
      }),
      getVertexIdFromHint: (id) => ({ vertexId: id }),
      makeVertex: (id) =>
        id === 'skip'
          ? { kind: 'omitted', satisfiesDependencies: true }
          : {
              kind: 'found',
              vertex: {
                vertexId: id,
                dependsOn: ['skip', 'external'],
                dependsOnComplete: ['skip'],
                vertexContent: { $data: { name: id }, $childHints: [] },
              },
            },
      resolvePrerequisite: () => ({
        kind: 'omitted',
        satisfiesDependencies: true,
      }),
    };
    const result = await prepare<T, string>({ traversableGraph: adapter });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    const runner = result.dag.createRunner({
      completedWork: new Set(['skip', 'external']),
    });
    expect(runner.summary().unusedCompletedWorkIds).toEqual([]);
    runner.run();
    expect(runner.getStopReason()).toBe('finished');
    expect(result.dag.vertices.map((vertex) => vertex.vertexId)).toEqual([
      'a',
      'b',
    ]);
  });

  test(`${prepare.name} distinguishes empty catalogs and explicitly omitted roots`, async () => {
    for (const explicit of [false, true]) {
      const result = await prepare<T, string>({
        traversableGraph: {
          makeRoot: () => ({
            kind: 'omitted',
            satisfiesDependencies: true,
            ...(explicit ? { vertexId: 'empty' } : {}),
          }),
          makeVertex: () => {
            throw new Error('No children');
          },
        },
      });
      if (result.kind !== 'valid') throw new Error('Expected valid');
      expect(result.dag.vertices).toEqual([]);
      const session = result.dag.createSession(
        explicit ? { completedWork: new Set(['empty']) } : {},
      );
      expect(session.advance()).toEqual({ kind: 'finished' });
    }
    const empty = await prepare<TreeTypeParameters<string, string>, string>(
      graphFrom<string, string>([], { id: (id) => id }),
    );
    if (empty.kind !== 'valid') throw new Error('Expected valid');
    expect(empty.dag.createSession().advance()).toEqual({ kind: 'finished' });
  });

  test(`${prepare.name} returns missing prerequisites as milestone issues`, async () => {
    const missing = await prepare<TreeTypeParameters<string, string>, string>(
      graphFrom(['a'], { id: (id) => id, dependsOn: () => ['absent'] }),
    );
    expect(missing).toMatchObject({
      kind: 'invalid',
      issues: [
        {
          kind: 'milestone',
          diagnostics: { unknownPrerequisiteIds: ['absent'] },
        },
      ],
    });
    expect(missing).not.toHaveProperty('diagnostics');
  });

  test(`${prepare.name} returns dependency cycles as milestone issues`, async () => {
    const cycle = await prepare<TreeTypeParameters<string, string>, string>(
      graphFrom(['a', 'b'], {
        id: (id) => id,
        dependsOn: (id) => [id === 'a' ? 'b' : 'a'],
      }),
    );
    expect(cycle).toMatchObject({
      kind: 'invalid',
      issues: [
        {
          kind: 'milestone',
          diagnostics: {
            dependencyCycles: [expect.arrayContaining(['a', 'b'])],
          },
        },
      ],
    });
    expect(cycle).not.toHaveProperty('diagnostics');
  });
}

test('prepared discovery retains undefined omission IDs and transitive detached prerequisites', async () => {
  type ID = string | undefined;
  type G = TreeTypeParameters<ID, ID>;
  const adapter: TraversableGraph<G, G, ID> = {
    makeRoot: () => ({
      kind: 'found',
      vertex: {
        vertexId: 'root',
        vertexContent: { $data: 'root', $childHints: [undefined, 'work'] },
      },
    }),
    getVertexIdFromHint: (vertexId) => ({ vertexId }),
    makeVertex: (id) =>
      id === undefined
        ? { kind: 'omitted', satisfiesDependencies: true }
        : {
            kind: 'found',
            vertex: {
              vertexId: id,
              dependsOn: [undefined, 'remote'],
              vertexContent: { $data: id, $childHints: [] },
            },
          },
    resolvePrerequisite: (id) => ({
      kind: 'found',
      vertex: {
        vertexId: id,
        dependsOn: id === 'remote' ? ['earlier'] : [],
        vertexContent: { $data: id, $childHints: [] },
      },
    }),
  };
  const original = new DagTraversal({ traversableGraph: adapter })
    .makeRunner()
    .prepare();
  const result = await prepareDagAsync({ traversableGraph: adapter });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner = result.dag.createRunner();
  const events = [...runner.getIterable()].map((event) => [
    event.vertexId,
    event.kind,
  ]);
  expect(events).toEqual(
    [...original.getIterable()].map((event) => [event.vertexId, event.kind]),
  );
  const seeded = result.dag.createRunner({
    completedWork: new Set<ID>([undefined, 'earlier', 'remote']),
  });
  expect(seeded.summary().unusedCompletedWorkIds).toEqual([]);
  expect(
    [...seeded.getIterable()]
      .filter((event) => event.kind === 'workCompleted')
      .map((event) => event.vertexId),
  ).toEqual(['root', 'work']);
  expect(
    runner
      .getResolvedGraph()
      .getParentsOf(runner.getResolvedGraph().getVertexRefById('remote')!),
  ).toEqual([]);
});

test('unidentified omitted children do not become fake prepared identities', () => {
  const adapter: TraversableGraph<T, T, string> = {
    ...source(),
    makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
  };
  const result = prepareDag({ traversableGraph: adapter });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner = result.dag.createRunner().run();
  expect(result.dag.vertices.map((vertex) => vertex.vertexId)).toEqual(['a']);
  expect(runner.summary().counts.discovered).toBe(1);
  expect(runner.getStopReason()).toBe('finished');
});

test('prepared definitions preserve effective implicit work dependencies and root policy', () => {
  const adapter = source();
  const makeVertex: typeof adapter.makeVertex = (id) => ({
    kind: 'found',
    vertex: {
      vertexId: id,
      vertexContent: { $data: { name: id }, $childHints: [] },
    },
  });
  const implicit = prepareDag({
    traversableGraph: { ...adapter, makeVertex },
    implicitParentDependency: true,
  });
  if (implicit.kind !== 'valid') throw new Error('Expected valid');
  expect(implicit.dag.vertices[1]!.dependsOn).toEqual(['a']);
  const session = implicit.dag.createSession();
  const boundary = session.advance();
  if (boundary.kind !== 'awaitingSettlement') throw new Error('Expected work');
  expect(boundary.frontier.map((ticket) => ticket.vertexId)).toEqual(['a']);
  session.complete(boundary.frontier[0]!);
  expect(session.advance()).toMatchObject({ frontier: [{ vertexId: 'b' }] });

  const ignored = prepareDag({
    rootDependencies: 'ignore',
    traversableGraph: {
      ...adapter,
      makeVertex,
      makeRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: 'a',
          dependsOn: ['b'],
          vertexContent: { $data: { name: 'a' }, $childHints: ['b'] },
        },
      }),
    },
  });
  if (ignored.kind !== 'valid') throw new Error('Expected valid');
  const runner = ignored.dag.createRunner();
  expect(
    [...runner.getIterable()]
      .filter((event) => event.kind === 'workCompleted')
      .map((event) => event.vertexId),
  ).toEqual(['a', 'b']);
});

test('prepared forest completion joins retain structural sharing and order', () => {
  type Item = { id: string; children: Item[]; after?: string[] };
  const shared: Item = { id: 'shared', children: [] };
  const roots: Item[] = [
    { id: 'left', children: [shared] },
    { id: 'right', children: [shared] },
    { id: 'review', children: [], after: ['left', 'right'] },
  ];
  const result = prepareDag(
    forestFrom(roots, {
      id: (item) => item.id,
      children: (item) => item.children,
      dependsOnComplete: (item) => item.after ?? [],
    }),
  );
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner = result.dag.createRunner();
  const graph = runner.getResolvedGraph();
  expect(graph.getRoot()).toBeNull();
  expect(
    graph
      .getParentsOf(graph.getVertexRefById('shared')!)!
      .map((ref) => graph.getVertexId(ref)),
  ).toEqual(['left', 'right']);
  const events = [...runner.getIterable()].map((event) => [
    event.vertexId,
    event.kind,
  ]);
  const review = events.findIndex(
    ([id, kind]) => id === 'review' && kind === 'workCompleted',
  );
  expect(
    events.findIndex(
      ([id, kind]) => id === 'left' && kind === 'subgraphCompleted',
    ),
  ).toBeLessThan(review);
  expect(
    events.findIndex(
      ([id, kind]) => id === 'right' && kind === 'subgraphCompleted',
    ),
  ).toBeLessThan(review);
});

test('definition arrays are immutable while arbitrary IDs and data stay shallow', async () => {
  const objectId = { key: 'object' };
  const symbol = Symbol('id');
  const ids: unknown[] = [undefined, null, NaN, objectId, symbol];
  const items = ids.map((id) => ({ id, label: 'original' }));
  const result = prepareDag(graphFrom(items, { id: (item) => item.id }));
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(() => (result.dag.vertices as unknown[]).pop()).toThrow();
  expect(() =>
    (result.dag.vertices[0]!.children as unknown[]).push(symbol),
  ).toThrow();
  expect(Object.isFrozen(objectId)).toBe(false);
  expect(Object.isFrozen(items[0])).toBe(false);
  items[0]!.label = 'updated';
  const first = result.dag.createRunner({ saveNotMutatedResolvedGraph: true });
  const second = await result.dag.createAsyncRunner();
  expect(
    first
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => first.getResolvedGraph().getVertexId(ref)),
  ).toEqual(ids);
  expect(
    second.getResolvedGraph().getVertexRefById(undefined)!.unref().getData(),
  ).toBe(items[0]);
  expect(
    second.getResolvedGraph().getVertexRefById(undefined)!.unref().getData()
      .label,
  ).toBe('updated');
  first.run();
  await second.run();
  expect(first.notMutatedResolvedGraph).not.toBeNull();
});

test('prepared runners reject topology-changing visitor commands independently', () => {
  const result = prepareDag({ traversableGraph: source() });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner = result.dag.createRunner({
    visitors: {
      [Order.ON_READY]: () => ({
        commands: [
          {
            commandName: Command.REWRITE_CHILD_HINTS,
            commandArguments: { newHints: [] },
          },
        ],
      }),
    },
  });
  expect(() => runner.run()).toThrow(/topology/);
  expect(result.dag.createRunner().run().getStopReason()).toBe('finished');
});

test('prepared option boundaries reject overrides including present undefined before callbacks', async () => {
  const calls: string[] = [];
  expect(() =>
    prepareDag({ traversableGraph: source(calls), visitors: undefined } as any),
  ).toThrow(TypeError);
  expect(calls).toEqual([]);
  const result = prepareDag({ traversableGraph: source(calls) });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  for (const field of [
    'traversableGraph',
    'traversableTree',
    'syntheticRoot',
    'discovery',
    'rootDependencies',
    'implicitParentDependency',
    'sortChildrenHints',
    'traversalRunnerInternalObjects',
  ]) {
    expect(() =>
      result.dag.createRunner({ [field]: undefined } as any),
    ).toThrow(TypeError);
    await expect(
      result.dag.createAsyncRunner({ [field]: undefined } as any),
    ).rejects.toThrow(TypeError);
  }
  expect(() =>
    result.dag.createSession({ workCompletion: 'visitorReturn' } as any),
  ).toThrow(TypeError);
  await expect(
    result.dag.createAsyncSession({ visitors: {} } as any),
  ).rejects.toThrow(TypeError);
  expect(() =>
    result.dag.createRunner({ [Symbol('extra')]: true } as any),
  ).toThrow(TypeError);
});

test('source callback failures are never mistaken for validation results', async () => {
  const error = new DagTraversalStallError({
    dependencies: [],
    unknownPrerequisiteIds: [],
    dependencyCycles: [],
    dependencyBlockedIds: [],
    structurallyIncompleteIds: [],
  });
  for (const prepare of [prepareDag, prepareDagAsync]) {
    const adapter = source();
    for (const hook of ['makeVertex', 'getVertexIdFromHint'] as const) {
      await expect(async () =>
        prepare({
          traversableGraph: {
            ...adapter,
            [hook]: () => {
              throw error;
            },
          },
        }),
      ).rejects.toBe(error);
    }
    await expect(async () =>
      prepare({
        traversableGraph: {
          ...adapter,
          makeRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'a',
              dependsOn: ['external'],
              vertexContent: { $data: { name: 'a' }, $childHints: [] },
            },
          }),
          resolvePrerequisite: () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  }
});

test('hint identity may be unknown and default async sessions remain independent', async () => {
  const result = await prepareDagAsync({
    traversableGraph: {
      ...source(),
      getVertexIdFromHint: () => undefined,
    },
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const first = await result.dag.createAsyncSession();
  const second = await result.dag.createAsyncSession();
  expect(await first.advance()).toMatchObject({
    kind: 'awaitingSettlement',
    frontier: [{ vertexId: 'a' }],
  });
  expect(second.summary().deferredFrontier).toEqual([]);
});

for (const prepare of [prepareDag, prepareDagAsync]) {
  test(`${prepare.name} preserves non-enumerable IDs and inherited source fields`, async () => {
    class Entry {
      vertexId!: string;
      constructor(id: string) {
        Object.defineProperty(this, 'vertexId', { value: id });
      }
      get vertexContent() {
        return {
          $data: { name: this.vertexId },
          $childHints: this.vertexId === 'a' ? ['b'] : [],
        };
      }
      get dependsOn() {
        return this.vertexId === 'b' ? ['a'] : [];
      }
      get dependsOnComplete() {
        return [];
      }
    }
    const result = await prepare<T, string>({
      traversableGraph: {
        makeRoot: () => ({ kind: 'found', vertex: new Entry('a') }),
        makeVertex: (id) => ({ kind: 'found', vertex: new Entry(id) }),
      },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    expect(
      result.dag.vertices.map((vertex) => [vertex.vertexId, vertex.dependsOn]),
    ).toEqual([
      ['a', []],
      ['b', ['a']],
    ]);
    expect(
      result.dag
        .createRunner({ completedWork: new Set(['a']) })
        .run()
        .summary().completedWorkIds,
    ).toEqual(['a', 'b']);
  });

  test(`${prepare.name} preserves omission order with own and hint-supplied IDs`, async () => {
    for (const hintSupplied of [false, true]) {
      const adapter: TraversableGraph<T, T, string> = {
        makeRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: 'root',
            vertexContent: {
              $data: { name: 'root' },
              $childHints: ['skip', 'b', 'c'],
            },
          },
        }),
        ...(hintSupplied
          ? { getVertexIdFromHint: (id: string) => ({ vertexId: id }) }
          : {}),
        makeVertex: (id) =>
          id === 'skip'
            ? {
                kind: 'omitted',
                satisfiesDependencies: true,
                ...(hintSupplied ? {} : { vertexId: id }),
              }
            : {
                kind: 'found',
                vertex: {
                  vertexId: id,
                  dependsOn: id === 'b' ? ['skip'] : [],
                  vertexContent: { $data: { name: id }, $childHints: [] },
                },
              },
      };
      const original = new DagTraversal({ traversableGraph: adapter })
        .makeRunner()
        .prepare();
      const result = await prepare<T, string>({ traversableGraph: adapter });
      if (result.kind !== 'valid') throw new Error('Expected valid');
      const replay = result.dag.createRunner();
      const events = [...replay.getIterable()].map((event) => [
        event.vertexId,
        event.kind,
      ]);
      expect(events).toEqual(
        [...original.getIterable()].map((event) => [
          event.vertexId,
          event.kind,
        ]),
      );
      expect(
        events.filter(([, kind]) => kind === 'workCompleted').map(([id]) => id),
      ).toEqual(['root', 'b', 'c']);
    }
  });
}

for (const async of [false, true]) {
  test.each([false, true])(
    `${
      async ? 'async' : 'sync'
    } discovery cycles expose an identity-preserving closed witness (self=%p)`,
    async (self) => {
      const a = { name: 'same' };
      const b = self ? a : { name: 'same' };
      const graph = graphFrom(
        [{ id: a, children: [b] }, ...(self ? [] : [{ id: b, children: [a] }])],
        {
          id: (item) => item.id,
          children: (item) => item.children,
        },
      );
      let failure: unknown;
      try {
        if (async) await prepareDagAsync(graph);
        else prepareDag(graph);
      } catch (error) {
        failure = error;
      }
      expect(SubpathCycleError).toBe(DagDiscoveryCycleError);
      expect(failure).toBeInstanceOf(DagDiscoveryCycleError);
      if (!(failure instanceof DagDiscoveryCycleError))
        throw Error('Expected typed discovery cycle');
      expect(failure.name).toBe('DagDiscoveryCycleError');
      expect(failure.message).toMatch(/^Discovery cycle detected:/);
      expect(failure.vertexIds).toEqual(self ? [a, a] : [b, a, b]);
      expect(failure.vertexIds[0]).toBe(b);
      expect(Object.isFrozen(failure.vertexIds)).toBe(true);
    },
  );
}
