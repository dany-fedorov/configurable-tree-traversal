import { BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultBFS } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDAG } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT as defaultDFS } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveBreadthFirstTraversalRunnerIterableConfig as makeBFS } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { makeEffectiveDagTraversalRunnerIterableConfig as makeDAG } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig as makeDFS } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type {
  TraversalExecutionSelectionPatch,
  VisitorCallbackPhaseSelection,
} from '../src';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  AsyncGraphWalkBuilder,
  BreadthFirstTreeVisitPhase as BFS,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as DAG,
  DepthFirstTreeVisitPhase as DFS,
  DepthFirstTreeTraversalBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind,
} from '../src';

export function executionSelectionTypes() {
  const dfs = [
    new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
    new AsyncDepthFirstTreeTraversalBuilder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ];
  const bfs = [
    new BreadthFirstTreeTraversalBuilder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
    new AsyncBreadthFirstTreeTraversalBuilder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ];
  const dag = [
    new DagTraversalBuilder({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
    new AsyncDagTraversalBuilder({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ];
  const phases: readonly DFS[] = [DFS.BEFORE_CHILD_EXPANSION];
  const selection: VisitorCallbackPhaseSelection<DFS> = { include: phases };
  const options: TraversalExecutionSelectionPatch<DFS> = {
    deliveredEventKinds: phases,
    admittedVisitorCallbackPhases: selection,
  };
  for (const runner of dfs) {
    runner.runUntilSuspendedOrTerminal(options);
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.runUntilSuspendedOrTerminal(makeDFS());
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(defaultDFS);
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: phases,
      admittedVisitorCallbackPhases: { exclude: [] },
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error Legacy selectors are not canonical inputs.
      iterateOver: phases,
      enableVisitorFunctionsFor: phases,
    });
    runner.runUntilSuspendedOrTerminal({
      deliveredEventKinds: phases,
      // @ts-expect-error Legacy selectors are not canonical inputs.
      disableVisitorFunctionsFor: [],
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error Canonical selectors cannot include and exclude.
      admittedVisitorCallbackPhases: { include: [], exclude: [] },
    });
    runner.runUntilSuspendedOrTerminal({
      deliveredEventKinds: phases,
      // @ts-expect-error Emission aliases conflict.
      iterateOver: phases,
    });
    runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: 'all',
      // @ts-expect-error Visitor aliases conflict even when disabled.
      enableVisitorFunctionsFor: null,
    });
    runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: 'all',
      // @ts-expect-error Visitor aliases conflict.
      disableVisitorFunctionsFor: [],
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error The real runner infers DFS phases.
      deliveredEventKinds: [DAG.ON_WORK_READY],
    });
  }
  for (const runner of bfs) {
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.runUntilSuspendedOrTerminal(makeBFS());
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(defaultBFS);
    runner.runUntilSuspendedOrTerminal({
      deliveredEventKinds: [BFS.AT_LEVEL_ORDER_VERTEX],
      admittedVisitorCallbackPhases: 'all',
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error BFS rejects DFS visitor phases.
      admittedVisitorCallbackPhases: { include: [DFS.BEFORE_CHILD_EXPANSION] },
    });
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      // @ts-expect-error BFS rejects DAG emission phases.
      deliveredEventKinds: [DAG.ON_SUBGRAPH_COMPLETION_READY],
    });
  }
  const dagOptions: TraversalExecutionSelectionPatch<
    DAG,
    'workCompletionCommitted' | 'subgraphCompletionCommitted'
  > = {
    deliveredEventKinds: ['workCompletionCommitted'],
    admittedVisitorCallbackPhases: { include: [DAG.ON_WORK_READY] },
  };
  for (const runner of dag) {
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(dagOptions);
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      // @ts-expect-error Callback readiness phases are not committed event kinds.
      deliveredEventKinds: [DAG.ON_WORK_READY],
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error Committed event kinds are not callback phases.
      admittedVisitorCallbackPhases: { include: ['workCompletionCommitted'] },
    });
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.runUntilSuspendedOrTerminal(makeDAG());
    // @ts-expect-error Legacy normalized storage is not a public execution input.
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(defaultDAG);
    runner.runUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
      admittedVisitorCallbackPhases: {
        exclude: [DAG.ON_SUBGRAPH_COMPLETION_READY],
      },
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error DAG rejects BFS phases.
      admittedVisitorCallbackPhases: { exclude: [BFS.AT_LEVEL_ORDER_VERTEX] },
    });
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
      // @ts-expect-error DAG rejects simultaneous emission aliases.
      iterateOver: [],
    });
  }
}

function walkingKinds() {
  for (const runner of [
    new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => [],
        enumerateOutgoingLinks: () => [],
      },
    }).createIndependentRunnerFromCurrentOptions(),
    new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => [],
        enumerateOutgoingLinks: () => [],
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ]) {
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        'vertexOccurrence',
        'admittedEdgeOccurrence',
        'routePrefix',
      ],
      admittedVisitorCallbackPhases: {
        include: [GraphWalkObservationKind.VERTEX_OCCURRENCE],
      },
    });
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      // @ts-expect-error Walking cannot emit tree phases.
      deliveredEventKinds: [DFS.BEFORE_CHILD_EXPANSION],
    });
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      // @ts-expect-error Walking cannot emit DAG completion kinds.
      deliveredEventKinds: ['workCompletionCommitted'],
    });
    runner.runUntilSuspendedOrTerminal({
      // @ts-expect-error Walking cannot invoke DAG callback phases.
      admittedVisitorCallbackPhases: { include: [DAG.ON_WORK_READY] },
    });
  }
}
void walkingKinds;
