import {
  BreadthFirstTreeTraversalBuilder,
  MutableValueReference,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  MutableResolvedTreeStore,
  TraversalVisitorCommandName,
  Vertex,
  MutableTreeVertexTopologyRecord,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';

test('BFS resolves one queued child at the next visit boundary', () => {
  const calls: string[] = [];
  const traversal = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['A', 'B'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => {
        calls.push(hint);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
  });
  const iterator = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect(iterator.next().value?.vertex.getVertexData()).toBe('root');
  expect(calls).toEqual([]);
  expect(iterator.next().value?.vertex.getVertexData()).toBe('A');
  expect(calls).toEqual(['A']);
  iterator.return(undefined);
});

test('DFS preserves callback boundaries and observes in-order parent rewrites', () => {
  const trace: string[] = [];
  const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        trace.push('adapter:root');
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['left', 'right'],
            },
          },
        };
      },
      resolveChildVertexFromHint: (
        hint,
        { childDiscoveryContext, liveResolvedTreeView: resolvedTree },
      ) => {
        const root = resolvedTree.getRootVertexHandleOrNull();
        const resolved =
          root === null ? [] : resolvedTree.getChildVertexHandlesOrNull(root);
        trace.push(
          `adapter:${hint}:parent=${childDiscoveryContext.parentVertexAtChildResolution.getVertexData()}:depth=${
            childDiscoveryContext.discoveryDepthInEdges
          }:index=${childDiscoveryContext.parentChildHintIndex}:resolved=${[
            root?.getCurrentVertexView().getVertexData(),
            ...(resolved?.map((ref) =>
              ref.getCurrentVertexView().getVertexData(),
            ) ?? []),
          ].join(',')}`,
        );
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
  });

  for (const order of Object.values(DepthFirstTreeVisitPhase)) {
    traversal.registerVisitorCallbackForPhase(order, (vertex) => {
      trace.push(`visitor:${order}:${vertex.getVertexData()}`);
      if (
        order ===
          DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES &&
        vertex.getVertexData() === 'root'
      ) {
        return {
          commands: [
            {
              commandName:
                TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'rewritten-root' },
            },
          ],
        };
      }
      return undefined;
    });
  }

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    trace.push(`iterator:${event.eventKind}:${event.vertex.getVertexData()}`);
  }

  const resolvedTree = runner.getLiveResolvedTreeView();
  const rootRef = resolvedTree.getRootVertexHandleOrNull();
  if (rootRef === null) throw new Error('Expected a resolved root');
  trace.push(
    `tree:${rootRef.getCurrentVertexView().getVertexData()}:${resolvedTree
      .getChildVertexHandlesOrNull(rootRef)
      ?.map((ref) => ref.getCurrentVertexView().getVertexData())
      .join(',')}`,
  );

  expect(trace).toEqual([
    'adapter:root',
    'visitor:BEFORE_CHILD_EXPANSION:root',
    'iterator:BEFORE_CHILD_EXPANSION:root',
    'adapter:left:parent=root:depth=1:index=0:resolved=root',
    'visitor:BEFORE_CHILD_EXPANSION:left',
    'iterator:BEFORE_CHILD_EXPANSION:left',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:left',
    'iterator:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:left',
    'visitor:AFTER_CHILD_SUBTREES:left',
    'iterator:AFTER_CHILD_SUBTREES:left',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:root',
    'iterator:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:rewritten-root',
    'adapter:right:parent=rewritten-root:depth=1:index=1:resolved=rewritten-root,left',
    'visitor:BEFORE_CHILD_EXPANSION:right',
    'iterator:BEFORE_CHILD_EXPANSION:right',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:right',
    'iterator:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:right',
    'visitor:AFTER_CHILD_SUBTREES:right',
    'iterator:AFTER_CHILD_SUBTREES:right',
    'visitor:AFTER_CHILD_SUBTREES:rewritten-root',
    'iterator:AFTER_CHILD_SUBTREES:rewritten-root',
    'tree:rewritten-root:left,right',
  ]);
});

test('ResolvedTreeStore retains supplied records and their child arrays', () => {
  const tree = new MutableResolvedTreeStore<TestGraph>();
  const rootRef = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'root',
      $childDiscoveryHints: ['child'],
    }),
  );
  const childRef = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'child', $childDiscoveryHints: [] }),
  );
  const children = [childRef];
  const suppliedRecord = new MutableTreeVertexTopologyRecord<TestGraph>({
    metadata: { childDiscoveryContext: null },
    childReferences: children,
  });

  tree.setRootVertexReference(rootRef);
  tree.setVertexRecord(rootRef, suppliedRecord);

  expect(tree.getMutableVertexRecordOrNull(rootRef)).toBe(suppliedRecord);
  expect(
    tree.getMutableVertexRecordOrNull(rootRef)?.getMutableChildReferenceList(),
  ).toBe(children);
  expect(tree.getDetachedChildReferenceListOrNull(rootRef)).toEqual(children);
  expect(tree.getDetachedChildReferenceListOrNull(rootRef)).not.toBe(children);
});
