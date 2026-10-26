import {
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  DagTraversal,
  AsyncDagTraversal,
  GraphWalk,
  AsyncGraphWalk,
  DepthFirstPhase,
  ObjectTreeSource,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src';
const source = new ObjectTreeSource({ value: 1 });
// @ts-expect-error construction requires its source
new DepthFirstTreeTraversal({});
// @ts-expect-error construction requires its source
new AsyncDepthFirstTreeTraversal({});
// @ts-expect-error construction requires its source
new BreadthFirstTreeTraversal({});
// @ts-expect-error construction requires its source
new AsyncBreadthFirstTreeTraversal({});
// @ts-expect-error construction requires its source
new DagTraversal({});
// @ts-expect-error construction requires its source
new AsyncDagTraversal({});
// @ts-expect-error construction requires its source
new GraphWalk({});
// @ts-expect-error construction requires its source
new AsyncGraphWalk({});
const traversal = new DepthFirstTreeTraversal({ traversableTree: source });
traversal.configure({ visitors: {} });
// @ts-expect-error mutable engine state is not a public configuration port
traversal.configure({ traversalRunnerInternalObjects: {} });
// @ts-expect-error mutable configuration is private
traversal.icfg;
// @ts-expect-error registrations are accessed through detached list queries
traversal.visitors;
const runner = traversal.createRunner();
// @ts-expect-error mutable runner configuration is private
runner.icfg;
// @ts-expect-error mutable runner state is private
runner.state;
// @ts-expect-error raw containers are private
runner.resolvedTreesContainer;
// @ts-expect-error execution ownership is private
runner.curGenerator;
// @ts-expect-error legacy execution selectors are not canonical inputs
runner.run({ iterateOver: [DepthFirstPhase.PRE_ORDER] });
traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => undefined, {
  // @ts-expect-error registration policy has one canonical vocabulary
  resolutionStyle: Style.SEQUENTIAL,
});
// @ts-expect-error public effective inspection contains canonical selectors
runner.inspect().executionOptions.iterateOver;

// @ts-expect-error preferred object options use the tagged resolution hook
new ObjectTreeSource({}, { makeVertexHook: () => ({}) });
// @ts-expect-error runners are public capabilities, not normalized constructors
new (null as unknown as typeof import('../src')).DepthFirstTreeRunner({});
// @ts-expect-error runners are public capabilities, not normalized constructors
new (null as unknown as typeof import('../src')).GraphWalkRunner({});
// @ts-expect-error runners are public capabilities, not normalized constructors
new (null as unknown as typeof import('../src')).DagTraversalRunner({});
