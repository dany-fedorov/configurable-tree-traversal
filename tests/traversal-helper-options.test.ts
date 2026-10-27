import {
  BreadthFirstPhase as B,
  DepthFirstPhase as F,
  DagVisitorPhase as D,
  TraversalRunnerStatus,
  TraversalVisitorCommandName as C,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirst,
  traverseTreeBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type { DagDiscoverySource, TreeSource, VertexTypes } from '../src';

type T = VertexTypes<string, string>;
function source(root = 'root'): DagDiscoverySource<T> & TreeSource<T> {
  const make = (id: string) => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: {
        $data: id,
        $childHints: id === root ? ['a', 'b'] : [],
      },
    },
  });
  return {
    resolveRoot: () => make(root),
    resolveChild: make,
    getVertexIdFromHint: (vertexId) => ({ vertexId }),
  };
}

test('DFS options register all phases and honor child ordering', () => {
  const visits: string[] = [];
  const runner = traverseTreeDepthFirst({
    traversableTree: source(),
    sortChildrenHints: (hints) => hints.reverse(),
    visitors: {
      [F.PRE_ORDER]: (vertex) => {
        visits.push(`pre:${vertex.getData()}`);
      },
      [F.IN_ORDER]: (vertex) => {
        visits.push(`in:${vertex.getData()}`);
      },
      [F.POST_ORDER]: (vertex) => {
        visits.push(`post:${vertex.getData()}`);
      },
    },
  });
  expect(visits).toEqual([
    'pre:root',
    'pre:b',
    'in:b',
    'post:b',
    'in:root',
    'pre:a',
    'in:a',
    'post:a',
    'post:root',
  ]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async DFS options register all phases and honor async child ordering', async () => {
  const visits: string[] = [];
  const result = traverseTreeDepthFirstAsync({
    traversableTree: source(),
    concurrency: 1,
    sortChildrenHints: async (hints) => hints.reverse(),
    visitors: {
      [F.PRE_ORDER]: async (vertex) => {
        visits.push(`pre:${vertex.getData()}`);
      },
      [F.IN_ORDER]: async (vertex) => {
        visits.push(`in:${vertex.getData()}`);
      },
      [F.POST_ORDER]: async (vertex) => {
        visits.push(`post:${vertex.getData()}`);
      },
    },
  });
  expect(result).toBeInstanceOf(Promise);
  expect((await result).getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    'pre:root',
    'pre:b',
    'in:b',
    'post:b',
    'in:root',
    'pre:a',
    'in:a',
    'post:a',
    'post:root',
  ]);
});

test('BFS options visit levels with configured ordering', async () => {
  const visits: string[] = [];
  const runner = traverseTreeBreadthFirst({
    traversableTree: source(),
    sortChildrenHints: (hints) => hints.reverse(),
    visitors: {
      [B.LEVEL_ORDER]: (vertex) => {
        visits.push(vertex.getData());
      },
    },
  });
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual(['root', 'b', 'a']);
  visits.length = 0;
  const result = traverseTreeBreadthFirstAsync({
    traversableTree: source(),
    concurrency: 1,
    sortChildrenHints: async (hints) => hints.reverse(),
    visitors: {
      [B.LEVEL_ORDER]: async (vertex) => {
        visits.push(vertex.getData());
      },
    },
  });
  expect(result).toBeInstanceOf(Promise);
  expect((await result).getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual(['root', 'b', 'a']);
});

test('DAG options support both source choices, phases, and discovery configuration', async () => {
  const visits: string[] = [];
  const runner = traverseDag({
    traversableGraph: source(),
    sortChildrenHints: (hints) => hints.reverse(),
    implicitParentDependency: true,
    visitors: {
      [D.ON_WORK_READY]: (vertex) => {
        visits.push(`ready:${vertex.getData()}`);
      },
      [D.ON_SUBGRAPH_READY]: (vertex) => {
        visits.push(`complete:${vertex.getData()}`);
      },
    },
  });
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    'ready:root',
    'ready:b',
    'ready:a',
    'complete:b',
    'complete:a',
    'complete:root',
  ]);
  visits.length = 0;
  const result = traverseDagAsync({
    traversableTree: source(),
    concurrency: 1,
    sortChildrenHints: async (hints) => hints.reverse(),
    visitors: {
      [D.ON_WORK_READY]: async (vertex) => {
        visits.push(`ready:${vertex.getData()}`);
      },
      [D.ON_SUBGRAPH_READY]: async (vertex) => {
        visits.push(`complete:${vertex.getData()}`);
      },
    },
  });
  expect(result).toBeInstanceOf(Promise);
  expect((await result).getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    'ready:root',
    'ready:b',
    'ready:a',
    'complete:b',
    'complete:a',
    'complete:root',
  ]);
});

test('canonical helpers accept omitted and empty visitor maps', async () => {
  for (const visitors of [undefined, {}]) {
    const treeOptions = {
      traversableTree: source(),
      ...(visitors && { visitors }),
    };
    const graphOptions = {
      traversableGraph: source(),
      ...(visitors && { visitors }),
    };
    expect(traverseTreeDepthFirst(treeOptions).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(traverseTreeBreadthFirst(treeOptions).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(traverseDag(graphOptions).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect((await traverseTreeDepthFirstAsync(treeOptions)).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect((await traverseTreeBreadthFirstAsync(treeOptions)).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect((await traverseDagAsync(graphOptions)).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
  }
});

test('canonical helper callbacks preserve exact failures', async () => {
  const failure = { reason: 'callback failure' };
  const fail = () => {
    throw failure;
  };
  const capture = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      return error;
    }
    return undefined;
  };
  expect(
    capture(() =>
      traverseTreeDepthFirst({
        traversableTree: source(),
        visitors: { [F.PRE_ORDER]: fail },
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      traverseTreeBreadthFirst({
        traversableTree: source(),
        visitors: { [B.LEVEL_ORDER]: fail },
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      traverseDag({
        traversableGraph: source(),
        visitors: { [D.ON_WORK_READY]: fail },
      }),
    ),
  ).toBe(failure);
  await expect(
    traverseTreeDepthFirstAsync({
      traversableTree: source(),
      visitors: { [F.PRE_ORDER]: fail },
    }),
  ).rejects.toBe(failure);
  await expect(
    traverseTreeBreadthFirstAsync({
      traversableTree: source(),
      visitors: { [B.LEVEL_ORDER]: fail },
    }),
  ).rejects.toBe(failure);
  await expect(
    traverseDagAsync({
      traversableGraph: source(),
      visitors: { [D.ON_WORK_READY]: fail },
    }),
  ).rejects.toBe(failure);
});

test('canonical commands reach the traversal runner', async () => {
  const halt = () => ({
    commands: [{ commandName: C.PAUSE_TRAVERSAL as const }],
  });
  expect(
    traverseTreeDepthFirst({
      traversableTree: source(),
      visitors: { [F.POST_ORDER]: halt },
    }).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    traverseTreeBreadthFirst({
      traversableTree: source(),
      visitors: { [B.LEVEL_ORDER]: halt },
    }).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    traverseDag({
      traversableGraph: source(),
      visitors: { [D.ON_SUBGRAPH_READY]: halt },
    }).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    (
      await traverseTreeDepthFirstAsync({
        traversableTree: source(),
        visitors: { [F.POST_ORDER]: halt },
      })
    ).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    (
      await traverseTreeBreadthFirstAsync({
        traversableTree: source(),
        visitors: { [B.LEVEL_ORDER]: halt },
      })
    ).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    (
      await traverseDagAsync({
        traversableGraph: source(),
        visitors: { [D.ON_SUBGRAPH_READY]: halt },
      })
    ).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
});

test('helpers reject positional calls even when source and options fields overlap', () => {
  const legacy = {
    ...source('argument'),
    traversableTree: source('extra-field'),
    visitors: {},
  };
  for (const helper of [
    traverseTreeDepthFirst,
    traverseTreeBreadthFirst,
    traverseTreeDepthFirstAsync,
    traverseTreeBreadthFirstAsync,
    traverseDag,
    traverseDagAsync,
  ]) {
    expect(() =>
      (helper as unknown as (...args: unknown[]) => unknown)(legacy, null, {
        traversableTree: source('config'),
      }),
    ).toThrow(TypeError);
  }
});

test('canonical helpers preserve exact source failures', async () => {
  const failure = Symbol('source failure');
  const fail = () => {
    throw failure;
  };
  const broken = { ...source(), resolveRoot: fail };
  const capture = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      return error;
    }
    return undefined;
  };
  expect(
    capture(() => traverseTreeDepthFirst({ traversableTree: broken })),
  ).toBe(failure);
  expect(
    capture(() => traverseTreeBreadthFirst({ traversableTree: broken })),
  ).toBe(failure);
  expect(capture(() => traverseDag({ traversableGraph: broken }))).toBe(
    failure,
  );
  await expect(
    traverseTreeDepthFirstAsync({ traversableTree: broken }),
  ).rejects.toBe(failure);
  await expect(
    traverseTreeBreadthFirstAsync({ traversableTree: broken }),
  ).rejects.toBe(failure);
  await expect(traverseDagAsync({ traversableGraph: broken })).rejects.toBe(
    failure,
  );
});

test('canonical async options retain constructor configuration validation', () => {
  expect(() =>
    traverseTreeDepthFirstAsync({ traversableTree: source(), concurrency: 0 }),
  ).toThrow(TypeError);
  expect(() =>
    traverseTreeBreadthFirstAsync({
      traversableTree: source(),
      concurrency: 0,
    }),
  ).toThrow(TypeError);
  expect(() =>
    traverseDagAsync({ traversableGraph: source(), concurrency: 0 }),
  ).toThrow(TypeError);
});
