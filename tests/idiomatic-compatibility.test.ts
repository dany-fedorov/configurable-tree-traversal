import type { VertexView } from '../src';
import * as api from '../src';
import {
  Vertex,
  MutableValueReference,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeVisitPhase as F,
  DagVisitorPhase as D,
  ObjectPropertyTreeSource,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  traverseDag,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  traverseDagAsync,
} from '../src';

type T = { VertexData: string; ChildHint: string };
const content = { $vertexData: 'root', $childDiscoveryHints: [] as string[] };
const source = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: { vertexContentInput: content },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};

test.each([
  { $d: 'root', $c: [] },
  { ...content, $d: 'old' },
  { ...content, $c: [] },
])('rejects retired vertex content %#', (value) => {
  expect(() => new Vertex<T>(value as never)).toThrow(TypeError);
  expect(() =>
    new Vertex<T>(content).createEditableShallowCloneWithContentOverrides(
      value as never,
    ),
  ).toThrow(TypeError);
});

test('retired accessors and public runtime exports are absent', () => {
  const vertex = new Vertex<T>(content);
  expect('$d' in vertex).toBe(false);
  expect('$c' in vertex).toBe(false);
  expect('getId' in new MutableValueReference(vertex)).toBe(false);
  const runner = new DagTraversalBuilder<T>({ treeDiscoverySource: source })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect('getIdOf' in runner.getLiveResolvedGraphView()).toBe(false);
  expect('getVertexById' in runner.getLiveResolvedGraphView()).toBe(false);
  expect('DEFER_READY' in api).toBe(false);
  expect('TraversalVisitorFunctionResolutionStyle' in api).toBe(false);
  expect(
    'REWRITE_VERTEX_HINTS_ON_PRE_ORDER' in api.TraversalVisitorCommandName,
  ).toBe(false);
});

for (const result of [{ vertexContent: content }, { vertexContent: null }]) {
  test('rejects untagged sync and async tree results', async () => {
    const invalid = { ...source, resolveRootVertex: () => result };
    expect(() =>
      new DepthFirstTreeTraversalBuilder<T>({
        treeDiscoverySource: invalid as never,
      })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow(TypeError);
    await expect(
      new AsyncDepthFirstTreeTraversalBuilder<T>({
        treeDiscoverySource: invalid as never,
      })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).rejects.toThrow(TypeError);
  });
}

test.each([
  'iterateOver',
  'enableVisitorFunctionsFor',
  'disableVisitorFunctionsFor',
])('rejects retired execution selector %s before invoking a source', (key) => {
  let calls = 0;
  const runner = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: {
      ...source,
      resolveRootVertex() {
        calls++;
        return source.resolveRootVertex();
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() =>
    runner.runUntilSuspendedOrTerminal({ [key]: [] } as never),
  ).toThrow(TypeError);
  expect(calls).toBe(0);
  runner.runUntilSuspendedOrTerminal();
  expect(calls).toBe(1);
});

test('rejects retired registration policy atomically', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: source,
  });
  expect(() =>
    traversal.registerVisitorCallbackForPhase(F.BEFORE_CHILD_EXPANSION, {
      visitor: () => undefined,
      resolutionStyle: 'CONCURRENT',
    } as never),
  ).toThrow(TypeError);
  expect(
    traversal.getDetachedVisitorRegistrationRecordsForPhase(
      F.BEFORE_CHILD_EXPANSION,
    ),
  ).toEqual([]);
  expect(() =>
    traversal.appendVisitorGroupForPhase(F.BEFORE_CHILD_EXPANSION, {
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
          commandArguments: { replacementChildHints: [] },
        },
      ],
    },
  ]) {
    expect(() =>
      traverseDag({
        treeDiscoverySource: source,
        visitors: { [D.ON_WORK_READY]: (() => result) as never },
      }),
    ).toThrow(TypeError);
  }
});

test('rejects boolean settlement feedback without consuming the generation', () => {
  const runner = new DagTraversalBuilder<T>({
    treeDiscoverySource: source,
    workCompletionPolicy: 'requireExternalWorkSettlement',
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const work = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
  for (const outcome of [{ ok: true }, { ok: false, error: 'failure' }]) {
    expect(() =>
      runner.settleDeferredWork(
        work.vertexId,
        outcome as never,
        work.settlementToken,
      ),
    ).toThrow(TypeError);
  }
  expect(
    runner.settleDeferredWork(
      work.vertexId,
      { kind: 'workCompleted' },
      work.settlementToken,
    ),
  ).toBe(true);
});

test('rejects undefined prerequisite resolution', () => {
  const graph = {
    ...source,
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: 'root',
        vertexContentInput: content,
        workWaitsForWorkOf: ['missing'],
      },
    }),
    resolvePrerequisiteByVertexId: () => undefined,
  };
  expect(() =>
    new DagTraversalBuilder<T>({ dagDiscoverySource: graph as never })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow(TypeError);
});

test('all convenience helpers reject positional calls before discovery', () => {
  for (const helper of [
    runTreeDepthFirstUntilSuspendedOrTerminal,
    runTreeBreadthFirstUntilSuspendedOrTerminal,
    traverseDag,
    runTreeDepthFirstUntilSuspendedOrTerminalAsync,
    runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
    traverseDagAsync,
  ]) {
    const positional = helper as unknown as (...args: unknown[]) => unknown;
    expect(() => positional({ treeDiscoverySource: source }, null)).toThrow(
      TypeError,
    );
  }
});

test('rejects retired object hooks and returnMe results', () => {
  expect(
    () =>
      new ObjectPropertyTreeSource({}, { makeVertexHook: () => ({}) } as never),
  ).toThrow(TypeError);
  const objectSource = new ObjectPropertyTreeSource(
    { child: 1 },
    {
      resolveChildPropertyOrUseDefault: (() => ({
        returnMe: content,
      })) as never,
    },
  );
  expect(() =>
    runTreeDepthFirstUntilSuspendedOrTerminal({
      treeDiscoverySource: objectSource,
    }),
  ).toThrow(TypeError);
});

test('object built-in source returns a tagged root', () => {
  expect(new ObjectPropertyTreeSource({}).resolveRootVertex()).toHaveProperty(
    'kind',
    'vertexResolved',
  );
});

test('query records round-trip group identity but receive freshly assigned indexes', () => {
  const seen: number[] = [];
  const visitor = (
    _vertex: VertexView<T>,
    context: {
      visitorRegistrationMetadata: { phaseRegistrationInsertionIndex: number };
    },
  ) => {
    seen.push(
      context.visitorRegistrationMetadata.phaseRegistrationInsertionIndex,
    );
  };
  const traversal = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: source,
  });
  traversal.appendVisitorGroupForPhase(F.BEFORE_CHILD_EXPANSION, {
    visitors: [visitor, visitor],
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
  });
  const records = traversal.getDetachedVisitorRegistrationRecordsForPhase(
    F.BEFORE_CHILD_EXPANSION,
  );
  const group = records[0]!.visitorGroup;
  records[0]!.phaseRegistrationInsertionIndex = 200;
  records[1]!.phaseRegistrationInsertionIndex = -20;
  traversal.replaceVisitorDefinitionsForPhase(
    F.BEFORE_CHILD_EXPANSION,
    records,
  );
  const replaced = traversal.getDetachedVisitorRegistrationRecordsForPhase(
    F.BEFORE_CHILD_EXPANSION,
  );
  expect(
    replaced.map((record) => record.phaseRegistrationInsertionIndex),
  ).toEqual([0, 1]);
  expect(replaced[0]!.visitor).toBe(visitor);
  expect(replaced[0]!.visitorGroup).toBe(group);
  expect(replaced[1]!.visitorGroup).toBe(group);
  expect(replaced[0]).not.toBe(records[0]);
  expect(replaced[0]).not.toHaveProperty('resolutionStyle');
  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen).toEqual([0, 1]);
});

test('grouped phase inputs reject retired policy before replacing registrations', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: source,
  });
  const visitor = () => undefined;
  traversal.registerVisitorCallbackForPhase(F.BEFORE_CHILD_EXPANSION, visitor);
  expect(() =>
    traversal.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, {
      groups: [],
      resolutionStyle: undefined,
    } as never),
  ).toThrow(TypeError);
  expect(
    traversal.getDetachedVisitorRegistrationRecordsForPhase(
      F.BEFORE_CHILD_EXPANSION,
    )[0]!.visitor,
  ).toBe(visitor);
});
