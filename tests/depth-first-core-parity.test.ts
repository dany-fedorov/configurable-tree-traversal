import {
  CTTRef,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  Vertex,
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

test('DFS can traverse a completed injected resolved-tree container again', () => {
  const adapter = {
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: ['missing', 'child'] },
    }),
    makeVertex: (hint: string) => ({
      vertexContent:
        hint === 'missing' ? null : { $d: hint, $c: [] },
    }),
  };
  const first = new DepthFirstTraversal<TestGraph>({
    traversableTree: adapter,
  }).makeRunner();
  first.run();
  const root = first.getResolvedTree().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord = first.getResolvedTree().get(root);
  const originalChildren = first.getResolvedTree().getChildrenOf(root);
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord = first.getResolvedTree().get(originalChild);

  const second = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => {
        throw new Error('Existing root must be reused');
      },
      makeVertex: adapter.makeVertex,
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: first.resolvedTreesContainer,
    },
  }).makeRunner();

  const events = Array.from(
    second.getIterable({
      iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
    }),
  );
  expect(events.map((event) => event.vertex.getData())).toEqual([
    'root',
    'child',
  ]);
  expect(events[1]?.vertexRef).toBe(originalChild);
  expect(second.getResolvedTree().getRoot()).toBe(root);
  expect(second.getResolvedTree().get(root)).toBe(rootRecord);
  expect(second.getResolvedTree().getChildrenOf(root)).toBe(originalChildren);
  expect(second.getResolvedTree().getChildrenOf(root)).toEqual([originalChild]);
  expect(second.getResolvedTree().get(originalChild)).toBe(childRecord);
  expect(second.getResolvedGraph().getVertexRefs()).toEqual([
    root,
    originalChild,
  ]);
});

test('deleting the current vertex still advances visitor metadata for its sibling', () => {
  const siblingMetadata: unknown[] = [];
  const traversal = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['deleted', 'sibling'] } }),
      makeVertex: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  });
  traversal.addVisitorFor(
    DepthFirstTraversalOrder.PRE_ORDER,
    (vertex, options) => {
      if (vertex.getData() === 'deleted') {
        return {
          commands: [{ commandName: TraversalVisitorCommandName.DELETE_VERTEX }],
        };
      }
      if (vertex.getData() === 'sibling') {
        siblingMetadata.push(
          options.vertexVisitIndex,
          options.previousVisitedVertexRef?.unref().getData(),
        );
      }
      return undefined;
    },
  );

  traversal.makeRunner().run();
  expect(siblingMetadata).toEqual([2, 'deleted']);
});

test('hint rewrites clone the command payload before a later visitor mutates it', () => {
  const hints = ['first'];
  const traversal = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['original'] } }),
      makeVertex: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  });
  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) =>
    vertex.getData() === 'root'
      ? {
          commands: [
            {
              commandName:
                TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
              commandArguments: { newHints: hints },
            },
          ],
        }
      : undefined,
  );
  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) => {
    if (vertex.getData() === 'root') hints.push('late');
  });

  expect(
    Array.from(
      traversal.makeRunner().getIterable({
        iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
      }),
    ).map((event) => event.vertex.getData()),
  ).toEqual(['root', 'first']);
});

test('disabled visitor execution leaves injected per-order state unchanged', () => {
  const traversal = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: [] } }),
      makeVertex: () => ({ vertexContent: null }),
    },
  });
  const seed = traversal.makeRunner().state;
  const previous = new CTTRef(
    new Vertex<TestGraph>({ $d: 'previous', $c: [] }),
  );
  seed.visitorsState[DepthFirstTraversalOrder.PRE_ORDER] = {
    vertexVisitIndex: 41,
    curVertexVisitorVisitIndex: 42,
    previousVisitedVertexRef: previous,
  };
  let visitorCalls = 0;
  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => {
    visitorCalls += 1;
  });
  const runner = new DepthFirstTraversal<TestGraph>({
    traversableTree: traversal.icfg.traversableTree,
    visitors: traversal.visitors,
    traversalRunnerInternalObjects: { state: seed },
  }).makeRunner();

  expect(
    Array.from(
      runner.getIterable({
        iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
        disableVisitorFunctionsFor: [DepthFirstTraversalOrder.PRE_ORDER],
      }),
    ).map((event) => event.vertex.getData()),
  ).toEqual(['root']);
  expect(visitorCalls).toBe(0);
  expect(seed.visitorsState[DepthFirstTraversalOrder.PRE_ORDER]).toEqual({
    vertexVisitIndex: 41,
    curVertexVisitorVisitIndex: 42,
    previousVisitedVertexRef: previous,
  });
  const root = runner.getResolvedGraph().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  expect(runner.getResolvedGraph().getStatusOf(root)).toBe('COMPLETE');
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test.each(['sorter', 'resolver', 'visitor'] as const)(
  'DFS %s failure clears policy frames from inspection',
  (failureAt) => {
    const failure = new Error(`${failureAt} failed`);
    const traversal = new DepthFirstTraversal<TestGraph>({
      traversableTree: {
        makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['child'] } }),
        makeVertex: () => {
          if (failureAt === 'resolver') throw failure;
          return { vertexContent: { $d: 'child', $c: [] } };
        },
      },
      sortChildrenHints:
        failureAt === 'sorter'
          ? () => {
              throw failure;
            }
          : null,
    });
    if (failureAt === 'visitor') {
      traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => {
        throw failure;
      });
    }
    const runner = traversal.makeRunner();

    expect(() => runner.run()).toThrow(failure);
    expect(runner.inspect()).toMatchObject({
      status: TraversalRunnerStatus.FAILED,
      frames: [],
      chains: [],
      pendingRequests: [],
    });
  },
);
