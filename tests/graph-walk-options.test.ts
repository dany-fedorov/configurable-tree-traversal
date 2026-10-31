import { GraphWalk, AsyncGraphWalk } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';
import { GraphWalkPhase as Phase } from '../src/traversals/graph-walk/GraphWalkPhase';
import type { GraphWalkSource } from '../src/traversals/graph-walk/GraphWalkSource';
import { normalizeWalkOptions } from '../src/traversals/graph-walk/lib/normalizeWalkOptions';

const source: GraphWalkSource<string, undefined, string> = {
  hydration: 'inlineOrCached' as const,
  roots: () => [],
  outgoing: () => [],
};

describe('walking configuration snapshots', () => {
  test('defaults are once/BFS with vertex emissions and all visitors, without source I/O', () => {
    const calls: string[] = [];
    const lazySource = {
      hydration: 'inlineOrCached' as const,
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
    expect(config.execution.emitEvents).toEqual([Phase.VERTEX]);
    expect(config.execution.visitorPhases).toBe('all');
    expect(config.visitors).toEqual({ vertex: [], edge: [], path: [] });
    expect(config.source.receiver).toBe(lazySource);
    expect(config.source.roots).toBe(lazySource.roots);
    expect(config.source.resolveVertex).toBeUndefined();
    expect(config.shouldFollowEdge).toBeUndefined();
    expect(config.shouldExpandVertex).toBeUndefined();
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
          limits: { maxAdmittedTargets: 2 },
        }),
      ).toThrow(TypeError);
      expect(
        normalizeWalkOptions({ source, revisit, limits: { maxDepth: 0 } })
          .revisit,
      ).toBe(revisit);
      expect(
        normalizeWalkOptions({
          source,
          revisit,
          limits: { maxCandidateReadAttempts: 0 },
        }).revisit,
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
      for (const key of [
        'maxDepth',
        'maxCandidateReadAttempts',
        'maxAdmittedTargets',
      ]) {
        expect(() =>
          normalizeWalkOptions({ source, limits: { [key]: value } }),
        ).toThrow(TypeError);
      }
    },
  );

  test('copies selectors, limits and registration wrappers while retaining callbacks and receiver', () => {
    const emitEvents = [Phase.VERTEX];
    const include = [Phase.EDGE];
    const limits = { maxDepth: 4, maxCandidateReadAttempts: undefined };
    const callback = () => undefined;
    const records = [{ visitor: callback, priority: 5 }];
    const resolver = () => ({ kind: 'omitted' as const });
    const hydrated = {
      ...source,
      hydration: 'resolver' as const,
      resolveVertex: resolver,
    };
    const config = normalizeWalkOptions({
      source: hydrated,
      emitEvents,
      visitorPhases: { include },
      limits,
      visitors: { vertex: records },
      shouldFollowEdge: callback,
      shouldExpandVertex: callback,
    });
    emitEvents.length = 0;
    include.length = 0;
    limits.maxDepth = 99;
    records[0]!.priority = 99;
    hydrated.roots = () => {
      throw new Error('changed');
    };
    expect(config.execution.emitEvents).toEqual([Phase.VERTEX]);
    expect(config.execution.visitorPhases).toEqual({ include: [Phase.EDGE] });
    expect(config.limits).toEqual({ maxDepth: 4 });
    expect(config.visitors.vertex[0]!.priority).toBe(5);
    expect(config.visitors.vertex[0]!.visitor).toBe(callback);
    expect(config.source.receiver).toBe(hydrated);
    expect(config.source.roots).toBe(source.roots);
    expect(config.source.resolveVertex).toBe(resolver);
    expect(config.shouldFollowEdge).toBe(callback);
    expect(config.shouldExpandVertex).toBe(callback);
    expect(Object.isFrozen(hydrated)).toBe(false);
    const copy = normalizeWalkOptions({}, config);
    expect(copy.visitors.vertex[0]).not.toBe(config.visitors.vertex[0]);
    expect(copy.source.roots).toBe(config.source.roots);
    expect(copy.limits).not.toBe(config.limits);
  });

  test('uses shared selector validation and field-wise legacy patches', () => {
    const config = normalizeWalkOptions({ source, emitEvents: [Phase.EDGE] });
    expect(config.execution.emitEvents).toEqual([Phase.EDGE]);
    const patched = normalizeWalkOptions(
      { visitorPhases: { exclude: [Phase.PATH] } },
      config,
    );
    expect(patched.execution.emitEvents).toEqual([Phase.EDGE]);
    expect(patched.execution.visitorPhases).toEqual({ exclude: [Phase.PATH] });
    expect(() =>
      normalizeWalkOptions({ source, emitEvents: [], iterateOver: [] }),
    ).toThrow(TypeError);
    expect(() =>
      normalizeWalkOptions({ source, emitEvents: ['ON_WORK_READY'] }),
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
    { hydration: 'inlineOrCached' },
    {
      hydration: 'inlineOrCached',
      roots: 1,
      outgoing() {
        return [];
      },
    },
    {
      hydration: 'inlineOrCached' as const,
      roots() {
        return [];
      },
      outgoing: null,
    },
    { ...source, hydration: 'resolver', resolveVertex: 1 },
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
    { shouldFollowEdge: false },
    { shouldExpandVertex: false },
    { visitors: null },
    { visitors: [] },
    { visitors: 1 },
    { visitors: { ON_WORK_READY: [] } },
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
      limits: { maxAdmittedTargets: 0 },
      shouldFollowEdge: () => true,
      shouldExpandVertex: () => false,
      visitors: { edge: [] },
      emitEvents: [Phase.PATH],
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
      get hydration() {
        reads.push('hydration');
        return 'inlineOrCached' as const;
      },
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
      'hydration',
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
    const lazy = {
      hydration: 'inlineOrCached' as const,
      roots,
      outgoing: () => [],
    };
    const traversal = new Factory({
      source: lazy,
      limits: { maxCandidateReadAttempts: 0 },
    });
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
          limits: { maxCandidateReadAttempts: 2, maxDepht: 1 } as never,
        }),
    ).toThrow(TypeError);
    expect(() =>
      traversal.configure({
        replaceLimits: { maxCandidateReadAttempts: 2, maxDepht: 1 } as never,
      }),
    ).toThrow(TypeError);
    expect(roots).not.toHaveBeenCalled();
    await traversal.createRunner().run();
    expect(roots).not.toHaveBeenCalled();
  });
}

for (const Factory of [GraphWalk, AsyncGraphWalk]) {
  test(`${Factory.name} accepts initially absent null predicates`, async () => {
    const walk = new Factory({
      source: idGraph(
        ['root'],
        [
          ['root', ['child']],
          ['child', []],
        ],
      ),
      shouldFollowEdge: null,
      shouldExpandVertex: null,
    });
    const runner = walk.createRunner();
    await runner.run();
    expect(runner.summary().counts.uniqueFoundVertices).toBe(2);
    expect(runner.summary().counts.discoveredLinks).toBe(1);
  });

  test.each(['shouldFollowEdge', 'shouldExpandVertex'] as const)(
    `${Factory.name} resets %s with null and retains it with undefined or omission atomically`,
    async (predicate) => {
      const walk = new Factory({
        source: idGraph(
          ['root'],
          [
            ['root', ['child']],
            ['child', []],
          ],
        ),
        [predicate]: () => false,
      });
      async function found() {
        const runner = walk.createRunner();
        await runner.run();
        return runner.summary().counts.uniqueFoundVertices;
      }
      expect(await found()).toBe(1);
      walk.configure({ [predicate]: undefined });
      walk.configure({});
      expect(await found()).toBe(1);
      expect(() =>
        walk.configure({ [predicate]: null, emitEvents: ['invalid'] as never }),
      ).toThrow(TypeError);
      expect(await found()).toBe(1);
      walk.configure({ [predicate]: null });
      expect(await found()).toBe(2);
    },
  );
}

it.each(['followEdge', 'expandVertex'])(
  'rejects removed predicate option %s instead of retaining an alias',
  (key) => {
    const source = {
      hydration: 'inlineOrCached' as const,
      roots: () => [],
      outgoing: () => [],
    };
    expect(() => new GraphWalk({ source, [key]: () => true } as never)).toThrow(
      TypeError,
    );
  },
);
it.each(['maxSteps', 'maxOccurrences'])(
  'rejects removed walking limit %s instead of retaining an alias',
  (key) => {
    const source = {
      hydration: 'inlineOrCached' as const,
      roots: () => [],
      outgoing: () => [],
    };
    expect(
      () => new GraphWalk({ source, limits: { [key]: 1 } } as never),
    ).toThrow(TypeError);
  },
);
