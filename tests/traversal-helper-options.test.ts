import {
  BreadthFirstTreeVisitPhase as B,
  DepthFirstTreeVisitPhase as F,
  DagVisitorPhase as D,
  TraversalRunnerStatus,
  TraversalVisitorCommandName as C,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  DagDiscoverySource,
  TreeDiscoverySource,
  VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
function source(root = 'root'): DagDiscoverySource<T> & TreeDiscoverySource<T> {
  const make = (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: id,
        $childDiscoveryHints: id === root ? ['a', 'b'] : [],
      },
    },
  });
  return {
    resolveRootVertex: () => make(root),
    resolveChildHint: make,
    resolveChildVertexFromHint: make,
    tryGetVertexIdentityFromHint: (vertexId) => ({ vertexId }),
  };
}

test('DFS options register all phases and honor child ordering', () => {
  const visits: string[] = [];
  const runner = runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: source(),
    transformChildHintsBeforeResolution: (hints) => hints.reverse(),
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: (vertex) => {
        visits.push(`pre:${vertex.getVertexData()}`);
      },
      [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: (vertex) => {
        visits.push(`in:${vertex.getVertexData()}`);
      },
      [F.AFTER_CHILD_SUBTREES]: (vertex) => {
        visits.push(`post:${vertex.getVertexData()}`);
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
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

test('async DFS options register all phases and honor async child ordering', async () => {
  const visits: string[] = [];
  const result = runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: source(),
    maxConcurrentCallbackInvocations: 1,
    transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: async (vertex) => {
        visits.push(`pre:${vertex.getVertexData()}`);
      },
      [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: async (vertex) => {
        visits.push(`in:${vertex.getVertexData()}`);
      },
      [F.AFTER_CHILD_SUBTREES]: async (vertex) => {
        visits.push(`post:${vertex.getVertexData()}`);
      },
    },
  });
  expect(result).toBeInstanceOf(Promise);
  expect((await result).getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
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
  const runner = runTreeBreadthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: source(),
    transformChildHintsBeforeResolution: (hints) => hints.reverse(),
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: (vertex) => {
        visits.push(vertex.getVertexData());
      },
    },
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect(visits).toEqual(['root', 'b', 'a']);
  visits.length = 0;
  const result = runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: source(),
    maxConcurrentCallbackInvocations: 1,
    transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: async (vertex) => {
        visits.push(vertex.getVertexData());
      },
    },
  });
  expect(result).toBeInstanceOf(Promise);
  expect((await result).getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect(visits).toEqual(['root', 'b', 'a']);
});

test('DAG options support both source choices, phases, and discovery configuration', async () => {
  const visits: string[] = [];
  const runner = traverseDag({
    dagDiscoverySource: source(),
    transformChildHintsBeforeResolution: (hints) => hints.reverse(),
    undeclaredWorkPrerequisitePolicy: 'waitForDiscoveringParentWork',
    visitors: {
      [D.ON_WORK_READY]: (vertex) => {
        visits.push(`ready:${vertex.getVertexData()}`);
      },
      [D.ON_SUBGRAPH_COMPLETION_READY]: (vertex) => {
        visits.push(`complete:${vertex.getVertexData()}`);
      },
    },
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
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
    treeDiscoverySource: source(),
    maxConcurrentCallbackInvocations: 1,
    transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
    visitors: {
      [D.ON_WORK_READY]: async (vertex) => {
        visits.push(`ready:${vertex.getVertexData()}`);
      },
      [D.ON_SUBGRAPH_COMPLETION_READY]: async (vertex) => {
        visits.push(`complete:${vertex.getVertexData()}`);
      },
    },
  });
  expect(result).toBeInstanceOf(Promise);
  expect((await result).getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
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
      treeDiscoverySource: source(),
      ...(visitors && { visitors }),
    };
    const graphOptions = {
      dagDiscoverySource: source(),
      ...(visitors && { visitors }),
    };
    expect(
      runTreeDepthFirstUntilSuspendedOrTerminal(
        treeOptions,
      ).getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
    expect(
      runTreeBreadthFirstUntilSuspendedOrTerminal(
        treeOptions,
      ).getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
    expect(traverseDag(graphOptions).getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(
      (
        await runTreeDepthFirstUntilSuspendedOrTerminalAsync(treeOptions)
      ).getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
    expect(
      (
        await runTreeBreadthFirstUntilSuspendedOrTerminalAsync(treeOptions)
      ).getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
    expect(
      (await traverseDagAsync(graphOptions)).getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
  }
});

test('canonical helper callbacks preserve exact failures', async () => {
  const failure = { reason: 'callback failure' };
  const fail = () => {
    throw failure;
  };
  const capture = (runUntilSuspendedOrTerminal: () => unknown) => {
    try {
      runUntilSuspendedOrTerminal();
    } catch (error) {
      return error;
    }
    return undefined;
  };
  expect(
    capture(() =>
      runTreeDepthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: source(),
        visitors: { [F.BEFORE_CHILD_EXPANSION]: fail },
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      runTreeBreadthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: source(),
        visitors: { [B.AT_LEVEL_ORDER_VERTEX]: fail },
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      traverseDag({
        dagDiscoverySource: source(),
        visitors: { [D.ON_WORK_READY]: fail },
      }),
    ),
  ).toBe(failure);
  await expect(
    runTreeDepthFirstUntilSuspendedOrTerminalAsync({
      treeDiscoverySource: source(),
      visitors: { [F.BEFORE_CHILD_EXPANSION]: fail },
    }),
  ).rejects.toBe(failure);
  await expect(
    runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
      treeDiscoverySource: source(),
      visitors: { [B.AT_LEVEL_ORDER_VERTEX]: fail },
    }),
  ).rejects.toBe(failure);
  await expect(
    traverseDagAsync({
      dagDiscoverySource: source(),
      visitors: { [D.ON_WORK_READY]: fail },
    }),
  ).rejects.toBe(failure);
});

test('canonical commands reach the traversal runner', async () => {
  const halt = () => ({
    commands: [
      { commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY as const },
    ],
  });
  expect(
    runTreeDepthFirstUntilSuspendedOrTerminal({
      treeDiscoverySource: source(),
      visitors: { [F.AFTER_CHILD_SUBTREES]: halt },
    }).getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.SUSPENDED);
  expect(
    runTreeBreadthFirstUntilSuspendedOrTerminal({
      treeDiscoverySource: source(),
      visitors: { [B.AT_LEVEL_ORDER_VERTEX]: halt },
    }).getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.SUSPENDED);
  expect(
    traverseDag({
      dagDiscoverySource: source(),
      visitors: { [D.ON_SUBGRAPH_COMPLETION_READY]: halt },
    }).getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.SUSPENDED);
  expect(
    (
      await runTreeDepthFirstUntilSuspendedOrTerminalAsync({
        treeDiscoverySource: source(),
        visitors: { [F.AFTER_CHILD_SUBTREES]: halt },
      })
    ).getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.SUSPENDED);
  expect(
    (
      await runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
        treeDiscoverySource: source(),
        visitors: { [B.AT_LEVEL_ORDER_VERTEX]: halt },
      })
    ).getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.SUSPENDED);
  expect(
    (
      await traverseDagAsync({
        dagDiscoverySource: source(),
        visitors: { [D.ON_SUBGRAPH_COMPLETION_READY]: halt },
      })
    ).getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.SUSPENDED);
});

test('helpers reject positional calls even when source and options fields overlap', () => {
  const legacy = {
    ...source('argument'),
    treeDiscoverySource: source('extra-field'),
    visitors: {},
  };
  for (const helper of [
    runTreeDepthFirstUntilSuspendedOrTerminal,
    runTreeBreadthFirstUntilSuspendedOrTerminal,
    runTreeDepthFirstUntilSuspendedOrTerminalAsync,
    runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
    traverseDag,
    traverseDagAsync,
  ]) {
    expect(() =>
      (helper as unknown as (...args: unknown[]) => unknown)(legacy, null, {
        treeDiscoverySource: source('config'),
      }),
    ).toThrow(TypeError);
  }
});

test('canonical helpers preserve exact source failures', async () => {
  const failure = Symbol('source failure');
  const fail = () => {
    throw failure;
  };
  const broken = { ...source(), resolveRootVertex: fail };
  const capture = (runUntilSuspendedOrTerminal: () => unknown) => {
    try {
      runUntilSuspendedOrTerminal();
    } catch (error) {
      return error;
    }
    return undefined;
  };
  expect(
    capture(() =>
      runTreeDepthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: broken,
      }),
    ),
  ).toBe(failure);
  expect(
    capture(() =>
      runTreeBreadthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: broken,
      }),
    ),
  ).toBe(failure);
  expect(capture(() => traverseDag({ dagDiscoverySource: broken }))).toBe(
    failure,
  );
  await expect(
    runTreeDepthFirstUntilSuspendedOrTerminalAsync({
      treeDiscoverySource: broken,
    }),
  ).rejects.toBe(failure);
  await expect(
    runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
      treeDiscoverySource: broken,
    }),
  ).rejects.toBe(failure);
  await expect(traverseDagAsync({ dagDiscoverySource: broken })).rejects.toBe(
    failure,
  );
});

test('canonical async options retain constructor configuration validation', () => {
  expect(() =>
    runTreeDepthFirstUntilSuspendedOrTerminalAsync({
      treeDiscoverySource: source(),
      maxConcurrentCallbackInvocations: 0,
    }),
  ).toThrow(TypeError);
  expect(() =>
    runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
      treeDiscoverySource: source(),
      maxConcurrentCallbackInvocations: 0,
    }),
  ).toThrow(TypeError);
  expect(() =>
    traverseDagAsync({
      dagDiscoverySource: source(),
      maxConcurrentCallbackInvocations: 0,
    }),
  ).toThrow(TypeError);
});
