import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  type VertexTypes,
} from '../src';

type T = VertexTypes<{ label: string }, { label: string }>;
for (const Builder of [
  DepthFirstTreeTraversal<T>,
  BreadthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  test(`${Builder.name} restricts observation handles and vertices at runtime`, async () => {
    const data = { label: 'root' };
    const hint = { label: 'child' };
    const runner = new Builder({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: data, $childHints: [hint] } },
        }),
        resolveChild: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: hint, $childHints: [] } },
        }),
      },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) events.push(event);
    const view = runner.getResolvedTreeView()!;
    const root = view.getRoot()!;
    expect('setValue' in root).toBe(false);
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(root.getValue())).toBe(true);
    expect(Object.isFrozen(root.getValue().getChildrenHints())).toBe(true);
    expect(root.getValue().getData()).toBe(data);
    expect(root.getValue().getChildrenHints()[0]).toBe(hint);
    expect(Object.isFrozen(data)).toBe(false);
    expect(Object.isFrozen(hint)).toBe(false);
    const child = view.getChildrenOf(root)![0]!;
    const context = view.getResolutionContextOf(child)!;
    expect(context.parentVertexRef).toBe(root);
    expect(context.parentVertex).toBe(root.getValue());
    expect(Object.isFrozen(context)).toBe(true);
    expect(events[0]!.vertexRef).toBe(root);
    expect('isTraversalRoot' in events[0]!).toBe(false);
    expect('isTraversalRootVertex' in runner).toBe(false);
  });
}

import {
  DepthFirstPhase,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  type VertexHandle,
  type VertexView,
  type TreeVisitorContext,
  type DagVisitorContext,
  type TreeChildResolutionContext,
  type VertexResolutionContext,
} from '../src';

function assertVertex(vertex: VertexView<T>) {
  expect(Object.isFrozen(vertex)).toBe(true);
  expect('setData' in vertex).toBe(false);
  expect(Object.isFrozen(vertex.getChildrenHints())).toBe(true);
  expect(() => Object.assign(vertex, { $data: { label: 'forged' } })).toThrow(
    TypeError,
  );
  const clone = vertex.clone();
  expect(clone.getData()).toBe(vertex.getData());
  expect(clone.getChildrenHints()).not.toBe(vertex.getChildrenHints());
  clone.getChildrenHints().length = 0;
}
function assertHandle(handle: VertexHandle<T>) {
  expect('setValue' in handle).toBe(false);
  expect(Object.isFrozen(handle)).toBe(true);
  assertVertex(handle.getValue());
}

for (const [Builder, phase] of [
  [DepthFirstTreeTraversal<T>, 'PRE_ORDER'],
  [BreadthFirstTreeTraversal<T>, 'LEVEL_ORDER'],
  [AsyncDepthFirstTreeTraversal<T>, 'PRE_ORDER'],
  [AsyncBreadthFirstTreeTraversal<T>, 'LEVEL_ORDER'],
  [DagTraversal<T>, 'ON_WORK_READY'],
  [AsyncDagTraversal<T>, 'ON_WORK_READY'],
] as const) {
  test(`${Builder.name} restricts callbacks, source contexts, originals and graph records`, async () => {
    const accepted: VertexResolutionContext<T>[] = [];
    const handles: VertexHandle<T>[] = [];
    const data = { label: 'root' };
    const childHint = { label: 'child' };
    let sourceContext: TreeChildResolutionContext<T, T> | undefined;
    const visitor = (
      vertex: VertexView<T>,
      context: TreeVisitorContext<string, T, T> | DagVisitorContext<T>,
    ) => {
      assertVertex(vertex);
      assertHandle(context.vertexRef);
      expect(context.vertexRef.getValue()).toBe(vertex);
      expect('resolvedTree' in context).toBe(false);
      expect('resolvedGraph' in context).toBe(false);
      expect('isTraversalRoot' in context).toBe(false);
      if (context.previousPhaseVertexRef !== null)
        expect(context.previousPhaseVertexRef).toBe(
          handles[handles.length - 1],
        );
      handles.push(context.vertexRef);
      if ('resolvedTreeView' in context) {
        expect('set' in context.resolvedTreeView).toBe(false);
        expect(context.resolvedTreeView.has(context.vertexRef)).toBe(true);
        const saved = context.originalTreeView?.getRoot();
        if (saved != null) {
          assertHandle(saved);
          expect(saved.getValue().getData()).toBe(data);
        }
      } else {
        expect(
          context.resolvedGraphView.get(context.vertexRef)!.vertexRef,
        ).toBe(context.vertexRef);
        const saved = context.originalGraphView?.getRoot();
        if (saved != null) {
          assertHandle(saved);
          expect(saved.getValue().getData()).toBe(data);
        }
      }
      if (vertex.getData() === data)
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: { label: 'rewritten' } },
            },
          ],
        };
      return undefined;
    };
    const runner = new Builder({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: data, $childHints: [childHint] } },
        }),
        resolveChild: (_hint, context) => {
          sourceContext = context;
          expect('resolvedTree' in context).toBe(false);
          expect('set' in context.resolvedTreeView).toBe(false);
          expect(Object.isFrozen(context.resolutionContext)).toBe(true);
          assertHandle(context.resolutionContext.parentVertexRef);
          assertVertex(context.resolutionContext.parentVertex);
          expect(context.resolutionContext.parentVertexRef).toBe(handles[0]);
          expect(context.resolutionContext.vertexHint).toBe(childHint);
          accepted.push(context.resolutionContext);
          return {
            kind: 'found',
            vertex: { vertexContent: { $data: childHint, $childHints: [] } },
          };
        },
      },
      [phase === 'ON_WORK_READY'
        ? 'retainOriginalGraphStructure'
        : 'retainOriginalTreeStructure']: true,
      visitors: { [phase]: visitor },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) {
      assertVertex(event.vertex);
      assertHandle(event.vertexRef);
      events.push(event);
    }
    expect('getResolvedTreeStore' in runner).toBe(false);
    expect('getResolvedGraph' in runner).toBe(false);
    const view = runner.getResolvedTreeView()!;
    const root = view.getRoot()!;
    const child = view.getChildrenOf(root)![0]!;
    expect(view.getResolutionContextOf(child)).toBe(accepted[0]);
    expect(sourceContext!.resolvedTreeView).toBe(view);
    expect(root).toBe(handles[0]);
    expect(root.getValue().getData().label).toBe('rewritten');
    expect(events.find((event) => event.vertexRef === root)).toBeDefined();
    const graph = runner.getResolvedGraphView();
    expect(graph.getRoot()).toBe(root);
    expect(graph.getVertexRefById(graph.getVertexId(child))).toBe(child);
    expect(graph.get(child)!.incoming[0]!.parentRef).toBe(root);
    expect(graph.get(root)!.slots[0]).toMatchObject({ childRef: child });
    for (const handle of graph.getPathsTo(child)[0]!) assertHandle(handle);
    expect(Object.isFrozen(graph.getVertexRefs())).toBe(true);
    const forged = {
      getRefId: () => root.getRefId(),
      getValue: () => root.getValue(),
    };
    expect(view.has(forged)).toBe(false);
    expect(graph.has(forged)).toBe(false);
    expect(graph.get(forged)).toBeNull();
    expect(graph.getParentsOf(forged)).toBeNull();
    expect(graph.getChildrenOf(forged)).toBeNull();
    expect(graph.getVisitStageOf(forged)).toBeNull();
    expect(() => graph.getVertexId(forged)).toThrow();
    expect(() => graph.getPathsTo(child, { extra: true } as never)).toThrow(
      TypeError,
    );
  });
}

for (const Builder of [
  DagTraversal<T, T, unknown>,
  AsyncDagTraversal<T, T, unknown>,
]) {
  test.each([undefined, NaN, {}, Symbol('root')])(
    `${Builder.name} preserves arbitrary IDs in graph source contexts`,
    async (id) => {
      const childId = {};
      let observedParent: VertexHandle<T> | undefined;
      const runner = new Builder({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found',
            vertex: {
              vertexId: id,
              vertexContent: {
                $data: { label: 'root' },
                $childHints: [{ label: 'child' }],
              },
            },
          }),
          resolveChild: (_hint, context) => {
            expect('resolvedGraph' in context).toBe(false);
            observedParent = context.resolutionContext.parentVertexRef!;
            assertHandle(observedParent);
            expect(context.resolvedGraphView.getVertexId(observedParent)).toBe(
              id,
            );
            return {
              kind: 'found',
              vertex: {
                vertexId: childId,
                vertexContent: { $data: { label: 'child' }, $childHints: [] },
              },
            };
          },
        },
        retainOriginalGraphStructure: true,
      }).createRunner();
      await runner.run();
      expect(runner.getResolvedGraphView().getRoot()).toBe(observedParent);
      expect(runner.getResolvedGraphView().getVertexRefById(id)).toBe(
        observedParent,
      );
      const saved = runner.originalGraphView!;
      const savedRoot = saved.getRoot()!;
      assertHandle(savedRoot);
      expect(saved.getVertexId(savedRoot)).toBe(id);
      expect(saved.getPathsTo(saved.getVertexRefById(childId)!)[0]![0]).toBe(
        savedRoot,
      );
    },
  );
}

for (const Builder of [
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
]) {
  test(`${Builder.name} keeps recorded event values separate from live handles`, async () => {
    const runner = new Builder({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexContent: { $data: { label: 'before' }, $childHints: [] },
          },
        }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
      visitors: {
        [DepthFirstPhase.POST_ORDER]: () => ({
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: { label: 'after' } },
            },
          ],
        }),
      },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) events.push(event);
    expect(events[0]!.vertex.getData().label).toBe('before');
    expect(events[0]!.vertexRef.getValue().getData().label).toBe('after');
    expect(events[0]!.vertex).not.toBe(events[0]!.vertexRef.getValue());
  });
}
for (const Builder of [DagTraversal<T>, AsyncDagTraversal<T>]) {
  test(`${Builder.name} keeps committed milestone values separate from live handles`, async () => {
    const runner = new Builder({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexContent: { $data: { label: 'before' }, $childHints: [] },
          },
        }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
      visitors: {
        [DagVisitorPhase.ON_SUBGRAPH_READY]: () => ({
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: { label: 'after' } },
            },
          ],
        }),
      },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) events.push(event);
    expect(events[0]!.vertex.getData().label).toBe('before');
    expect(events[0]!.vertexRef.getValue().getData().label).toBe('after');
  });
}

for (const Builder of [DagTraversal<T>, AsyncDagTraversal<T>]) {
  test(`${Builder.name} hides synthetic entry parents from source contexts`, async () => {
    const contexts: unknown[] = [];
    const runner = new Builder({
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexContent: {
              $data: { label: 'private holder' },
              $childHints: [{ label: 'entry' }],
            },
          },
        }),
        resolveChild: (hint, context) => {
          contexts.push(context.resolutionContext);
          if (hint.label === 'entry') {
            expect(context.resolutionContext.parentVertex).toBeNull();
            expect(context.resolutionContext.parentVertexRef).toBeNull();
            expect(context.resolutionContext).toMatchObject({
              depth: 1,
              hintIndex: 0,
              vertexHint: hint,
            });
          } else {
            expect(
              context.resolutionContext.parentVertex!.getData().label,
            ).toBe('entry');
            expect(
              context.resolvedGraphView.has(
                context.resolutionContext.parentVertexRef!,
              ),
            ).toBe(true);
          }
          return {
            kind: 'found',
            vertex: {
              vertexId: hint.label,
              vertexContent: {
                $data: hint,
                $childHints: hint.label === 'entry' ? [{ label: 'child' }] : [],
              },
            },
          };
        },
      },
    }).createRunner();
    await runner.run();
    expect(contexts).toHaveLength(2);
    expect(
      runner
        .getResolvedGraphView()
        .getVertexRefs()
        .map((ref) => ref.getValue().getData().label),
    ).toEqual(['entry', 'child']);
  });
}
