import { capturedOutputValue, outputValue } from './helpers/rewriteOutput';
import {
  DepthFirstTreeVisitPhase,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  objectRewrite as rewriteApi,
  rewriteObject,
  rewriteObjectWithAssertedOutputType,
} from '../src';
import type { ObjectPropertyRewriteOptions } from '../src/tools/rewrite-object';

function pauseBeforeRootRewrite() {
  let didHalt = false;
  return {
    [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: {
      descendingExecutionPriorityWithinGroup: 200,
      visitor: (_vertex: unknown, { isTreeRoot }: { isTreeRoot: boolean }) => {
        if (!isTreeRoot || didHalt) return undefined;
        didHalt = true;
        return {
          commands: [
            {
              commandName:
                TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY as const,
            },
          ],
        };
      },
    },
  };
}

describe('rewrite result contracts', () => {
  test('requires completion and converts the final root only once after resuming', () => {
    const input = { count: 1 };
    const convertedValues: unknown[] = [];
    const completion: boolean[] = [];
    const result = rewriteObject(input, {
      visitors: pauseBeforeRootRewrite(),
      rewritePropertyAfterChildTraversal: ({ propertyKey: key }) =>
        key === 'count'
          ? {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: 'renamed' },
            }
          : undefined,
      convertPresentRootOutputValue: (value, context) => {
        completion.push(context.isTraversalFinished);
        convertedValues.push(value);
        return { converted: value };
      },
    });

    expect(result.traversalRunner.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.SUSPENDED,
    );
    expect(capturedOutputValue(result)).toEqual({ converted: { count: 1 } });
    expect(() => outputValue(result)).toThrow(/output.*not complete/i);
    expect(convertedValues).toEqual([input]);
    result.traversalRunner.runUntilSuspendedOrTerminal();
    const final = outputValue(result);
    expect(final).toEqual({ converted: { renamed: 1 } });
    expect(outputValue(result)).toBe(final);
    expect(convertedValues).toEqual([input, { renamed: 1 }]);
    expect(completion).toEqual([false, true]);
    expect(capturedOutputValue(result)).toEqual({ converted: { count: 1 } });
  });

  test('reuses the initial successful conversion when the run already finished', () => {
    let conversions = 0;
    const result = rewriteObject(
      { count: 1 },
      {
        convertPresentRootOutputValue: (value) => ({
          value,
          conversion: ++conversions,
        }),
      },
    );
    expect(outputValue(result)).toBe(capturedOutputValue(result));
    expect(outputValue(result)).toEqual({ value: { count: 1 }, conversion: 1 });
    expect(conversions).toBe(1);
  });

  test.each([null, undefined, { conversionFailure: true }])(
    'retries after the exact final conversion error %p',
    (error) => {
      let conversions = 0;
      const result = rewriteObject(
        { count: 1 },
        {
          visitors: pauseBeforeRootRewrite(),
          convertPresentRootOutputValue: (value) => {
            conversions += 1;
            if (conversions === 2) throw error;
            return { value };
          },
        },
      );
      result.traversalRunner.runUntilSuspendedOrTerminal();
      let threw = false;
      try {
        outputValue(result);
      } catch (thrown) {
        threw = true;
        expect(thrown).toBe(error);
      }
      expect(threw).toBe(true);
      const final = outputValue(result);
      expect(final).toEqual({ value: { count: 1 } });
      expect(outputValue(result)).toBe(final);
      expect(conversions).toBe(3);
    },
  );

  test('preserves exact initial conversion errors', () => {
    const error = { initialFailure: true };
    let threw = false;
    try {
      rewriteObject(
        {},
        {
          convertPresentRootOutputValue: () => {
            throw error;
          },
        },
      );
    } catch (thrown) {
      threw = true;
      expect(thrown).toBe(error);
    }
    expect(threw).toBe(true);
  });

  test('preserves deleted and null final root presence after resuming', () => {
    const deleted = rewriteObject(
      {},
      {
        visitors: pauseBeforeRootRewrite(),
        rewritePropertyAfterChildTraversal: () => ({
          kind: 'deletePropertySubtree',
        }),
        convertPresentRootOutputValue: (value) =>
          value === null ? 'deleted' : 'present',
      },
    );
    deleted.traversalRunner.runUntilSuspendedOrTerminal();
    expect(deleted.getFinalOutputResult()).toEqual({ kind: 'absent' });
    const nullRoot = rewriteObject(
      {},
      {
        visitors: pauseBeforeRootRewrite(),
        rewritePropertyAfterChildTraversal: () => ({
          kind: 'patchPropertyKeyOrValue',
          propertyPatch: { propertyValue: null },
        }),
      },
    );
    nullRoot.traversalRunner.runUntilSuspendedOrTerminal();
    expect(nullRoot.getFinalOutputResult()).toEqual({
      kind: 'present',
      value: null,
    });
    expect(outputValue(rewriteObject(null))).toBeNull();
    expect(
      outputValue(
        rewriteObject(
          {},
          {
            rewritePropertyAfterChildTraversal: () => ({
              kind: 'deletePropertySubtree',
            }),
          },
        ),
      ),
    ).toBeNull();
  });

  test('explicit output helper rewrites with and without options through the public exports', () => {
    const result = rewriteObjectWithAssertedOutputType<{ renamed: number }>(
      { count: 1 },
      {
        rewritePropertyAfterChildTraversal: ({ propertyKey: key }) =>
          key === 'count'
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyKey: 'renamed' },
              }
            : undefined,
      },
    );
    expect(outputValue(result)).toEqual({ renamed: 1 });
    expect(
      outputValue(
        rewriteApi.rewriteObjectWithAssertedOutputType<{ count: number }>({
          count: 1,
        }),
      ),
    ).toEqual({ count: 1 });
    // An explicit output is a caller assertion; no schema validation occurs.
    expect(outputValue(rewriteObjectWithAssertedOutputType<string>(3))).toBe(3);
  });

  test.each([undefined, {}])(
    'rejects a present traversableTree %p before any callbacks',
    (treeDiscoverySource) => {
      const calls: string[] = [];
      const options = {
        treeDiscoverySource,
        mapInputToRootProperty: () => {
          calls.push('source');
          return { key: 'root', value: 1 };
        },
        rewrite: () => {
          calls.push('rewrite');
          return undefined;
        },
        convertPresentRootOutputValue: () => {
          calls.push('convert');
          return 1;
        },
      } as unknown as ObjectPropertyRewriteOptions<
        unknown,
        PropertyKey,
        unknown,
        number,
        PropertyKey,
        unknown
      >;
      expect(() => rewriteObject({}, options)).toThrow(/treeDiscoverySource/);
      expect(() =>
        rewriteObjectWithAssertedOutputType<number>({}, options),
      ).toThrow(/treeDiscoverySource/);
      expect(calls).toEqual([]);
    },
  );
});
