import { treeResolution } from './source-result-fixtures';
import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  MutableRef,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  Vertex,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  createInternalDepthFirstTreeRunner,
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

test('DFS shared core preserves the callback, context, and event trace', () => {
  const trace: string[] = [];
  const traversal = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        trace.push('adapter:root');
        return {
          kind: 'found' as const,
          vertex: {
            vertexContent: {
              $data: 'root',
              $childHints: ['left', 'missing', 'right'],
            },
          },
        };
      },
      resolveChild: (hint, { resolutionContext, resolvedTree }) => {
        const root = resolvedTree.getRoot();
        trace.push(
          `adapter:${hint}:parent=${resolutionContext.parentVertex.getData()}:depth=${
            resolutionContext.depth
          }:index=${resolutionContext.hintIndex}:children=${
            root === null
              ? ''
              : (resolvedTree.getChildrenOf(root) ?? [])
                  .map((ref) => ref.getValue().getData())
                  .join(',')
          }`,
        );
        return treeResolution(
          hint === 'missing' ? null : { $data: hint, $childHints: [] },
        );
      },
    },
  });

  for (const order of Object.values(DepthFirstPhase)) {
    traversal.addVisitorFor(order, (vertex, options) => {
      trace.push(
        `visitor:${order}:${vertex.getData()}:visit=${
          options.phaseVisitIndex
        }:current=${options.visitorIndex}`,
      );
      return undefined;
    });
  }

  const runner = traversal.createRunner();
  const initialInspection = runner.inspect();
  expect(initialInspection).toMatchObject({
    status: TraversalRunnerStatus.INITIAL,
    kind: 'depth-first',
    execution: 'sync',
    sourceMode: 'tree',
    bufferedEventCount: 0,
    inFlightCallbackCount: 0,
  });
  expect(runner.getResolvedTreeStore().getRoot()).toBeNull();

  for (const event of runner.iterateEvents()) {
    trace.push(`event:${event.phase}:${event.vertex.getData()}`);
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
    runner.getResolvedTreeStore().getResolvedGraph(),
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
  const traversal = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: [] } },
      }),
      resolveChild: () => ({ kind: 'omitted' as const }),
    },
  });
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({
    commands: [{ commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL }],
  }));
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) => {
    visits.push(vertex.getData());
  });

  const runner = traversal.createRunner();
  expect(Array.from(runner.iterateEvents())).toEqual([]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  const halted = runner.inspect();
  expect(halted.chains).toHaveLength(1);
  expect(halted.chains[0]).toMatchObject({
    order: DepthFirstPhase.PRE_ORDER,
    phase: 'paused',
    position: 1,
  });
  expect(
    runnerInternals(runner).state.visitorsState[DepthFirstPhase.PRE_ORDER],
  ).toMatchObject({
    phaseVisitIndex: 0,
    visitorIndex: 1,
    previousPhaseVertexRef: null,
  });
  expect(visits).toEqual([]);

  runner.run();
  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('DFS can traverse a completed injected resolved-tree container again', () => {
  const adapter = {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: 'root', $childHints: ['missing', 'child'] },
      },
    }),
    resolveChild: (hint: string) =>
      treeResolution(
        hint === 'missing' ? null : { $data: hint, $childHints: [] },
      ),
  };
  const first = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: adapter,
  }).createRunner();
  first.run();
  const root = first.getResolvedTreeStore().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord = first.getResolvedTreeStore().get(root);
  const originalChildren = first
    .getResolvedTreeStore()
    .get(root)
    ?.getChildren();
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord = first.getResolvedTreeStore().get(originalChild);

  const second = createInternalDepthFirstTreeRunner<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: adapter.resolveChild,
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
    },
  });

  const events = Array.from(
    second.iterateEvents({
      emitEvents: [DepthFirstPhase.PRE_ORDER],
    }),
  );
  expect(events.map((event) => event.vertex.getData())).toEqual([
    'root',
    'child',
  ]);
  expect(events[1]?.vertexRef).toBe(originalChild);
  expect(second.getResolvedTreeStore().getRoot()).toBe(root);
  expect(second.getResolvedTreeStore().get(root)).toBe(rootRecord);
  expect(second.getResolvedTreeStore().get(root)?.getChildren()).toBe(
    originalChildren,
  );
  expect(second.getResolvedTreeStore().getChildrenOf(root)).not.toBe(
    originalChildren,
  );
  expect(second.getResolvedTreeStore().getChildrenOf(root)).toEqual([
    originalChild,
  ]);
  expect(second.getResolvedTreeStore().get(originalChild)).toBe(childRecord);
  expect(second.getResolvedGraph().getVertexRefs()).toEqual([
    root,
    originalChild,
  ]);
});

test('deleting the current vertex still advances visitor metadata for its sibling', () => {
  const siblingMetadata: unknown[] = [];
  const traversal = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: ['deleted', 'sibling'] },
        },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    },
  });
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex, options) => {
    if (vertex.getData() === 'deleted') {
      return {
        commands: [
          { commandName: TraversalVisitorCommandName.DELETE_TREE_SUBTREE },
        ],
      };
    }
    if (vertex.getData() === 'sibling') {
      siblingMetadata.push(
        options.phaseVisitIndex,
        options.previousPhaseVertexRef?.getValue().getData(),
      );
    }
    return undefined;
  });

  traversal.createRunner().run();
  expect(siblingMetadata).toEqual([2, 'deleted']);
});

test('hint rewrites clone the command payload before a later visitor mutates it', () => {
  const hints = ['first'];
  const traversal = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['original'] } },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    },
  });
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) =>
    vertex.getData() === 'root'
      ? {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: hints },
            },
          ],
        }
      : undefined,
  );
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) => {
    if (vertex.getData() === 'root') hints.push('late');
  });

  expect(
    Array.from(
      traversal.createRunner().iterateEvents({
        emitEvents: [DepthFirstPhase.PRE_ORDER],
      }),
    ).map((event) => event.vertex.getData()),
  ).toEqual(['root', 'first']);
});

test('disabled visitor execution leaves injected per-order state unchanged', () => {
  const traversal = new DepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: [] } },
      }),
      resolveChild: () => ({ kind: 'omitted' as const }),
    },
  });
  const seed = runnerInternals(traversal.createRunner()).state;
  const previous = new MutableRef(
    new Vertex<TestGraph>({ $data: 'previous', $childHints: [] }),
  );
  seed.visitorsState[DepthFirstPhase.PRE_ORDER] = {
    phaseVisitIndex: 41,
    visitorIndex: 42,
    previousPhaseVertexRef: previous,
  };
  let visitorCalls = 0;
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => {
    visitorCalls += 1;
  });
  const runner = createInternalDepthFirstTreeRunner<TestGraph>({
    traversableTree: traversalInternals(traversal).icfg.traversableTree,
    visitors: traversalInternals(traversal).visitors,
    traversalRunnerInternalObjects: { state: seed },
  });

  expect(
    Array.from(
      runner.iterateEvents({
        emitEvents: [DepthFirstPhase.PRE_ORDER],
        visitorPhases: { exclude: [DepthFirstPhase.PRE_ORDER] },
      }),
    ).map((event) => event.vertex.getData()),
  ).toEqual(['root']);
  expect(visitorCalls).toBe(0);
  expect(seed.visitorsState[DepthFirstPhase.PRE_ORDER]).toEqual({
    phaseVisitIndex: 41,
    visitorIndex: 42,
    previousPhaseVertexRef: previous,
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
    const traversal = new DepthFirstTreeTraversal<TestGraph>({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
        }),
        resolveChild: () => {
          if (failureAt === 'resolver') throw failure;
          return {
            kind: 'found' as const,
            vertex: { vertexContent: { $data: 'child', $childHints: [] } },
          };
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
      traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => {
        throw failure;
      });
    }
    const runner = traversal.createRunner();

    expect(() => runner.run()).toThrow(failure);
    expect(runner.inspect()).toMatchObject({
      status: TraversalRunnerStatus.FAILED,
      frames: [],
      chains: [],
      pendingRequests: [],
    });
  },
);
