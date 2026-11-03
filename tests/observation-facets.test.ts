import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  type VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<{ label: string }, { label: string }>;
for (const Builder of [
  DepthFirstTreeTraversalBuilder<T>,
  BreadthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Builder.name} restricts observation handles and vertices at runtime`, async () => {
    const data = { label: 'root' };
    const hint = { label: 'child' };
    const runner = new Builder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: data,
              $childDiscoveryHints: [hint],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event);
    const view = runner.getLiveResolvedTreeView()!;
    const root = view.getRootVertexHandleOrNull()!;
    expect('setValue' in root).toBe(false);
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(root.getCurrentVertexView())).toBe(true);
    expect(
      Object.isFrozen(
        root.getCurrentVertexView().getDetachedChildDiscoveryHints(),
      ),
    ).toBe(true);
    expect(root.getCurrentVertexView().getVertexData()).toBe(data);
    expect(
      root.getCurrentVertexView().getDetachedChildDiscoveryHints()[0],
    ).toBe(hint);
    expect(Object.isFrozen(data)).toBe(false);
    expect(Object.isFrozen(hint)).toBe(false);
    const child = view.getChildVertexHandlesOrNull(root)![0]!;
    const context = view.getChildDiscoveryContextOrNull(child)!;
    expect(context.parentVertexHandle).toBe(root);
    expect(context.parentVertexAtChildResolution).toBe(
      root.getCurrentVertexView(),
    );
    expect(Object.isFrozen(context)).toBe(true);
    expect(events[0]!.vertexHandle).toBe(root);
    expect('isTraversalRoot' in events[0]!).toBe(false);
    expect('isTraversalRootVertex' in runner).toBe(false);
  });
}

import {
  DepthFirstTreeVisitPhase,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  type VertexHandle,
  type VertexView,
  type TreeVisitorContext,
  type DagVisitorContext,
  type TreeChildResolverContext,
  type ChildDiscoveryContext,
} from '../src';

function assertVertex(vertex: VertexView<T>) {
  expect(Object.isFrozen(vertex)).toBe(true);
  expect('setData' in vertex).toBe(false);
  expect(Object.isFrozen(vertex.getDetachedChildDiscoveryHints())).toBe(true);
  expect(() =>
    Object.assign(vertex, { $vertexData: { label: 'forged' } }),
  ).toThrow(TypeError);
  const clone = vertex.createEditableShallowCloneWithContentOverrides();
  expect(clone.getVertexData()).toBe(vertex.getVertexData());
  expect(clone.getMutableChildDiscoveryHints()).not.toBe(
    vertex.getDetachedChildDiscoveryHints(),
  );
  clone.getMutableChildDiscoveryHints().length = 0;
}
function assertHandle(handle: VertexHandle<T>) {
  expect('setValue' in handle).toBe(false);
  expect(Object.isFrozen(handle)).toBe(true);
  assertVertex(handle.getCurrentVertexView());
}

for (const [Builder, phase] of [
  [DepthFirstTreeTraversalBuilder<T>, 'BEFORE_CHILD_EXPANSION'],
  [BreadthFirstTreeTraversalBuilder<T>, 'AT_LEVEL_ORDER_VERTEX'],
  [AsyncDepthFirstTreeTraversalBuilder<T>, 'BEFORE_CHILD_EXPANSION'],
  [AsyncBreadthFirstTreeTraversalBuilder<T>, 'AT_LEVEL_ORDER_VERTEX'],
  [DagTraversalBuilder<T>, 'ON_WORK_READY'],
  [AsyncDagTraversalBuilder<T>, 'ON_WORK_READY'],
] as const) {
  test(`${Builder.name} restricts callbacks, source contexts, originals and graph records`, async () => {
    const accepted: ChildDiscoveryContext<T>[] = [];
    const handles: VertexHandle<T>[] = [];
    const data = { label: 'root' };
    const childHint = { label: 'child' };
    let sourceContext: TreeChildResolverContext<T, T> | undefined;
    const visitor = (
      vertex: VertexView<T>,
      context: TreeVisitorContext<string, T, T> | DagVisitorContext<T>,
    ) => {
      assertVertex(vertex);
      assertHandle(context.vertexHandle);
      expect(context.vertexHandle.getCurrentVertexView()).toBe(vertex);
      expect('resolvedTree' in context).toBe(false);
      expect('resolvedGraph' in context).toBe(false);
      expect('isTraversalRoot' in context).toBe(false);
      if (context.previousCommittedVisitVertexHandleForSamePhase !== null)
        expect(context.previousCommittedVisitVertexHandleForSamePhase).toBe(
          handles[handles.length - 1],
        );
      handles.push(context.vertexHandle);
      if ('liveResolvedTreeView' in context) {
        expect('set' in context.liveResolvedTreeView).toBe(false);
        expect(
          context.liveResolvedTreeView.containsVertexHandle(
            context.vertexHandle,
          ),
        ).toBe(true);
        const saved =
          context.preCommandDiscoveredTreeView?.getRootVertexHandleOrNull();
        if (saved != null) {
          assertHandle(saved);
          expect(saved.getCurrentVertexView().getVertexData()).toBe(data);
        }
      } else {
        expect(
          context.liveResolvedGraphView.getVertexSnapshotOrNull(
            context.vertexHandle,
          )!.vertexHandle,
        ).toBe(context.vertexHandle);
        const saved =
          context.preCommandDiscoveredGraphView?.getDesignatedRootHandleOrNull();
        if (saved != null) {
          assertHandle(saved);
          expect(saved.getCurrentVertexView().getVertexData()).toBe(data);
        }
      }
      if (vertex.getVertexData() === data)
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: {
                replacementVertexData: { label: 'rewritten' },
              },
            },
          ],
        };
      return undefined;
    };
    const runner = new Builder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: data,
              $childDiscoveryHints: [childHint],
            },
          },
        }),
        resolveChildVertexFromHint: (_hint, context) => {
          sourceContext = context;
          expect('resolvedTree' in context).toBe(false);
          expect('set' in context.liveResolvedTreeView).toBe(false);
          expect(Object.isFrozen(context.childDiscoveryContext)).toBe(true);
          assertHandle(context.childDiscoveryContext.parentVertexHandle);
          assertVertex(
            context.childDiscoveryContext.parentVertexAtChildResolution,
          );
          expect(context.childDiscoveryContext.parentVertexHandle).toBe(
            handles[0],
          );
          expect(context.childDiscoveryContext.childDiscoveryHint).toBe(
            childHint,
          );
          accepted.push(context.childDiscoveryContext);
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: childHint,
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
      [phase === 'ON_WORK_READY'
        ? 'retainDiscoveredGraphBeforeVisitorCommands'
        : 'retainDiscoveredTreeBeforeVisitorCommands']: true,
      visitors: { [phase]: visitor },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      assertVertex(event.vertex);
      assertHandle(event.vertexHandle);
      events.push(event);
    }
    expect('getResolvedTreeStore' in runner).toBe(false);
    expect('getResolvedGraph' in runner).toBe(false);
    const view = runner.getLiveResolvedTreeView()!;
    const root = view.getRootVertexHandleOrNull()!;
    const child = view.getChildVertexHandlesOrNull(root)![0]!;
    expect(view.getChildDiscoveryContextOrNull(child)).toBe(accepted[0]);
    expect(sourceContext!.liveResolvedTreeView).toBe(view);
    expect(root).toBe(handles[0]);
    expect(root.getCurrentVertexView().getVertexData().label).toBe('rewritten');
    expect(events.find((event) => event.vertexHandle === root)).toBeDefined();
    const graph = runner.getLiveResolvedGraphView();
    expect(graph.getDesignatedRootHandleOrNull()).toBe(root);
    expect(graph.getVertexHandleByIdOrNull(graph.requireVertexId(child))).toBe(
      child,
    );
    expect(
      graph.getVertexSnapshotOrNull(child)!.incomingStructuralChildEdges[0]!
        .parentVertexHandle,
    ).toBe(root);
    expect(
      graph.getVertexSnapshotOrNull(root)!.orderedChildDiscoverySlots[0],
    ).toMatchObject({ childVertexHandle: child });
    for (const handle of graph.requireAllStructuralAncestorPathsTo(child)[0]!)
      assertHandle(handle);
    expect(Object.isFrozen(graph.getVertexHandles())).toBe(true);
    const forged = {
      getReferenceIdentity: () => root.getReferenceIdentity(),
      getCurrentVertexView: () => root.getCurrentVertexView(),
    };
    expect(view.containsVertexHandle(forged)).toBe(false);
    expect(graph.containsVertexHandle(forged)).toBe(false);
    expect(graph.getVertexSnapshotOrNull(forged)).toBeNull();
    expect(graph.getDistinctStructuralParentHandlesOrNull(forged)).toBeNull();
    expect(graph.getStructuralChildHandlesInSlotOrderOrNull(forged)).toBeNull();
    expect(graph.getVertexVisitSchedulingStageOrNull(forged)).toBeNull();
    expect(() => graph.requireVertexId(forged)).toThrow();
    expect(() =>
      graph.requireAllStructuralAncestorPathsTo(child, {
        extra: true,
      } as never),
    ).toThrow(TypeError);
  });
}

for (const Builder of [
  DagTraversalBuilder<T, T, unknown>,
  AsyncDagTraversalBuilder<T, T, unknown>,
]) {
  test.each([undefined, NaN, {}, Symbol('root')])(
    `${Builder.name} preserves arbitrary IDs in graph source contexts`,
    async (id) => {
      const childId = {};
      let observedParent: VertexHandle<T> | undefined;
      const runner = new Builder({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: id,
              vertexContentInput: {
                $vertexData: { label: 'root' },
                $childDiscoveryHints: [{ label: 'child' }],
              },
            },
          }),
          resolveChildHint: (_hint, context) => {
            expect('resolvedGraph' in context).toBe(false);
            observedParent =
              context.structuralChildResolution.parentVertexHandle!;
            assertHandle(observedParent);
            expect(
              context.liveResolvedGraphView.requireVertexId(observedParent),
            ).toBe(id);
            return {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexId: childId,
                vertexContentInput: {
                  $vertexData: { label: 'child' },
                  $childDiscoveryHints: [],
                },
              },
            };
          },
        },
        retainDiscoveredGraphBeforeVisitorCommands: true,
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
      ).toBe(observedParent);
      expect(
        runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(id),
      ).toBe(observedParent);
      const saved = runner.preCommandDiscoveredGraphView!;
      const savedRoot = saved.getDesignatedRootHandleOrNull()!;
      assertHandle(savedRoot);
      expect(saved.requireVertexId(savedRoot)).toBe(id);
      expect(
        saved.requireAllStructuralAncestorPathsTo(
          saved.getVertexHandleByIdOrNull(childId)!,
        )[0]![0],
      ).toBe(savedRoot);
    },
  );
}

for (const Builder of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
]) {
  test(`${Builder.name} keeps recorded event values separate from live handles`, async () => {
    const runner = new Builder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: { label: 'before' },
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
      visitors: {
        [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: () => ({
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: { label: 'after' } },
            },
          ],
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event);
    expect(events[0]!.vertex.getVertexData().label).toBe('before');
    expect(
      events[0]!.vertexHandle.getCurrentVertexView().getVertexData().label,
    ).toBe('after');
    expect(events[0]!.vertex).not.toBe(
      events[0]!.vertexHandle.getCurrentVertexView(),
    );
  });
}
for (const Builder of [DagTraversalBuilder<T>, AsyncDagTraversalBuilder<T>]) {
  test(`${Builder.name} keeps committed milestone values separate from live handles`, async () => {
    const runner = new Builder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: { label: 'before' },
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
      visitors: {
        [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: () => ({
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: { label: 'after' } },
            },
          ],
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event);
    expect(events[0]!.vertex.getVertexData().label).toBe('before');
    expect(
      events[0]!.vertexHandle.getCurrentVertexView().getVertexData().label,
    ).toBe('after');
  });
}

for (const Builder of [DagTraversalBuilder<T>, AsyncDagTraversalBuilder<T>]) {
  test(`${Builder.name} hides synthetic entry parents from source contexts`, async () => {
    const contexts: unknown[] = [];
    const runner = new Builder({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: { label: 'private holder' },
              $childDiscoveryHints: [{ label: 'entry' }],
            },
          },
        }),
        resolveChildHint: (hint, context) => {
          contexts.push(context.structuralChildResolution);
          if (hint.label === 'entry') {
            expect(
              context.structuralChildResolution.parentVertexAtChildResolution,
            ).toBeNull();
            expect(
              context.structuralChildResolution.parentVertexHandle,
            ).toBeNull();
            expect(context.structuralChildResolution).toMatchObject({
              discoveryDepthInEdges: 1,
              parentChildHintIndex: 0,
              childDiscoveryHint: hint,
            });
          } else {
            expect(
              context.structuralChildResolution.parentVertexAtChildResolution!.getVertexData()
                .label,
            ).toBe('entry');
            expect(
              context.liveResolvedGraphView.containsVertexHandle(
                context.structuralChildResolution.parentVertexHandle!,
              ),
            ).toBe(true);
          }
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: hint.label,
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints:
                  hint.label === 'entry' ? [{ label: 'child' }] : [],
              },
            },
          };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(contexts).toHaveLength(2);
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandles()
        .map((ref) => ref.getCurrentVertexView().getVertexData().label),
    ).toEqual(['entry', 'child']);
  });
}
