import {
  BreadthFirstTraversal,
  CTTRef,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  ResolvedTree,
  TraversalVisitorCommandName,
  Vertex,
  VertexResolved,
  type TreeTypeParameters,
} from '../src';
import type { DepthFirstTraversalResolvedTreesContainer } from '../src/traversals/depth-first-traversal';
import type { TestGraph } from './helpers/graph-fixtures';

type Node = { $d: string; $c: Node[] };
type TraceTree = TreeTypeParameters<string, Node>;

const node = ($d: string, ...$c: Node[]): Node => ({ $d, $c });

test('BFS resolves one queued child at the next visit boundary', () => {
  const calls: string[] = [];
  const traversal = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      makeVertex: (hint) => {
        calls.push(hint);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });
  const iterator = traversal.makeRunner().getIterable();

  expect(iterator.next().value?.vertex.getData()).toBe('root');
  expect(calls).toEqual([]);
  expect(iterator.next().value?.vertex.getData()).toBe('A');
  expect(calls).toEqual(['A']);
  iterator.return(undefined);
});

test('DFS preserves its callback, context, event, and tree-prefix trace', () => {
  const trace: string[] = [];
  const root = node('root', node('B'), node('C'));
  const traversal = new DepthFirstTraversal<TraceTree>({
    traversableTree: {
      makeRoot: () => {
        trace.push('adapter:root');
        return { vertexContent: root };
      },
      makeVertex: (hint, { resolutionContext, resolvedTree }) => {
        const contents = resolvedTree
          .getPathTo(resolutionContext.parentVertexRef)
          .map((ref) => ref.unref().getData())
          .join('>');
        trace.push(
          `adapter:${hint.$d}:parent=${resolutionContext.parentVertex.getData()}` +
            `:depth=${resolutionContext.depth}:index=${resolutionContext.hintIndex}` +
            `:path=${contents}`,
        );
        return { vertexContent: hint };
      },
    },
  });

  for (const order of Object.values(DepthFirstTraversalOrder)) {
    traversal.addVisitorFor(order, (vertex, options) => {
      const context = options.resolvedTree.getResolutionContextOf(
        options.vertexRef,
      );
      const contents = options.resolvedTree
        .getPathTo(options.vertexRef)
        .map((ref) => ref.unref().getData())
        .join('>');
      trace.push(
        `visitor:${order}:${vertex.getData()}:parent=` +
          `${context?.parentVertex.getData() ?? 'null'}:path=${contents}`,
      );
      if (
        order === DepthFirstTraversalOrder.IN_ORDER &&
        vertex.getData() === 'root'
      ) {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'root-after-B' },
            },
          ],
        };
      }
      return undefined;
    });
  }

  const runner = traversal.makeRunner();
  for (const event of runner.getIterable()) {
    trace.push(`event:${event.order}:${event.vertex.getData()}`);
  }

  expect(trace).toEqual([
    'adapter:root',
    'visitor:PRE_ORDER:root:parent=null:path=root',
    'event:PRE_ORDER:root',
    'adapter:B:parent=root:depth=1:index=0:path=root',
    'visitor:PRE_ORDER:B:parent=root:path=root>B',
    'event:PRE_ORDER:B',
    'visitor:IN_ORDER:B:parent=root:path=root>B',
    'event:IN_ORDER:B',
    'visitor:POST_ORDER:B:parent=root:path=root>B',
    'event:POST_ORDER:B',
    'visitor:IN_ORDER:root:parent=null:path=root',
    'event:IN_ORDER:root-after-B',
    'adapter:C:parent=root-after-B:depth=1:index=1:path=root-after-B',
    'visitor:PRE_ORDER:C:parent=root-after-B:path=root-after-B>C',
    'event:PRE_ORDER:C',
    'visitor:IN_ORDER:C:parent=root-after-B:path=root-after-B>C',
    'event:IN_ORDER:C',
    'visitor:POST_ORDER:C:parent=root-after-B:path=root-after-B>C',
    'event:POST_ORDER:C',
    'visitor:POST_ORDER:root-after-B:parent=null:path=root-after-B',
    'event:POST_ORDER:root-after-B',
  ]);

  const resolvedTree = runner.getResolvedTree();
  const rootRef = resolvedTree.getRoot();
  expect(rootRef?.unref().getData()).toBe('root-after-B');
  expect(
    rootRef &&
      resolvedTree
        .getChildrenOf(rootRef)
        ?.map((ref) => ref.unref().getData()),
  ).toEqual(['B', 'C']);
});

test('resolved-tree records, child arrays, and injected stores retain identity', () => {
  const tree = new ResolvedTree<TraceTree>();
  const ref = new CTTRef(new Vertex<TraceTree>(node('root')));
  const children: CTTRef<Vertex<TraceTree>>[] = [];
  const record = new VertexResolved<TraceTree>({
    $d: { resolutionContext: null },
    $c: children,
  });
  tree.set(ref, record);

  expect(tree.get(ref)).toBe(record);
  expect(tree.getChildrenOf(ref)).toBe(children);

  const source = new DepthFirstTraversal<TraceTree>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    saveNotMutatedResolvedTree: true,
  }).makeRunner().resolvedTreesContainer;
  const injected = new DepthFirstTraversal<TraceTree>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer:
        source as DepthFirstTraversalResolvedTreesContainer<TraceTree, TraceTree>,
    },
  }).makeRunner().resolvedTreesContainer;

  expect(injected.resolvedTree).toBe(source.resolvedTree);
  expect(injected.notMutatedResolvedTree).toBe(source.notMutatedResolvedTree);
  expect(injected.notMutatedResolvedTreeRefsMap).toBe(
    source.notMutatedResolvedTreeRefsMap,
  );
});
