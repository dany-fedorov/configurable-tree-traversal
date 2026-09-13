import { CTTRef } from '../src/core/CTTRef';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { HintVertexId, Ref } from '../src/core/graph/types';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { TestGraph } from './helpers/graph-fixtures';
import { Vertex } from '../src/core/Vertex';

function result(
  label: string,
  options: {
    id?: unknown;
    dependsOn?: readonly unknown[];
    hints?: string[];
  } = {},
): MakeVertexResult<TestGraph> {
  const value: MakeVertexResult<TestGraph> = {
    vertexContent: { $d: label, $c: options.hints ?? [] },
  };
  if (Object.prototype.hasOwnProperty.call(options, 'id')) {
    value.vertexId = options.id;
  }
  if (Object.prototype.hasOwnProperty.call(options, 'dependsOn')) {
    value.dependsOn = options.dependsOn!;
  }
  return value;
}

function omitted(id?: unknown): MakeVertexResult<TestGraph> {
  return arguments.length === 0
    ? { vertexContent: null }
    : { vertexContent: null, vertexId: id };
}

function context(
  parentRef: Ref<TestGraph>,
  hintIndex: number,
): VertexResolutionContext<TestGraph> {
  return {
    depth: 1,
    parentVertex: parentRef.unref(),
    parentVertexRef: parentRef,
    hintIndex,
    vertexHint: parentRef.unref().getChildrenHints()[hintIndex]!,
  };
}

function setup(rootHints: string[] = []) {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const rootRef = scheduling.acceptRoot(
    result('root', { id: 'root', dependsOn: ['ignored'], hints: rootHints }),
  )!;
  container.store.prepareSlots(rootRef, rootHints);
  return { container, scheduling, rootRef };
}

test('root acceptance honors existing live, omitted, and deleted identities', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  container.store.markDeleted('deleted');
  container.store.markOmitted('omitted');
  expect(scheduling.acceptRoot(result('deleted', { id: 'deleted' }))).toBeNull();
  expect(scheduling.acceptRoot(omitted('omitted'))).toBeNull();
  expect(() =>
    scheduling.acceptRoot(result('conflict', { id: 'omitted' })),
  ).toThrow(/omission conflicts/i);

  const rootRef = scheduling.acceptRoot(result('root', { id: 'root' }))!;
  container.store.setRoot(null);
  expect(scheduling.acceptRoot(result('ignored', { id: 'root' }))).toBe(rootRef);
  expect(container.resolvedGraph.getRoot()).toBe(rootRef);
});

test('scheduling rejects unknown enrollment and duplicate expansion transitions', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const unknown = new CTTRef(
    new Vertex<TestGraph>({ $d: 'unknown', $c: [] }),
  );
  expect(() => scheduling.markPreVisited(unknown)).toThrow(/unknown/i);
  container.store.insertVertex({
    ref: unknown,
    id: 'unknown',
    dependsOn: [],
    depth: 0,
  });
  expect(() => scheduling.markPreVisited(unknown)).toThrow(/not enrolled/i);
  expect(() => scheduling.markPreVisiting(unknown)).toThrow(/not enrolled/i);
  expect(() => scheduling.disableSubtree(new CTTRef(unknown.unref()))).toThrow(
    /unknown/i,
  );

  const rootRef = scheduling.acceptRoot(result('root', { id: 'root' }))!;
  expect(scheduling.getStall()).toBeNull();
  scheduling.prepareSlots(rootRef, []);
  expect(() => scheduling.prepareSlots(rootRef, [])).toThrow(/already prepared/i);
  scheduling.markPreVisited(rootRef);
  scheduling.closeExpansion(rootRef);
  expect(() =>
    (
      scheduling as unknown as {
        noteLinkedSlot(parent: Ref<TestGraph>, index: number): void;
      }
    ).noteLinkedSlot(rootRef, 0),
  ).toThrow(/after expansion is closed/i);
  expect(scheduling.deleteVertex(new CTTRef(rootRef.unref()))).toEqual(new Set());
});

test('known-hint and consumed-tree restoration handle absent and reusable slots', () => {
  const { container, scheduling, rootRef } = setup(['child']);
  (
    scheduling as unknown as {
      captureReusableTreeChildren(parent: Ref<TestGraph>): void;
    }
  ).captureReusableTreeChildren(rootRef);
  expect(
    (
      scheduling as unknown as {
        reusableTreeChildren: Map<Ref<TestGraph>, unknown>;
      }
    ).reusableTreeChildren.size,
  ).toBe(0);
  expect(
    scheduling.acceptKnownHint(context(rootRef, 0), {} as HintVertexId),
  ).toBe(false);
  expect(
    scheduling.acceptKnownHint(context(rootRef, 0), { vertexId: 'missing' }),
  ).toBe(false);
  scheduling.restoreConsumedTreeSlot(context(rootRef, 0));
  expect(container.resolvedGraph.get(rootRef)?.slots[0]?.kind).toBe('omitted');

  const second = setup(['child']);
  const childRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'child', $c: [] }),
  );
  second.container.acceptVertex(childRef, 'child', [], context(second.rootRef, 0));
  const reusable = second.scheduling as unknown as {
    reusableTreeChildren: Map<
      Ref<TestGraph>,
      Map<number, { ref: Ref<TestGraph>; hint: string }>
    >;
  };
  reusable.reusableTreeChildren.set(
    second.rootRef,
    new Map([[0, { ref: childRef, hint: 'child' }]]),
  );
  second.scheduling.restoreConsumedTreeSlot(context(second.rootRef, 0));
  expect(second.container.resolvedGraph.getChildrenOf(second.rootRef)).toEqual([
    childRef,
  ]);
  expect(second.container.resolvedGraph.getStatusOf(childRef)).toBe('COMPLETE');
  reusable.reusableTreeChildren.set(
    second.rootRef,
    new Map([[0, { ref: childRef, hint: 'different' }]]),
  );
  expect(
    (
      second.scheduling as unknown as {
        findExistingTreeChild(
          value: VertexResolutionContext<TestGraph>,
        ): Ref<TestGraph> | null;
      }
    ).findExistingTreeChild(context(second.rootRef, 0)),
  ).toBeNull();

  const removals = new Set<Ref<TestGraph>>([second.rootRef]);
  const pending: Ref<TestGraph>[] = [];
  (
    second.scheduling as unknown as {
      addRemoval(
        ref: Ref<TestGraph>,
        refs: Set<Ref<TestGraph>>,
        work: Ref<TestGraph>[],
      ): void;
    }
  ).addRemoval(second.rootRef, removals, pending);
  expect(pending).toEqual([]);
});

test('admits an early dependent only after both later prerequisites are pre-visited', () => {
  const { container, scheduling, rootRef } = setup(['join', 'A', 'B']);

  expect(scheduling.takeReady()).toBe(rootRef);
  scheduling.markPreVisited(rootRef);
  const joinRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('join', { id: 'join', dependsOn: ['A', 'B'] }),
  )!;
  expect(scheduling.takeReady()).toBeNull();
  const aRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('A', { id: 'A' }),
  )!;
  const bRef = scheduling.acceptVertex(
    context(rootRef, 2),
    result('B', { id: 'B' }),
  )!;

  expect(scheduling.takeReady()).toBe(aRef);
  expect(scheduling.takeReady()).toBe(bRef);
  scheduling.markPreVisited(aRef);
  expect(scheduling.takeReady()).toBeNull();
  scheduling.markPreVisited(bRef);
  expect(scheduling.takeReady()).toBe(joinRef);
  expect(container.resolvedGraph.get(joinRef)?.status).toBe('READY');
});

test('uses one FIFO for eligible visits and consumes each readiness once', () => {
  const { scheduling, rootRef } = setup(['A']);
  scheduling.markPreVisited(rootRef);
  const aRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('A', { id: 'A' }),
  )!;

  expect(scheduling.takeEligible()).toEqual({
    ref: rootRef,
    order: 'ON_READY',
  });
  expect(scheduling.takeEligible()).toEqual({ ref: aRef, order: 'ON_READY' });
  expect(scheduling.takeEligible()).toBeNull();
  scheduling.markPreVisited(aRef);
  scheduling.markPreVisited(aRef);
  expect(scheduling.takeReady()).toBeNull();
});

test('consumes a wide eligible FIFO with a cursor and preserves head blocking', () => {
  const width = 10_000;
  const hints = Array.from({ length: width }, (_, index) => String(index));
  const { scheduling, rootRef } = setup(hints);
  scheduling.markPreVisited(rootRef);
  const refs = hints.map((hint, index) =>
    scheduling.acceptVertex(
      context(rootRef, index),
      result(hint, { id: hint, dependsOn: [] }),
    ),
  );
  const shift = jest.spyOn(Array.prototype, 'shift');
  try {
    expect(scheduling.takeCompleting()).toBeNull();
    expect(scheduling.takeReady()).toBe(rootRef);
    expect(scheduling.inspectEligible().slice(0, 3)).toEqual(
      refs.slice(0, 3).map((ref) => ({ ref, order: 'ON_READY' })),
    );
    for (const ref of refs) expect(scheduling.takeReady()).toBe(ref);
    expect(scheduling.takeEligible()).toBeNull();
    expect(scheduling.inspectEligible()).toEqual([]);
    expect(shift).not.toHaveBeenCalled();
  } finally {
    shift.mockRestore();
  }
});

test('defaults child dependencies to the parent and ignores root dependencies', () => {
  const { container, scheduling, rootRef } = setup(['child']);
  const childRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('child', { id: 'child' }),
  )!;

  expect(container.resolvedGraph.get(rootRef)?.dependsOn).toEqual([]);
  expect(container.resolvedGraph.get(childRef)?.dependsOn).toEqual(['root']);
  expect(scheduling.takeReady()).toBe(rootRef);
  expect(scheduling.takeReady()).toBeNull();
  scheduling.markPreVisited(rootRef);
  expect(scheduling.takeReady()).toBe(childRef);
});

test('deduplicates dependencies with SameValueZero and accepts COMPLETING as satisfied', () => {
  const dependencyId = {};
  const { container, scheduling, rootRef } = setup(['dependency', 'dependent']);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const dependencyRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('dependency', { id: dependencyId, dependsOn: [] }),
  )!;
  expect(scheduling.takeReady()).toBe(dependencyRef);
  container.store.setStatus(dependencyRef, 'COMPLETING');

  const dependentRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('dependent', {
      id: 'dependent',
      dependsOn: [dependencyId, dependencyId, NaN, NaN],
    }),
  )!;
  expect(container.resolvedGraph.get(dependentRef)?.dependsOn).toEqual([
    dependencyId,
    NaN,
  ]);
  expect(scheduling.takeReady()).toBeNull();

  const omittedParent = new CTTRef(rootRef.unref().clone({ $c: ['missing'] }));
  container.acceptVertex(
    omittedParent,
    'omitted-parent',
    [],
    context(rootRef, 1),
  );
  container.store.prepareSlots(omittedParent, ['missing']);
  scheduling.acceptVertex(context(omittedParent, 0), omitted(NaN));
  expect(scheduling.takeReady()).toBe(dependentRef);
});

test('an omission releases reverse dependents once and repeated omissions close each slot', () => {
  const { container, scheduling, rootRef } = setup([
    'dependent',
    'missing-1',
    'missing-2',
  ]);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const dependentRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('dependent', { id: 'dependent', dependsOn: ['missing'] }),
  )!;

  expect(
    scheduling.acceptVertex(context(rootRef, 1), omitted('missing')),
  ).toBeNull();
  expect(scheduling.takeReady()).toBe(dependentRef);
  expect(
    scheduling.acceptVertex(context(rootRef, 2), omitted('missing')),
  ).toBeNull();
  expect(scheduling.takeReady()).toBeNull();
  expect(
    container.resolvedGraph.get(rootRef)?.slots.map((slot) => slot.kind),
  ).toEqual(['linked', 'omitted', 'omitted']);
});

test('supports null and undefined ids while anonymous null results reserve no identity', () => {
  const { container, scheduling, rootRef } = setup([
    'null-live',
    'undefined-live',
    'anonymous-null',
  ]);
  const nullRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('null-live', { id: null, dependsOn: [] }),
  )!;
  const undefinedRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('undefined-live', { id: undefined, dependsOn: [] }),
  )!;

  expect(container.resolvedGraph.getVertexById(null)).toBe(nullRef);
  expect(container.resolvedGraph.getVertexById(undefined)).toBe(undefinedRef);
  expect(scheduling.acceptVertex(context(rootRef, 2), omitted())).toBeNull();
  expect(container.resolvedGraph.getVertexRefs()).toEqual([
    rootRef,
    nullRef,
    undefinedRef,
  ]);
});

test('rejects content for an omitted identity without closing the conflicting slot', () => {
  const { container, scheduling, rootRef } = setup(['omit', 'conflict']);
  scheduling.acceptVertex(context(rootRef, 0), omitted(null));

  expect(() =>
    scheduling.acceptVertex(
      context(rootRef, 1),
      result('conflict', { id: null }),
    ),
  ).toThrow(/omission.*content/i);
  expect(container.resolvedGraph.get(rootRef)?.slots[1]?.kind).toBe('pending');
});

test('a duplicate null result links the first live identity and preserves its content', () => {
  const { container, scheduling, rootRef } = setup(['first', 'duplicate']);
  const firstRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('first', { id: 'same', dependsOn: [] }),
  )!;

  expect(scheduling.acceptVertex(context(rootRef, 1), omitted('same'))).toBe(
    firstRef,
  );
  expect(container.resolvedGraph.getChildrenOf(rootRef)).toEqual([
    firstRef,
    firstRef,
  ]);
  expect(firstRef.unref().getData()).toBe('first');
});

test('duplicate live results add edges but retain first content and dependencies', () => {
  const { container, scheduling, rootRef } = setup([
    'first',
    'duplicate',
    'omit',
  ]);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const firstRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('first', { id: 'same', dependsOn: ['gate'] }),
  )!;
  const duplicateRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('replacement', { id: 'same', dependsOn: [] }),
  );

  expect(duplicateRef).toBe(firstRef);
  expect(firstRef.unref().getData()).toBe('first');
  expect(container.resolvedGraph.get(firstRef)?.dependsOn).toEqual(['gate']);
  expect(scheduling.takeReady()).toBeNull();
  scheduling.acceptVertex(context(rootRef, 2), omitted('gate'));
  expect(scheduling.takeReady()).toBe(firstRef);
  expect(scheduling.takeReady()).toBeNull();
});

test('uses authoritative hint identities and compares dual ids with SameValueZero', () => {
  const { container, scheduling, rootRef } = setup([
    'hint',
    'nan',
    'zero',
    'bad',
  ]);
  const hinted = scheduling.acceptVertex(
    context(rootRef, 0),
    result('hint', { dependsOn: [] }),
    { vertexId: undefined },
  )!;
  const nan = scheduling.acceptVertex(
    context(rootRef, 1),
    result('nan', { id: NaN, dependsOn: [] }),
    { vertexId: NaN },
  )!;
  scheduling.acceptVertex(
    context(rootRef, 2),
    result('zero', { id: -0, dependsOn: [] }),
    { vertexId: 0 },
  );

  expect(container.resolvedGraph.getVertexById(undefined)).toBe(hinted);
  expect(container.resolvedGraph.getVertexById(NaN)).toBe(nan);
  expect(() =>
    scheduling.acceptVertex(
      context(rootRef, 3),
      result('bad', { id: {}, dependsOn: [] }),
      { vertexId: {} },
    ),
  ).toThrow(/id.*mismatch/i);
  expect(container.resolvedGraph.get(rootRef)?.slots[3]?.kind).toBe('pending');
});

test('detects result ids as own properties rather than inherited values', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const inherited = Object.create({
    vertexId: 'inherited',
  }) as MakeVertexResult<TestGraph>;
  inherited.vertexContent = { $d: 'root', $c: [] };
  inherited.dependsOn = ['ignored'];

  const rootRef = scheduling.acceptRoot(inherited)!;

  expect(container.resolvedGraph.getVertexById('inherited')).toBeNull();
  expect(container.resolvedGraph.getIdOf(rootRef)).toBe(rootRef.getId());
});

test('retries generated UUID identities that are already indexed', () => {
  const { container, scheduling, rootRef } = setup(['generated']);
  const getId = jest
    .spyOn(CTTRef.prototype, 'getId')
    .mockReturnValueOnce('root')
    .mockReturnValueOnce('fresh-generated-id');
  try {
    const generated = scheduling.acceptVertex(
      context(rootRef, 0),
      result('generated', { dependsOn: [] }),
    )!;

    expect(container.resolvedGraph.getIdOf(generated)).toBe(
      'fresh-generated-id',
    );
  } finally {
    getId.mockRestore();
  }
});

test('closes arrivals for deleted identities without restoring them', () => {
  const { container, scheduling, rootRef } = setup(['first', 'deleted']);
  const deletedRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('first', { id: 'deleted', dependsOn: [] }),
  )!;
  container.deleteVertices(new Set([deletedRef]));

  expect(
    scheduling.acceptVertex(
      context(rootRef, 1),
      result('replacement', { id: 'deleted', dependsOn: [] }),
    ),
  ).toBeNull();
  expect(container.store.getIdState('deleted')).toEqual({ kind: 'deleted' });
  expect(container.resolvedGraph.get(rootRef)?.slots[1]?.kind).toBe('deleted');
});

test('tombstones a new identity whose dependency was already deleted', () => {
  const { container, scheduling, rootRef } = setup(['dependency', 'dependent']);
  const dependencyRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('dependency', { id: 'dependency', dependsOn: [] }),
  )!;
  container.deleteVertices(new Set([dependencyRef]));

  expect(
    scheduling.acceptVertex(
      context(rootRef, 1),
      result('dependent', {
        id: 'dependent',
        dependsOn: ['dependency'],
      }),
    ),
  ).toBeNull();
  expect(container.store.getIdState('dependent')).toEqual({ kind: 'deleted' });
  expect(container.resolvedGraph.get(rootRef)?.slots[1]?.kind).toBe('deleted');
});

test('an explicitly identified null root records omission and creates no root', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);

  expect(scheduling.acceptRoot(omitted('empty-root'))).toBeNull();
  expect(container.store.getIdState('empty-root')).toEqual({ kind: 'omitted' });
  expect(container.resolvedGraph.getRoot()).toBeNull();
  expect(scheduling.takeReady()).toBeNull();
});

test('tree-source scheduling rejects graph metadata even on omitted results', () => {
  const graphContainer = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(graphContainer);
  const metadata = omitted('tree-id');
  Object.defineProperty(graphContainer, 'sourceMode', { value: 'tree' });

  expect(() => scheduling.acceptRoot(metadata)).toThrow(/tree.*metadata/i);
  expect(graphContainer.store.getIdState('tree-id')).toBeUndefined();
});

test('accepts a hint wrapper only when it carries an own vertexId', () => {
  const { container, scheduling, rootRef } = setup(['hint']);
  const inheritedHint = Object.create({
    vertexId: 'inherited',
  }) as HintVertexId;
  const hinted = scheduling.acceptVertex(
    context(rootRef, 0),
    result('hint', { dependsOn: [] }),
    inheritedHint,
  )!;

  expect(container.resolvedGraph.getVertexById('inherited')).toBeNull();
  expect(container.resolvedGraph.getIdOf(hinted)).toBe(hinted.getId());
});
