import type { DagDiscoverySource, VertexDataAndChildHintTypes } from '../src';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src';
import { mergeAsyncDagTraversalInstanceConfigs } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';
import { mergeDagTraversalInstanceConfigs } from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import { traversalInternals } from './internal-runner-fixtures';

type Data = VertexDataAndChildHintTypes<string, string>;

for (const Factory of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const sourceKey of [
    'dagDiscoverySource',
    'treeDiscoverySource',
  ] as const) {
    const oppositeKey =
      sourceKey === 'dagDiscoverySource'
        ? 'treeDiscoverySource'
        : 'dagDiscoverySource';
    function fixture() {
      const calls: string[] = [];
      const originalId = { name: 'original' };
      const replacementId = Symbol('replacement');
      function source(data: string, vertexId: unknown) {
        return {
          resolveRootVertex() {
            calls.push(data);
            return {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: data,
                  $childDiscoveryHints: [],
                },
                ...(sourceKey === 'dagDiscoverySource' ? { vertexId } : {}),
              },
            };
          },
          ...(sourceKey === 'dagDiscoverySource'
            ? {
                resolveChildHint: () => ({
                  omittedVertexIdentity: null,
                  kind: 'vertexIntentionallyOmitted' as const,
                  satisfiesWorkAndSubgraphCompletionPrerequisites:
                    true as const,
                }),
              }
            : {
                resolveChildVertexFromHint: () => ({
                  kind: 'vertexIntentionallyOmitted' as const,
                }),
              }),
        };
      }
      const original = source('original', originalId);
      const replacement = source('replacement', replacementId);
      const seen: string[] = [];
      const traversal = new Factory<Data>({ [sourceKey]: original } as never);
      traversal.registerVisitorCallbackForPhase(
        Order.ON_WORK_READY,
        (vertex) => void seen.push(vertex.getVertexData()),
      );
      async function runUntilSuspendedOrTerminal(expected: string) {
        seen.length = 0;
        const runner = traversal.createIndependentRunnerFromCurrentOptions();
        await runner.runUntilSuspendedOrTerminal();
        expect(seen).toEqual([expected]);
        if (sourceKey === 'dagDiscoverySource') {
          expect(
            runner
              .getLiveResolvedGraphView()
              .getVertexHandleByIdOrNull(
                expected === 'original' ? originalId : replacementId,
              ),
          ).toBeDefined();
        }
        return runner;
      }
      return {
        traversal,
        original,
        replacement,
        calls,
        runUntilSuspendedOrTerminal,
      };
    }

    test.each(['own undefined', 'inherited'])(
      `${Factory.name} ${sourceKey} ignores %s source keys and keeps the active source`,
      async (shape) => {
        const { traversal, replacement, calls, runUntilSuspendedOrTerminal } =
          fixture();
        for (const key of [sourceKey, oppositeKey]) {
          const patch =
            shape === 'own undefined'
              ? { [key]: undefined }
              : (Object.create({ [key]: replacement }) as object);
          const before = calls.length;
          traversal.patchOptionsForFutureRunners(patch);
          expect(calls).toHaveLength(before);
          await runUntilSuspendedOrTerminal('original');
        }
      },
    );

    test(`${Factory.name} ${sourceKey} replaces only same-family sources and rejects opposite patches atomically`, async () => {
      const { traversal, replacement, calls, runUntilSuspendedOrTerminal } =
        fixture();
      expect(() =>
        traversal.patchOptionsForFutureRunners({
          [sourceKey]: replacement,
          [oppositeKey]: replacement,
          visitors: { [Order.ON_WORK_READY]: [] },
        } as never),
      ).toThrow(/source mode/i);
      expect(calls).toEqual([]);
      await runUntilSuspendedOrTerminal('original');
      traversal.patchOptionsForFutureRunners({ [sourceKey]: replacement });
      expect(calls).toEqual(['original']);
      await runUntilSuspendedOrTerminal('replacement');
    });

    test.each([null, 0, {}])(
      `${Factory.name} ${sourceKey} rejects malformed opposite source %p without mutation or callbacks`,
      async (opposite) => {
        const { traversal, replacement, calls, runUntilSuspendedOrTerminal } =
          fixture();
        const before = traversalInternals(traversal).icfg;
        const visitors =
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            Order.ON_WORK_READY,
          );
        expect(() =>
          traversal.patchOptionsForFutureRunners({
            [sourceKey]: replacement,
            [oppositeKey]: opposite,
            visitors: { [Order.ON_WORK_READY]: [] },
          } as never),
        ).toThrow(TypeError);
        expect(calls).toEqual([]);
        expect(traversalInternals(traversal).icfg).toBe(before);
        expect(
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            Order.ON_WORK_READY,
          ),
        ).toEqual(visitors);
        await runUntilSuspendedOrTerminal('original');
      },
    );

    test.each([true, false])(
      `${Factory.name} ${sourceKey} captures source getters once (enumerable=%s)`,
      async (enumerable) => {
        const {
          traversal,
          original,
          replacement,
          calls,
          runUntilSuspendedOrTerminal,
        } = fixture();
        let reads = 0;
        const patch = Object.defineProperty({}, sourceKey, {
          enumerable,
          get() {
            reads += 1;
            return reads === 1 ? replacement : original;
          },
        });
        traversal.patchOptionsForFutureRunners(patch);
        expect(reads).toBe(1);
        expect(calls).toEqual([]);
        await runUntilSuspendedOrTerminal('replacement');
        reads = 0;
        const constructed = new Factory<Data>(patch as never);
        expect(reads).toBe(1);
        constructed.registerVisitorCallbackForPhase(
          Order.ON_WORK_READY,
          (vertex) => expect(vertex.getVertexData()).toBe('replacement'),
        );
        await constructed
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      },
    );

    test(`${Factory.name} ${sourceKey} keeps a source when own getters return undefined`, async () => {
      const { traversal, runUntilSuspendedOrTerminal } = fixture();
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
      traversal.patchOptionsForFutureRunners(patch);
      expect(reads).toEqual(['dagDiscoverySource', 'treeDiscoverySource']);
      await runUntilSuspendedOrTerminal('original');
      expect(() => new Factory<Data>(patch as never)).toThrow(/exactly one/i);
    });

    test(`${Factory.name} ${sourceKey} validates nonenumerable defined options atomically`, async () => {
      const { traversal, replacement, calls, runUntilSuspendedOrTerminal } =
        fixture();
      const failure = new Error('nonenumerable ordinary option');
      const patch = Object.defineProperty(
        { [sourceKey]: replacement },
        'workCompletionPolicy',
        {
          get() {
            throw failure;
          },
        },
      );
      expect(() => traversal.patchOptionsForFutureRunners(patch)).toThrow(
        failure,
      );
      expect(calls).toEqual([]);
      await runUntilSuspendedOrTerminal('original');
      expect(() =>
        traversal.patchOptionsForFutureRunners(
          Object.defineProperty({}, 'workCompletionPolicy', {
            value: 'invalid',
          }),
        ),
      ).toThrow(TypeError);
      traversal.patchOptionsForFutureRunners(
        Object.defineProperty({}, 'workCompletionPolicy', { value: undefined }),
      );
      await runUntilSuspendedOrTerminal('original');
    });

    test(`${Factory.name} ${sourceKey} rejects symbol and own __proto__ options atomically`, async () => {
      const { traversal, runUntilSuspendedOrTerminal } = fixture();
      const before = traversalInternals(traversal).icfg;
      for (const key of ['__proto__', Symbol('ordinary option')]) {
        const patch = Object.defineProperty({}, key, {
          enumerable: true,
          value: undefined,
        });
        expect(() => traversal.patchOptionsForFutureRunners(patch)).toThrow(
          TypeError,
        );
        expect(traversalInternals(traversal).icfg).toBe(before);
      }
      await runUntilSuspendedOrTerminal('original');
    });

    test(`${Factory.name} ${sourceKey} never reads inherited source getters`, async () => {
      const { traversal, original, runUntilSuspendedOrTerminal } = fixture();
      const inherited = Object.defineProperty({}, oppositeKey, {
        get() {
          throw new Error('inherited source getter');
        },
      });
      traversal.patchOptionsForFutureRunners(
        Object.create(inherited) as object,
      );
      const input = Object.assign(Object.create(inherited) as object, {
        [sourceKey]: original,
      });
      const constructed = new Factory<Data>(input as never);
      await constructed
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      await runUntilSuspendedOrTerminal('original');
      expect(
        () =>
          new Factory<Data>(Object.create({ [sourceKey]: original }) as never),
      ).toThrow(/exactly one/i);
    });

    test.each([undefined, null, Symbol('source getter error')])(
      `${Factory.name} ${sourceKey} preserves exact getter errors and configuration (%p)`,
      async (error) => {
        const { traversal, calls, runUntilSuspendedOrTerminal } = fixture();
        const patch = Object.defineProperty({}, sourceKey, {
          enumerable: true,
          get() {
            throw error;
          },
        });
        for (const action of [
          () => traversal.patchOptionsForFutureRunners(patch),
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
        await runUntilSuspendedOrTerminal('original');
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
    const source: DagDiscoverySource<Data> = {
      resolveRootVertex: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    };
    const base = {
      ...traversalInternals(
        new DagTraversalBuilder<Data>({ dagDiscoverySource: source }),
      ).icfg,
      maxConcurrentCallbackInvocations: Infinity,
    };
    const merged = merge<Data, Data>(base, {
      dagDiscoverySource: undefined,
    });
    expect(merged.dagDiscoverySource).toBe(source);
  });
}
