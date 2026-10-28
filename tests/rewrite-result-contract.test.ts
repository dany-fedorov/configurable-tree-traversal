import {
  DepthFirstPhase,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  objectRewrite as rewriteApi,
  rewriteObject,
  rewriteObjectAs,
} from '../src';
import type { RewriteObjectOptions } from '../src/tools/rewrite-object';

function pauseBeforeRootRewrite() {
  let didHalt = false;
  return {
    [DepthFirstPhase.POST_ORDER]: {
      priority: 200,
      visitor: (_vertex: unknown, { isTreeRoot }: { isTreeRoot: boolean }) => {
        if (!isTreeRoot || didHalt) return undefined;
        didHalt = true;
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL as const,
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
      rewrite: ({ key }) =>
        key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
      convertRootValue: (value, context) => {
        completion.push(context.complete);
        convertedValues.push(value);
        return { converted: value };
      },
    });

    expect(result.traversalRunner.getStatus()).toBe(
      TraversalRunnerStatus.HALTED,
    );
    expect(result.outputAtReturn).toEqual({ converted: { count: 1 } });
    expect(() => result.getOutput()).toThrow(/output.*not complete/i);
    expect(convertedValues).toEqual([input]);
    result.traversalRunner.run();
    const final = result.getOutput();
    expect(final).toEqual({ converted: { renamed: 1 } });
    expect(result.getOutput()).toBe(final);
    expect(convertedValues).toEqual([input, { renamed: 1 }]);
    expect(completion).toEqual([false, true]);
    expect(result.outputAtReturn).toEqual({ converted: { count: 1 } });
  });

  test('reuses the initial successful conversion when the run already finished', () => {
    let conversions = 0;
    const result = rewriteObject(
      { count: 1 },
      {
        convertRootValue: (value) => ({
          value,
          conversion: ++conversions,
        }),
      },
    );
    expect(result.getOutput()).toBe(result.outputAtReturn);
    expect(result.getOutput()).toEqual({ value: { count: 1 }, conversion: 1 });
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
          convertRootValue: (value) => {
            conversions += 1;
            if (conversions === 2) throw error;
            return { value };
          },
        },
      );
      result.traversalRunner.run();
      let threw = false;
      try {
        result.getOutput();
      } catch (thrown) {
        threw = true;
        expect(thrown).toBe(error);
      }
      expect(threw).toBe(true);
      const final = result.getOutput();
      expect(final).toEqual({ value: { count: 1 } });
      expect(result.getOutput()).toBe(final);
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
          convertRootValue: () => {
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

  test('converts deleted and null final roots after resuming', () => {
    const deleted = rewriteObject(
      {},
      {
        visitors: pauseBeforeRootRewrite(),
        rewrite: () => ({ delete: true }),
        convertRootValue: (value) => (value === null ? 'deleted' : 'present'),
      },
    );
    deleted.traversalRunner.run();
    expect(deleted.getOutput()).toBe('deleted');
    const nullRoot = rewriteObject(
      {},
      {
        visitors: pauseBeforeRootRewrite(),
        rewrite: () => ({ rewrite: { value: null } }),
      },
    );
    nullRoot.traversalRunner.run();
    expect(nullRoot.getOutput()).toBeNull();
    expect(rewriteObject(null).getOutput()).toBeNull();
    expect(
      rewriteObject({}, { rewrite: () => ({ delete: true }) }).getOutput(),
    ).toBeNull();
  });

  test('explicit output helper rewrites with and without options through the public exports', () => {
    const result = rewriteObjectAs<{ renamed: number }>(
      { count: 1 },
      {
        rewrite: ({ key }) =>
          key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
      },
    );
    expect(result.getOutput()).toEqual({ renamed: 1 });
    expect(
      rewriteApi.rewriteObjectAs<{ count: number }>({ count: 1 }).getOutput(),
    ).toEqual({ count: 1 });
    // An explicit output is a caller assertion; no schema validation occurs.
    expect(rewriteObjectAs<string>(3).getOutput()).toBe(3);
  });

  test.each([undefined, {}])(
    'rejects a present traversableTree %p before any callbacks',
    (traversableTree) => {
      const calls: string[] = [];
      const options = {
        traversableTree,
        getRootPropertyFromInputObject: () => {
          calls.push('source');
          return { key: 'root', value: 1 };
        },
        rewrite: () => {
          calls.push('rewrite');
          return undefined;
        },
        convertRootValue: () => {
          calls.push('convert');
          return 1;
        },
      } as unknown as RewriteObjectOptions<
        unknown,
        PropertyKey,
        unknown,
        number,
        PropertyKey,
        unknown
      >;
      expect(() => rewriteObject({}, options)).toThrow(/traversableTree/);
      expect(() => rewriteObjectAs<number>({}, options)).toThrow(
        /traversableTree/,
      );
      expect(calls).toEqual([]);
    },
  );
});
