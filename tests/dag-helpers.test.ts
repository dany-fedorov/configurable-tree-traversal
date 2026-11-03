import {
  DagVisitorPhase,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  dagTraversal,
  hasExactlyOneResolvedStructuralLeaf,
  traverseDag,
} from '../src';
import { traverseDagAsync } from '../src/traversals/dag-traversal';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { PreCommandDiscoveredGraphView } from '../src/core/ResolvedGraphView';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

type TestGraph = VertexDataAndChildHintTypes<string, string>;

function graph(
  root: string | null,
  children: Record<string, string[]>,
): DagDiscoverySource<TestGraph> {
  const result = (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: id,
      vertexContentInput: {
        $vertexData: id,
        $childDiscoveryHints: children[id] ?? [],
      },
    },
  });
  return {
    resolveRootVertex: () =>
      root === null
        ? {
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          }
        : result(root),
    resolveChildHint: (hint) => result(hint),
    tryGetVertexIdentityFromHint: (hint) => ({ vertexId: hint }),
  };
}

test('DAG helpers register visitors and visit their configured source', () => {
  const visits: string[] = [];
  const explicit = graph('root', { root: [] });
  const runner = traverseDag({
    ...{ dagDiscoverySource: explicit },
    visitors: {
      ON_WORK_READY: (vertex) => {
        visits.push(`ready:${vertex.getVertexData()}`);
      },
      ON_SUBGRAPH_COMPLETION_READY: (vertex) => {
        visits.push(`complete:${vertex.getVertexData()}`);
      },
    },
  });

  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect(visits).toEqual(['ready:root', 'complete:root']);
  expect(dagTraversal.traverseDag).toBe(traverseDag);
  expect(dagTraversal.DagVisitorPhase).toBe(DagVisitorPhase);
});

test('async DAG helper accepts omitted visitors and returns a finished runner', async () => {
  const explicit = graph('root', { root: [] });
  const runner = await traverseDagAsync({
    ...{ dagDiscoverySource: explicit },
  });

  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect(
    runner
      .getLiveResolvedGraphView()
      .getDesignatedRootHandleOrNull()
      ?.getCurrentVertexView()
      .getVertexData(),
  ).toBe('root');
});

test('async DAG helper registers its completion visitor', async () => {
  const visits: string[] = [];
  const runner = await traverseDagAsync({
    ...{ dagDiscoverySource: graph('root', { root: [] }) },
    visitors: {
      ON_SUBGRAPH_COMPLETION_READY: async (vertex) => {
        visits.push(vertex.getVertexData());
      },
    },
  });

  expect(visits).toEqual(['root']);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

test('async DAG helper returns a halted runner when its visitor requests halt', async () => {
  const runner = await traverseDagAsync({
    ...{ dagDiscoverySource: graph('root', { root: ['leaf'], leaf: [] }) },
    visitors: {
      ON_WORK_READY: async () => ({
        commands: [
          {
            commandName:
              TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
          },
        ],
      }),
    },
  });

  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.SUSPENDED,
  );
  expect(
    hasExactlyOneResolvedStructuralLeaf(runner.getLiveResolvedGraphView()),
  ).toBe(true);
});

test('hasSingleStructuralSink counts the currently resolved discovery graph', () => {
  const empty = traverseDag({ ...{ dagDiscoverySource: graph(null, {}) } });
  const fork = traverseDag({
    ...{
      dagDiscoverySource: graph('root', {
        root: ['left', 'right'],
        left: [],
        right: [],
      }),
    },
  });
  const chain = traverseDag({
    ...{
      dagDiscoverySource: graph('root', { root: ['leaf'], leaf: [] }),
    },
  });

  expect(
    hasExactlyOneResolvedStructuralLeaf(empty.getLiveResolvedGraphView()),
  ).toBe(false);
  expect(
    hasExactlyOneResolvedStructuralLeaf(fork.getLiveResolvedGraphView()),
  ).toBe(false);
  expect(
    hasExactlyOneResolvedStructuralLeaf(chain.getLiveResolvedGraphView()),
  ).toBe(true);
  expect(
    hasExactlyOneResolvedStructuralLeaf({
      getVertexHandles: () => [null as never],
      getStructuralChildHandlesInSlotOrderOrNull: () => null,
    } as unknown as PreCommandDiscoveredGraphView<TestGraph>),
  ).toBe(true);
});
