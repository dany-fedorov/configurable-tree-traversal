import { capturedOutputValue } from './helpers/rewriteOutput';
import { ObjectPropertyTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree';
import {
  rewriteObject,
  rewriteObjectWithAssertedOutputType,
} from '../src/tools/rewrite-object/rewriteObject';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal';
import { DepthFirstTreeVisitPhase } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import { BreadthFirstTreeTraversalBuilder } from '../src/traversals/breadth-first-traversal';
import { BreadthFirstTreeVisitPhase } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';

describe('object rewriting', () => {
  test('reconstructs nested arrays and objects after rewriting their leaves', () => {
    const input = {
      branch: { keep: 1, change: 2 },
      sibling: ['x', 'y'],
    };

    const outputAtReturn = capturedOutputValue(
      rewriteObject(input, {
        rewritePropertyAfterChildTraversal: ({ propertyValue: value }) =>
          typeof value === 'number'
            ? { kind: "patchPropertyKeyOrValue", propertyPatch: { propertyValue: value + 10 } }
            : undefined,
      }),
    );

    expect(outputAtReturn).toEqual({
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

    const outputAtReturn = capturedOutputValue(
      rewriteObject(input, {
        rewritePropertyAfterChildTraversal: ({ propertyValue: value }) =>
          typeof value === 'number'
            ? { kind: "patchPropertyKeyOrValue", propertyPatch: { propertyValue: value * 10 } }
            : undefined,
      }),
    );

    expect(outputAtReturn).toEqual({ visible: 10, [secret]: 20 });
    expect(Reflect.ownKeys(outputAtReturn as object)).toEqual([
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

    const outputAtReturn = capturedOutputValue(
      rewriteObjectWithAssertedOutputType<typeof input>(input, {
        rewritePropertyAfterChildTraversal: ({ propertyValue: value }) =>
          typeof value === 'string'
            ? { kind: "patchPropertyKeyOrValue", propertyPatch: { propertyValue: value.toUpperCase() } }
            : undefined,
      }),
    );

    expect(outputAtReturn).toHaveLength(2);
    expect(Array.from(outputAtReturn!)).toEqual(['ONE', 'THREE']);
    expect(outputAtReturn!.label).toBe('ARRAY');
    expect(outputAtReturn![metadata]).toBe('SYMBOL');
  });

  test('compacts numeric array children after deletion', () => {
    expect(
      capturedOutputValue(
        rewriteObject([1, 2, 3], {
          rewritePropertyAfterChildTraversal: ({ propertyValue: value }) =>
            value === 2 ? { kind: "deletePropertySubtree" } : undefined,
        }),
      ),
    ).toEqual([1, 3]);
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['string', 'root'],
  ])('returns an unchanged %s root', (_name, input) => {
    expect(capturedOutputValue(rewriteObject(input))).toBe(input);
  });

  test('rewrites a primitive root', () => {
    expect(
      capturedOutputValue(
        rewriteObject(3, {
          rewritePropertyAfterChildTraversal: ({ propertyValue: value }) =>
            value === 3 ? { kind: "patchPropertyKeyOrValue", propertyPatch: { propertyValue: 4 } } : undefined,
        }),
      ),
    ).toBe(4);
  });

  test('returns an absent result when the root is deleted', () => {
    expect(
      rewriteObject({ value: 1 }, { rewritePropertyAfterChildTraversal: () => ({ kind: "deletePropertySubtree" }) })
        .capturedOutputResultAtReturn,
    ).toEqual({ kind: 'absent' });
  });

  test('does not invoke a value converter for an absent root', () => {
    let conversions = 0;
    const result = rewriteObject(
      { value: 1 },
      {
        rewritePropertyAfterChildTraversal: () => ({ kind: "deletePropertySubtree" }),
        convertPresentRootOutputValue: (value) => {
          conversions++;
          return value;
        },
      },
    );
    expect(result.capturedOutputResultAtReturn).toEqual({ kind: 'absent' });
    expect(result.getFinalOutputResult()).toEqual({ kind: 'absent' });
    expect(conversions).toBe(0);
  });

  test('forwards child sorting to the depth-first traversal', () => {
    const visited: PropertyKey[] = [];

    rewriteObject(
      { a: 1, b: 2 },
      {
        transformChildHintsBeforeResolution: (hints) => hints.slice().reverse(),
        rewritePropertyAfterChildTraversal: ({ propertyKey: key }) => {
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
    const tree = new ObjectPropertyTreeSource({ a: shared, b: shared });
    const traversal = new BreadthFirstTreeTraversalBuilder({ treeDiscoverySource: tree });
    let visits = 0;
    traversal.registerVisitorForPhase(BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX, () => {
      visits += 1;
      if (visits > 20) {
        throw new Error('cycle test guard exceeded');
      }
    });

    expect(() => traversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal()).toThrow(
      /object identity cycle/i,
    );
    expect(visits).toBeLessThanOrEqual(20);
  });

  test('detects cycles introduced by rewritten child hints', () => {
    const input = { child: {} };
    const tree = new ObjectPropertyTreeSource(input);
    const traversal = new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree });
    let visits = 0;
    traversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, (vertex) => {
      visits += 1;
      if (visits > 20) {
        throw new Error('cycle test guard exceeded');
      }
      if (vertex.getVertexData().propertyKey === 'child') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: {
                replacementChildHints: [{ propertyKey: 'back', propertyValue: input }],
              },
            },
          ],
        };
      }
      return undefined;
    });

    expect(() => traversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal()).toThrow(
      /object identity cycle/i,
    );
    expect(visits).toBeLessThanOrEqual(20);
  });

  test('keeps cycle ancestry isolated across concurrent adapter runs', () => {
    const input: { self?: unknown } = {};
    input.self = input;
    const tree = new ObjectPropertyTreeSource(input);
    const firstTraversal = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: tree,
    });
    let visits = 0;
    firstTraversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, () => {
      visits += 1;
      if (visits > 20) {
        throw new Error('cycle test guard exceeded');
      }
    });
    const firstIterator = firstTraversal.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect(firstIterator.next().done).toBe(false);

    const secondIterator = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: tree,
    })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal();
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

    expect(
      capturedOutputValue(rewriteObject({ left: shared, right: shared })),
    ).toEqual({
      left: { leaf: 1 },
      right: { leaf: 1 },
    });
  });

  test('allows a traversable object adapter to be reused', () => {
    const input = { child: { leaf: 1 } };
    const tree = new ObjectPropertyTreeSource(input);

    expect(() =>
      new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).not.toThrow();
    expect(() =>
      new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).not.toThrow();
  });
});
