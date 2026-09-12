import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';

test('DFS shared core preserves the callback, context, and event trace', () => {
  const trace: string[] = [];
  const traversal = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => {
        trace.push('adapter:root');
        return { vertexContent: { $d: 'root', $c: ['left', 'missing', 'right'] } };
      },
      makeVertex: (hint, { resolutionContext, resolvedTree }) => {
        const root = resolvedTree.getRoot();
        trace.push(
          `adapter:${hint}:parent=${resolutionContext.parentVertex.getData()}:depth=${resolutionContext.depth}:index=${resolutionContext.hintIndex}:children=${
            root === null
              ? ''
              : (resolvedTree.getChildrenOf(root) ?? [])
                  .map((ref) => ref.unref().getData())
                  .join(',')
          }`,
        );
        return {
          vertexContent:
            hint === 'missing' ? null : { $d: hint, $c: [] },
        };
      },
    },
  });

  for (const order of Object.values(DepthFirstTraversalOrder)) {
    traversal.addVisitorFor(order, (vertex, options) => {
      trace.push(
        `visitor:${order}:${vertex.getData()}:visit=${options.vertexVisitIndex}:current=${options.curVertexVisitorVisitIndex}`,
      );
      return undefined;
    });
  }

  const runner = traversal.makeRunner();
  const initialInspection = runner.inspect();
  expect(initialInspection).toMatchObject({
    status: TraversalRunnerStatus.INITIAL,
    kind: 'depth-first',
    execution: 'sync',
    sourceMode: 'tree',
    bufferedEventCount: 0,
    inFlightCallbackCount: 0,
  });
  expect(runner.getResolvedTree().getRoot()).toBeNull();

  for (const event of runner.getIterable()) {
    trace.push(`event:${event.order}:${event.vertex.getData()}`);
  }

  expect(trace).toEqual([
    'adapter:root',
    'visitor:PRE_ORDER:root:visit=0:current=0',
    'event:PRE_ORDER:root',
    'adapter:left:parent=root:depth=1:index=0:children=',
    'visitor:PRE_ORDER:left:visit=1:current=0',
    'event:PRE_ORDER:left',
    'visitor:IN_ORDER:left:visit=0:current=0',
    'event:IN_ORDER:left',
    'visitor:POST_ORDER:left:visit=0:current=0',
    'event:POST_ORDER:left',
    'visitor:IN_ORDER:root:visit=1:current=0',
    'event:IN_ORDER:root',
    'adapter:missing:parent=root:depth=1:index=1:children=left',
    'visitor:IN_ORDER:root:visit=2:current=0',
    'event:IN_ORDER:root',
    'adapter:right:parent=root:depth=1:index=2:children=left',
    'visitor:PRE_ORDER:right:visit=2:current=0',
    'event:PRE_ORDER:right',
    'visitor:IN_ORDER:right:visit=3:current=0',
    'event:IN_ORDER:right',
    'visitor:POST_ORDER:right:visit=1:current=0',
    'event:POST_ORDER:right',
    'visitor:POST_ORDER:root:visit=2:current=0',
    'event:POST_ORDER:root',
  ]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(runner.getResolvedGraph()).toBe(
    runner.getResolvedTree().getResolvedGraph(),
  );
  const resolvedRoot = runner.getResolvedGraph().getRoot();
  expect(resolvedRoot).not.toBeNull();
  if (resolvedRoot === null) throw new Error('Expected a resolved root');
  expect(runner.getResolvedGraph().getStatusOf(resolvedRoot)).toBe('COMPLETE');
  expect(
    runner
      .getResolvedGraph()
      .getChildrenOf(resolvedRoot)
      ?.map((ref) => runner.getResolvedGraph().getStatusOf(ref)),
  ).toEqual(['COMPLETE', 'COMPLETE']);
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    frames: [],
    chains: [],
    pendingRequests: [],
    bufferedEventCount: 0,
    inFlightCallbackCount: 0,
  });
});

test('DFS inspection during a visitor halt preserves the next visitor', () => {
  const visits: string[] = [];
  const traversal = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: [] } }),
      makeVertex: () => ({ vertexContent: null }),
    },
  });
  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => ({
    commands: [{ commandName: TraversalVisitorCommandName.HALT_TRAVERSAL }],
  }));
  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) => {
    visits.push(vertex.getData());
  });

  const runner = traversal.makeRunner();
  expect(Array.from(runner.getIterable())).toEqual([]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  const halted = runner.inspect();
  expect(halted.chains).toHaveLength(1);
  expect(halted.chains[0]).toMatchObject({
    order: DepthFirstTraversalOrder.PRE_ORDER,
    phase: 'paused',
    position: 1,
  });
  expect(
    runner.state.visitorsState[DepthFirstTraversalOrder.PRE_ORDER],
  ).toMatchObject({
    vertexVisitIndex: 0,
    curVertexVisitorVisitIndex: 1,
    previousVisitedVertexRef: null,
  });
  expect(visits).toEqual([]);

  runner.run();
  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});
