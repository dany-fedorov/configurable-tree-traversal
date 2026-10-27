import {
  rewriteObject,
  ObjectTreeSource,
  createObjectMutationBinder,
  walkGraph,
  walkGraphAsync,
  materializeWalkSourceFromRecords,
  DepthFirstPhase,
  BreadthFirstPhase,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  DagTraversal,
  AsyncDagTraversal,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirst,
  traverseTreeBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
  type ObjectTreeVertexTypes,
  type ObjectCurrentVertexTypes,
  type VertexTypes,
  type TraversalVisitorCommandArguments,
  type TraversalVisitorCommand,
  type TraversalVisitorResult,
  type TreeSource,
  type AsyncTreeSource,
  type DagDiscoverySource,
  type AsyncDagDiscoverySource,
} from '../src';

type Input = ObjectTreeVertexTypes<'input', number>;
type Output = ObjectTreeVertexTypes<'output', string>;
type Current = ObjectCurrentVertexTypes<Input, Output>;
const outputHints = () => ({
  commands: [
    {
      commandName: Command.REWRITE_CHILD_HINTS as const,
      commandArguments: {
        newHints: [{ key: 'output' as const, value: 'changed' }],
      },
    },
  ],
});
rewriteObject<number, 'input', number, unknown, 'output', string>(0, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  resolveVertexHook(hint) {
    hint.value.toFixed();
    return { kind: 'useDefault' };
  },
  visitors: {
    // @ts-expect-error The owned source resolves input hints, not output-only hints.
    [DepthFirstPhase.PRE_ORDER]: outputHints,
  },
});
const matching = new ObjectTreeSource<
  number,
  'input',
  number,
  'output',
  string
>(0, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
});
traverseTreeDepthFirst<Input, Current>({
  traversableTree: matching,
  visitors: {
    // @ts-expect-error Matching output types do not widen the source hint domain.
    [DepthFirstPhase.PRE_ORDER]: outputHints,
  },
});
const narrow = new ObjectTreeSource<number, 'input', number>(0, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  resolveVertexHook(_hint, context) {
    context.resolutionContext.parentVertexRef
      .getValue()
      .getData()
      .value.toFixed();
    return { kind: 'useDefault' };
  },
});
const binder = createObjectMutationBinder<Input, Output>();
traverseTreeDepthFirst<Input, Current>({
  // @ts-expect-error A source must accept the full live context after a data patch.
  traversableTree: narrow,
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: (vertex, context) => ({
      commands: [
        binder(vertex, context).makeMutationCommand({
          rewrite: { value: 'changed' },
        }),
      ],
    }),
  },
});

// Source hint and data types are deliberately independent, with non-never domains.
type T = VertexTypes<number, 'input'>;
type R = VertexTypes<number | string, 'input' | 'output'>;
declare const tree: TreeSource<T, R>;
declare const asyncTree: AsyncTreeSource<T, R>;
declare const narrowTree: TreeSource<T>;
declare const narrowAsyncTree: AsyncTreeSource<T>;
declare const graph: DagDiscoverySource<T, R, object | undefined>;
declare const asyncGraph: AsyncDagDiscoverySource<T, R, object | undefined>;
declare const narrowGraph: DagDiscoverySource<T, T, object | undefined>;
declare const narrowAsyncGraph: AsyncDagDiscoverySource<
  T,
  T,
  object | undefined
>;
const invalidHints = () => ({
  commands: [
    {
      commandName: Command.REWRITE_CHILD_HINTS as const,
      commandArguments: { newHints: ['output' as const] },
    },
  ],
});
const validHints = () => ({
  commands: [
    {
      commandName: Command.REWRITE_CHILD_HINTS as const,
      commandArguments: { newHints: ['input' as const] },
    },
  ],
});

// DepthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
traverseTreeDepthFirst<T, R>({
  traversableTree: tree,
  visitors: { [DepthFirstPhase.PRE_ORDER]: validHints },
});
// @ts-expect-error Sources cannot promise a narrower live context.
traverseTreeDepthFirst<T, R>({ traversableTree: narrowTree });
const depthFirstTreeTraversal = new DepthFirstTreeTraversal<T, R>({
  traversableTree: tree,
});
// @ts-expect-error Construction enforces the source's live-context contract.
new DepthFirstTreeTraversal<T, R>({ traversableTree: narrowTree });
// @ts-expect-error Reconfiguration enforces the same live-context contract.
depthFirstTreeTraversal.configure({ traversableTree: narrowTree });
depthFirstTreeTraversal.configure({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DepthFirstPhase.PRE_ORDER]: invalidHints,
  },
});
depthFirstTreeTraversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, validHints);
// @ts-expect-error Registration cannot introduce output-only hints.
depthFirstTreeTraversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, invalidHints);
depthFirstTreeTraversal.addVisitorGroupFor(DepthFirstPhase.PRE_ORDER, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
// @ts-expect-error Replacement registration cannot introduce output-only hints.
depthFirstTreeTraversal.setVisitorsFor(DepthFirstPhase.PRE_ORDER, invalidHints);
depthFirstTreeTraversal.setVisitorsFor(
  DepthFirstPhase.PRE_ORDER,
  depthFirstTreeTraversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER),
);

// AsyncDepthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
traverseTreeDepthFirstAsync<T, R>({
  traversableTree: asyncTree,
  visitors: { [DepthFirstPhase.PRE_ORDER]: validHints },
});
// @ts-expect-error Sources cannot promise a narrower live context.
traverseTreeDepthFirstAsync<T, R>({ traversableTree: narrowAsyncTree });
const asyncDepthFirstTreeTraversal = new AsyncDepthFirstTreeTraversal<T, R>({
  traversableTree: asyncTree,
});
// @ts-expect-error Construction enforces the source's live-context contract.
new AsyncDepthFirstTreeTraversal<T, R>({ traversableTree: narrowAsyncTree });
// @ts-expect-error Reconfiguration enforces the same live-context contract.
asyncDepthFirstTreeTraversal.configure({ traversableTree: narrowAsyncTree });
asyncDepthFirstTreeTraversal.configure({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DepthFirstPhase.PRE_ORDER]: invalidHints,
  },
});
asyncDepthFirstTreeTraversal.addVisitorFor(
  DepthFirstPhase.PRE_ORDER,
  validHints,
);
asyncDepthFirstTreeTraversal.addVisitorFor(
  DepthFirstPhase.PRE_ORDER,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
asyncDepthFirstTreeTraversal.addVisitorGroupFor(DepthFirstPhase.PRE_ORDER, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
asyncDepthFirstTreeTraversal.setVisitorsFor(
  DepthFirstPhase.PRE_ORDER,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
asyncDepthFirstTreeTraversal.setVisitorsFor(
  DepthFirstPhase.PRE_ORDER,
  asyncDepthFirstTreeTraversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER),
);

// BreadthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
traverseTreeBreadthFirst<T, R>({
  traversableTree: tree,
  visitors: { [BreadthFirstPhase.LEVEL_ORDER]: validHints },
});
// @ts-expect-error Sources cannot promise a narrower live context.
traverseTreeBreadthFirst<T, R>({ traversableTree: narrowTree });
const breadthFirstTreeTraversal = new BreadthFirstTreeTraversal<T, R>({
  traversableTree: tree,
});
// @ts-expect-error Construction enforces the source's live-context contract.
new BreadthFirstTreeTraversal<T, R>({ traversableTree: narrowTree });
// @ts-expect-error Reconfiguration enforces the same live-context contract.
breadthFirstTreeTraversal.configure({ traversableTree: narrowTree });
breadthFirstTreeTraversal.configure({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [BreadthFirstPhase.LEVEL_ORDER]: invalidHints,
  },
});
breadthFirstTreeTraversal.addVisitorFor(
  BreadthFirstPhase.LEVEL_ORDER,
  validHints,
);
breadthFirstTreeTraversal.addVisitorFor(
  BreadthFirstPhase.LEVEL_ORDER,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
breadthFirstTreeTraversal.addVisitorGroupFor(BreadthFirstPhase.LEVEL_ORDER, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
breadthFirstTreeTraversal.setVisitorsFor(
  BreadthFirstPhase.LEVEL_ORDER,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
breadthFirstTreeTraversal.setVisitorsFor(
  BreadthFirstPhase.LEVEL_ORDER,
  breadthFirstTreeTraversal.listVisitorsFor(BreadthFirstPhase.LEVEL_ORDER),
);

// AsyncBreadthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
traverseTreeBreadthFirstAsync<T, R>({
  traversableTree: asyncTree,
  visitors: { [BreadthFirstPhase.LEVEL_ORDER]: validHints },
});
// @ts-expect-error Sources cannot promise a narrower live context.
traverseTreeBreadthFirstAsync<T, R>({ traversableTree: narrowAsyncTree });
const asyncBreadthFirstTreeTraversal = new AsyncBreadthFirstTreeTraversal<T, R>(
  { traversableTree: asyncTree },
);
// @ts-expect-error Construction enforces the source's live-context contract.
new AsyncBreadthFirstTreeTraversal<T, R>({ traversableTree: narrowAsyncTree });
// @ts-expect-error Reconfiguration enforces the same live-context contract.
asyncBreadthFirstTreeTraversal.configure({ traversableTree: narrowAsyncTree });
asyncBreadthFirstTreeTraversal.configure({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [BreadthFirstPhase.LEVEL_ORDER]: invalidHints,
  },
});
asyncBreadthFirstTreeTraversal.addVisitorFor(
  BreadthFirstPhase.LEVEL_ORDER,
  validHints,
);
asyncBreadthFirstTreeTraversal.addVisitorFor(
  BreadthFirstPhase.LEVEL_ORDER,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
asyncBreadthFirstTreeTraversal.addVisitorGroupFor(
  BreadthFirstPhase.LEVEL_ORDER,
  // @ts-expect-error Group registration cannot introduce output-only hints.
  { visitors: [invalidHints] },
);
asyncBreadthFirstTreeTraversal.setVisitorsFor(
  BreadthFirstPhase.LEVEL_ORDER,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
asyncBreadthFirstTreeTraversal.setVisitorsFor(
  BreadthFirstPhase.LEVEL_ORDER,
  asyncBreadthFirstTreeTraversal.listVisitorsFor(BreadthFirstPhase.LEVEL_ORDER),
);

// DagTraversal: helper, construction, reconfiguration and every registration route.
traverseDag<T, R, object | undefined>({
  traversableGraph: graph,
  visitors: { [DagVisitorPhase.ON_WORK_READY]: validHints },
});
// @ts-expect-error Sources cannot promise a narrower live context.
traverseDag<T, R, object | undefined>({ traversableGraph: narrowGraph });
const dagTraversal = new DagTraversal<T, R, object | undefined>({
  traversableGraph: graph,
});
// @ts-expect-error Construction enforces the source's live-context contract.
new DagTraversal<T, R, object | undefined>({ traversableGraph: narrowGraph });
// @ts-expect-error Reconfiguration enforces the same live-context contract.
dagTraversal.configure({ traversableGraph: narrowGraph });
dagTraversal.configure({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DagVisitorPhase.ON_WORK_READY]: invalidHints,
  },
});
dagTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, validHints);
// @ts-expect-error Registration cannot introduce output-only hints.
dagTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, invalidHints);
dagTraversal.addVisitorGroupFor(DagVisitorPhase.ON_WORK_READY, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
// @ts-expect-error Replacement registration cannot introduce output-only hints.
dagTraversal.setVisitorsFor(DagVisitorPhase.ON_WORK_READY, invalidHints);
dagTraversal.setVisitorsFor(
  DagVisitorPhase.ON_WORK_READY,
  dagTraversal.listVisitorsFor(DagVisitorPhase.ON_WORK_READY),
);

// AsyncDagTraversal: helper, construction, reconfiguration and every registration route.
traverseDagAsync<T, R, object | undefined>({
  traversableGraph: asyncGraph,
  visitors: { [DagVisitorPhase.ON_WORK_READY]: validHints },
});
traverseDagAsync<T, R, object | undefined>({
  // @ts-expect-error Sources cannot promise a narrower live context.
  traversableGraph: narrowAsyncGraph,
});
const asyncDagTraversal = new AsyncDagTraversal<T, R, object | undefined>({
  traversableGraph: asyncGraph,
});
new AsyncDagTraversal<T, R, object | undefined>({
  // @ts-expect-error Construction enforces the source's live-context contract.
  traversableGraph: narrowAsyncGraph,
});
// @ts-expect-error Reconfiguration enforces the same live-context contract.
asyncDagTraversal.configure({ traversableGraph: narrowAsyncGraph });
asyncDagTraversal.configure({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DagVisitorPhase.ON_WORK_READY]: invalidHints,
  },
});
asyncDagTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, validHints);
// @ts-expect-error Registration cannot introduce output-only hints.
asyncDagTraversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, invalidHints);
asyncDagTraversal.addVisitorGroupFor(DagVisitorPhase.ON_WORK_READY, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
// @ts-expect-error Replacement registration cannot introduce output-only hints.
asyncDagTraversal.setVisitorsFor(DagVisitorPhase.ON_WORK_READY, invalidHints);
asyncDagTraversal.setVisitorsFor(
  DagVisitorPhase.ON_WORK_READY,
  asyncDagTraversal.listVisitorsFor(DagVisitorPhase.ON_WORK_READY),
);

// Tree-backed DAGs and sync sources admitted to async builders obey the same boundary.
// @ts-expect-error A tree-backed DAG must supply the full current context.
new DagTraversal<T, R>({ traversableTree: narrowTree });
// @ts-expect-error A synchronous source still needs the async traversal's live domain.
new AsyncDagTraversal<T, R>({ traversableTree: narrowTree });
new AsyncDagTraversal<T, R, object | undefined>({
  // @ts-expect-error A synchronous discovery source still needs the async live domain.
  traversableGraph: narrowGraph,
});

// The generic source input owns hints even when rewrite hints are disjoint.
type HintInput = VertexTypes<number, 'first' | { next: number }>;
type HintOutput = VertexTypes<string, boolean>;
function genericHints<H>(hint: H) {
  return () => ({
    commands: [
      {
        commandName: Command.REWRITE_CHILD_HINTS as const,
        commandArguments: { newHints: [hint] },
      },
    ],
  });
}
declare const unionSource: TreeSource<HintInput, HintOutput>;
const unionTraversal = new DepthFirstTreeTraversal<HintInput, HintOutput>({
  traversableTree: unionSource,
});
unionTraversal.addVisitorFor(
  DepthFirstPhase.PRE_ORDER,
  genericHints<HintInput['VertexHint']>('first'),
);
unionTraversal.addVisitorFor(
  DepthFirstPhase.PRE_ORDER,
  genericHints<HintInput['VertexHint']>({ next: 1 }),
);
unionTraversal.addVisitorFor(
  DepthFirstPhase.POST_ORDER,
  // @ts-expect-error Even a valid source hint cannot be introduced after discovery.
  genericHints<HintInput['VertexHint']>('first'),
);

type UnionInput = ObjectTreeVertexTypes<'input' | 'output', number | string>;
type UnionCurrent = ObjectCurrentVertexTypes<UnionInput, Output>;
const unionObject = new ObjectTreeSource<
  number,
  'input' | 'output',
  number | string,
  'output',
  string
>(0, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  resolveVertexHook(hint, context) {
    const hintValue: number | string = hint.value;
    const originalValue: number | string = context
      .originalTreeView!.getRoot()!
      .getValue()
      .getData().value;
    const currentValue: number | string =
      context.resolutionContext.parentVertexRef.getValue().getData().value;
    // @ts-expect-error The declared source union applies to original discovered records too.
    const numberOnly: number = originalValue;
    void [hintValue, currentValue, numberOnly];
    return { kind: 'useDefault' };
  },
});
traverseTreeDepthFirst<UnionInput, UnionCurrent>({
  traversableTree: unionObject,
  visitors: { PRE_ORDER: outputHints },
});
rewriteObject<
  number,
  'input' | 'output',
  number | string,
  unknown,
  'output',
  string
>(0, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  visitors: { PRE_ORDER: outputHints },
});

// Keep source-driven inference with context-sensitive spread sorters and visitors.
declare const inferredTree: TreeSource<VertexTypes<number, string>>;
const inferredBreadth = traverseTreeBreadthFirst({
  traversableTree: inferredTree,
  ...{ sortChildrenHints: <Hint,>(hints: Hint[]) => hints.reverse() },
  visitors: {
    LEVEL_ORDER: (vertex) => {
      const value: number = vertex.getData();
      void value;
    },
  },
});
const inferredValue: number = inferredBreadth
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();
void inferredValue;

// Walking has no rewrite-hint command and keeps its independent source protocol.
const walkingSource = materializeWalkSourceFromRecords(
  [{ id: 'root', value: 1 }],
  { id: (item) => item.id, roots: ['root'], outgoing: () => [] },
);
walkGraph({ source: walkingSource });
walkGraphAsync({ source: walkingSource });

const inferredDirect = traverseTreeBreadthFirst({
  traversableTree: inferredTree,
  sortChildrenHints: (hints) => hints.reverse(),
});
const inferredAnnotated = traverseTreeBreadthFirst({
  traversableTree: inferredTree,
  ...{ sortChildrenHints: (hints: string[]) => hints.reverse() },
});
const directData: number = inferredDirect
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();
const annotatedData: number = inferredAnnotated
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();
void [directData, annotatedData];

new DepthFirstTreeTraversal({
  traversableTree: tree,
  sortChildrenHints: (hints) => hints.reverse(),
  visitors: {
    PRE_ORDER: (vertex) => {
      const live: number | string = vertex.getData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getData();
      void [live, inputOnly];
    },
  },
});

new AsyncDepthFirstTreeTraversal({
  traversableTree: asyncTree,
  sortChildrenHints: (hints) => hints.reverse(),
  visitors: {
    PRE_ORDER: (vertex) => {
      const live: number | string = vertex.getData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getData();
      void [live, inputOnly];
    },
  },
});

new BreadthFirstTreeTraversal({
  traversableTree: tree,
  sortChildrenHints: (hints) => hints.reverse(),
  visitors: {
    LEVEL_ORDER: (vertex) => {
      const live: number | string = vertex.getData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getData();
      void [live, inputOnly];
    },
  },
});

new AsyncBreadthFirstTreeTraversal({
  traversableTree: asyncTree,
  sortChildrenHints: (hints) => hints.reverse(),
  visitors: {
    LEVEL_ORDER: (vertex) => {
      const live: number | string = vertex.getData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getData();
      void [live, inputOnly];
    },
  },
});

new DagTraversal({
  traversableGraph: graph,
  sortChildrenHints: (hints) => hints.reverse(),
  visitors: {
    ON_WORK_READY: (vertex) => {
      const live: number | string = vertex.getData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getData();
      void [live, inputOnly];
    },
  },
});

new AsyncDagTraversal({
  traversableGraph: asyncGraph,
  sortChildrenHints: (hints) => hints.reverse(),
  visitors: {
    ON_WORK_READY: (vertex) => {
      const live: number | string = vertex.getData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getData();
      void [live, inputOnly];
    },
  },
});

// Shared standalone defaults remain useful; concrete visitors select source hints.
const standaloneHints: TraversalVisitorCommand<R, Command.REWRITE_CHILD_HINTS> = invalidHints().commands[0]!;
const sourceOwnedHints: TraversalVisitorCommand<R, Command.REWRITE_CHILD_HINTS, T['VertexHint']> = validHints().commands[0]!;
// @ts-expect-error Standalone output hints cannot bypass a concrete source-owned contract.
const rejectedStandalone: typeof sourceOwnedHints = standaloneHints;
const standaloneArguments: TraversalVisitorCommandArguments<HintOutput>[Command.REWRITE_CHILD_HINTS] = { newHints: [true] };
const sourceArguments: TraversalVisitorCommandArguments<HintOutput, HintInput['VertexHint']>[Command.REWRITE_CHILD_HINTS] = { newHints: ['first', { next: 2 }] };
const sourceResult: TraversalVisitorResult<HintOutput, DepthFirstPhase.PRE_ORDER, 'tree', HintInput['VertexHint']> = genericHints<HintInput['VertexHint']>('first')();
void [rejectedStandalone, standaloneArguments, sourceArguments, sourceResult];
