import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  GraphWalk,
  type TreeSource,
  type VertexTypes,
  type DepthFirstTreeOptionsPatch,
  type InOrderOptions,
} from '../src';
const tree: TreeSource<VertexTypes> = {
  resolveRoot: () => ({ kind: 'omitted' }),
  resolveChild: () => ({ kind: 'omitted' }),
};
const patch: DepthFirstTreeOptionsPatch = {
  traversableTree: undefined,
  transformChildHints: undefined,
  inOrder: { afterChildIndices: undefined, visitSingleChildParent: undefined },
  visitors: { PRE_ORDER: undefined },
};
new DepthFirstTreeTraversal({ traversableTree: tree }).configure(patch);
new AsyncDepthFirstTreeTraversal({ traversableTree: tree }).configure({
  ...patch,
  concurrency: undefined,
});
new BreadthFirstTreeTraversal({ traversableTree: tree }).configure({
  traversableTree: undefined,
  visitors: { LEVEL_ORDER: undefined },
});
new AsyncBreadthFirstTreeTraversal({ traversableTree: tree }).configure({
  concurrency: undefined,
});
new DagTraversal({ traversableTree: tree }).configure({
  discovery: undefined,
  workCompletion: undefined,
  visitors: { ON_WORK_READY: undefined },
});
new AsyncDagTraversal({ traversableTree: tree }).configure({
  concurrency: undefined,
  completedWork: undefined,
});
new GraphWalk({
  source: {
    hydration: 'inlineOrCached' as const,
    roots: () => [],
    outgoing: () => [],
  },
}).configure({
  source: undefined,
  strategy: undefined,
  replaceLimits: undefined,
  revisit: undefined,
  visitors: { vertex: undefined },
});
const inOrder: Partial<InOrderOptions> = {
  afterChildIndices: { indices: [0, 2] },
  fallbackChildIndices: { ranges: [{ from: -2, through: -1 }] },
};
void inOrder;
// @ts-expect-error ambiguous tuples are removed
const ambiguous: Partial<InOrderOptions> = { afterChildIndices: [0, 2] };
const conflicting: Partial<InOrderOptions> = {
  // @ts-expect-error a selection must choose one tag
  afterChildIndices: { indices: [0], ranges: [] },
};
void ambiguous;
void conflicting;

const optionalPathOptions: import('../src').GetPathToOptions = {
  noRoot: undefined,
  noSelf: undefined,
};
void optionalPathOptions;
