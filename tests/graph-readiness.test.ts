import type { InternalChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import { MutableValueReference } from '../src/core/CTTRef';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type {
  ChildHintVertexIdentity,
  InternalVertexRef,
} from '../src/core/graph/types';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { TestGraph } from './helpers/graph-fixtures';
import { Vertex } from '../src/core/Vertex';

function result(
  label: string,
  options: {
    id?: unknown;
    dependsOnWork?: readonly unknown[];
    hints?: string[];
  } = {},
): MakeVertexResult<TestGraph> {
  const value: MakeVertexResult<TestGraph> = {
    vertexContent: {
      $vertexData: label,
      $childDiscoveryHints: options.hints ?? [],
    },
  };
  if (Object.prototype.hasOwnProperty.call(options, 'id')) {
    value.vertexId = options.id;
  }
  if (Object.prototype.hasOwnProperty.call(options, 'dependsOnWork')) {
    value.workWaitsForWorkOf = options.dependsOnWork!;
  }
  return value;
}

function omitted(id?: unknown): MakeVertexResult<TestGraph> {
  return arguments.length === 0
    ? { vertexContent: null }
    : { vertexContent: null, vertexId: id };
}

function context(
  parentRef: InternalVertexRef<TestGraph>,
  hintIndex: number,
): ChildDiscoveryContext<TestGraph> {
  return {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: parentRef.getReferencedValue(),
    parentVertexHandle: parentRef,
    parentChildHintIndex: hintIndex,
    childDiscoveryHint: parentRef
      .getReferencedValue()
      .getMutableChildDiscoveryHints()[hintIndex]!,
  };
}

function setup(rootHints: string[] = []) {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const rootRef = scheduling.acceptRoot(
    result('root', { id: 'root', hints: rootHints }),
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
  expect(
    scheduling.acceptRoot(result('deleted', { id: 'deleted' })),
  ).toBeNull();
  expect(scheduling.acceptRoot(omitted('omitted'))).toBeNull();
  expect(() =>
    scheduling.acceptRoot(result('conflict', { id: 'omitted' })),
  ).toThrow(/omission conflicts/i);

  const rootRef = scheduling.acceptRoot(result('root', { id: 'root' }))!;
  container.store.setRoot(null);
  expect(scheduling.acceptRoot(result('ignored', { id: 'root' }))).toBe(
    rootRef,
  );
  expect(container.liveResolvedGraphView.getRoot()).toBe(rootRef);
});

test('scheduling rejects unknown enrollment and duplicate expansion transitions', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const unknown = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'unknown', $childDiscoveryHints: [] }),
  );
  expect(() => scheduling.markPreVisited(unknown)).toThrow(/unknown/i);
  container.store.insertVertex({
    ref: unknown,
    id: 'unknown',
    workWaitsForWorkOf: [],
    depth: 0,
  });
  expect(() => scheduling.markPreVisited(unknown)).toThrow(/not enrolled/i);
  expect(() => scheduling.markPreVisiting(unknown)).toThrow(/not enrolled/i);
  expect(() =>
    scheduling.disableSubtree(
      new MutableValueReference(unknown.getReferencedValue()),
    ),
  ).toThrow(/unknown/i);

  const rootRef = scheduling.acceptRoot(result('root', { id: 'root' }))!;
  expect(scheduling.getStall()).toBeNull();
  scheduling.prepareSlots(rootRef, []);
  expect(() => scheduling.prepareSlots(rootRef, [])).toThrow(
    /already prepared/i,
  );
  scheduling.markPreVisited(rootRef);
  scheduling.closeExpansion(rootRef);
  expect(() =>
    (
      scheduling as unknown as {
        noteLinkedSlot(
          parent: InternalVertexRef<TestGraph>,
          index: number,
        ): void;
      }
    ).noteLinkedSlot(rootRef, 0),
  ).toThrow(/after expansion is closed/i);
  expect(
    scheduling.deleteVertex(
      new MutableValueReference(rootRef.getReferencedValue()),
    ),
  ).toEqual(new Set());
});

test('known-hint and consumed-tree restoration handle absent and reusable slots', () => {
  const { container, scheduling, rootRef } = setup(['child']);
  (
    scheduling as unknown as {
      captureReusableTreeChildren(parent: InternalVertexRef<TestGraph>): void;
    }
  ).captureReusableTreeChildren(rootRef);
  expect(
    (
      scheduling as unknown as {
        reusableTreeChildren: Map<InternalVertexRef<TestGraph>, unknown>;
      }
    ).reusableTreeChildren.size,
  ).toBe(0);
  expect(
    scheduling.acceptKnownHint(
      context(rootRef, 0),
      {} as ChildHintVertexIdentity,
    ),
  ).toBe(false);
  expect(
    scheduling.acceptKnownHint(context(rootRef, 0), { vertexId: 'missing' }),
  ).toBe(false);
  scheduling.restoreConsumedTreeSlot(context(rootRef, 0));
  expect(container.liveResolvedGraphView.get(rootRef)?.slots[0]?.kind).toBe(
    'omitted',
  );

  const second = setup(['child']);
  const childRef = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'child', $childDiscoveryHints: [] }),
  );
  second.container.acceptVertex(
    childRef,
    'child',
    [],
    context(second.rootRef, 0),
  );
  const reusable = second.scheduling as unknown as {
    reusableTreeChildren: Map<
      InternalVertexRef<TestGraph>,
      Map<number, { ref: InternalVertexRef<TestGraph>; hint: string }>
    >;
  };
  reusable.reusableTreeChildren.set(
    second.rootRef,
    new Map([[0, { ref: childRef, hint: 'child' }]]),
  );
  second.scheduling.restoreConsumedTreeSlot(context(second.rootRef, 0));
  expect(
    second.container.liveResolvedGraphView.getChildrenOf(second.rootRef),
  ).toEqual([childRef]);
  expect(
    second.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
      childRef,
    ),
  ).toBe('COMPLETION_VISIT_COMMITTED');
  reusable.reusableTreeChildren.set(
    second.rootRef,
    new Map([[0, { ref: childRef, hint: 'different' }]]),
  );
  expect(
    (
      second.scheduling as unknown as {
        findExistingTreeChild(
          value: ChildDiscoveryContext<TestGraph>,
        ): InternalVertexRef<TestGraph> | null;
      }
    ).findExistingTreeChild(context(second.rootRef, 0)),
  ).toBeNull();

  const removals = new Set<InternalVertexRef<TestGraph>>([second.rootRef]);
  const pending: InternalVertexRef<TestGraph>[] = [];
  (
    second.scheduling as unknown as {
      addRemoval(
        ref: InternalVertexRef<TestGraph>,
        refs: Set<InternalVertexRef<TestGraph>>,
        work: InternalVertexRef<TestGraph>[],
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
    result('join', { id: 'join', dependsOnWork: ['A', 'B'] }),
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
  expect(container.liveResolvedGraphView.get(joinRef)?.visitStage).toBe(
    'INITIAL_VISIT_ELIGIBLE',
  );
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
    order: 'ON_WORK_READY',
  });
  expect(scheduling.takeEligible()).toEqual({
    ref: aRef,
    order: 'ON_WORK_READY',
  });
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
      result(hint, { id: hint, dependsOnWork: [] }),
    ),
  );
  const shift = jest.spyOn(Array.prototype, 'shift');
  try {
    expect(scheduling.takeCompleting()).toBeNull();
    expect(scheduling.takeReady()).toBe(rootRef);
    expect(scheduling.inspectEligible().slice(0, 3)).toEqual(
      refs.slice(0, 3).map((ref) => ({ ref, order: 'ON_WORK_READY' })),
    );
    for (const ref of refs) expect(scheduling.takeReady()).toBe(ref);
    expect(scheduling.takeEligible()).toBeNull();
    expect(scheduling.inspectEligible()).toEqual([]);
    expect(shift).not.toHaveBeenCalled();
  } finally {
    shift.mockRestore();
  }
});

test('graph children have no work prerequisites unless explicitly declared', () => {
  const { container, scheduling, rootRef } = setup(['child']);
  const childRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('child', { id: 'child' }),
  )!;

  expect(
    container.liveResolvedGraphView.get(rootRef)?.workWaitsForWorkOf,
  ).toEqual([]);
  expect(
    container.liveResolvedGraphView.get(childRef)?.workWaitsForWorkOf,
  ).toEqual([]);
  expect(scheduling.takeReady()).toBe(rootRef);
  expect(scheduling.takeReady()).toBe(childRef);
  expect(scheduling.takeReady()).toBeNull();
});

test('deduplicates dependencies with SameValueZero and accepts COMPLETION_VISIT_ELIGIBLE as satisfied', () => {
  const dependencyId = {};
  const { container, scheduling, rootRef } = setup(['dependency', 'dependent']);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const dependencyRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('dependency', { id: dependencyId, dependsOnWork: [] }),
  )!;
  expect(scheduling.takeReady()).toBe(dependencyRef);
  container.store.setVisitStage(dependencyRef, 'COMPLETION_VISIT_ELIGIBLE');

  const dependentRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('dependent', {
      id: 'dependent',
      dependsOnWork: [dependencyId, dependencyId, NaN, NaN],
    }),
  )!;
  expect(
    container.liveResolvedGraphView.get(dependentRef)?.workWaitsForWorkOf,
  ).toEqual([dependencyId, NaN]);
  expect(scheduling.takeReady()).toBeNull();

  const omittedParent = new MutableValueReference(
    rootRef
      .getReferencedValue()
      .createEditableShallowCloneWithContentOverrides({
        $childDiscoveryHints: ['missing'],
      }),
  );
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
    result('dependent', { id: 'dependent', dependsOnWork: ['missing'] }),
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
    container.liveResolvedGraphView
      .get(rootRef)
      ?.slots.map((slot) => slot.kind),
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
    result('null-live', { id: null, dependsOnWork: [] }),
  )!;
  const undefinedRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('undefined-live', { id: undefined, dependsOnWork: [] }),
  )!;

  expect(container.liveResolvedGraphView.getVertexRefById(null)).toBe(nullRef);
  expect(container.liveResolvedGraphView.getVertexRefById(undefined)).toBe(
    undefinedRef,
  );
  expect(scheduling.acceptVertex(context(rootRef, 2), omitted())).toBeNull();
  expect(container.liveResolvedGraphView.getVertexRefs()).toEqual([
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
  expect(container.liveResolvedGraphView.get(rootRef)?.slots[1]?.kind).toBe(
    'pending',
  );
});

test('a duplicate null result links the first live identity and preserves its content', () => {
  const { container, scheduling, rootRef } = setup(['first', 'duplicate']);
  const firstRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('first', { id: 'same', dependsOnWork: [] }),
  )!;

  expect(scheduling.acceptVertex(context(rootRef, 1), omitted('same'))).toBe(
    firstRef,
  );
  expect(container.liveResolvedGraphView.getChildrenOf(rootRef)).toEqual([
    firstRef,
    firstRef,
  ]);
  expect(firstRef.getReferencedValue().getVertexData()).toBe('first');
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
    result('first', { id: 'same', dependsOnWork: ['gate'] }),
  )!;
  const duplicateRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('replacement', { id: 'same', dependsOnWork: [] }),
  );

  expect(duplicateRef).toBe(firstRef);
  expect(firstRef.getReferencedValue().getVertexData()).toBe('first');
  expect(
    container.liveResolvedGraphView.get(firstRef)?.workWaitsForWorkOf,
  ).toEqual(['gate']);
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
    result('hint', { dependsOnWork: [] }),
    { vertexId: undefined },
  )!;
  const nan = scheduling.acceptVertex(
    context(rootRef, 1),
    result('nan', { id: NaN, dependsOnWork: [] }),
    { vertexId: NaN },
  )!;
  scheduling.acceptVertex(
    context(rootRef, 2),
    result('zero', { id: -0, dependsOnWork: [] }),
    { vertexId: 0 },
  );

  expect(container.liveResolvedGraphView.getVertexRefById(undefined)).toBe(
    hinted,
  );
  expect(container.liveResolvedGraphView.getVertexRefById(NaN)).toBe(nan);
  expect(() =>
    scheduling.acceptVertex(
      context(rootRef, 3),
      result('bad', { id: {}, dependsOnWork: [] }),
      { vertexId: {} },
    ),
  ).toThrow(/id.*mismatch/i);
  expect(container.liveResolvedGraphView.get(rootRef)?.slots[3]?.kind).toBe(
    'pending',
  );
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
  inherited.vertexContent = { $vertexData: 'root', $childDiscoveryHints: [] };
  inherited.workWaitsForWorkOf = ['ignored'];

  const rootRef = scheduling.acceptRoot(inherited)!;

  expect(
    container.liveResolvedGraphView.getVertexRefById('inherited'),
  ).toBeNull();
  expect(container.liveResolvedGraphView.requireVertexId(rootRef)).toBe(
    rootRef.getReferenceIdentity(),
  );
});

test('retries generated UUID identities that are already indexed', () => {
  const { container, scheduling, rootRef } = setup(['generated']);
  const getId = jest
    .spyOn(MutableValueReference.prototype, 'getReferenceIdentity')
    .mockReturnValueOnce('root')
    .mockReturnValueOnce('fresh-generated-id');
  try {
    const generated = scheduling.acceptVertex(
      context(rootRef, 0),
      result('generated', { dependsOnWork: [] }),
    )!;

    expect(container.liveResolvedGraphView.requireVertexId(generated)).toBe(
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
    result('first', { id: 'deleted', dependsOnWork: [] }),
  )!;
  container.deleteVertices(new Set([deletedRef]));

  expect(
    scheduling.acceptVertex(
      context(rootRef, 1),
      result('replacement', { id: 'deleted', dependsOnWork: [] }),
    ),
  ).toBeNull();
  expect(container.store.getIdState('deleted')).toEqual({ kind: 'deleted' });
  expect(container.liveResolvedGraphView.get(rootRef)?.slots[1]?.kind).toBe(
    'deleted',
  );
});

test('tombstones a new identity whose dependency was already deleted', () => {
  const { container, scheduling, rootRef } = setup(['dependency', 'dependent']);
  const dependencyRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('dependency', { id: 'dependency', dependsOnWork: [] }),
  )!;
  container.deleteVertices(new Set([dependencyRef]));

  expect(
    scheduling.acceptVertex(
      context(rootRef, 1),
      result('dependent', {
        id: 'dependent',
        dependsOnWork: ['dependency'],
      }),
    ),
  ).toBeNull();
  expect(container.store.getIdState('dependent')).toEqual({ kind: 'deleted' });
  expect(container.liveResolvedGraphView.get(rootRef)?.slots[1]?.kind).toBe(
    'deleted',
  );
});

test('an explicitly identified null root records omission and creates no root', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);

  expect(scheduling.acceptRoot(omitted('empty-root'))).toBeNull();
  expect(container.store.getIdState('empty-root')).toEqual({ kind: 'omitted' });
  expect(container.liveResolvedGraphView.getRoot()).toBeNull();
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
  }) as ChildHintVertexIdentity;
  const hinted = scheduling.acceptVertex(
    context(rootRef, 0),
    result('hint', { dependsOnWork: [] }),
    inheritedHint,
  )!;

  expect(
    container.liveResolvedGraphView.getVertexRefById('inherited'),
  ).toBeNull();
  expect(container.liveResolvedGraphView.requireVertexId(hinted)).toBe(
    hinted.getReferenceIdentity(),
  );
});
