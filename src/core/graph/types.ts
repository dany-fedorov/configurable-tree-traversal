import type { MutableValueReference } from '@core/CTTRef';
import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { MutableTreeVertexTopologyRecord } from '@core/ResolvedTree';
import type {
  VisitorCommandsResult,
  VisitorGroupMetadata,
} from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { VisitorRegistrationOptions } from '@core/TraversalVisitor';

export type VertexId = unknown;

export type MaybePromise<T> = T | PromiseLike<T>;

export type InternalVertexRef<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = MutableValueReference<Vertex<InputVertexTypes>>;

export type VisitorCallbackReturnValue<
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VisitorPhase extends string = never,
  Family extends 'tree' | 'dag' = 'tree' | 'dag',
  SourceHint = RewrittenVertexTypes['ChildHint'],
> =
  | VisitorCommandsResult<
      RewrittenVertexTypes,
      VisitorPhase,
      Family,
      SourceHint
    >
  | undefined
  | void;

export type ChildHintVertexIdentity<VertexId = unknown> = {
  vertexId: VertexId;
};

export type VertexVisitSchedulingStage =
  | 'DISCOVERED'
  | 'INITIAL_VISIT_ELIGIBLE'
  | 'INITIAL_VISIT_STARTED'
  | 'INITIAL_VISIT_COMMITTED'
  | 'COMPLETION_VISIT_ELIGIBLE'
  | 'COMPLETION_VISIT_COMMITTED';

export type InternalStructuralChildEdge<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = Readonly<{
  parentRef: InternalVertexRef<InputVertexTypes>;
  childRef: InternalVertexRef<InputVertexTypes>;
  hintIndex: number;
  hint: InputVertexTypes['ChildHint'];
}>;

export type InternalChildSlot<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> =
  | Readonly<{ kind: 'pending'; hint: InputVertexTypes['ChildHint'] }>
  | Readonly<{
      kind: 'linked';
      hint: InputVertexTypes['ChildHint'];
      childRef: InternalVertexRef<InputVertexTypes>;
    }>
  | Readonly<{
      kind: 'omitted';
      hint: InputVertexTypes['ChildHint'];
      /** Null denotes anonymous omission; wrappers retain every ID, including undefined. */
      identity: Readonly<{ vertexId: VertexId }> | null;
    }>
  | Readonly<{
      kind: 'deleted' | 'disabled';
      hint: InputVertexTypes['ChildHint'];
    }>;

export type InternalResolvedGraphVertex<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = Readonly<{
  vertexHandle: InternalVertexRef<InputVertexTypes>;
  vertex: Vertex<InputVertexTypes>;
  vertexId: VertexId;
  discoveryDepth: number;
  workWaitsForWorkOf: readonly VertexId[];
  workWaitsForSubgraphCompletionOf?: readonly VertexId[];
  visitStage: VertexVisitSchedulingStage;
  incoming: readonly InternalStructuralChildEdge<InputVertexTypes>[];
  slots: readonly InternalChildSlot<InputVertexTypes, VertexId>[];
}>;

export type VisitorRecord<VisitorCallback> = {
  phaseRegistrationInsertionIndex: number;
  visitor: VisitorCallback;
  readonly visitorGroup?: VisitorGroupMetadata | undefined;
} & VisitorRegistrationOptions;

export type IdState<InputVertexTypes extends VertexDataAndChildHintTypes> =
  | { kind: 'live'; ref: InternalVertexRef<InputVertexTypes> }
  | { kind: 'omitted' }
  | { kind: 'deleted' };

/** Detached identity facts for internal observational consumers. */
export type GraphIdentityState<VertexId = unknown> = Readonly<{
  vertexId: VertexId;
  kind: 'live' | 'omitted' | 'deleted';
}>;

/** Scheduler facts that cannot be inferred from emitted events or global discovery. */
export type GraphSchedulingState<VertexId = unknown> = Readonly<{
  vertexId: VertexId;
  expansion: 'unprepared' | 'open' | 'closed';
  initialCommitted: boolean;
  completionCommitted: boolean;
  remainingChildren: number;
}>;

/** Internal DAG observation; arrays and wrappers are owned by the snapshot. */
export type DagInspectionState<VertexId = unknown> = Readonly<{
  identityStates: readonly GraphIdentityState<VertexId>[];
  schedulingStates: readonly GraphSchedulingState<VertexId>[];
  discoveryComplete: boolean;
}>;

export interface GraphStoreContract<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> {
  readonly mode: 'tree' | 'dag';
  readonly graph: InternalResolvedGraphView<InputVertexTypes, VertexId>;
  getIdState(id: VertexId): IdState<InputVertexTypes> | undefined;
  inspectIdentityStates(): readonly GraphIdentityState<VertexId>[];
  getTraversalSlots(
    ref: InternalVertexRef<InputVertexTypes>,
  ): readonly InternalChildSlot<InputVertexTypes, VertexId>[] | null;
  getTraversalSlot(
    ref: InternalVertexRef<InputVertexTypes>,
    index: number,
  ): InternalChildSlot<InputVertexTypes, VertexId> | undefined;
  getDiscoveryDepth(ref: InternalVertexRef<InputVertexTypes>): number;
  getDeclaredDependencies(ref: InternalVertexRef<InputVertexTypes>): VertexId[];
  getDeclaredCompleteDependencies(
    ref: InternalVertexRef<InputVertexTypes>,
  ): VertexId[];
  getTopologyVersion(): number;
  insertVertex(input: {
    ref: InternalVertexRef<InputVertexTypes>;
    id: VertexId;
    workWaitsForWorkOf: readonly VertexId[];
    workWaitsForSubgraphCompletionOf?: readonly VertexId[];
    depth: number;
  }): void;
  setRoot(ref: InternalVertexRef<InputVertexTypes> | null): void;
  setVisitStage(
    ref: InternalVertexRef<InputVertexTypes>,
    visitStage: VertexVisitSchedulingStage,
  ): void;
  resetTraversal(ref: InternalVertexRef<InputVertexTypes>): void;
  prepareSlots(
    ref: InternalVertexRef<InputVertexTypes>,
    hints: readonly InputVertexTypes['ChildHint'][],
  ): void;
  linkSlot(
    parent: InternalVertexRef<InputVertexTypes>,
    index: number,
    child: InternalVertexRef<InputVertexTypes>,
    legacyTopologyAlreadyLinked?: boolean,
  ): void;
  closeSlot(
    parent: InternalVertexRef<InputVertexTypes>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: ChildHintVertexIdentity<VertexId>,
  ): void;
  markOmitted(id: VertexId): void;
  markDeleted(id: VertexId): void;
  removeVertices(refs: ReadonlySet<InternalVertexRef<InputVertexTypes>>): void;
  getTreeRecord(
    ref: InternalVertexRef<InputVertexTypes>,
  ): MutableTreeVertexTopologyRecord<InputVertexTypes> | null;
  setTreeRecord(
    ref: InternalVertexRef<InputVertexTypes>,
    record: MutableTreeVertexTopologyRecord<InputVertexTypes>,
  ): void;
}

export type StructuralChildEdge<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = Readonly<{
  parentVertexHandle: import('../CTTRef').VertexHandle<InputVertexTypes>;
  childVertexHandle: import('../CTTRef').VertexHandle<InputVertexTypes>;
  parentChildHintIndex: number;
  childDiscoveryHint: InputVertexTypes['ChildHint'];
}>;
export type ChildDiscoverySlot<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> =
  | Readonly<{
      kind: 'awaitingResolution';
      childDiscoveryHint: InputVertexTypes['ChildHint'];
    }>
  | Readonly<{
      kind: 'linkedToVertex';
      childDiscoveryHint: InputVertexTypes['ChildHint'];
      childVertexHandle: import('../CTTRef').VertexHandle<InputVertexTypes>;
    }>
  | Readonly<{
      kind: 'omitted';
      childDiscoveryHint: InputVertexTypes['ChildHint'];
      omittedVertexIdentity: Readonly<{ vertexId: VertexId }> | null;
    }>
  | Readonly<{
      kind: 'targetDeleted' | 'discoverySkipped';
      childDiscoveryHint: InputVertexTypes['ChildHint'];
    }>;

/** Public graph facts expose safe facets directly, without mutable intermediate types. */
export type ResolvedGraphVertexSnapshot<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = Readonly<{
  vertexHandle: import('../CTTRef').VertexHandle<InputVertexTypes>;
  vertex: import('../Vertex').VertexView<InputVertexTypes>;
  vertexId: VertexId;
  firstDiscoveryDepthInEdges: number;
  workWaitsForWorkOf: readonly VertexId[];
  workWaitsForSubgraphCompletionOf?: readonly VertexId[];
  schedulingVisitStage: VertexVisitSchedulingStage;
  incomingStructuralChildEdges: readonly StructuralChildEdge<InputVertexTypes>[];
  orderedChildDiscoverySlots: readonly ChildDiscoverySlot<
    InputVertexTypes,
    VertexId
  >[];
}>;
