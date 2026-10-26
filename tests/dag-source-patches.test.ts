import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src';
import type { TraversableGraph, TreeTypeParameters } from '../src';
import { mergeDagTraversalInstanceConfigs } from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import { mergeAsyncDagTraversalInstanceConfigs } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';

type Data = TreeTypeParameters<string, string>;

for (const Factory of [DagTraversal, AsyncDagTraversal]) {
  for (const sourceKey of ['traversableGraph', 'traversableTree'] as const) {
    const oppositeKey =
      sourceKey === 'traversableGraph' ? 'traversableTree' : 'traversableGraph';
    function fixture() {
      const calls: string[] = [];
      const originalId = { name: 'original' };
      const replacementId = Symbol('replacement');
      function source(data: string, vertexId: unknown): TraversableGraph<Data> {
        return {
          makeRoot() {
            calls.push(data);
            return {
              kind: 'found',
              vertex: {
                vertexContent: { $data: data, $childHints: [] },
                ...(sourceKey === 'traversableGraph' ? { vertexId } : {}),
              },
            };
          },
          makeVertex: () => ({ vertexContent: null }),
        };
      }
      const original = source('original', originalId);
      const replacement = source('replacement', replacementId);
      const seen: string[] = [];
      const traversal = new Factory<Data>({ [sourceKey]: original } as never);
      traversal.addVisitorFor(
        Order.ON_READY,
        (vertex) => void seen.push(vertex.getData()),
      );
      async function run(expected: string) {
        seen.length = 0;
        const runner = traversal.makeRunner();
        await runner.run();
        expect(seen).toEqual([expected]);
        if (sourceKey === 'traversableGraph') {
          expect(
            runner
              .getResolvedGraph()
              .getVertexRefById(
                expected === 'original' ? originalId : replacementId,
              ),
          ).toBeDefined();
        }
      }
      return { traversal, original, replacement, calls, run };
    }

    test.each(['own undefined', 'inherited'])(
      `${Factory.name} ${sourceKey} ignores %s source keys and keeps the active source`,
      async (shape) => {
        const { traversal, replacement, calls, run } = fixture();
        for (const key of [sourceKey, oppositeKey]) {
          const patch =
            shape === 'own undefined'
              ? { [key]: undefined }
              : (Object.create({ [key]: replacement }) as object);
          const before = calls.length;
          traversal.configure(patch);
          expect(calls).toHaveLength(before);
          await run('original');
        }
      },
    );

    test(`${Factory.name} ${sourceKey} replaces only same-family sources and rejects opposite patches atomically`, async () => {
      const { traversal, replacement, calls, run } = fixture();
      expect(() =>
        traversal.configure({
          [sourceKey]: replacement,
          [oppositeKey]: replacement,
          visitors: { [Order.ON_READY]: [] },
        } as never),
      ).toThrow(/source mode/i);
      expect(calls).toEqual([]);
      await run('original');
      traversal.configure({ [sourceKey]: replacement });
      expect(calls).toEqual(['original']);
      await run('replacement');
    });

    test.each([true, false])(
      `${Factory.name} ${sourceKey} captures source getters once (enumerable=%s)`,
      async (enumerable) => {
        const { traversal, original, replacement, calls, run } = fixture();
        let reads = 0;
        const patch = Object.defineProperty({}, sourceKey, {
          enumerable,
          get() {
            reads += 1;
            return reads === 1 ? replacement : original;
          },
        });
        traversal.configure(patch);
        expect(reads).toBe(1);
        expect(calls).toEqual([]);
        await run('replacement');
        reads = 0;
        const constructed = new Factory<Data>(patch as never);
        expect(reads).toBe(1);
        constructed.addVisitorFor(Order.ON_READY, (vertex) =>
          expect(vertex.getData()).toBe('replacement'),
        );
        await constructed.makeRunner().run();
      },
    );

    test(`${Factory.name} ${sourceKey} keeps a source when own getters return undefined`, async () => {
      const { traversal, run } = fixture();
      const reads: string[] = [];
      const patch = {};
      for (const key of [sourceKey, oppositeKey]) {
        Object.defineProperty(patch, key, {
          enumerable: true,
          get() {
            reads.push(key);
            return undefined;
          },
        });
      }
      traversal.configure(patch);
      expect(reads).toEqual(['traversableGraph', 'traversableTree']);
      await run('original');
      expect(() => new Factory<Data>(patch as never)).toThrow(/exactly one/i);
    });

    test(`${Factory.name} ${sourceKey} treats only source properties as nonenumerable options`, async () => {
      const { traversal, original, replacement, calls, run } = fixture();
      const patch = Object.defineProperty(
        { [sourceKey]: replacement },
        'workCompletion',
        {
          get() {
            throw new Error('nonenumerable ordinary option');
          },
        },
      );
      traversal.configure(patch);
      expect(calls).toEqual([]);
      await run('replacement');
      const constructed = new Factory<Data>({
        [sourceKey]: original,
        [oppositeKey]: undefined,
      } as never);
      await constructed.makeRunner().run();
    });

    test.each([null, 0, {}])(
      `${Factory.name} ${sourceKey} rejects defined malformed opposite sources (%p)`,
      async (value) => {
        const { traversal, calls, run } = fixture();
        expect(() =>
          traversal.configure({ [oppositeKey]: value } as never),
        ).toThrow(/source mode/i);
        expect(calls).toEqual([]);
        await run('original');
      },
    );

    test(`${Factory.name} ${sourceKey} never reads inherited source getters`, async () => {
      const { traversal, original, run } = fixture();
      const inherited = Object.defineProperty({}, oppositeKey, {
        get() {
          throw new Error('inherited source getter');
        },
      });
      traversal.configure(Object.create(inherited) as object);
      const input = Object.assign(Object.create(inherited) as object, {
        [sourceKey]: original,
      });
      const constructed = new Factory<Data>(input as never);
      await constructed.makeRunner().run();
      await run('original');
      expect(
        () =>
          new Factory<Data>(Object.create({ [sourceKey]: original }) as never),
      ).toThrow(/exactly one/i);
    });

    test.each([undefined, null, Symbol('source getter error')])(
      `${Factory.name} ${sourceKey} preserves exact getter errors and configuration (%p)`,
      async (error) => {
        const { traversal, calls, run } = fixture();
        const patch = Object.defineProperty({}, sourceKey, {
          enumerable: true,
          get() {
            throw error;
          },
        });
        for (const action of [
          () => traversal.configure(patch),
          () => new Factory<Data>(patch as never),
        ]) {
          let caught = false;
          try {
            action();
          } catch (value) {
            caught = true;
            expect(value).toBe(error);
          }
          expect(caught).toBe(true);
        }
        expect(calls).toEqual([]);
        await run('original');
      },
    );
  }
}

// Historical deep imports also expose the merge functions to consumers.
for (const merge of [
  mergeDagTraversalInstanceConfigs,
  mergeAsyncDagTraversalInstanceConfigs,
]) {
  test(`${merge.name} retains a source for an ignored direct patch`, () => {
    const source: TraversableGraph<Data> = {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    };
    const base = {
      ...new DagTraversal<Data>({ traversableGraph: source }).icfg,
      concurrency: Infinity,
    };
    const merged = merge<Data, Data>(base, {
      traversableGraph: undefined,
    });
    expect(merged.traversableGraph).toBe(source);
  });
}
