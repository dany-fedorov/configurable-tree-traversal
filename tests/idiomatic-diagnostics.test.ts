import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  DagTraversal,
  DagVisitorPhase,
  TraversalRunnerStatus,
} from '../src';
import type { TreeDagExecutionInspection, VertexTypes } from '../src';
import { deferred } from './helpers/graph-fixtures';

type G = VertexTypes<string, string>;
const root = {
  kind: 'found' as const,
  vertex: {
    vertexId: undefined,
    vertexContent: { $data: 'root', $childHints: [] as string[] },
  },
};

test('DAG inspection names pending public operations without source IO or engine keys', () => {
  const snapshots: TreeDagExecutionInspection[] = [];
  const observe = () => {
    snapshots.push(runner.inspect());
    expect(runner.inspect()).toEqual(snapshots[snapshots.length - 1]);
  };
  const runner = new DagTraversal<G>({
    traversableGraph: {
      resolveRoot: () => {
        observe();
        return {
          ...root,
          vertex: {
            ...root.vertex,
            dependsOnWork: ['external'],
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        };
      },
      resolvePrerequisite: () => {
        observe();
        return {
          kind: 'found',
          vertex: { vertexContent: { $data: 'external', $childHints: [] } },
        };
      },
      getVertexIdFromHint: (hint) => {
        observe();
        return { vertexId: hint };
      },
      resolveChild: (hint) => {
        observe();
        return {
          kind: 'found',
          vertex: {
            vertexId: hint,
            vertexContent: { $data: hint, $childHints: [] },
          },
        };
      },
    },
    sortChildrenHints: (hints) => {
      observe();
      return hints;
    },
    visitors: {
      ON_WORK_READY: () => {
        observe();
      },
    },
  }).createRunner();
  runner.run();
  expect(snapshots.flatMap((snapshot) => snapshot.pendingRequests)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        operation: 'resolveRoot',
        owner: { kind: 'root', id: 1, epoch: 0 },
        valid: true,
      }),
      expect.objectContaining({
        operation: 'resolveChild',
        owner: expect.objectContaining({ kind: 'frame' }),
        valid: true,
      }),
      expect.objectContaining({
        operation: 'resolvePrerequisite',
        owner: expect.objectContaining({ kind: 'prerequisite' }),
        valid: true,
      }),
      expect.objectContaining({ operation: 'sortChildHints', valid: true }),
      expect.objectContaining({
        operation: 'getVertexIdFromHint',
        valid: true,
      }),
      expect.objectContaining({
        operation: 'visit',
        owner: expect.objectContaining({ kind: 'chain' }),
        valid: true,
      }),
    ]),
  );
  for (const snapshot of snapshots) {
    for (const request of snapshot.pendingRequests)
      expect(request).not.toHaveProperty('kind');
  }
  const count = snapshots.length;
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    pendingRequests: [],
    inFlightCallbackCount: 0,
  });
  expect(snapshots).toHaveLength(count);
});

for (const family of ['depth-first', 'breadth-first', 'dag'] as const) {
  test(`${family} separates visit phase from chain state while pause drains a visitor`, async () => {
    const gate = deferred<void>();
    const entered = deferred<void>();
    let sourceCalls = 0;
    const visitor = async () => {
      entered.resolve();
      await gate.promise;
    };
    const tree = {
      resolveRoot: () => {
        sourceCalls++;
        return {
          kind: 'found' as const,
          vertex: { vertexContent: root.vertex.vertexContent },
        };
      },
      resolveChild: () => ({ kind: 'omitted' as const }),
    };
    const runner =
      family === 'depth-first'
        ? new AsyncDepthFirstTreeTraversal<G>({
            traversableTree: tree,
            visitors: { PRE_ORDER: visitor },
          }).createRunner()
        : family === 'breadth-first'
        ? new AsyncBreadthFirstTreeTraversal<G>({
            traversableTree: tree,
            visitors: { LEVEL_ORDER: visitor },
          }).createRunner()
        : new AsyncDagTraversal<G>({
            traversableGraph: {
              resolveRoot: () => {
                sourceCalls++;
                return root;
              },
              resolveChild: () => ({
                kind: 'omitted',
                satisfiesDependencies: true,
              }),
            },
            visitors: { ON_WORK_READY: visitor },
          }).createRunner();
    const running = runner.run();
    await entered.promise;
    const phase =
      family === 'depth-first'
        ? 'PRE_ORDER'
        : family === 'breadth-first'
        ? 'LEVEL_ORDER'
        : 'ON_WORK_READY';
    const first = runner.inspect();
    expect(first).toMatchObject({
      inFlightCallbackCount: 1,
      chains: [
        {
          phase,
          state: 'running',
          visitorIndex: 0,
          waitingFor: 'callback',
          executionOptions: { visitorPhases: 'all' },
        },
      ],
      pendingRequests: [{ operation: 'visit', valid: true }],
    });
    const chain = first.chains[0]!;
    expect(first.pendingRequests[0]!.owner).toEqual(chain.owner);
    expect(Object.isFrozen(chain)).toBe(true);
    for (const key of ['order', 'group', 'position', 'config'])
      expect(chain).not.toHaveProperty(key);
    const graph = runner.getResolvedGraph();
    const ref = graph.getVertexRefs()[0]!;
    expect(graph.get(ref)).toMatchObject({
      visitStage:
        family === 'dag' ? 'INITIAL_VISIT_STARTED' : 'INITIAL_VISIT_ELIGIBLE',
    });
    expect(graph.getVisitStageOf(ref)).toBe(
      family === 'dag' ? 'INITIAL_VISIT_STARTED' : 'INITIAL_VISIT_ELIGIBLE',
    );
    expect(graph.get(ref)).not.toHaveProperty('status');
    expect(graph).not.toHaveProperty('getStatusOf');
    expect(runner.requestPause()).toBe(true);
    const pausing = runner.inspect();
    expect(pausing).toMatchObject({
      pauseRequested: true,
      inFlightCallbackCount: 1,
      pendingRequests: [{ operation: 'visit' }],
    });
    expect(pausing.pendingRequests[0]!.owner).toEqual(chain.owner);
    expect(runner.inspect()).toEqual(pausing);
    expect(sourceCalls).toBe(1);
    gate.resolve();
    await running;
    expect(runner.inspect()).toMatchObject({
      status: TraversalRunnerStatus.HALTED,
      stopReason: 'paused',
      inFlightCallbackCount: 0,
      pendingRequests: [],
    });
    await runner.run();
    expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
    expect(graph.get(ref)).toMatchObject({ visitStage: 'COMPLETE' });
  });
}

test('deferred work keeps the initial visit started after callbacks drain', () => {
  const runner = new DagTraversal<G>({
    workCompletion: 'externalSettlement',
    traversableGraph: {
      resolveRoot: () => root,
      resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
    },
  }).createRunner();
  runner.run();
  const graph = runner.getResolvedGraph();
  const ref = graph.getVertexRefById(undefined)!;
  expect(graph.get(ref)).toMatchObject({
    vertexId: undefined,
    visitStage: 'INITIAL_VISIT_STARTED',
  });
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.HALTED,
    stopReason: 'awaitingSettlement',
    inFlightCallbackCount: 0,
    pendingRequests: [],
    chains: [],
  });
  const frontier = runner.summary().awaitingSettlement[0]!;
  expect(frontier.vertexId).toBeUndefined();
  expect(
    runner.settle(undefined, { kind: 'workCompleted' }, frontier.generation),
  ).toBe(true);
  runner.run();
  expect(graph.get(ref)).toMatchObject({ visitStage: 'COMPLETE' });
});

test('completion diagnostics describe eligibility at callback admission, independently of W/C progress', () => {
  const stages: unknown[] = [];
  const runner = new DagTraversal<G>({
    traversableGraph: {
      resolveRoot: () => root,
      resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
    },
    visitors: {
      [DagVisitorPhase.ON_WORK_READY]: (_vertex, context) => {
        stages.push(context.resolvedGraph.get(context.vertexRef));
      },
      [DagVisitorPhase.ON_SUBGRAPH_READY]: (_vertex, context) => {
        stages.push(context.resolvedGraph.get(context.vertexRef));
      },
    },
  }).createRunner();
  runner.run();
  expect(stages).toEqual([
    expect.objectContaining({ visitStage: 'INITIAL_VISIT_STARTED' }),
    expect.objectContaining({ visitStage: 'COMPLETION_VISIT_ELIGIBLE' }),
  ]);
  expect(runner.summary().counts).toMatchObject({
    workCompleted: 1,
    subgraphCompleted: 1,
  });
});
