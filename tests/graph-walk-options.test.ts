import { GraphWalk, AsyncGraphWalk } from '../src';
import { GraphWalkPhase as Phase } from '../src/traversals/graph-walk/GraphWalkPhase';
import type { GraphWalkSource } from '../src/traversals/graph-walk/GraphWalkSource';
import { normalizeWalkOptions } from '../src/traversals/graph-walk/lib/normalizeWalkOptions';

const source: GraphWalkSource<string, undefined, string> = {
  roots: () => [],
  outgoing: () => [],
};

describe('walking configuration snapshots', () => {
  test('defaults are once/BFS with vertex emissions and all visitors, without source I/O', () => {
    const calls: string[] = [];
    const lazySource = {
      roots() {
        calls.push('roots');
        return [];
      },
      outgoing() {
        calls.push('outgoing');
        return [];
      },
    };
    const config = normalizeWalkOptions({ source: lazySource });
    expect(calls).toEqual([]);
    expect(config.strategy).toBe('breadthFirst');
    expect(config.revisit).toBe('once');
    expect(config.limits).toEqual({});
    expect(config.execution.emitPhases).toEqual([Phase.VERTEX]);
    expect(config.execution.visitorPhases).toBe('all');
    expect(config.visitors).toEqual({ vertex: [], edge: [], path: [] });
    expect(config.source.receiver).toBe(lazySource);
    expect(config.source.roots).toBe(lazySource.roots);
    expect(config.source.resolveVertex).toBeUndefined();
    expect(config.followEdge).toBeUndefined();
    expect(config.expandVertex).toBeUndefined();
  });

  test('construction and patches require a depth or step bound for enumeration', () => {
    for (const revisit of ['simplePaths', 'walks']) {
      expect(() => normalizeWalkOptions({ source, revisit })).toThrow(
        TypeError,
      );
      expect(() =>
        normalizeWalkOptions({
          source,
          revisit,
          limits: { maxOccurrences: 2 },
        }),
      ).toThrow(TypeError);
      expect(
        normalizeWalkOptions({ source, revisit, limits: { maxDepth: 0 } })
          .revisit,
      ).toBe(revisit);
      expect(
        normalizeWalkOptions({ source, revisit, limits: { maxSteps: 0 } })
          .revisit,
      ).toBe(revisit);
    }
    const unbounded = normalizeWalkOptions({ source });
    expect(() => normalizeWalkOptions({ revisit: 'walks' }, unbounded)).toThrow(
      TypeError,
    );
    expect(unbounded.revisit).toBe('once');
    const bounded = normalizeWalkOptions({ source, limits: { maxDepth: 3 } });
    const patched = normalizeWalkOptions({ revisit: 'walks' }, bounded);
    expect(patched.revisit).toBe('walks');
    expect(patched.limits).toEqual({ maxDepth: 3 });
    expect(bounded.revisit).toBe('once');
    expect(() => normalizeWalkOptions({ limits: {} }, patched)).toThrow(
      TypeError,
    );
    expect(patched.limits).toEqual({ maxDepth: 3 });
  });

  test.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '1', null])(
    'rejects invalid bounds %p',
    (value) => {
      for (const key of ['maxDepth', 'maxSteps', 'maxOccurrences']) {
        expect(() =>
          normalizeWalkOptions({ source, limits: { [key]: value } }),
        ).toThrow(TypeError);
      }
    },
  );

  test('copies selectors, limits and registration wrappers while retaining callbacks and receiver', () => {
    const emitPhases = [Phase.VERTEX];
    const include = [Phase.EDGE];
    const limits = { maxDepth: 4, maxSteps: undefined };
    const callback = () => undefined;
    const records = [{ visitor: callback, priority: 5 }];
    const resolver = () => ({ kind: 'omitted' as const });
    const hydrated = { ...source, resolveVertex: resolver };
    const config = normalizeWalkOptions({
      source: hydrated,
      emitPhases,
      visitorPhases: { include },
      limits,
      visitors: { vertex: records },
      followEdge: callback,
      expandVertex: callback,
    });
    emitPhases.length = 0;
    include.length = 0;
    limits.maxDepth = 99;
    records[0]!.priority = 99;
    hydrated.roots = () => {
      throw new Error('changed');
    };
    expect(config.execution.emitPhases).toEqual([Phase.VERTEX]);
    expect(config.execution.visitorPhases).toEqual({ include: [Phase.EDGE] });
    expect(config.limits).toEqual({ maxDepth: 4 });
    expect(config.visitors.vertex[0]!.priority).toBe(5);
    expect(config.visitors.vertex[0]!.visitor).toBe(callback);
    expect(config.source.receiver).toBe(hydrated);
    expect(config.source.roots).toBe(source.roots);
    expect(config.source.resolveVertex).toBe(resolver);
    expect(config.followEdge).toBe(callback);
    expect(config.expandVertex).toBe(callback);
    expect(Object.isFrozen(hydrated)).toBe(false);
    const copy = normalizeWalkOptions({}, config);
    expect(copy.visitors.vertex[0]).not.toBe(config.visitors.vertex[0]);
    expect(copy.source.roots).toBe(config.source.roots);
    expect(copy.limits).not.toBe(config.limits);
  });

  test('uses shared selector validation and field-wise legacy patches', () => {
    const config = normalizeWalkOptions({ source, iterateOver: [Phase.EDGE] });
    expect(config.execution.emitPhases).toEqual([Phase.EDGE]);
    const patched = normalizeWalkOptions(
      { visitorPhases: { exclude: [Phase.PATH] } },
      config,
    );
    expect(patched.execution.emitPhases).toEqual([Phase.EDGE]);
    expect(patched.execution.visitorPhases).toEqual({ exclude: [Phase.PATH] });
    expect(() =>
      normalizeWalkOptions({ source, emitPhases: [], iterateOver: [] }),
    ).toThrow(TypeError);
    expect(() =>
      normalizeWalkOptions({ source, emitPhases: ['ON_READY'] }),
    ).toThrow(TypeError);
  });

  test.each([null, [], false, undefined])(
    'rejects nonobject options %p',
    (input) => {
      expect(() => normalizeWalkOptions(input)).toThrow(TypeError);
    },
  );

  test.each([
    undefined,
    null,
    [],
    1,
    {},
    {
      roots: 1,
      outgoing() {
        return [];
      },
    },
    {
      roots() {
        return [];
      },
      outgoing: null,
    },
    { ...source, resolveVertex: 1 },
  ])('rejects malformed sources %p', (value) => {
    expect(() => normalizeWalkOptions({ source: value })).toThrow(TypeError);
  });

  test.each([
    { strategy: 'DFS' },
    { strategy: null },
    { revisit: 'paths' },
    { revisit: null },
    { limits: null },
    { limits: [] },
    { limits: 1 },
    { followEdge: false },
    { expandVertex: null },
    { visitors: null },
    { visitors: [] },
    { visitors: 1 },
    { visitors: { ON_READY: [] } },
    { visitors: { vertex: 1 } },
  ])('rejects malformed fields %p', (patch) => {
    expect(() => normalizeWalkOptions({ source, ...patch })).toThrow(TypeError);
  });

  test('rejects any own concurrency before reading options or source callbacks', () => {
    const input = {
      get source() {
        throw 'source getter';
      },
    };
    Object.defineProperty(input, 'concurrency', { value: undefined });
    expect(() => normalizeWalkOptions(input)).toThrow(TypeError);
    const inherited = Object.assign(
      Object.create({ concurrency: 20 }) as object,
      { source },
    );
    expect(normalizeWalkOptions(inherited).revisit).toBe('once');
  });

  test('reads recognized getters once and propagates exact getter errors', () => {
    const reads: string[] = [];
    const input = Object.create(null) as Record<string, unknown>;
    const values = {
      source,
      strategy: 'depthFirst',
      revisit: 'once',
      limits: { maxOccurrences: 0 },
      followEdge: () => true,
      expandVertex: () => false,
      visitors: { edge: [] },
      emitPhases: [Phase.PATH],
    };
    for (const [key, value] of Object.entries(values))
      Object.defineProperty(input, key, {
        get() {
          reads.push(key);
          return value;
        },
      });
    expect(normalizeWalkOptions(input).strategy).toBe('depthFirst');
    expect(reads).toEqual(Object.keys(values));
    for (const error of [null, undefined, Symbol('error')]) {
      let caught = false;
      try {
        normalizeWalkOptions({
          get source() {
            throw error;
          },
        });
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
    }
  });

  test('captures nested source, limit and phase getters once without invoking callbacks', () => {
    const reads: string[] = [];
    const capturedSource = {
      get roots() {
        reads.push('roots');
        return source.roots;
      },
      get outgoing() {
        reads.push('outgoing');
        return source.outgoing;
      },
      get resolveVertex() {
        reads.push('resolveVertex');
        return undefined;
      },
    };
    normalizeWalkOptions({
      source: capturedSource,
      limits: {
        get maxDepth() {
          reads.push('maxDepth');
          return 2;
        },
      },
      visitors: {
        get vertex() {
          reads.push('vertex');
          return [];
        },
      },
    });
    expect(reads).toEqual([
      'roots',
      'outgoing',
      'resolveVertex',
      'maxDepth',
      'vertex',
    ]);
  });

  test('replaces supplied visitor phases and preserves other copied phases during patches', () => {
    const first = () => undefined;
    const second = () => undefined;
    const config = normalizeWalkOptions({
      source,
      visitors: { vertex: first, edge: second },
    });
    const patched = normalizeWalkOptions({ visitors: { vertex: [] } }, config);
    expect(patched.visitors.vertex).toEqual([]);
    expect(patched.visitors.edge[0]!.visitor).toBe(second);
    expect(config.visitors.vertex[0]!.visitor).toBe(first);
  });
});

for (const Factory of [GraphWalk, AsyncGraphWalk]) {
  test(`${Factory.name} rejects unknown options and limit keys before discovery and preserves configuration`, async () => {
    const roots = jest.fn(() => []);
    const lazy = { roots, outgoing: () => [] };
    const traversal = new Factory({ source: lazy, limits: { maxSteps: 0 } });
    for (const key of ['stratgey', Symbol('option')]) {
      const bad = Object.defineProperty({}, key, { value: 'depthFirst' });
      expect(
        () => new Factory({ source: lazy, ...bad, [key]: 'depthFirst' }),
      ).toThrow(TypeError);
      expect(() => traversal.configure(bad)).toThrow(TypeError);
    }
    expect(
      () =>
        new Factory({
          source: lazy,
          limits: { maxSteps: 2, maxDepht: 1 } as never,
        }),
    ).toThrow(TypeError);
    expect(() =>
      traversal.configure({ limits: { maxSteps: 2, maxDepht: 1 } as never }),
    ).toThrow(TypeError);
    expect(roots).not.toHaveBeenCalled();
    await traversal.makeRunner().run();
    expect(roots).not.toHaveBeenCalled();
  });
}
