import {
  DagTraversalOrder,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  dagTraversal,
  hasSingleSink,
  traverseDag,
} from '../src';
import { traverseDagAsync } from '../src/traversals/dag-traversal';
import type { TraversableGraph } from '../src/core/TraversableGraph';
import type { ResolvedGraphSnapshot } from '../src/core/ResolvedGraph';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type TestGraph = TreeTypeParameters<string, string>;

function graph(
  root: string | null,
  children: Record<string, string[]>,
): TraversableGraph<TestGraph> {
  const result = (id: string) => ({
    vertexId: id,
    vertexContent: { $d: id, $c: children[id] ?? [] },
  });
  return {
    makeRoot: () => (root === null ? { vertexContent: null } : result(root)),
    makeVertex: (hint) => result(hint),
    getVertexIdFromHint: (hint) => ({ vertexId: hint }),
  };
}

test('DAG helpers register visitors and keep their explicit source authoritative', () => {
  const visits: string[] = [];
  const explicit = graph('root', { root: [] });
  const override = graph('wrong', { wrong: [] });
  const runner = traverseDag(
    { traversableGraph: explicit },
    {
      onReadyVisitor: (vertex) => {
        visits.push(`ready:${vertex.getData()}`);
      },
      onCompleteVisitor: (vertex) => {
        visits.push(`complete:${vertex.getData()}`);
      },
    },
    { traversableGraph: override } as never,
  );

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual(['ready:root', 'complete:root']);
  expect(dagTraversal.traverseDag).toBe(traverseDag);
  expect(dagTraversal.DagTraversalOrder).toBe(DagTraversalOrder);
});

test('async DAG helper accepts a null visitor set and returns a finished runner', async () => {
  const explicit = graph('root', { root: [] });
  const override = graph('wrong', { wrong: [] });
  const runner = await traverseDagAsync({ traversableGraph: explicit }, null, {
    traversableGraph: override,
  } as never);

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(runner.getResolvedGraph().getRoot()?.unref().getData()).toBe('root');
});

test('async DAG helper registers its completion visitor', async () => {
  const visits: string[] = [];
  const runner = await traverseDagAsync(
    { traversableGraph: graph('root', { root: [] }) },
    {
      onCompleteVisitor: async (vertex) => {
        visits.push(vertex.getData());
      },
    },
  );

  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async DAG helper returns a halted runner when its visitor requests halt', async () => {
  const runner = await traverseDagAsync(
    { traversableGraph: graph('root', { root: ['leaf'], leaf: [] }) },
    {
      onReadyVisitor: async () => ({
        commands: [{ commandName: TraversalVisitorCommandName.HALT_TRAVERSAL }],
      }),
    },
  );

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  expect(hasSingleSink(runner.getResolvedGraph())).toBe(true);
});

test('hasSingleSink counts the currently resolved discovery graph', () => {
  const empty = traverseDag({ traversableGraph: graph(null, {}) }, null);
  const fork = traverseDag(
    {
      traversableGraph: graph('root', {
        root: ['left', 'right'],
        left: [],
        right: [],
      }),
    },
    null,
  );
  const chain = traverseDag(
    {
      traversableGraph: graph('root', { root: ['leaf'], leaf: [] }),
    },
    null,
  );

  expect(hasSingleSink(empty.getResolvedGraph())).toBe(false);
  expect(hasSingleSink(fork.getResolvedGraph())).toBe(false);
  expect(hasSingleSink(chain.getResolvedGraph())).toBe(true);
  expect(
    hasSingleSink({
      getVertexRefs: () => [null as never],
      getChildrenOf: () => null,
    } as unknown as ResolvedGraphSnapshot<TestGraph>),
  ).toBe(true);
});
