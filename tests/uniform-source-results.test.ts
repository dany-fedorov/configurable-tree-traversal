import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
} from '../src';
import type { AsyncTreeSource, VertexTypes } from '../src';

type T = VertexTypes<string, string>;

for (const Constructor of [
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
  BreadthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  test(`${Constructor.name} accepts canonical found/omitted tree results in structural order`, async () => {
    const source = {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: ['a', 'omit', 'b'] },
        },
      }),
      resolveChild: (hint: string) =>
        hint === 'omit'
          ? { kind: 'omitted' as const }
          : {
              kind: 'found' as const,
              vertex: { vertexContent: { $data: hint, $childHints: [] } },
            },
    };
    const runner = new Constructor({ traversableTree: source }).createRunner();
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
    const runner = new Constructor({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner();
    await runner.run();
    const seen: unknown[] = [];
    for await (const event of runner.getIterable()) seen.push(event);
    expect(seen).toEqual([]);
  });
}

for (const Constructor of [
  AsyncDepthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  test(`${Constructor.name} normalizes promised canonical tree results`, async () => {
    const source: AsyncTreeSource<T> = {
      resolveRoot: async () => ({
        kind: 'found',
        vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
      }),
      resolveChild: async () => ({
        kind: 'found',
        vertex: { vertexContent: { $data: 'child', $childHints: [] } },
      }),
    };
    const runner = new Constructor({ traversableTree: source }).createRunner();
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

for (const Constructor of [DagTraversal<T>, AsyncDagTraversal<T>]) {
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
          const runner = new Constructor({
            traversableGraph: {
              resolveRoot: () =>
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
              resolveChild: () => badResult,
              resolvePrerequisite: () => badResult,
            },
          }).createRunner();
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
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
  BreadthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
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
    const runner = new Constructor({
      traversableTree: {
        resolveRoot: () => badResult,
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner();
    let failure: { error: unknown } | undefined;
    try {
      await runner.run();
    } catch (error) {
      failure = { error };
    }
    expect(failure).toBeDefined();
    if (
      Constructor === DepthFirstTreeTraversal ||
      Constructor === BreadthFirstTreeTraversal ||
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

for (const Constructor of [
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
  BreadthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  test(`${Constructor.name} retains legacy null-content root/child omission`, async () => {
    for (const empty of [true, false]) {
      const runner = new Constructor({
        traversableTree: {
          resolveRoot: () => ({
            vertexContent: empty
              ? null
              : { $data: 'root', $childHints: ['skip'] },
          }),
          resolveChild: () => ({ vertexContent: null }),
        },
      }).createRunner();
      const seen: string[] = [];
      for await (const event of runner.getIterable()) {
        if (event !== null && !seen.includes(event.vertex.getData()))
          seen.push(event.vertex.getData());
      }
      expect(seen).toEqual(empty ? [] : ['root']);
    }
  });
  test.each([undefined, null, Symbol('callback failure')])(
    `${Constructor.name} preserves exact tree root/child callback error %p`,
    async (failure) => {
      for (const atRoot of [true, false]) {
        const runner = new Constructor({
          traversableTree: {
            resolveRoot: () => {
              if (atRoot) throw failure;
              return {
                kind: 'found',
                vertex: {
                  vertexContent: { $data: 'root', $childHints: ['child'] },
                },
              };
            },
            resolveChild: () => {
              throw failure;
            },
          },
        }).createRunner();
        let caught = false;
        try {
          await runner.run();
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
  AsyncDepthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  test(`${Constructor.name} accepts promised plain root/child omissions`, async () => {
    for (const empty of [true, false]) {
      const source: AsyncTreeSource<T> = {
        resolveRoot: async () =>
          empty
            ? { kind: 'omitted' }
            : {
                kind: 'found',
                vertex: {
                  vertexContent: { $data: 'root', $childHints: ['skip'] },
                },
              },
        resolveChild: async () => ({ kind: 'omitted' }),
      };
      const runner = new Constructor({ traversableTree: source }).createRunner();
      const seen: string[] = [];
      for await (const event of runner.getIterable()) {
        if (event !== null && !seen.includes(event.vertex.getData()))
          seen.push(event.vertex.getData());
      }
      expect(seen).toEqual(empty ? [] : ['root']);
    }
  });
}
