import * as api from '../src';
import {
  Vertex,
  MutableRef,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  DagTraversal,
  DepthFirstPhase as F,
  DagVisitorPhase as D,
  ObjectTreeSource,
  traverseTreeDepthFirst,
  traverseTreeBreadthFirst,
  traverseDag,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirstAsync,
  traverseDagAsync,
} from '../src';

type T = { VertexData: string; VertexHint: string };
const content = { $data: 'root', $childHints: [] as string[] };
const source = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexContent: content },
  }),
  resolveChild: () => ({ kind: 'omitted' as const }),
};

test.each([
  { $d: 'root', $c: [] },
  { ...content, $d: 'old' },
  { ...content, $c: [] },
])('rejects retired vertex content %#', (value) => {
  expect(() => new Vertex<T>(value as never)).toThrow(TypeError);
  expect(() => new Vertex<T>(content).clone(value as never)).toThrow(TypeError);
});

test('retired accessors and public runtime exports are absent', () => {
  const vertex = new Vertex<T>(content);
  expect('$d' in vertex).toBe(false);
  expect('$c' in vertex).toBe(false);
  expect('getId' in new MutableRef(vertex)).toBe(false);
  const runner = new DagTraversal<T>({ traversableTree: source })
    .createRunner()
    .run();
  expect('getIdOf' in runner.getResolvedGraph()).toBe(false);
  expect('getVertexById' in runner.getResolvedGraph()).toBe(false);
  expect('DEFER_READY' in api).toBe(false);
  expect('TraversalVisitorFunctionResolutionStyle' in api).toBe(false);
  expect(
    'REWRITE_VERTEX_HINTS_ON_PRE_ORDER' in api.TraversalVisitorCommandName,
  ).toBe(false);
});

for (const result of [{ vertexContent: content }, { vertexContent: null }]) {
  test('rejects untagged sync and async tree results', async () => {
    const invalid = { ...source, resolveRoot: () => result };
    expect(() =>
      new DepthFirstTreeTraversal<T>({ traversableTree: invalid as never })
        .createRunner()
        .run(),
    ).toThrow(TypeError);
    await expect(
      new AsyncDepthFirstTreeTraversal<T>({ traversableTree: invalid as never })
        .createRunner()
        .run(),
    ).rejects.toThrow(TypeError);
  });
}

test.each([
  'iterateOver',
  'enableVisitorFunctionsFor',
  'disableVisitorFunctionsFor',
])('rejects retired execution selector %s before invoking a source', (key) => {
  let calls = 0;
  const runner = new DepthFirstTreeTraversal<T>({
    traversableTree: {
      ...source,
      resolveRoot() {
        calls++;
        return source.resolveRoot();
      },
    },
  }).createRunner();
  expect(() => runner.run({ [key]: [] } as never)).toThrow(TypeError);
  expect(calls).toBe(0);
  runner.run();
  expect(calls).toBe(1);
});

test('rejects retired registration policy atomically', () => {
  const traversal = new DepthFirstTreeTraversal<T>({ traversableTree: source });
  expect(() =>
    traversal.addVisitorFor(F.PRE_ORDER, {
      visitor: () => undefined,
      resolutionStyle: 'CONCURRENT',
    } as never),
  ).toThrow(TypeError);
  expect(traversal.listVisitorsFor(F.PRE_ORDER)).toEqual([]);
  expect(() =>
    traversal.addVisitorGroupFor(F.PRE_ORDER, {
      visitors: [],
      resolutionStyle: 'CONCURRENT',
    } as never),
  ).toThrow(TypeError);
});

test('rejects old hint commands and symbol callback results', () => {
  for (const result of [
    Symbol('DEFER_READY'),
    {
      commands: [
        {
          commandName: 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
          commandArguments: { newHints: [] },
        },
      ],
    },
  ]) {
    expect(() =>
      traverseDag({
        traversableTree: source,
        visitors: { [D.ON_WORK_READY]: (() => result) as never },
      }),
    ).toThrow(TypeError);
  }
});

test('rejects boolean settlement feedback without consuming the generation', () => {
  const runner = new DagTraversal<T>({
    traversableTree: source,
    workCompletion: 'externalSettlement',
  })
    .createRunner()
    .run();
  const work = runner.summary().awaitingSettlement[0]!;
  for (const outcome of [{ ok: true }, { ok: false, error: 'failure' }]) {
    expect(() =>
      runner.settle(work.vertexId, outcome as never, work.generation),
    ).toThrow(TypeError);
  }
  expect(
    runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation),
  ).toBe(true);
});

test('rejects undefined prerequisite resolution', () => {
  const graph = {
    ...source,
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexId: 'root',
        vertexContent: content,
        dependsOnWork: ['missing'],
      },
    }),
    resolvePrerequisite: () => undefined,
  };
  expect(() =>
    new DagTraversal<T>({ traversableGraph: graph as never })
      .createRunner()
      .run(),
  ).toThrow(TypeError);
});

test('all convenience helpers reject positional calls before discovery', () => {
  for (const helper of [
    traverseTreeDepthFirst,
    traverseTreeBreadthFirst,
    traverseDag,
    traverseTreeDepthFirstAsync,
    traverseTreeBreadthFirstAsync,
    traverseDagAsync,
  ]) {
    const positional = helper as unknown as (...args: unknown[]) => unknown;
    expect(() => positional({ traversableTree: source }, null)).toThrow(
      TypeError,
    );
  }
});

test('rejects retired object hooks and returnMe results', () => {
  expect(
    () => new ObjectTreeSource({}, { makeVertexHook: () => ({}) } as never),
  ).toThrow(TypeError);
  const objectSource = new ObjectTreeSource(
    { child: 1 },
    { resolveVertexHook: (() => ({ returnMe: content })) as never },
  );
  expect(() =>
    traverseTreeDepthFirst({ traversableTree: objectSource }),
  ).toThrow(TypeError);
});

test('object built-in source returns a tagged root', () => {
  expect(new ObjectTreeSource({}).resolveRoot()).toHaveProperty(
    'kind',
    'found',
  );
});

test('query records round-trip group identity but receive freshly assigned indexes', () => {
  const seen: number[] = [];
  const visitor = (
    _vertex: Vertex<T>,
    context: { registration: { addedIndex: number } },
  ) => {
    seen.push(context.registration.addedIndex);
  };
  const traversal = new DepthFirstTreeTraversal<T>({ traversableTree: source });
  traversal.addVisitorGroupFor(F.PRE_ORDER, {
    visitors: [visitor, visitor],
    commandCommitMode: 'afterGroup',
  });
  const records = traversal.listVisitorsFor(F.PRE_ORDER);
  const group = records[0]!.visitorGroup;
  records[0]!.addedIndex = 200;
  records[1]!.addedIndex = -20;
  traversal.setVisitorsFor(F.PRE_ORDER, records);
  const replaced = traversal.listVisitorsFor(F.PRE_ORDER);
  expect(replaced.map((record) => record.addedIndex)).toEqual([0, 1]);
  expect(replaced[0]!.visitor).toBe(visitor);
  expect(replaced[0]!.visitorGroup).toBe(group);
  expect(replaced[1]!.visitorGroup).toBe(group);
  expect(replaced[0]).not.toBe(records[0]);
  expect(replaced[0]).not.toHaveProperty('resolutionStyle');
  traversal.createRunner().run();
  expect(seen).toEqual([0, 1]);
});

test('grouped phase inputs reject retired policy before replacing registrations', () => {
  const traversal = new DepthFirstTreeTraversal<T>({ traversableTree: source });
  const visitor = () => undefined;
  traversal.addVisitorFor(F.PRE_ORDER, visitor);
  expect(() =>
    traversal.setVisitorsFor(F.PRE_ORDER, {
      groups: [],
      resolutionStyle: undefined,
    } as never),
  ).toThrow(TypeError);
  expect(traversal.listVisitorsFor(F.PRE_ORDER)[0]!.visitor).toBe(visitor);
});
