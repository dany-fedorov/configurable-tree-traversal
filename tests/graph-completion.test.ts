import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { Ref } from '../src/core/graph/types';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { TestGraph } from './helpers/graph-fixtures';

function result(
  id: string,
  hints: string[] = [],
  dependsOn: readonly unknown[] = [],
): MakeVertexResult<TestGraph> {
  return {
    vertexContent: { $d: id, $c: hints },
    vertexId: id,
    dependsOn,
  };
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

function setup(hints: string[] = []) {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const rootRef = scheduling.acceptRoot(result('root', hints))!;
  container.store.prepareSlots(rootRef, hints);
  return { container, scheduling, rootRef };
}

test('a completed child releases its parent completion obligation', () => {
  const { container, scheduling, rootRef } = setup(['child']);
  expect(scheduling.takeReady()).toBe(rootRef);
  scheduling.markPreVisited(rootRef);
  const childRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('child'),
  )!;
  container.store.prepareSlots(childRef, []);
  expect(scheduling.takeReady()).toBe(childRef);
  scheduling.markPreVisited(childRef);
  scheduling.closeExpansion(rootRef);

  scheduling.closeExpansion(childRef);
  expect(scheduling.takeCompleting()).toBe(childRef);
  expect(scheduling.takeCompleting()).toBeNull();
  scheduling.markComplete(childRef);
  expect(scheduling.takeCompleting()).toBe(rootRef);
});

test('closed empty expansions complete but unprepared expansions do not', () => {
  const { scheduling, rootRef } = setup();
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);

  expect(scheduling.takeCompleting()).toBeNull();
  scheduling.closeExpansion(rootRef);
  expect(scheduling.takeCompleting()).toBe(rootRef);
});

test('completion entries append behind existing initial visits in one FIFO', () => {
  const { container, scheduling, rootRef } = setup(['A', 'B']);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const aRef = scheduling.acceptVertex(context(rootRef, 0), result('A'))!;
  container.store.prepareSlots(aRef, []);
  expect(scheduling.takeReady()).toBe(aRef);
  scheduling.markPreVisited(aRef);
  const bRef = scheduling.acceptVertex(context(rootRef, 1), result('B'))!;

  scheduling.closeExpansion(aRef);

  expect(scheduling.takeCompleting()).toBeNull();
  expect(scheduling.takeEligible()).toEqual({ ref: bRef, order: 'ON_READY' });
  expect(scheduling.takeEligible()).toEqual({
    ref: aRef,
    order: 'ON_COMPLETE',
  });
});

test('duplicate slots are accounted once across completion and later deletion', () => {
  const { container, scheduling, rootRef } = setup(['child-1', 'child-2']);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const childRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('child'),
  )!;
  expect(scheduling.acceptVertex(context(rootRef, 1), result('child'))).toBe(
    childRef,
  );
  container.store.prepareSlots(childRef, []);
  scheduling.takeReady();
  scheduling.markPreVisited(childRef);
  scheduling.closeExpansion(rootRef);
  scheduling.closeExpansion(childRef);
  expect(scheduling.takeCompleting()).toBe(childRef);

  scheduling.markComplete(childRef);
  expect(scheduling.takeCompleting()).toBe(rootRef);
  expect(scheduling.deleteVertex(childRef)).toEqual(new Set([childRef]));
  expect(scheduling.takeCompleting()).toBeNull();
  expect(
    container.resolvedGraph.get(rootRef)?.slots.map((slot) => slot.kind),
  ).toEqual(['deleted', 'deleted']);
});

test('terminal slots release completion and completion commits only once', () => {
  const { scheduling, rootRef } = setup(['missing']);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  scheduling.closeSlot(rootRef, 0, 'omitted');
  scheduling.closeExpansion(rootRef);

  expect(scheduling.takeCompleting()).toBe(rootRef);
  scheduling.markComplete(rootRef);
  scheduling.markComplete(rootRef);
  expect(scheduling.takeCompleting()).toBeNull();
});

test('stall details separate missing dependencies from other incomplete work', () => {
  const { scheduling, rootRef } = setup(['blocked']);
  scheduling.takeReady();
  scheduling.markPreVisited(rootRef);
  const blockedRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('blocked', [], ['missing']),
  )!;

  expect(scheduling.getStall()).toEqual({
    dependencies: [{ id: 'blocked', missing: ['missing'] }],
    incomplete: [rootRef],
  });

  scheduling.closeExpansion(rootRef);
  expect(scheduling.getStall()).toEqual({
    dependencies: [{ id: 'blocked', missing: ['missing'] }],
    incomplete: [rootRef],
  });
  expect(blockedRef).not.toBe(rootRef);
});
