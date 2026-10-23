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
  depth = 1,
): VertexResolutionContext<TestGraph> {
  return {
    depth,
    parentVertex: parentRef.unref(),
    parentVertexRef: parentRef,
    hintIndex,
    vertexHint: parentRef.unref().getChildrenHints()[hintIndex]!,
  };
}

function setup(hints: string[], commitRoot = true) {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const rootRef = scheduling.acceptRoot(result('root', hints))!;
  scheduling.prepareSlots(rootRef, hints);
  scheduling.takeReady();
  if (commitRoot) scheduling.markPreVisited(rootRef);
  return { container, scheduling, rootRef };
}

test('a shared descendant survives while it has another live parent', () => {
  const { container, scheduling, rootRef } = setup(['A', 'B']);
  const aRef = scheduling.acceptVertex(
    context(rootRef, 0),
    result('A', ['S']),
  )!;
  const bRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('B', ['S']),
  )!;
  scheduling.prepareSlots(aRef, ['S']);
  scheduling.prepareSlots(bRef, ['S']);
  const sharedRef = scheduling.acceptVertex(context(aRef, 0), result('S'))!;
  scheduling.acceptVertex(context(bRef, 0), result('S'));

  expect(scheduling.deleteVertex(aRef)).toEqual(new Set([aRef]));
  expect(container.resolvedGraph.has(sharedRef)).toBe(true);
  expect(container.resolvedGraph.getParentsOf(sharedRef)).toEqual([bRef]);
  expect(container.resolvedGraph.getChildrenOf(rootRef)).toEqual([bRef]);
});

test('declared dependency deletion cascades despite surviving graph parents', () => {
  const { container, scheduling, rootRef } = setup(['A', 'B', 'D']);
  const aRef = scheduling.acceptVertex(context(rootRef, 0), result('A'))!;
  const bRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('B', ['D']),
  )!;
  scheduling.prepareSlots(bRef, ['D']);
  const dependentRef = scheduling.acceptVertex(
    context(rootRef, 2),
    result('D', [], ['A']),
  )!;
  scheduling.acceptVertex(context(bRef, 0), result('D'));

  expect(scheduling.deleteVertex(aRef)).toEqual(new Set([aRef, dependentRef]));
  expect(container.resolvedGraph.has(dependentRef)).toBe(false);
  expect(container.resolvedGraph.getChildrenOf(bRef)).toEqual([]);
});

test('tombstones delete late dependents before admission', () => {
  const { container, scheduling, rootRef } = setup(['A', 'late']);
  const aRef = scheduling.acceptVertex(context(rootRef, 0), result('A'))!;
  scheduling.deleteVertex(aRef);

  expect(
    scheduling.acceptVertex(context(rootRef, 1), result('late', [], ['A'])),
  ).toBeNull();
  expect(container.store.getIdState('late')).toEqual({ kind: 'deleted' });
  expect(container.resolvedGraph.get(rootRef)?.slots[1]?.kind).toBe('deleted');
});

test('late tombstoning cascades to earlier dependents', () => {
  const { container, scheduling, rootRef } = setup(['A', 'D', 'X', 'E']);
  const aRef = scheduling.acceptVertex(context(rootRef, 0), result('A'))!;
  const dependentRef = scheduling.acceptVertex(
    context(rootRef, 1),
    result('D', [], ['X']),
  )!;
  const cascadeRef = scheduling.acceptVertex(
    context(rootRef, 3),
    result('E', [], ['D']),
  )!;
  scheduling.deleteVertex(aRef);

  expect(
    scheduling.acceptVertex(context(rootRef, 2), result('X', [], ['A'])),
  ).toBeNull();
  expect(container.store.getIdState('X')).toEqual({ kind: 'deleted' });
  expect(container.store.getIdState('D')).toEqual({ kind: 'deleted' });
  expect(container.store.getIdState('E')).toEqual({ kind: 'deleted' });
  expect(container.resolvedGraph.has(dependentRef)).toBe(false);
  expect(container.resolvedGraph.has(cascadeRef)).toBe(false);
  expect(
    container.resolvedGraph.get(rootRef)?.slots.map((slot) => slot.kind),
  ).toEqual(['deleted', 'deleted', 'deleted', 'deleted']);
});

test('deleting the root returns every affected ref and empties the graph', () => {
  const { container, scheduling, rootRef } = setup(['A', 'B']);
  const aRef = scheduling.acceptVertex(context(rootRef, 0), result('A'))!;
  const bRef = scheduling.acceptVertex(context(rootRef, 1), result('B'))!;

  expect(scheduling.deleteVertex(rootRef)).toEqual(
    new Set([rootRef, aRef, bRef]),
  );
  expect(container.resolvedGraph.getRoot()).toBeNull();
  expect(container.resolvedGraph.getVertexRefs()).toEqual([]);
  expect(scheduling.getStall()).toBeNull();
});

test('disabling a subtree during its initial visit closes its slots', () => {
  const { container, scheduling, rootRef } = setup(
    ['unused-1', 'unused-2'],
    false,
  );

  scheduling.disableSubtree(rootRef);
  expect(
    container.resolvedGraph.get(rootRef)?.slots.map((slot) => slot.kind),
  ).toEqual(['disabled', 'disabled']);
  expect(scheduling.takeCompleting()).toBeNull();

  scheduling.markPreVisited(rootRef);
  expect(scheduling.takeCompleting()).toBe(rootRef);
});

test('deep and wide deletion cascades use iterative worklists', () => {
  const depth = 1500;
  const width = 1500;
  const { container, scheduling, rootRef } = setup(['deep', 'wide']);
  let parent = scheduling.acceptVertex(
    context(rootRef, 0),
    result('deep-0', ['next']),
  )!;
  const deepRoot = parent;
  for (let index = 1; index < depth; index += 1) {
    scheduling.prepareSlots(parent, ['next']);
    parent = scheduling.acceptVertex(
      context(parent, 0, index + 1),
      result(`deep-${index}`, index + 1 < depth ? ['next'] : []),
    )!;
  }

  const wideHints = Array.from({ length: width }, (_, index) => `w-${index}`);
  const wideRoot = scheduling.acceptVertex(
    context(rootRef, 1),
    result('wide', wideHints),
  )!;
  scheduling.prepareSlots(wideRoot, wideHints);
  for (let index = 0; index < width; index += 1) {
    scheduling.acceptVertex(context(wideRoot, index, 2), result(`w-${index}`));
  }

  expect(scheduling.deleteVertex(deepRoot).size).toBe(depth);
  expect(scheduling.deleteVertex(wideRoot).size).toBe(width + 1);
  expect(container.resolvedGraph.getVertexRefs()).toEqual([rootRef]);
});

test('detached anchors retain ownership after later discovery', () => {
  const { container, scheduling, rootRef } = setup(['parent']);
  const anchor = scheduling.acceptPrerequisite(
    'anchor',
    result('anchor', ['child']),
  )!;
  const parent = scheduling.acceptVertex(
    context(rootRef, 0),
    result('parent', ['anchor']),
  )!;
  scheduling.prepareSlots(parent, ['anchor']);
  scheduling.acceptVertex(context(parent, 0), result('anchor'));
  scheduling.prepareSlots(anchor, ['child']);
  const child = scheduling.acceptVertex(context(anchor, 0), result('child'))!;
  scheduling.deleteVertex(parent);
  expect(container.resolvedGraph.has(anchor)).toBe(true);
  expect(container.resolvedGraph.getParentsOf(anchor)).toEqual([]);
  expect(container.resolvedGraph.has(child)).toBe(true);
  expect(scheduling.deleteVertex(anchor)).toEqual(new Set([anchor, child]));
  expect(container.isDetachedAnchor(anchor)).toBe(false);
});

test('deleting the original root includes detached anchors and their normal children', () => {
  const { container, scheduling, rootRef } = setup([]);
  const anchor = scheduling.acceptPrerequisite(
    'anchor',
    result('anchor', ['child']),
  )!;
  scheduling.prepareSlots(anchor, ['child']);
  const child = scheduling.acceptVertex(context(anchor, 0), result('child'))!;
  expect(scheduling.deleteVertex(rootRef)).toEqual(
    new Set([rootRef, anchor, child]),
  );
  expect(container.resolvedGraph.getVertexRefs()).toEqual([]);
  expect(scheduling.acceptPrerequisite('anchor', result('anchor'))).toBeNull();
  expect(container.isDetachedAnchor(anchor)).toBe(false);
});

test('lookup acceptance honors live identity, omissions, and deleted prerequisite cascades', () => {
  const { container, scheduling, rootRef } = setup(['deleted', 'dependent']);
  const deleted = scheduling.acceptVertex(
    context(rootRef, 0),
    result('deleted'),
  )!;
  const dependent = scheduling.acceptVertex(
    context(rootRef, 1),
    result('dependent', [], ['lookup']),
  )!;
  scheduling.deleteVertex(deleted);
  expect(
    scheduling.acceptPrerequisite('lookup', result('lookup', [], ['deleted'])),
  ).toBeNull();
  expect(container.resolvedGraph.has(dependent)).toBe(false);
  expect(container.store.getIdState('lookup')).toEqual({ kind: 'deleted' });
  expect(
    scheduling.acceptPrerequisite('root', result('root', ['ignored'])),
  ).toBe(rootRef);
  expect(
    scheduling.acceptPrerequisite('omitted', { vertexContent: null }),
  ).toBeNull();
  expect(
    scheduling.acceptPrerequisite('omitted', { vertexContent: null }),
  ).toBeNull();
  expect(() =>
    scheduling.acceptPrerequisite('omitted', result('omitted')),
  ).toThrow('Vertex omission conflicts with supplied content');
});

test('a quiescent scheduler restored from the container keeps detached anchor ownership', () => {
  const { container, scheduling, rootRef } = setup(['parent']);
  const anchor = scheduling.acceptPrerequisite('anchor', result('anchor'))!;
  const parent = scheduling.acceptVertex(
    context(rootRef, 0),
    result('parent', ['anchor']),
  )!;
  scheduling.prepareSlots(parent, ['anchor']);
  scheduling.acceptVertex(context(parent, 0), result('anchor'));
  scheduling.markPreVisited(parent);
  scheduling.closeExpansion(parent);
  scheduling.closeExpansion(rootRef);
  const restored = new GraphScheduling(container);
  restored.restoreDagSeed([{ ref: anchor, order: 'ON_READY' }]);
  expect(restored.deleteVertex(parent)).toEqual(new Set([parent]));
  expect(container.resolvedGraph.has(anchor)).toBe(true);
  expect(container.resolvedGraph.getParentsOf(anchor)).toEqual([]);
  expect(restored.takeRemovedRefs()).toEqual(new Set([parent]));
  expect(restored.takeRemovedRefs()).toEqual(new Set());
});

test('a dependency cascade reaching the ordinary root also removes independent anchors', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container, undefined, false, 'honor');
  const root = scheduling.acceptRoot(result('root', [], ['prerequisite']))!;
  const prerequisite = scheduling.acceptPrerequisite(
    'prerequisite',
    result('prerequisite'),
  )!;
  const independent = scheduling.acceptPrerequisite(
    'independent',
    result('independent'),
  )!;
  expect(scheduling.deleteVertex(prerequisite)).toEqual(
    new Set([prerequisite, root, independent]),
  );
  expect(container.resolvedGraph.getVertexRefs()).toEqual([]);
});
