import { BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultBFS } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDAG } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDFS } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveBreadthFirstTraversalRunnerIterableConfig as makeBFS } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { makeEffectiveDagTraversalRunnerIterableConfig as makeDAG } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig as makeDFS } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type { TraversalExecutionOptions, VisitorPhaseSelection } from '../src';
import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  AsyncGraphWalk,
  BreadthFirstPhase as BFS,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DagVisitorPhase as DAG,
  DepthFirstPhase as DFS,
  DepthFirstTreeTraversal,
  GraphWalk,
  GraphWalkPhase,
} from '../src';

export function executionSelectionTypes() {
  const dfs = [
    new DepthFirstTreeTraversal({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner(),
    new AsyncDepthFirstTreeTraversal({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner(),
  ];
  const bfs = [
    new BreadthFirstTreeTraversal({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner(),
    new AsyncBreadthFirstTreeTraversal({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner(),
  ];
  const dag = [
    new DagTraversal({
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner(),
    new AsyncDagTraversal({
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner(),
  ];
  const phases: readonly DFS[] = [DFS.PRE_ORDER];
  const selection: VisitorPhaseSelection<DFS> = { include: phases };
  const options: TraversalExecutionOptions<DFS> = {
    emitEvents: phases,
    visitorPhases: selection,
  };
  for (const runner of dfs) {
    runner.run(options);
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.run(makeDFS());
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.iterateEvents(defaultDFS);
    runner.iterateEvents({
      emitEvents: phases,
      visitorPhases: { exclude: [] },
    });
    // @ts-expect-error Legacy selectors are not canonical inputs.
    runner.run({ iterateOver: phases, enableVisitorFunctionsFor: phases });
    // @ts-expect-error Legacy selectors are not canonical inputs.
    runner.run({ emitEvents: phases, disableVisitorFunctionsFor: [] });
    // @ts-expect-error Canonical selectors cannot include and exclude.
    runner.run({ visitorPhases: { include: [], exclude: [] } });
    // @ts-expect-error Emission aliases conflict.
    runner.run({ emitEvents: phases, iterateOver: phases });
    // @ts-expect-error Visitor aliases conflict even when disabled.
    runner.run({ visitorPhases: 'all', enableVisitorFunctionsFor: null });
    // @ts-expect-error Visitor aliases conflict.
    runner.run({ visitorPhases: 'all', disableVisitorFunctionsFor: [] });
    // @ts-expect-error The real runner infers DFS phases.
    runner.run({ emitEvents: [DAG.ON_WORK_READY] });
  }
  for (const runner of bfs) {
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.run(makeBFS());
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.iterateEvents(defaultBFS);
    runner.run({ emitEvents: [BFS.LEVEL_ORDER], visitorPhases: 'all' });
    // @ts-expect-error BFS rejects DFS visitor phases.
    runner.run({ visitorPhases: { include: [DFS.PRE_ORDER] } });
    // @ts-expect-error BFS rejects DAG emission phases.
    runner.iterateEvents({ emitEvents: [DAG.ON_SUBGRAPH_READY] });
  }
  const dagOptions: TraversalExecutionOptions<
    DAG,
    'workCompleted' | 'subgraphCompleted'
  > = {
    emitEvents: ['workCompleted'],
    visitorPhases: { include: [DAG.ON_WORK_READY] },
  };
  for (const runner of dag) {
    runner.iterateEvents(dagOptions);
    // @ts-expect-error Callback readiness phases are not committed event kinds.
    runner.iterateEvents({ emitEvents: [DAG.ON_WORK_READY] });
    // @ts-expect-error Committed event kinds are not callback phases.
    runner.run({ visitorPhases: { include: ['workCompleted'] } });
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.run(makeDAG());
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.iterateEvents(defaultDAG);
    runner.run({
      emitEvents: ['workCompleted'],
      visitorPhases: { exclude: [DAG.ON_SUBGRAPH_READY] },
    });
    // @ts-expect-error DAG rejects BFS phases.
    runner.run({ visitorPhases: { exclude: [BFS.LEVEL_ORDER] } });
    // @ts-expect-error DAG rejects simultaneous emission aliases.
    runner.iterateEvents({ emitEvents: [], iterateOver: [] });
  }
}

function walkingKinds() {
  for (const runner of [
    new GraphWalk({
      source: { roots: () => [], outgoing: () => [] },
    }).createRunner(),
    new AsyncGraphWalk({
      source: { roots: () => [], outgoing: () => [] },
    }).createRunner(),
  ]) {
    runner.iterateEvents({
      emitEvents: ['vertex', 'edge', 'path'],
      visitorPhases: { include: [GraphWalkPhase.VERTEX] },
    });
    // @ts-expect-error Walking cannot emit tree phases.
    runner.iterateEvents({ emitEvents: [DFS.PRE_ORDER] });
    // @ts-expect-error Walking cannot emit DAG completion kinds.
    runner.iterateEvents({ emitEvents: ['workCompleted'] });
    // @ts-expect-error Walking cannot invoke DAG callback phases.
    runner.run({ visitorPhases: { include: [DAG.ON_WORK_READY] } });
  }
}
void walkingKinds;
