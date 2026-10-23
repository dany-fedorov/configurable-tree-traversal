import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  DagTraversal,
  DepthFirstTraversal,
} from '../src';
import type { AsyncTraversableTree, TreeTypeParameters } from '../src';

type T = TreeTypeParameters<string, string>;

for (const Constructor of [
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  DagTraversal,
  AsyncDagTraversal,
]) {
  test(`${Constructor.name} accepts canonical found/omitted tree results in structural order`, async () => {
    const source = {
      makeRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: ['a', 'omit', 'b'] },
        },
      }),
      makeVertex: (hint: string) =>
        hint === 'omit'
          ? { kind: 'omitted' as const, satisfiesDependencies: true as const }
          : {
              kind: 'found' as const,
              vertex: { vertexContent: { $data: hint, $childHints: [] } },
            },
    };
    const runner = new Constructor<T>({ traversableTree: source }).makeRunner();
    const seen: string[] = [];
    for await (const event of runner.getIterable()) {
      if (event !== null) seen.push(event.vertex.getData());
    }
    expect(seen.filter((data, index) => seen.indexOf(data) === index)).toEqual([
      'root',
      'a',
      'b',
    ]);
  });

  test(`${Constructor.name} accepts an anonymous canonical omitted tree root`, async () => {
    const runner = new Constructor<T>({
      traversableTree: {
        makeRoot: () => ({ kind: 'omitted', satisfiesDependencies: true }),
        makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).makeRunner();
    await runner.run();
    const seen: unknown[] = [];
    for await (const event of runner.getIterable()) seen.push(event);
    expect(seen).toEqual([]);
  });
}

for (const Constructor of [
  AsyncDepthFirstTraversal,
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
]) {
  test(`${Constructor.name} normalizes promised canonical tree results`, async () => {
    const source: AsyncTraversableTree<T> = {
      makeRoot: async () => ({
        kind: 'found',
        vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
      }),
      makeVertex: async () => ({
        kind: 'found',
        vertex: { vertexContent: { $data: 'child', $childHints: [] } },
      }),
    };
    const runner = new Constructor<T>({ traversableTree: source }).makeRunner();
    const seen: string[] = [];
    for await (const event of runner.getIterable()) {
      if (event !== null) seen.push(event.vertex.getData());
    }
    expect(seen.filter((data, index) => seen.indexOf(data) === index)).toEqual([
      'root',
      'child',
    ]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
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
            { vertexContent: null },
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
          const runner = new Constructor<T>({
            traversableGraph: {
              makeRoot: () =>
                callback === 'root'
                  ? badResult
                  : {
                      vertexId: 'root',
                      dependsOn:
                        callback === 'prerequisite' ? ['external'] : [],
                      vertexContent: {
                        $data: 'root',
                        $childHints: callback === 'hint' ? ['child'] : [],
                      },
                    },
              makeVertex: () => badResult,
              resolvePrerequisite: () => badResult,
            },
          }).makeRunner();
          let failure: { error: unknown } | undefined;
          try {
            await runner.run();
          } catch (error) {
            failure = { error };
          }
          expect(failure).toBeDefined();
          if (Constructor === DagTraversal) {
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
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  DagTraversal,
  AsyncDagTraversal,
]) {
  test(`${Constructor.name} tree root observes a throwing then getter only once`, async () => {
    const originalError = {};
    let getterCalls = 0;
    const badResult = Object.defineProperty({ vertexContent: null }, 'then', {
      get() {
        getterCalls += 1;
        if (getterCalls === 1) throw originalError;
        return undefined;
      },
    });
    const runner = new Constructor<T>({
      traversableTree: {
        makeRoot: () => badResult,
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner();
    let failure: { error: unknown } | undefined;
    try {
      await runner.run();
    } catch (error) {
      failure = { error };
    }
    expect(failure).toBeDefined();
    if (
      Constructor === DepthFirstTraversal ||
      Constructor === BreadthFirstTraversal ||
      Constructor === DagTraversal
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
