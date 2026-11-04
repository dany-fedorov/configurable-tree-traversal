import type { VertexView } from '../src';
import {
  MutableValueReference,
  AsyncDepthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  BreadthFirstTreeVisitPhase,
  type LiveResolvedTreeView,
  type TreeVisitorContext,
  type Vertex,
  type VertexDataAndChildHintTypes,
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  MutableTreeVertexTopologyRecord,
  Vertex as VertexValue,
  type LivePreCommandDiscoveredGraphView,
} from '../src';

test('mutable handles preserve reference identity when their value changes', () => {
  const ref = new MutableValueReference({ value: 1 });
  const id = ref.getReferenceIdentity();
  ref.replaceReferencedValue({ value: 2 });
  expect(ref.getReferencedValue()).toEqual({ value: 2 });
  expect(ref.getReferenceIdentity()).toBe(id);
});

type RetainedTree = VertexDataAndChildHintTypes<{ count: number }, string>;
for (const Constructor of [
  DepthFirstTreeTraversalBuilder<RetainedTree>,
  AsyncDepthFirstTreeTraversalBuilder<RetainedTree>,
  BreadthFirstTreeTraversalBuilder<RetainedTree>,
  AsyncBreadthFirstTreeTraversalBuilder<RetainedTree>,
]) {
  test(`${Constructor.name} exposes progressive original structure with shared payloads`, async () => {
    const data = { count: 1 };
    let retained: LiveResolvedTreeView<RetainedTree> | null = null;
    const sizes: number[] = [];
    const visit = (
      _vertex: VertexView<RetainedTree>,
      context: TreeVisitorContext<string, RetainedTree, RetainedTree>,
    ) => {
      retained = context.livePreCommandDiscoveredTreeView;
      expect(retained).not.toHaveProperty('set');
      const root = retained!.getRootVertexHandleOrNull()!;
      expect(root.getCurrentVertexView().getVertexData()).toBe(data);
      sizes.push(retained!.getChildVertexHandlesOrNull(root)!.length);
      const children = retained!.getChildVertexHandlesOrNull(root)!;
      expect(() => {
        (children as unknown[]).length = 0;
      }).toThrow(TypeError);
    };
    const visitors =
      Constructor === DepthFirstTreeTraversalBuilder ||
      Constructor === AsyncDepthFirstTreeTraversalBuilder
        ? { [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: visit }
        : { [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: visit };
    const runner = new Constructor({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: data,
              $childDiscoveryHints: ['child'],
            },
          },
        }),
        resolveChildVertexFromHint: (_hint, context) => {
          expect(context.livePreCommandDiscoveredTreeView).toBe(retained);
          expect(context.livePreCommandDiscoveredTreeView).not.toHaveProperty(
            'set',
          );
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: { count: 2 },
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
      retainDiscoveredTreeBeforeVisitorCommands: true,
      visitors,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(sizes).toEqual([0, 1]);
    const view = retained! as LiveResolvedTreeView<RetainedTree>;
    expect(
      view.getChildVertexHandlesOrNull(view.getRootVertexHandleOrNull()!),
    ).toHaveLength(1);
    data.count = 9;
    expect(
      view.getRootVertexHandleOrNull()!.getCurrentVertexView().getVertexData()
        .count,
    ).toBe(9);
  });
}

test('tree records own metadata and children independently of Vertex content aliases', () => {
  const metadata = { childDiscoveryContext: null };
  const children: MutableValueReference<Vertex<RetainedTree>>[] = [];
  const record = new MutableTreeVertexTopologyRecord<RetainedTree>({
    metadata,
    childReferences: children,
  });
  expect(Object.keys(record)).toEqual(['metadata', 'childReferences']);
  expect(record.metadata).toBe(metadata);
  expect(record.childReferences).toBe(children);
  const child = new MutableValueReference(
    new VertexValue<RetainedTree>({
      $vertexData: { count: 2 },
      $childDiscoveryHints: [],
    }),
  );
  record.appendChildReferences([child]);
  expect(record.getMutableChildReferenceList()).toEqual([child]);
  const clone = record.shallowCloneWithRecordOverrides();
  expect(clone.metadata).not.toBe(metadata);
  expect(clone.childReferences).not.toBe(children);
  expect(clone.childReferences[0]).toBe(child);
});

for (const Constructor of [
  DagTraversalBuilder<RetainedTree>,
  AsyncDagTraversalBuilder<RetainedTree>,
]) {
  test(`${Constructor.name} retains progressively discovered original graph structure`, async () => {
    const data = { count: 1 };
    let retained: LivePreCommandDiscoveredGraphView<RetainedTree> | null = null;
    const sizes: number[] = [];
    const runner = new Constructor({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: data,
              $childDiscoveryHints: ['child'],
            },
          },
        }),
        resolveChildVertexFromHint: (_hint, context) => {
          expect(context.livePreCommandDiscoveredGraphView).toBe(retained);
          expect(retained!.getVertexHandles()).toHaveLength(1);
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'child',
              vertexContentInput: {
                $vertexData: { count: 2 },
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
      retainDiscoveredGraphBeforeVisitorCommands: true,
      visitors: {
        [DagVisitorPhase.ON_WORK_READY]: (_vertex, context) => {
          retained = context.livePreCommandDiscoveredGraphView;
          sizes.push(retained!.getVertexHandles().length);
          expect(
            retained!
              .getVertexHandleByIdOrNull('root')!
              .getCurrentVertexView()
              .getVertexData(),
          ).toBe(data);
          expect(() => {
            // @ts-expect-error readonly observation collection
            retained!.getVertexHandles().length = 0;
          }).toThrow(TypeError);
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(sizes).toEqual([1, 2]);
    const view = retained! as LivePreCommandDiscoveredGraphView<RetainedTree>;
    const root = view.getVertexHandleByIdOrNull('root')!;
    expect(view.getStructuralChildHandlesInSlotOrderOrNull(root)).toHaveLength(
      1,
    );
    expect(() => {
      // @ts-expect-error readonly observation collection
      view.getStructuralChildHandlesInSlotOrderOrNull(root)!.length = 0;
    }).toThrow(TypeError);
    expect(view.getStructuralChildHandlesInSlotOrderOrNull(root)).toHaveLength(
      1,
    );
    data.count = 9;
    expect(root.getCurrentVertexView().getVertexData().count).toBe(9);
  });
}
