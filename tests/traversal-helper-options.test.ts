import {
  BreadthFirstTraversalOrder as B,
  DepthFirstTraversalOrder as F,
  DagTraversalOrder as D,
  TraversalRunnerStatus,
  TraversalVisitorCommandName as C,
  traverseDepthFirst,
  traverseDepthFirstAsync,
  traverseBreadthFirst,
  traverseBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  TraversableGraph,
  TraversableTree,
  TreeTypeParameters,
} from '../src';

type T = TreeTypeParameters<string, string>;
function source(root = 'root'): TraversableGraph<T> & TraversableTree<T> {
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
    makeRoot: () => make(root),
    makeVertex: make,
    getVertexIdFromHint: (vertexId) => ({ vertexId }),
  };
}

test('DFS options register all phases and honor child ordering', () => {
  const visits: string[] = [];
  const runner = traverseDepthFirst({
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
  const result = traverseDepthFirstAsync({
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
  const runner = traverseBreadthFirst({
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
  const result = traverseBreadthFirstAsync({
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
      [D.ON_READY]: (vertex) => {
        visits.push(`ready:${vertex.getData()}`);
      },
      [D.ON_COMPLETE]: (vertex) => {
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
      [D.ON_READY]: async (vertex) => {
        visits.push(`ready:${vertex.getData()}`);
      },
      [D.ON_COMPLETE]: async (vertex) => {
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
    expect(traverseDepthFirst(treeOptions).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(traverseBreadthFirst(treeOptions).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(traverseDag(graphOptions).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect((await traverseDepthFirstAsync(treeOptions)).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect((await traverseBreadthFirstAsync(treeOptions)).getStatus()).toBe(
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
      traverseDepthFirst({
        traversableTree: source(),
        visitors: { [F.PRE_ORDER]: fail },
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      traverseBreadthFirst({
        traversableTree: source(),
        visitors: { [B.LEVEL_ORDER]: fail },
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      traverseDag({
        traversableGraph: source(),
        visitors: { [D.ON_READY]: fail },
      }),
    ),
  ).toBe(failure);
  await expect(
    traverseDepthFirstAsync({
      traversableTree: source(),
      visitors: { [F.PRE_ORDER]: fail },
    }),
  ).rejects.toBe(failure);
  await expect(
    traverseBreadthFirstAsync({
      traversableTree: source(),
      visitors: { [B.LEVEL_ORDER]: fail },
    }),
  ).rejects.toBe(failure);
  await expect(
    traverseDagAsync({
      traversableGraph: source(),
      visitors: { [D.ON_READY]: fail },
    }),
  ).rejects.toBe(failure);
});

test('canonical commands reach the traversal runner', async () => {
  const halt = () => ({
    commands: [{ commandName: C.HALT_TRAVERSAL as const }],
  });
  expect(
    traverseDepthFirst({
      traversableTree: source(),
      visitors: { [F.POST_ORDER]: halt },
    }).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    traverseBreadthFirst({
      traversableTree: source(),
      visitors: { [B.LEVEL_ORDER]: halt },
    }).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    traverseDag({
      traversableGraph: source(),
      visitors: { [D.ON_COMPLETE]: halt },
    }).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    (
      await traverseDepthFirstAsync({
        traversableTree: source(),
        visitors: { [F.POST_ORDER]: halt },
      })
    ).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    (
      await traverseBreadthFirstAsync({
        traversableTree: source(),
        visitors: { [B.LEVEL_ORDER]: halt },
      })
    ).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
  expect(
    (
      await traverseDagAsync({
        traversableGraph: source(),
        visitors: { [D.ON_COMPLETE]: halt },
      })
    ).getStatus(),
  ).toBe(TraversalRunnerStatus.HALTED);
});

test('legacy calls retain arity interpretation, null visitors, and source precedence', async () => {
  const legacy = {
    ...source('argument'),
    traversableTree: source('extra-field'),
    visitors: {},
  };
  const config = { traversableTree: source('config') };
  const root = (runner: {
    getResolvedGraph(): {
      getRoot(): { unref(): { getData(): unknown } } | null;
    };
  }) => runner.getResolvedGraph().getRoot()?.unref().getData();
  expect(root(traverseDepthFirst(legacy, null, config))).toBe('config');
  expect(root(traverseBreadthFirst(legacy, null, config))).toBe('config');
  expect(root(await traverseDepthFirstAsync(legacy, null, config))).toBe(
    'config',
  );
  expect(root(await traverseBreadthFirstAsync(legacy, null, config))).toBe(
    'config',
  );
  expect(
    root(
      traverseDag(
        { traversableGraph: source('argument'), visitors: {} } as never,
        null,
        { traversableGraph: source('config') } as never,
      ),
    ),
  ).toBe('argument');
  expect(
    root(
      await traverseDagAsync(
        { traversableGraph: source('argument'), visitors: {} } as never,
        null,
        { traversableGraph: source('config') } as never,
      ),
    ),
  ).toBe('argument');
});

test('canonical helpers preserve exact source failures', async () => {
  const failure = Symbol('source failure');
  const fail = () => {
    throw failure;
  };
  const broken = { ...source(), makeRoot: fail };
  const capture = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      return error;
    }
    return undefined;
  };
  expect(capture(() => traverseDepthFirst({ traversableTree: broken }))).toBe(
    failure,
  );
  expect(capture(() => traverseBreadthFirst({ traversableTree: broken }))).toBe(
    failure,
  );
  expect(capture(() => traverseDag({ traversableGraph: broken }))).toBe(
    failure,
  );
  await expect(
    traverseDepthFirstAsync({ traversableTree: broken }),
  ).rejects.toBe(failure);
  await expect(
    traverseBreadthFirstAsync({ traversableTree: broken }),
  ).rejects.toBe(failure);
  await expect(traverseDagAsync({ traversableGraph: broken })).rejects.toBe(
    failure,
  );
});

test('canonical async options retain constructor configuration validation', () => {
  expect(() =>
    traverseDepthFirstAsync({ traversableTree: source(), concurrency: 0 }),
  ).toThrow(TypeError);
  expect(() =>
    traverseBreadthFirstAsync({ traversableTree: source(), concurrency: 0 }),
  ).toThrow(TypeError);
  expect(() =>
    traverseDagAsync({ traversableGraph: source(), concurrency: 0 }),
  ).toThrow(TypeError);
});
