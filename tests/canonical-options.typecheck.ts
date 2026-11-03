import {
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  DepthFirstTreeVisitPhase,
  ObjectPropertyTreeSource,
} from '../src';
const source = new ObjectPropertyTreeSource({ value: 1 });
// @ts-expect-error construction requires its source
new DepthFirstTreeTraversalBuilder({});
// @ts-expect-error construction requires its source
new AsyncDepthFirstTreeTraversalBuilder({});
// @ts-expect-error construction requires its source
new BreadthFirstTreeTraversalBuilder({});
// @ts-expect-error construction requires its source
new AsyncBreadthFirstTreeTraversalBuilder({});
// @ts-expect-error construction requires its source
new DagTraversalBuilder({});
// @ts-expect-error construction requires its source
new AsyncDagTraversalBuilder({});
// @ts-expect-error construction requires its source
new GraphWalkBuilder({});
// @ts-expect-error construction requires its source
new AsyncGraphWalkBuilder({});
const traversal = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: source,
});
traversal.patchOptionsForFutureRunners({ visitors: {} });
// @ts-expect-error mutable engine state is not a public configuration port
traversal.patchOptionsForFutureRunners({ traversalRunnerInternalObjects: {} });
// @ts-expect-error mutable configuration is private
traversal.icfg;
// @ts-expect-error registrations are accessed through detached list queries
traversal.visitors;
const runner = traversal.createIndependentRunnerFromCurrentOptions();
// @ts-expect-error mutable runner configuration is private
runner.icfg;
// @ts-expect-error mutable runner state is private
runner.state;
// @ts-expect-error raw containers are private
runner.resolvedTreesContainer;
// @ts-expect-error execution ownership is private
runner.curGenerator;
runner.runUntilSuspendedOrTerminal({
  // @ts-expect-error legacy execution selectors are not canonical inputs
  iterateOver: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
});
traversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  () => undefined,
  {
    // @ts-expect-error registration policy has one canonical vocabulary
    resolutionStyle: 'SEQUENTIAL',
  },
);
// @ts-expect-error public effective inspection contains canonical selectors
runner.captureExecutionSnapshot().executionOptions.iterateOver;

// @ts-expect-error preferred object options use the tagged resolution hook
new ObjectPropertyTreeSource({}, { makeVertexHook: () => ({}) });
// @ts-expect-error runners are public capabilities, not normalized constructors
new (null as unknown as typeof import('../src')).DepthFirstTreeRunner({});
// @ts-expect-error runners are public capabilities, not normalized constructors
new (null as unknown as typeof import('../src')).GraphWalkRunner({});
// @ts-expect-error runners are public capabilities, not normalized constructors
new (null as unknown as typeof import('../src')).DagTraversalRunner({});

const inspectionDag = new DagTraversalBuilder({
  treeDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const inspectionAsyncDag = new AsyncDagTraversalBuilder({
  treeDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
// @ts-expect-error assembly-only state is not a public runner capability
inspectionDag.inspectDagState();
// @ts-expect-error assembly-only state is not a public async runner capability
inspectionAsyncDag.inspectDagState();
