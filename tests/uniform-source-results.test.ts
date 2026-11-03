import { treeResolution } from './source-result-fixtures';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
} from '../src';
import type {
  AsyncTreeDiscoverySource,
  VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
  BreadthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} accepts canonical found/omitted tree results in structural order`, async () => {
    const source = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['a', 'omit', 'b'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint: string) =>
        hint === 'omit'
          ? { kind: 'vertexIntentionallyOmitted' as const }
          : {
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: hint,
                  $childDiscoveryHints: [],
                },
              },
            },
    };
    const runner = new Constructor({
      treeDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    const seen: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      if (event !== null) seen.push(event.vertex.getVertexData());
    }
    expect(seen.filter((data, index) => seen.indexOf(data) === index)).toEqual([
      'root',
      'a',
      'b',
    ]);
  });

  test(`${Constructor.name} accepts an anonymous canonical omitted tree root`, async () => {
    const runner = new Constructor({
      treeDiscoverySource: {
        resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const seen: unknown[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      seen.push(event);
    expect(seen).toEqual([]);
  });
}

for (const Constructor of [
  AsyncDepthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} normalizes promised canonical tree results`, async () => {
    const source: AsyncTreeDiscoverySource<T> = {
      resolveRootVertex: async () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      }),
      resolveChildVertexFromHint: async () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'child',
            $childDiscoveryHints: [],
          },
        },
      }),
    };
    const runner = new Constructor({
      treeDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    const seen: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      if (event !== null) seen.push(event.vertex.getVertexData());
    }
    expect(seen.filter((data, index) => seen.indexOf(data) === index)).toEqual([
      'root',
      'child',
    ]);
  });
}

for (const Constructor of [
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  for (const callback of ['root', 'hint', 'prerequisite'] as const) {
    for (const laterAccess of [
      'succeeds',
      'throws a different error',
    ] as const) {
      test.each([undefined, null, { original: true }])(
        `${Constructor.name} ${callback} preserves the first then getter error %p when later access ${laterAccess}`,
        async (originalError) => {
          let getterCalls = 0;
          const badResult = Object.defineProperty(
            {
              omittedVertexIdentity: null,
              kind: 'vertexIntentionallyOmitted' as const,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
            },
            'then',
            {
              get() {
                getterCalls += 1;
                if (getterCalls === 1) throw originalError;
                if (laterAccess === 'succeeds') return undefined;
                throw { replacement: true };
              },
            },
          );
          const runner = new Constructor({
            dagDiscoverySource: {
              resolveRootVertex: () =>
                callback === 'root'
                  ? badResult
                  : {
                      kind: 'vertexResolved' as const,
                      resolvedVertexInput: {
                        vertexId: 'root',
                        workWaitsForWorkOf:
                          callback === 'prerequisite' ? ['external'] : [],
                        vertexContentInput: {
                          $vertexData: 'root',
                          $childDiscoveryHints:
                            callback === 'hint' ? ['child'] : [],
                        },
                      },
                    },
              resolveChildHint: () => badResult,
              resolvePrerequisiteByVertexId: () => badResult,
            },
          }).createIndependentRunnerFromCurrentOptions();
          let failure: { error: unknown } | undefined;
          try {
            await runner.runUntilSuspendedOrTerminal();
          } catch (error) {
            failure = { error };
          }
          expect(failure).toBeDefined();
          if (Constructor === DagTraversalBuilder) {
            expect(failure!.error).toBeInstanceOf(TypeError);
            expect(failure!.error).toHaveProperty('cause');
            expect(
              (failure!.error as TypeError & { cause: unknown }).cause,
            ).toBe(originalError);
          } else {
            expect(failure!.error).toBe(originalError);
          }
          expect(getterCalls).toBe(1);
        },
      );
    }
  }
}

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
  BreadthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} tree root observes a throwing then getter only once`, async () => {
    const originalError = {};
    let getterCalls = 0;
    const badResult = Object.defineProperty(
      { kind: 'vertexIntentionallyOmitted' as const },
      'then',
      {
        get() {
          getterCalls += 1;
          if (getterCalls === 1) throw originalError;
          return undefined;
        },
      },
    );
    const runner = new Constructor({
      treeDiscoverySource: {
        resolveRootVertex: () => badResult,
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    let failure: { error: unknown } | undefined;
    try {
      await runner.runUntilSuspendedOrTerminal();
    } catch (error) {
      failure = { error };
    }
    expect(failure).toBeDefined();
    if (
      Constructor === DepthFirstTreeTraversalBuilder ||
      Constructor === BreadthFirstTreeTraversalBuilder ||
      Constructor === DagTraversalBuilder
    ) {
      expect(failure!.error).toBeInstanceOf(TypeError);
      expect((failure!.error as TypeError & { cause: unknown }).cause).toBe(
        originalError,
      );
    } else {
      expect(failure!.error).toBe(originalError);
    }
    expect(getterCalls).toBe(1);
  });
}

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
  BreadthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} retains legacy null-content root/child omission`, async () => {
    for (const empty of [true, false]) {
      const runner = new Constructor({
        treeDiscoverySource: {
          resolveRootVertex: () =>
            treeResolution(
              empty
                ? null
                : { $vertexData: 'root', $childDiscoveryHints: ['skip'] },
            ),
          resolveChildVertexFromHint: () => ({
            kind: 'vertexIntentionallyOmitted' as const,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      const seen: string[] = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
        if (event !== null && !seen.includes(event.vertex.getVertexData()))
          seen.push(event.vertex.getVertexData());
      }
      expect(seen).toEqual(empty ? [] : ['root']);
    }
  });
  test.each([undefined, null, Symbol('callback failure')])(
    `${Constructor.name} preserves exact tree root/child callback error %p`,
    async (failure) => {
      for (const atRoot of [true, false]) {
        const runner = new Constructor({
          treeDiscoverySource: {
            resolveRootVertex: () => {
              if (atRoot) throw failure;
              return {
                kind: 'vertexResolved',
                resolvedVertexInput: {
                  vertexContentInput: {
                    $vertexData: 'root',
                    $childDiscoveryHints: ['child'],
                  },
                },
              };
            },
            resolveChildVertexFromHint: () => {
              throw failure;
            },
          },
        }).createIndependentRunnerFromCurrentOptions();
        let caught = false;
        try {
          await runner.runUntilSuspendedOrTerminal();
        } catch (error) {
          caught = true;
          expect(error).toBe(failure);
        }
        expect(caught).toBe(true);
      }
    },
  );
}
for (const Constructor of [
  AsyncDepthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} accepts promised plain root/child omissions`, async () => {
    for (const empty of [true, false]) {
      const source: AsyncTreeDiscoverySource<T> = {
        resolveRootVertex: async () =>
          empty
            ? { kind: 'vertexIntentionallyOmitted' }
            : {
                kind: 'vertexResolved',
                resolvedVertexInput: {
                  vertexContentInput: {
                    $vertexData: 'root',
                    $childDiscoveryHints: ['skip'],
                  },
                },
              },
        resolveChildVertexFromHint: async () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      };
      const runner = new Constructor({
        treeDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions();
      const seen: string[] = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
        if (event !== null && !seen.includes(event.vertex.getVertexData()))
          seen.push(event.vertex.getVertexData());
      }
      expect(seen).toEqual(empty ? [] : ['root']);
    }
  });
}
