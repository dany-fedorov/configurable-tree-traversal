import {
  BreadthFirstTreeTraversal,
  MutableRef,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  ResolvedTreeStore,
  TraversalVisitorCommandName,
  Vertex,
  TreeVertexRecord,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';

test('BFS resolves one queued child at the next visit boundary', () => {
  const calls: string[] = [];
  const traversal = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      resolveChild: (hint) => {
        calls.push(hint);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });
  const iterator = traversal.createRunner().iterateEvents();
  expect(iterator.next().value?.vertex.getData()).toBe('root');
  expect(calls).toEqual([]);
  expect(iterator.next().value?.vertex.getData()).toBe('A');
  expect(calls).toEqual(['A']);
  iterator.return(undefined);
});

test('DFS preserves callback boundaries and observes in-order parent rewrites', () => {
  const trace: string[] = [];
  const traversal = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        trace.push('adapter:root');
        return { vertexContent: { $d: 'root', $c: ['left', 'right'] } };
      },
      resolveChild: (hint, { resolutionContext, resolvedTree }) => {
        const root = resolvedTree.getRoot();
        const resolved = root === null ? [] : resolvedTree.getChildrenOf(root);
        trace.push(
          `adapter:${hint}:parent=${resolutionContext.parentVertex.getData()}:depth=${
            resolutionContext.depth
          }:index=${resolutionContext.hintIndex}:resolved=${[
            root?.getValue().getData(),
            ...(resolved?.map((ref) => ref.getValue().getData()) ?? []),
          ].join(',')}`,
        );
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });

  for (const order of Object.values(DepthFirstPhase)) {
    traversal.addVisitorFor(order, (vertex) => {
      trace.push(`visitor:${order}:${vertex.getData()}`);
      if (
        order === DepthFirstPhase.IN_ORDER &&
        vertex.getData() === 'root'
      ) {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'rewritten-root' },
            },
          ],
        };
      }
      return undefined;
    });
  }

  const runner = traversal.createRunner();
  for (const event of runner.iterateEvents()) {
    trace.push(`iterator:${event.phase}:${event.vertex.getData()}`);
  }

  const resolvedTree = runner.getResolvedTreeStore();
  const rootRef = resolvedTree.getRoot();
  if (rootRef === null) throw new Error('Expected a resolved root');
  trace.push(
    `tree:${rootRef.getValue().getData()}:${resolvedTree
      .getChildrenOf(rootRef)
      ?.map((ref) => ref.getValue().getData())
      .join(',')}`,
  );

  expect(trace).toEqual([
    'adapter:root',
    'visitor:PRE_ORDER:root',
    'iterator:PRE_ORDER:root',
    'adapter:left:parent=root:depth=1:index=0:resolved=root',
    'visitor:PRE_ORDER:left',
    'iterator:PRE_ORDER:left',
    'visitor:IN_ORDER:left',
    'iterator:IN_ORDER:left',
    'visitor:POST_ORDER:left',
    'iterator:POST_ORDER:left',
    'visitor:IN_ORDER:root',
    'iterator:IN_ORDER:rewritten-root',
    'adapter:right:parent=rewritten-root:depth=1:index=1:resolved=rewritten-root,left',
    'visitor:PRE_ORDER:right',
    'iterator:PRE_ORDER:right',
    'visitor:IN_ORDER:right',
    'iterator:IN_ORDER:right',
    'visitor:POST_ORDER:right',
    'iterator:POST_ORDER:right',
    'visitor:POST_ORDER:rewritten-root',
    'iterator:POST_ORDER:rewritten-root',
    'tree:rewritten-root:left,right',
  ]);
});

test('ResolvedTreeStore retains supplied records and their child arrays', () => {
  const tree = new ResolvedTreeStore<TestGraph>();
  const rootRef = new MutableRef(
    new Vertex<TestGraph>({ $d: 'root', $c: ['child'] }),
  );
  const childRef = new MutableRef(
    new Vertex<TestGraph>({ $d: 'child', $c: [] }),
  );
  const children = [childRef];
  const suppliedRecord = new TreeVertexRecord<TestGraph>({
    metadata: { resolutionContext: null },
    children: children,
  });

  tree.setRoot(rootRef);
  tree.set(rootRef, suppliedRecord);

  expect(tree.get(rootRef)).toBe(suppliedRecord);
  expect(tree.get(rootRef)?.getChildren()).toBe(children);
  expect(tree.getChildrenOf(rootRef)).toEqual(children);
  expect(tree.getChildrenOf(rootRef)).not.toBe(children);
});
