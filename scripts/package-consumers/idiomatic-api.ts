import {
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeDagInputFromRootRecords,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecordsAsync,
  materializeGraphWalkSourceFromVertexRecords,
  materializeSynchronousGraphWalkSourceFromAsyncRecords,
  DagTraversalBuilder,
  type MaterializedDagTraversalInput,
  type GraphWalkDiscoverySource,
  type VertexDataAndChildHintTypes,
  type MutableResolvedTreeStore,
  ObjectPropertyTreeSource,
  TraversalVisitorCommandName as Command,
} from 'configurable-tree-traversal';
import * as sources from 'configurable-tree-traversal/dag-input-materialization';
import * as walks from 'configurable-tree-traversal/traversals/graph-walk';
import cjs = require('configurable-tree-traversal');

const items = [{ id: undefined, value: 1 }];
const input: MaterializedDagTraversalInput<typeof items[number], undefined> =
  materializeMultiEntryDagInputFromRecordCatalog(items, {
    selectVertexId: (item) => item.id,
  });
const subpath: sources.MaterializedDagTraversalInput<
  typeof items[number],
  undefined
> = input;
const same: typeof materializeMultiEntryDagInputFromRecordCatalog =
  sources.materializeMultiEntryDagInputFromRecordCatalog;
const cjsInput: cjs.MaterializedDagTraversalInput<
  typeof items[number],
  undefined
> = subpath;
const holder: true = input.sourceRootIsHiddenEntryHolder;
new DagTraversalBuilder(input);
const roots: typeof input = materializeDagInputFromRootRecords(items, {
  selectVertexId: (item) => item.id,
});
const asyncRecords: Promise<typeof input> =
  materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
    selectVertexId: async (item) => item.id,
  });
const asyncRoots: Promise<typeof input> =
  materializeDagInputFromRootRecordsAsync(items, {
    selectVertexId: async (item) => item.id,
  });
const walking: GraphWalkDiscoverySource<
  typeof items[number],
  never,
  undefined
> = materializeGraphWalkSourceFromVertexRecords(items, {
  getVertexId: (item) => item.id,
  rootVertexIds: [undefined],
  enumerateOutgoingLinks: () => [],
});
const asyncWalking: Promise<typeof walking> =
  materializeSynchronousGraphWalkSourceFromAsyncRecords(items, {
    getVertexId: async (item) => item.id,
    rootVertexIds: [undefined],
    enumerateOutgoingLinks: () => [],
  });
const walkFactory: typeof materializeGraphWalkSourceFromVertexRecords =
  walks.materializeGraphWalkSourceFromVertexRecords;
// @ts-expect-error DAG input is an options envelope, not the actual source protocol.
new DagTraversalBuilder({ dagDiscoverySource: input });
// @ts-expect-error Removed envelope type has no compatibility alias.
import type { MaterializedDagSource } from 'configurable-tree-traversal';
// @ts-expect-error Removed envelope type has no subpath alias.
import type { MaterializedDagSource as OldSubpath } from 'configurable-tree-traversal/dag-input-materialization';
// @ts-expect-error Removed envelope factory.
import { materializeDagSourceFromRecords } from 'configurable-tree-traversal';
// @ts-expect-error Removed envelope factory.
import { materializeDagSourceFromRoots } from 'configurable-tree-traversal/dag-input-materialization';
// @ts-expect-error Removed async envelope factory.
import { materializeDagSourceFromRecordsAsync } from 'configurable-tree-traversal/dag-input-materialization';
// @ts-expect-error Removed async envelope factory.
import { materializeDagSourceFromRootsAsync } from 'configurable-tree-traversal';
// @ts-expect-error Removed object patch alias.
import type { ObjectMutationPatch } from 'configurable-tree-traversal';
// @ts-expect-error Removed callback alias.
import type { RewriteFn } from 'configurable-tree-traversal';
// @ts-expect-error Removed callback context alias.
import type { RewriteFnOptions } from 'configurable-tree-traversal';
// @ts-expect-error Removed callback input alias.
import type { RewriteFnPropInput } from 'configurable-tree-traversal';
// @ts-expect-error Removed object type alias.
import type { TraversableObjectTTP } from 'configurable-tree-traversal';
// @ts-expect-error Removed resolved-tree type alias.
import type { ResolvedTreeTypeParameters } from 'configurable-tree-traversal';
// @ts-expect-error Static mapper factory has a single canonical name.
ObjectPropertyTreeSource.getRootPropertyFromInputObjectDefault;
declare const store: MutableResolvedTreeStore<
  VertexDataAndChildHintTypes<string, string>
>;
// @ts-expect-error Tree deletion names its subtree scope.
store.delete;
// @ts-expect-error Generic deletion command removed.
Command.DELETE_VERTEX;
// @ts-expect-error Local pending expansion is named explicitly.
Command.DISABLE_SUBTREE_TRAVERSAL;
// @ts-expect-error Per-visit chain state has a single canonical name.
Command.SET_VERTEX_VISITORS_CHAIN_STATE;
void [
  input,
  subpath,
  same,
  cjsInput,
  holder,
  roots,
  asyncRecords,
  asyncRoots,
  walking,
  asyncWalking,
  walkFactory,
];
export type Removed = [
  MaterializedDagSource<unknown, unknown>,
  OldSubpath<unknown, unknown>,
  ObjectMutationPatch<any>,
  RewriteFn,
  RewriteFnOptions,
  RewriteFnPropInput,
  TraversableObjectTTP,
  ResolvedTreeTypeParameters,
];
void [
  materializeDagSourceFromRecords,
  materializeDagSourceFromRoots,
  materializeDagSourceFromRecordsAsync,
  materializeDagSourceFromRootsAsync,
];

// Complete retired compatibility input checks through the packed declarations.
import {
  Vertex,
  MutableValueReference,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  type TreeSourceVertexResolution,
  type DagPrerequisiteLookupResult,
  type VisitorRegistrationDefinition,
  type DagSettlementOutcome,
  type VertexDataAndChildHintTypes as LegacyVertexTypes,
  type LiveResolvedGraphView,
  type TraversalVisitorCommand,
} from 'configurable-tree-traversal';
// @ts-expect-error Removed legacy sentinel.
import { DEFER_READY } from 'configurable-tree-traversal';
// @ts-expect-error Removed legacy batching policy enum.
import { TraversalVisitorFunctionResolutionStyle } from 'configurable-tree-traversal';
type LegacyT = LegacyVertexTypes<string, string>;
// @ts-expect-error Canonical content is required.
new Vertex<LegacyT>({ $d: 'old', $c: [] });
const legacyVertex = new Vertex<LegacyT>({
  $vertexData: 'canonical',
  $childDiscoveryHints: [],
});
// @ts-expect-error Retired access alias.
legacyVertex.$d;
// @ts-expect-error Retired access alias.
legacyVertex.$c;
// @ts-expect-error Retired clone alias.
legacyVertex.createEditableShallowCloneWithContentOverrides({ $d: 'old' });
// @ts-expect-error UUID getter has a single canonical name.
new MutableValueReference(legacyVertex).getId();
declare const graph: LiveResolvedGraphView<LegacyT>;
// @ts-expect-error Removed graph forwarding alias.
graph.getIdOf(new MutableValueReference(legacyVertex));
// @ts-expect-error Removed graph forwarding alias.
graph.getVertexById('id');
const found: TreeSourceVertexResolution<LegacyT> = {
  // @ts-expect-error Untagged source results are unsupported.
  vertexContentInput: legacyVertex,
};
// @ts-expect-error Untagged omission is unsupported.
const omitted: TreeSourceVertexResolution<LegacyT> = { vertexContentInput: null };
// @ts-expect-error Missing prerequisite must be explicit.
const missing: DagPrerequisiteLookupResult<LegacyT> = undefined;
const visitor: VisitorRegistrationDefinition<() => void> = {
  visitor() {
    return undefined;
  },
  // @ts-expect-error Caller cannot set assigned registration indexes.
  phaseRegistrationInsertionIndex: 4,
};
// @ts-expect-error Settlement requires a tagged outcome.
const outcome: DagSettlementOutcome = { ok: true };
const command: TraversalVisitorCommand<LegacyT> = {
  // @ts-expect-error Old hint command is removed.
  commandName: 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
  commandArguments: { replacementChildHints: [] },
};
runTreeDepthFirstUntilSuspendedOrTerminal(
  {
    resolveRoot: () => ({ kind: 'omitted' }),
    resolveChild: () => ({ kind: 'omitted' }),
  },
  // @ts-expect-error Convenience helpers accept one options argument.
  null,
);
void [
  found,
  omitted,
  missing,
  visitor,
  outcome,
  command,
  DEFER_READY,
  TraversalVisitorFunctionResolutionStyle,
];

// Old options and declaration schemas must fail through real packed types.
import {
  copyAndNormalizeDagDefinition,
  type DagDefinition,
  type DagSchedulingOptions,
} from 'configurable-tree-traversal';
const oldEntry: DagDefinition<unknown, unknown>['entry'] = {
  // @ts-expect-error roots accepts shared topology; forest is retired.
  kind: 'forest',
  entryDiscoverySlots: [],
};
// @ts-expect-error Old root dependency key removed.
const oldPolicy: DagSchedulingOptions = { rootDependencies: 'ignore' };
// @ts-expect-error Old boolean fallback removed.
const oldFallback: DagSchedulingOptions = { implicitParentDependency: true };
void [copyAndNormalizeDagDefinition, oldEntry, oldPolicy, oldFallback];

// @ts-expect-error Removed simple helper type, use phase-keyed options.
import type { DepthFirstTraversalVisitorsSimple } from 'configurable-tree-traversal';
// @ts-expect-error Removed simple helper type, use phase-keyed options.
import type { AsyncDepthFirstTraversalVisitorsSimple } from 'configurable-tree-traversal';
// @ts-expect-error Removed simple helper type, use phase-keyed options.
import type { DagTraversalVisitorsSimple } from 'configurable-tree-traversal';
// @ts-expect-error Removed simple helper type, use phase-keyed options.
import type { AsyncDagTraversalVisitorsSimple } from 'configurable-tree-traversal';
// @ts-expect-error Canonical content has no legacy alias.
import type { LegacyVertexContent } from 'configurable-tree-traversal';
const badChainState: import('configurable-tree-traversal').TraversalVisitorCommand<
  LegacyT,
  Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE
> = {
  commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
  // @ts-expect-error Per-visit state uses the canonical field.
  commandArguments: { vertexVisitorsChainState: undefined },
};
export type RemovedHelperTypes = [
  DepthFirstTraversalVisitorsSimple,
  AsyncDepthFirstTraversalVisitorsSimple,
  DagTraversalVisitorsSimple,
  AsyncDagTraversalVisitorsSimple,
  LegacyVertexContent,
];
void badChainState;

const undefinedConfigurationPatch: cjs.DepthFirstTreeTraversalBuilderOptionsPatch =
  {
    treeDiscoverySource: undefined,
    childBoundaryVisits: {
      visitAfterChildIndices: undefined,
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-1] },
    },
    visitors: { AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES: undefined },
  };
new cjs.DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: new cjs.ObjectPropertyTreeSource(1),
}).patchOptionsForFutureRunners({
  treeDiscoverySource: undefined,
  childBoundaryVisits: {
    visitAfterChildIndices: {
      ranges: [{ fromInclusive: 0, throughInclusive: 2 }],
    },
  },
});
void undefinedConfigurationPatch;
