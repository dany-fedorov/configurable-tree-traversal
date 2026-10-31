import type { MutableRef } from '@core/CTTRef';
import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { TreeVertexRecord } from '@core/ResolvedTree';
import type {
  TraversalVisitorResult,
  VisitorGroupMetadata,
} from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { TraversalVisitorFunctionOptions } from '@core/TraversalVisitor';

export type VertexId = unknown;

export type MaybePromise<T> = T | PromiseLike<T>;

export type InternalVertexRef<T extends VertexTypes> = MutableRef<Vertex<T>>;

export type VisitResult<
  R extends VertexTypes,
  ORDER extends string = never,
  Family extends 'tree' | 'dag' = 'tree' | 'dag',
  SourceHint = R['VertexHint'],
> = TraversalVisitorResult<R, ORDER, Family, SourceHint> | undefined | void;

export type HintVertexId<ID = unknown> = { vertexId: ID };

export type ResolvedVisitStage =
  | 'DISCOVERED'
  | 'INITIAL_VISIT_ELIGIBLE'
  | 'INITIAL_VISIT_STARTED'
  | 'INITIAL_VISIT_COMMITTED'
  | 'COMPLETION_VISIT_ELIGIBLE'
  | 'COMPLETE';

export type InternalStructuralChildEdge<T extends VertexTypes> = Readonly<{
  parentRef: InternalVertexRef<T>;
  childRef: InternalVertexRef<T>;
  hintIndex: number;
  hint: T['VertexHint'];
}>;

export type InternalChildSlot<T extends VertexTypes, ID = unknown> =
  | Readonly<{ kind: 'pending'; hint: T['VertexHint'] }>
  | Readonly<{
      kind: 'linked';
      hint: T['VertexHint'];
      childRef: InternalVertexRef<T>;
    }>
  | Readonly<{
      kind: 'omitted';
      hint: T['VertexHint'];
      /** Null denotes anonymous omission; wrappers retain every ID, including undefined. */
      identity: Readonly<{ vertexId: ID }> | null;
    }>
  | Readonly<{
      kind: 'deleted' | 'disabled';
      hint: T['VertexHint'];
    }>;

export type InternalResolvedGraphVertex<
  T extends VertexTypes,
  ID = unknown,
> = Readonly<{
  vertexRef: InternalVertexRef<T>;
  vertex: Vertex<T>;
  vertexId: ID;
  discoveryDepth: number;
  dependsOnWork: readonly ID[];
  dependsOnSubgraphCompletion?: readonly ID[];
  visitStage: ResolvedVisitStage;
  incoming: readonly InternalStructuralChildEdge<T>[];
  slots: readonly InternalChildSlot<T, ID>[];
}>;

export type VisitorRecord<F> = {
  addedIndex: number;
  visitor: F;
  readonly visitorGroup?: VisitorGroupMetadata | undefined;
} & TraversalVisitorFunctionOptions;

export type IdState<T extends VertexTypes> =
  | { kind: 'live'; ref: InternalVertexRef<T> }
  | { kind: 'omitted' }
  | { kind: 'deleted' };

/** Detached identity facts for internal observational consumers. */
export type GraphIdentityState<ID = unknown> = Readonly<{
  vertexId: ID;
  kind: 'live' | 'omitted' | 'deleted';
}>;

/** Scheduler facts that cannot be inferred from emitted events or global discovery. */
export type GraphSchedulingState<ID = unknown> = Readonly<{
  vertexId: ID;
  expansion: 'unprepared' | 'open' | 'closed';
  initialCommitted: boolean;
  completionCommitted: boolean;
  remainingChildren: number;
}>;

/** Internal DAG observation; arrays and wrappers are owned by the snapshot. */
export type DagInspectionState<ID = unknown> = Readonly<{
  identityStates: readonly GraphIdentityState<ID>[];
  schedulingStates: readonly GraphSchedulingState<ID>[];
  discoveryComplete: boolean;
}>;

export interface GraphStoreContract<T extends VertexTypes, ID = unknown> {
  readonly mode: 'tree' | 'dag';
  readonly graph: InternalResolvedGraphView<T, ID>;
  getIdState(id: ID): IdState<T> | undefined;
  inspectIdentityStates(): readonly GraphIdentityState<ID>[];
  getTraversalSlots(
    ref: InternalVertexRef<T>,
  ): readonly InternalChildSlot<T, ID>[] | null;
  getTraversalSlot(
    ref: InternalVertexRef<T>,
    index: number,
  ): InternalChildSlot<T, ID> | undefined;
  getDiscoveryDepth(ref: InternalVertexRef<T>): number;
  getDeclaredDependencies(ref: InternalVertexRef<T>): ID[];
  getDeclaredCompleteDependencies(ref: InternalVertexRef<T>): ID[];
  getTopologyVersion(): number;
  insertVertex(input: {
    ref: InternalVertexRef<T>;
    id: ID;
    dependsOnWork: readonly ID[];
    dependsOnSubgraphCompletion?: readonly ID[];
    depth: number;
  }): void;
  setRoot(ref: InternalVertexRef<T> | null): void;
  setVisitStage(
    ref: InternalVertexRef<T>,
    visitStage: ResolvedVisitStage,
  ): void;
  resetTraversal(ref: InternalVertexRef<T>): void;
  prepareSlots(
    ref: InternalVertexRef<T>,
    hints: readonly T['VertexHint'][],
  ): void;
  linkSlot(
    parent: InternalVertexRef<T>,
    index: number,
    child: InternalVertexRef<T>,
    legacyTopologyAlreadyLinked?: boolean,
  ): void;
  closeSlot(
    parent: InternalVertexRef<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: HintVertexId<ID>,
  ): void;
  markOmitted(id: ID): void;
  markDeleted(id: ID): void;
  removeVertices(refs: ReadonlySet<InternalVertexRef<T>>): void;
  getTreeRecord(ref: InternalVertexRef<T>): TreeVertexRecord<T> | null;
  setTreeRecord(ref: InternalVertexRef<T>, record: TreeVertexRecord<T>): void;
}

export type StructuralChildEdge<T extends VertexTypes> = Readonly<{
  parentRef: import('../CTTRef').VertexHandle<T>;
  childRef: import('../CTTRef').VertexHandle<T>;
  hintIndex: number;
  hint: T['VertexHint'];
}>;
export type ChildSlot<T extends VertexTypes, ID = unknown> =
  | Readonly<{ kind: 'pending'; hint: T['VertexHint'] }>
  | Readonly<{
      kind: 'linked';
      hint: T['VertexHint'];
      childRef: import('../CTTRef').VertexHandle<T>;
    }>
  | Readonly<{
      kind: 'omitted';
      hint: T['VertexHint'];
      identity: Readonly<{ vertexId: ID }> | null;
    }>
  | Readonly<{ kind: 'deleted' | 'disabled'; hint: T['VertexHint'] }>;

/** Public graph facts expose safe facets directly, without mutable intermediate types. */
export type ResolvedGraphVertex<
  T extends VertexTypes,
  ID = unknown,
> = Readonly<{
  vertexRef: import('../CTTRef').VertexHandle<T>;
  vertex: import('../Vertex').VertexView<T>;
  vertexId: ID;
  discoveryDepth: number;
  dependsOnWork: readonly ID[];
  dependsOnSubgraphCompletion?: readonly ID[];
  visitStage: ResolvedVisitStage;
  incoming: readonly StructuralChildEdge<T>[];
  slots: readonly ChildSlot<T, ID>[];
}>;
