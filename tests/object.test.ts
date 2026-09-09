import { TraversableObjectTree } from '../src/traversable-tree-implementations/traversable-object-tree';
import { rewriteObject } from '../src/tools/rewrite-object/rewriteObject';
import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal';
import { DepthFirstTraversalOrder } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import { BreadthFirstTraversal } from '../src/traversals/breadth-first-traversal';
import { BreadthFirstTraversalOrder } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';

describe('object rewriting', () => {
  test('reconstructs nested arrays and objects after rewriting their leaves', () => {
    const input = {
      branch: { keep: 1, change: 2 },
      sibling: ['x', 'y'],
    };

    const { outputObject } = rewriteObject(input, {
      rewrite: ({ value }) =>
        typeof value === 'number'
          ? { rewrite: { value: value + 10 } }
          : undefined,
    });

    expect(outputObject).toEqual({
      branch: { keep: 11, change: 12 },
      sibling: ['x', 'y'],
    });
    expect(input).toEqual({
      branch: { keep: 1, change: 2 },
      sibling: ['x', 'y'],
    });
  });

  test('traverses and reconstructs enumerable symbol properties', () => {
    const secret = Symbol('secret');
    const input = { visible: 1, [secret]: 2 };

    const { outputObject } = rewriteObject(input, {
      rewrite: ({ value }) =>
        typeof value === 'number'
          ? { rewrite: { value: value * 10 } }
          : undefined,
    });

    expect(outputObject).toEqual({ visible: 10, [secret]: 20 });
    expect(Reflect.ownKeys(outputObject as object)).toEqual([
      'visible',
      secret,
    ]);
  });

  test('skips sparse slots while preserving symbol properties', () => {
    const metadata = Symbol('metadata');
    const input: Array<string> & {
      label?: string;
      [metadata]?: string;
    } = [];
    input.length = 4;
    input[1] = 'one';
    input[3] = 'three';
    input.label = 'array';
    input[metadata] = 'symbol';

    const { outputObject } = rewriteObject(input, {
      rewrite: ({ value }) =>
        typeof value === 'string'
          ? { rewrite: { value: value.toUpperCase() } }
          : undefined,
    });

    expect(outputObject).toHaveLength(2);
    expect(Array.from(outputObject!)).toEqual(['ONE', 'THREE']);
    expect(outputObject!.label).toBe('ARRAY');
    expect(outputObject![metadata]).toBe('SYMBOL');
  });

  test('compacts numeric array children after deletion', () => {
    expect(
      rewriteObject([1, 2, 3], {
        rewrite: ({ value }) => (value === 2 ? { delete: true } : undefined),
      }).outputObject,
    ).toEqual([1, 3]);
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['string', 'root'],
  ])('returns an unchanged %s root', (_name, input) => {
    expect(rewriteObject(input).outputObject).toBe(input);
  });

  test('rewrites a primitive root', () => {
    expect(
      rewriteObject(3, {
        rewrite: ({ value }) =>
          value === 3 ? { rewrite: { value: 4 } } : undefined,
      }).outputObject,
    ).toBe(4);
  });

  test('returns null when the root is deleted', () => {
    expect(
      rewriteObject({ value: 1 }, { rewrite: () => ({ delete: true }) })
        .outputObject,
    ).toBeNull();
  });

  test('passes deleted-root null through the output conversion hook', () => {
    expect(
      rewriteObject(
        { value: 1 },
        {
          rewrite: () => ({ delete: true }),
          getOutputObjectFromRootValue: (value) =>
            value === null ? 'deleted' : 'present',
        },
      ).outputObject,
    ).toBe('deleted');
  });

  test('forwards child sorting to the depth-first traversal', () => {
    const visited: PropertyKey[] = [];

    rewriteObject(
      { a: 1, b: 2 },
      {
        sortChildrenHints: (hints) => hints.slice().reverse(),
        rewrite: ({ key }) => {
          visited.push(key);
          return undefined;
        },
      },
    );

    expect(visited.slice(0, 2)).toEqual(['b', 'a']);
  });

  test('rejects an ancestor identity cycle with a descriptive path', () => {
    const input: { child?: { back?: unknown } } = {};
    input.child = { back: input };

    expect(() => rewriteObject(input)).toThrow(/cycle.*\$\.child\.back.*\$/i);
  });

  test('rejects cycles under breadth-first traversal with repeated branches', () => {
    const shared: { self?: unknown } = {};
    shared.self = shared;
    const tree = new TraversableObjectTree({ a: shared, b: shared });
    const traversal = new BreadthFirstTraversal({ traversableTree: tree });
    let visits = 0;
    traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, () => {
      visits += 1;
      if (visits > 20) {
        throw new Error('cycle test guard exceeded');
      }
    });

    expect(() => traversal.makeRunner().run()).toThrow(
      /object identity cycle/i,
    );
    expect(visits).toBeLessThanOrEqual(20);
  });

  test('detects cycles introduced by rewritten child hints', () => {
    const input = { child: {} };
    const tree = new TraversableObjectTree(input);
    const traversal = new DepthFirstTraversal({ traversableTree: tree });
    let visits = 0;
    traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) => {
      visits += 1;
      if (visits > 20) {
        throw new Error('cycle test guard exceeded');
      }
      if (vertex.getData().key === 'child') {
        return {
          commands: [
            {
              commandName:
                TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
              commandArguments: {
                newHints: [{ key: 'back', value: input }],
              },
            },
          ],
        };
      }
      return undefined;
    });

    expect(() => traversal.makeRunner().run()).toThrow(
      /object identity cycle/i,
    );
    expect(visits).toBeLessThanOrEqual(20);
  });

  test('keeps cycle ancestry isolated across concurrent adapter runs', () => {
    const input: { self?: unknown } = {};
    input.self = input;
    const tree = new TraversableObjectTree(input);
    const firstTraversal = new DepthFirstTraversal({ traversableTree: tree });
    let visits = 0;
    firstTraversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => {
      visits += 1;
      if (visits > 20) {
        throw new Error('cycle test guard exceeded');
      }
    });
    const firstIterator = firstTraversal.makeRunner().getIterable();
    expect(firstIterator.next().done).toBe(false);

    const secondIterator = new DepthFirstTraversal({ traversableTree: tree })
      .makeRunner()
      .getIterable();
    expect(secondIterator.next().done).toBe(false);
    secondIterator.return(undefined);

    expect(() => {
      while (!firstIterator.next().done) {
        // Drain the first run after the second one has initialized its root.
      }
    }).toThrow(/cycle.*\$\.self.*ancestor at \$/i);
    expect(visits).toBeLessThanOrEqual(20);
  });

  test('allows one object in separate branches', () => {
    const shared = { leaf: 1 };

    expect(rewriteObject({ left: shared, right: shared }).outputObject).toEqual(
      {
        left: { leaf: 1 },
        right: { leaf: 1 },
      },
    );
  });

  test('allows a traversable object adapter to be reused', () => {
    const input = { child: { leaf: 1 } };
    const tree = new TraversableObjectTree(input);

    expect(() =>
      new DepthFirstTraversal({ traversableTree: tree }).makeRunner().run(),
    ).not.toThrow();
    expect(() =>
      new DepthFirstTraversal({ traversableTree: tree }).makeRunner().run(),
    ).not.toThrow();
  });
});
