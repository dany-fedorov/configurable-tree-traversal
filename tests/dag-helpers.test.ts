import {
  DagVisitorPhase,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  dagTraversal,
  hasSingleStructuralSink,
  traverseDag,
} from '../src';
import { traverseDagAsync } from '../src/traversals/dag-traversal';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { OriginalGraphView } from '../src/core/ResolvedGraph';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type TestGraph = VertexTypes<string, string>;

function graph(
  root: string | null,
  children: Record<string, string[]>,
): DagDiscoverySource<TestGraph> {
  const result = (id: string) => ({
    kind: 'found' as const,
    vertex: {
      vertexId: id,
      vertexContent: { $data: id, $childHints: children[id] ?? [] },
    },
  });
  return {
    resolveRoot: () =>
      root === null
        ? { kind: 'omitted' as const, satisfiesDependencies: true as const }
        : result(root),
    resolveChild: (hint) => result(hint),
    getVertexIdFromHint: (hint) => ({ vertexId: hint }),
  };
}

test('DAG helpers register visitors and visit their configured source', () => {
  const visits: string[] = [];
  const explicit = graph('root', { root: [] });
  const runner = traverseDag({
    ...{ traversableGraph: explicit },
    visitors: {
      ON_WORK_READY: (vertex) => {
        visits.push(`ready:${vertex.getData()}`);
      },
      ON_SUBGRAPH_READY: (vertex) => {
        visits.push(`complete:${vertex.getData()}`);
      },
    },
  });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual(['ready:root', 'complete:root']);
  expect(dagTraversal.traverseDag).toBe(traverseDag);
  expect(dagTraversal.DagVisitorPhase).toBe(DagVisitorPhase);
});

test('async DAG helper accepts omitted visitors and returns a finished runner', async () => {
  const explicit = graph('root', { root: [] });
  const runner = await traverseDagAsync({ ...{ traversableGraph: explicit } });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(runner.getResolvedGraph().getRoot()?.getValue().getData()).toBe(
    'root',
  );
});

test('async DAG helper registers its completion visitor', async () => {
  const visits: string[] = [];
  const runner = await traverseDagAsync({
    ...{ traversableGraph: graph('root', { root: [] }) },
    visitors: {
      ON_SUBGRAPH_READY: async (vertex) => {
        visits.push(vertex.getData());
      },
    },
  });

  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async DAG helper returns a halted runner when its visitor requests halt', async () => {
  const runner = await traverseDagAsync({
    ...{ traversableGraph: graph('root', { root: ['leaf'], leaf: [] }) },
    visitors: {
      ON_WORK_READY: async () => ({
        commands: [
          { commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL },
        ],
      }),
    },
  });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  expect(hasSingleStructuralSink(runner.getResolvedGraph())).toBe(true);
});

test('hasSingleStructuralSink counts the currently resolved discovery graph', () => {
  const empty = traverseDag({ ...{ traversableGraph: graph(null, {}) } });
  const fork = traverseDag({
    ...{
      traversableGraph: graph('root', {
        root: ['left', 'right'],
        left: [],
        right: [],
      }),
    },
  });
  const chain = traverseDag({
    ...{
      traversableGraph: graph('root', { root: ['leaf'], leaf: [] }),
    },
  });

  expect(hasSingleStructuralSink(empty.getResolvedGraph())).toBe(false);
  expect(hasSingleStructuralSink(fork.getResolvedGraph())).toBe(false);
  expect(hasSingleStructuralSink(chain.getResolvedGraph())).toBe(true);
  expect(
    hasSingleStructuralSink({
      getVertexRefs: () => [null as never],
      getChildrenOf: () => null,
    } as unknown as OriginalGraphView<TestGraph>),
  ).toBe(true);
});
