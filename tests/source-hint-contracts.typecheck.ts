import {
  rewriteObject,
  ObjectPropertyTreeSource,
  createObjectPropertyMutationHelperBinder,
  createAndRunGraphWalkUntilSuspendedOrTerminal,
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync,
  materializeGraphWalkSourceFromVertexRecords,
  DepthFirstTreeVisitPhase,
  BreadthFirstTreeVisitPhase,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  traverseDag,
  traverseDagAsync,
  type ObjectPropertyTreeVertexTypes,
  type LiveObjectPropertyVertexTypes,
  type VertexDataAndChildHintTypes,
  type TraversalVisitorCommandArguments,
  type TraversalVisitorCommand,
  type VisitorCommandsResult,
  type TreeDiscoverySource,
  type AsyncTreeDiscoverySource,
  type DagDiscoverySource,
  type AsyncDagDiscoverySource,
} from '../src';

type Input = ObjectPropertyTreeVertexTypes<'input', number>;
type Output = ObjectPropertyTreeVertexTypes<'output', string>;
type Current = LiveObjectPropertyVertexTypes<Input, Output>;
const outputHints = () => ({
  commands: [
    {
      commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
      commandArguments: {
        replacementChildHints: [
          { propertyKey: 'output' as const, propertyValue: 'changed' },
        ],
      },
    },
  ],
});
rewriteObject<number, 'input', number, unknown, 'output', string>(0, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'input',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
  resolveChildPropertyOrUseDefault(hint) {
    hint.propertyValue.toFixed();
    return { kind: 'useDefaultChildPropertyResolution' };
  },
  visitors: {
    // @ts-expect-error The owned source resolves input hints, not output-only hints.
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: outputHints,
  },
});
const matching = new ObjectPropertyTreeSource<
  number,
  'input',
  number,
  'output',
  string
>(0, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'input',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
});
runTreeDepthFirstUntilSuspendedOrTerminal<Input, Current>({
  treeDiscoverySource: matching,
  visitors: {
    // @ts-expect-error Matching output types do not widen the source hint domain.
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: outputHints,
  },
});
const narrow = new ObjectPropertyTreeSource<number, 'input', number>(0, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'input',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
  resolveChildPropertyOrUseDefault(_hint, context) {
    const value = context.childDiscoveryContext.parentVertexHandle
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    if (typeof value === 'number') value.toFixed();
    return { kind: 'useDefaultChildPropertyResolution' };
  },
});
const binder = createObjectPropertyMutationHelperBinder<Input, Output>();
runTreeDepthFirstUntilSuspendedOrTerminal<Input, Current>({
  // @ts-expect-error A source must accept the full live context after a data patch.
  treeDiscoverySource: narrow,
  visitors: {
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex, context) => ({
      commands: [
        binder(vertex, context).createObjectPropertyMutationCommand({
          kind: 'patchPropertyKeyOrValue',
          propertyPatch: { propertyValue: 'changed' },
        }),
      ],
    }),
  },
});

// Source hint and data types are deliberately independent, with non-never domains.
type T = VertexDataAndChildHintTypes<number, 'input'>;
type R = VertexDataAndChildHintTypes<number | string, 'input' | 'output'>;
declare const tree: TreeDiscoverySource<T, R>;
declare const asyncTree: AsyncTreeDiscoverySource<T, R>;
declare const narrowTree: TreeDiscoverySource<T>;
declare const narrowAsyncTree: AsyncTreeDiscoverySource<T>;
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
      commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
      commandArguments: { replacementChildHints: ['output' as const] },
    },
  ],
});
const validHints = () => ({
  commands: [
    {
      commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
      commandArguments: { replacementChildHints: ['input' as const] },
    },
  ],
});

// DepthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
runTreeDepthFirstUntilSuspendedOrTerminal<T, R>({
  treeDiscoverySource: tree,
  visitors: { [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: validHints },
});
runTreeDepthFirstUntilSuspendedOrTerminal<T, R>({
  // @ts-expect-error Sources cannot promise a narrower live context.
  treeDiscoverySource: narrowTree,
});
const depthFirstTreeTraversal = new DepthFirstTreeTraversalBuilder<T, R>({
  treeDiscoverySource: tree,
});
// @ts-expect-error Construction enforces the source's live-context contract.
new DepthFirstTreeTraversalBuilder<T, R>({ treeDiscoverySource: narrowTree });
depthFirstTreeTraversal.patchOptionsForFutureRunners({
  // @ts-expect-error Reconfiguration enforces the same live-context contract.
  treeDiscoverySource: narrowTree,
});
depthFirstTreeTraversal.patchOptionsForFutureRunners({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: invalidHints,
  },
});
depthFirstTreeTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  validHints,
);
depthFirstTreeTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
depthFirstTreeTraversal.appendVisitorGroupForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  {
    // @ts-expect-error Group registration cannot introduce output-only hints.
    visitors: [invalidHints],
  },
);
depthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
depthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  depthFirstTreeTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  ),
);

// AsyncDepthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
runTreeDepthFirstUntilSuspendedOrTerminalAsync<T, R>({
  treeDiscoverySource: asyncTree,
  visitors: { [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: validHints },
});
runTreeDepthFirstUntilSuspendedOrTerminalAsync<T, R>({
  // @ts-expect-error Sources cannot promise a narrower live context.
  treeDiscoverySource: narrowAsyncTree,
});
const asyncDepthFirstTreeTraversal = new AsyncDepthFirstTreeTraversalBuilder<
  T,
  R
>({
  treeDiscoverySource: asyncTree,
});
new AsyncDepthFirstTreeTraversalBuilder<T, R>({
  // @ts-expect-error Construction enforces the source's live-context contract.
  treeDiscoverySource: narrowAsyncTree,
});
asyncDepthFirstTreeTraversal.patchOptionsForFutureRunners({
  // @ts-expect-error Reconfiguration enforces the same live-context contract.
  treeDiscoverySource: narrowAsyncTree,
});
asyncDepthFirstTreeTraversal.patchOptionsForFutureRunners({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: invalidHints,
  },
});
asyncDepthFirstTreeTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  validHints,
);
asyncDepthFirstTreeTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
asyncDepthFirstTreeTraversal.appendVisitorGroupForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  {
    // @ts-expect-error Group registration cannot introduce output-only hints.
    visitors: [invalidHints],
  },
);
asyncDepthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
asyncDepthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  asyncDepthFirstTreeTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  ),
);

// BreadthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
runTreeBreadthFirstUntilSuspendedOrTerminal<T, R>({
  treeDiscoverySource: tree,
  visitors: { [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: validHints },
});
runTreeBreadthFirstUntilSuspendedOrTerminal<T, R>({
  // @ts-expect-error Sources cannot promise a narrower live context.
  treeDiscoverySource: narrowTree,
});
const breadthFirstTreeTraversal = new BreadthFirstTreeTraversalBuilder<T, R>({
  treeDiscoverySource: tree,
});
// @ts-expect-error Construction enforces the source's live-context contract.
new BreadthFirstTreeTraversalBuilder<T, R>({ treeDiscoverySource: narrowTree });
breadthFirstTreeTraversal.patchOptionsForFutureRunners({
  // @ts-expect-error Reconfiguration enforces the same live-context contract.
  treeDiscoverySource: narrowTree,
});
breadthFirstTreeTraversal.patchOptionsForFutureRunners({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: invalidHints,
  },
});
breadthFirstTreeTraversal.registerVisitorCallbackForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  validHints,
);
breadthFirstTreeTraversal.registerVisitorCallbackForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
breadthFirstTreeTraversal.appendVisitorGroupForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  {
    // @ts-expect-error Group registration cannot introduce output-only hints.
    visitors: [invalidHints],
  },
);
breadthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
breadthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  breadthFirstTreeTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  ),
);

// AsyncBreadthFirstTreeTraversal: helper, construction, reconfiguration and every registration route.
runTreeBreadthFirstUntilSuspendedOrTerminalAsync<T, R>({
  treeDiscoverySource: asyncTree,
  visitors: { [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: validHints },
});
runTreeBreadthFirstUntilSuspendedOrTerminalAsync<T, R>({
  // @ts-expect-error Sources cannot promise a narrower live context.
  treeDiscoverySource: narrowAsyncTree,
});
const asyncBreadthFirstTreeTraversal =
  new AsyncBreadthFirstTreeTraversalBuilder<T, R>({
    treeDiscoverySource: asyncTree,
  });
new AsyncBreadthFirstTreeTraversalBuilder<T, R>({
  // @ts-expect-error Construction enforces the source's live-context contract.
  treeDiscoverySource: narrowAsyncTree,
});
asyncBreadthFirstTreeTraversal.patchOptionsForFutureRunners({
  // @ts-expect-error Reconfiguration enforces the same live-context contract.
  treeDiscoverySource: narrowAsyncTree,
});
asyncBreadthFirstTreeTraversal.patchOptionsForFutureRunners({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: invalidHints,
  },
});
asyncBreadthFirstTreeTraversal.registerVisitorCallbackForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  validHints,
);
asyncBreadthFirstTreeTraversal.registerVisitorCallbackForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
asyncBreadthFirstTreeTraversal.appendVisitorGroupForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  // @ts-expect-error Group registration cannot introduce output-only hints.
  { visitors: [invalidHints] },
);
asyncBreadthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
asyncBreadthFirstTreeTraversal.replaceVisitorDefinitionsForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  asyncBreadthFirstTreeTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  ),
);

// DagTraversal: helper, construction, reconfiguration and every registration route.
traverseDag<T, R, object | undefined>({
  dagDiscoverySource: graph,
  visitors: { [DagVisitorPhase.ON_WORK_READY]: validHints },
});
// @ts-expect-error Sources cannot promise a narrower live context.
traverseDag<T, R, object | undefined>({ dagDiscoverySource: narrowGraph });
const dagTraversal = new DagTraversalBuilder<T, R, object | undefined>({
  dagDiscoverySource: graph,
});
new DagTraversalBuilder<T, R, object | undefined>({
  // @ts-expect-error Construction enforces the source's live-context contract.
  dagDiscoverySource: narrowGraph,
});
// @ts-expect-error Reconfiguration enforces the same live-context contract.
dagTraversal.patchOptionsForFutureRunners({ dagDiscoverySource: narrowGraph });
dagTraversal.patchOptionsForFutureRunners({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DagVisitorPhase.ON_WORK_READY]: invalidHints,
  },
});
dagTraversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  validHints,
);
dagTraversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
dagTraversal.appendVisitorGroupForPhase(DagVisitorPhase.ON_WORK_READY, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
dagTraversal.replaceVisitorDefinitionsForPhase(
  DagVisitorPhase.ON_WORK_READY,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
dagTraversal.replaceVisitorDefinitionsForPhase(
  DagVisitorPhase.ON_WORK_READY,
  dagTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    DagVisitorPhase.ON_WORK_READY,
  ),
);

// AsyncDagTraversal: helper, construction, reconfiguration and every registration route.
traverseDagAsync<T, R, object | undefined>({
  dagDiscoverySource: asyncGraph,
  visitors: { [DagVisitorPhase.ON_WORK_READY]: validHints },
});
traverseDagAsync<T, R, object | undefined>({
  // @ts-expect-error Sources cannot promise a narrower live context.
  dagDiscoverySource: narrowAsyncGraph,
});
const asyncDagTraversal = new AsyncDagTraversalBuilder<
  T,
  R,
  object | undefined
>({
  dagDiscoverySource: asyncGraph,
});
new AsyncDagTraversalBuilder<T, R, object | undefined>({
  // @ts-expect-error Construction enforces the source's live-context contract.
  dagDiscoverySource: narrowAsyncGraph,
});
asyncDagTraversal.patchOptionsForFutureRunners({
  // @ts-expect-error Reconfiguration enforces the same live-context contract.
  dagDiscoverySource: narrowAsyncGraph,
});
asyncDagTraversal.patchOptionsForFutureRunners({
  visitors: {
    // @ts-expect-error Reconfiguration accepts only source-domain hints.
    [DagVisitorPhase.ON_WORK_READY]: invalidHints,
  },
});
asyncDagTraversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  validHints,
);
asyncDagTraversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  // @ts-expect-error Registration cannot introduce output-only hints.
  invalidHints,
);
asyncDagTraversal.appendVisitorGroupForPhase(DagVisitorPhase.ON_WORK_READY, {
  // @ts-expect-error Group registration cannot introduce output-only hints.
  visitors: [invalidHints],
});
asyncDagTraversal.replaceVisitorDefinitionsForPhase(
  DagVisitorPhase.ON_WORK_READY,
  // @ts-expect-error Replacement registration cannot introduce output-only hints.
  invalidHints,
);
asyncDagTraversal.replaceVisitorDefinitionsForPhase(
  DagVisitorPhase.ON_WORK_READY,
  asyncDagTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    DagVisitorPhase.ON_WORK_READY,
  ),
);

// Tree-backed DAGs and sync sources admitted to async builders obey the same boundary.
// @ts-expect-error A tree-backed DAG must supply the full current context.
new DagTraversalBuilder<T, R>({ treeDiscoverySource: narrowTree });
// @ts-expect-error A synchronous source still needs the async traversal's live domain.
new AsyncDagTraversalBuilder<T, R>({ treeDiscoverySource: narrowTree });
new AsyncDagTraversalBuilder<T, R, object | undefined>({
  // @ts-expect-error A synchronous discovery source still needs the async live domain.
  dagDiscoverySource: narrowGraph,
});

// The generic source input owns hints even when rewrite hints are disjoint.
type HintInput = VertexDataAndChildHintTypes<
  number,
  'first' | { next: number }
>;
type HintOutput = VertexDataAndChildHintTypes<string, boolean>;
function genericHints<H>(hint: H) {
  return () => ({
    commands: [
      {
        commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
        commandArguments: { replacementChildHints: [hint] },
      },
    ],
  });
}
declare const unionSource: TreeDiscoverySource<HintInput, HintOutput>;
const unionTraversal = new DepthFirstTreeTraversalBuilder<
  HintInput,
  HintOutput
>({
  treeDiscoverySource: unionSource,
});
unionTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  genericHints<HintInput['ChildHint']>('first'),
);
unionTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  genericHints<HintInput['ChildHint']>({ next: 1 }),
);
unionTraversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  // @ts-expect-error Even a valid source hint cannot be introduced after discovery.
  genericHints<HintInput['ChildHint']>('first'),
);

type UnionInput = ObjectPropertyTreeVertexTypes<
  'input' | 'output',
  number | string
>;
type UnionCurrent = LiveObjectPropertyVertexTypes<UnionInput, Output>;
const unionObject = new ObjectPropertyTreeSource<
  number,
  'input' | 'output',
  number | string,
  'output',
  string
>(0, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'input',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
  resolveChildPropertyOrUseDefault(hint, context) {
    const hintValue: number | string = hint.propertyValue;
    const originalValue: number | string = context
      .preCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    const currentValue: unknown =
      context.childDiscoveryContext.parentVertexHandle
        .getCurrentVertexView()
        .getVertexData().propertyValue;
    // @ts-expect-error The declared source union applies to original discovered records too.
    const numberOnly: number = originalValue;
    void [hintValue, currentValue, numberOnly];
    return { kind: 'useDefaultChildPropertyResolution' };
  },
});
runTreeDepthFirstUntilSuspendedOrTerminal<UnionInput, UnionCurrent>({
  treeDiscoverySource: unionObject,
  visitors: { BEFORE_CHILD_EXPANSION: outputHints },
});
rewriteObject<
  number,
  'input' | 'output',
  number | string,
  unknown,
  'output',
  string
>(0, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'input',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
  visitors: { BEFORE_CHILD_EXPANSION: outputHints },
});

// Keep source-driven inference with context-sensitive spread sorters and visitors.
declare const inferredTree: TreeDiscoverySource<
  VertexDataAndChildHintTypes<number, string>
>;
const inferredBreadth = runTreeBreadthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: inferredTree,
  ...{
    transformChildHintsBeforeResolution: <Hint>(hints: Hint[]) =>
      hints.reverse(),
  },
  visitors: {
    AT_LEVEL_ORDER_VERTEX: (vertex) => {
      const value: number = vertex.getVertexData();
      void value;
    },
  },
});
const inferredValue: number = inferredBreadth
  .getLiveResolvedTreeView()
  .getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();
void inferredValue;

// Walking has no rewrite-hint command and keeps its independent source protocol.
const walkingSource = materializeGraphWalkSourceFromVertexRecords(
  [{ id: 'root', value: 1 }],
  {
    getVertexId: (item) => item.id,
    rootVertexIds: ['root'],
    enumerateOutgoingLinks: () => [],
  },
);
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: walkingSource,
});
createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: walkingSource,
});

const inferredDirect = runTreeBreadthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: inferredTree,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
});
const inferredAnnotated = runTreeBreadthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: inferredTree,
  ...{
    transformChildHintsBeforeResolution: (hints: string[]) => hints.reverse(),
  },
});
const directData: number = inferredDirect
  .getLiveResolvedTreeView()
  .getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();
const annotatedData: number = inferredAnnotated
  .getLiveResolvedTreeView()
  .getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();
void [directData, annotatedData];

new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
  visitors: {
    BEFORE_CHILD_EXPANSION: (vertex) => {
      const live: number | string = vertex.getVertexData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getVertexData();
      void [live, inputOnly];
    },
  },
});

new AsyncDepthFirstTreeTraversalBuilder({
  treeDiscoverySource: asyncTree,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
  visitors: {
    BEFORE_CHILD_EXPANSION: (vertex) => {
      const live: number | string = vertex.getVertexData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getVertexData();
      void [live, inputOnly];
    },
  },
});

new BreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
  visitors: {
    AT_LEVEL_ORDER_VERTEX: (vertex) => {
      const live: number | string = vertex.getVertexData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getVertexData();
      void [live, inputOnly];
    },
  },
});

new AsyncBreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: asyncTree,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
  visitors: {
    AT_LEVEL_ORDER_VERTEX: (vertex) => {
      const live: number | string = vertex.getVertexData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getVertexData();
      void [live, inputOnly];
    },
  },
});

new DagTraversalBuilder({
  dagDiscoverySource: graph,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
  visitors: {
    ON_WORK_READY: (vertex) => {
      const live: number | string = vertex.getVertexData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getVertexData();
      void [live, inputOnly];
    },
  },
});

new AsyncDagTraversalBuilder({
  dagDiscoverySource: asyncGraph,
  transformChildHintsBeforeResolution: (hints) => hints.reverse(),
  visitors: {
    ON_WORK_READY: (vertex) => {
      const live: number | string = vertex.getVertexData();
      // @ts-expect-error Inference retains the source's declared rewrite context.
      const inputOnly: number = vertex.getVertexData();
      void [live, inputOnly];
    },
  },
});

// Shared standalone defaults remain useful; concrete visitors select source hints.
const standaloneHints: TraversalVisitorCommand<
  R,
  Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS
> = invalidHints().commands[0]!;
const sourceOwnedHints: TraversalVisitorCommand<
  R,
  Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
  T['ChildHint']
> = validHints().commands[0]!;
// @ts-expect-error Standalone output hints cannot bypass a concrete source-owned contract.
const rejectedStandalone: typeof sourceOwnedHints = standaloneHints;
const standaloneArguments: TraversalVisitorCommandArguments<HintOutput>[Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS] =
  { replacementChildHints: [true] };
const sourceArguments: TraversalVisitorCommandArguments<
  HintOutput,
  HintInput['ChildHint']
>[Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS] = {
  replacementChildHints: ['first', { next: 2 }],
};
const sourceResult: VisitorCommandsResult<
  HintOutput,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  'tree',
  HintInput['ChildHint']
> = genericHints<HintInput['ChildHint']>('first')();
void [rejectedStandalone, standaloneArguments, sourceArguments, sourceResult];
