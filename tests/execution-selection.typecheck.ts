import {
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  DepthFirstTraversalOrder as DFS,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  BreadthFirstTraversalOrder as BFS,
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as DAG,
  DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDFS,
  BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultBFS,
  DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDAG,
  makeEffectiveDepthFirstTraversalRunnerIterableConfig as makeDFS,
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig as makeBFS,
  makeEffectiveDagTraversalRunnerIterableConfig as makeDAG,
} from '../src';
import type { VisitorPhaseSelection, TraversalExecutionOptions } from '../src';

export function executionSelectionTypes() {
  const dfs = [
    new DepthFirstTraversal({}).makeRunner(),
    new AsyncDepthFirstTraversal({}).makeRunner(),
  ];
  const bfs = [
    new BreadthFirstTraversal({}).makeRunner(),
    new AsyncBreadthFirstTraversal({}).makeRunner(),
  ];
  const dag = [
    new DagTraversal({
      traversableGraph: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner(),
    new AsyncDagTraversal({
      traversableGraph: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner(),
  ];
  const phases: readonly DFS[] = [DFS.PRE_ORDER];
  const selection: VisitorPhaseSelection<DFS> = { include: phases };
  const options: TraversalExecutionOptions<DFS> = {
    emitPhases: phases,
    visitorPhases: selection,
  };
  for (const runner of dfs) {
    runner.run(options);
    runner.run(makeDFS());
    runner.getIterable(defaultDFS);
    runner.getIterable({ emitPhases: phases, visitorPhases: { exclude: [] } });
    runner.run({ iterateOver: phases, enableVisitorFunctionsFor: phases });
    runner.run({ emitPhases: phases, disableVisitorFunctionsFor: [] });
    // @ts-expect-error Canonical selectors cannot include and exclude.
    runner.run({ visitorPhases: { include: [], exclude: [] } });
    // @ts-expect-error Emission aliases conflict.
    runner.run({ emitPhases: phases, iterateOver: phases });
    // @ts-expect-error Visitor aliases conflict even when disabled.
    runner.run({ visitorPhases: 'all', enableVisitorFunctionsFor: null });
    // @ts-expect-error Visitor aliases conflict.
    runner.run({ visitorPhases: 'all', disableVisitorFunctionsFor: [] });
    // @ts-expect-error The real runner infers DFS phases.
    runner.run({ emitPhases: [DAG.ON_READY] });
  }
  for (const runner of bfs) {
    runner.run(makeBFS());
    runner.getIterable(defaultBFS);
    runner.run({ emitPhases: [BFS.LEVEL_ORDER], visitorPhases: 'all' });
    // @ts-expect-error BFS rejects DFS visitor phases.
    runner.run({ visitorPhases: { include: [DFS.PRE_ORDER] } });
    // @ts-expect-error BFS rejects DAG emission phases.
    runner.getIterable({ emitPhases: [DAG.ON_COMPLETE] });
  }
  for (const runner of dag) {
    runner.run(makeDAG());
    runner.getIterable(defaultDAG);
    runner.run({
      emitPhases: [DAG.ON_READY],
      visitorPhases: { exclude: [DAG.ON_COMPLETE] },
    });
    // @ts-expect-error DAG rejects BFS phases.
    runner.run({ visitorPhases: { exclude: [BFS.LEVEL_ORDER] } });
    // @ts-expect-error DAG rejects simultaneous emission aliases.
    runner.getIterable({ emitPhases: [], iterateOver: [] });
  }
}
