import type { CTTRef } from '@core/CTTRef';
import type {
  TraversalVisitorFunctionOptions,
  VisitorGroupMetadata,
} from '@core/TraversalVisitor';
import type { TraversalVisitorResult } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { VertexResolved } from '@core/ResolvedTree';

export type VertexId = unknown;

export type MaybePromise<T> = T | PromiseLike<T>;

export type Ref<T extends TreeTypeParameters> = CTTRef<Vertex<T>>;

export type VisitResult<
  R extends TreeTypeParameters,
  ORDER extends string = never,
> = TraversalVisitorResult<R, ORDER> | undefined | void;

export type HintVertexId<ID = unknown> = { vertexId: ID };

export type GraphVertexStatus =
  | 'DISCOVERED'
  | 'READY'
  | 'PRE_VISITING'
  | 'PRE_VISITED'
  | 'COMPLETING'
  | 'COMPLETE';

export type GraphEdge<T extends TreeTypeParameters> = Readonly<{
  parentRef: Ref<T>;
  childRef: Ref<T>;
  hintIndex: number;
  hint: T['VertexHint'];
}>;

export type ChildSlot<T extends TreeTypeParameters, ID = unknown> =
  | Readonly<{ kind: 'pending'; hint: T['VertexHint'] }>
  | Readonly<{
      kind: 'linked';
      hint: T['VertexHint'];
      childRef: Ref<T>;
    }>
  | Readonly<{
      kind: 'omitted';
      hint: T['VertexHint'];
      /** Own presence retains a known omitted identity, including undefined. */
      vertexId?: ID;
    }>
  | Readonly<{
      kind: 'deleted' | 'disabled';
      hint: T['VertexHint'];
    }>;

export type GraphVertex<T extends TreeTypeParameters, ID = unknown> = Readonly<{
  vertexRef: Ref<T>;
  vertex: Vertex<T>;
  vertexId: ID;
  discoveryDepth: number;
  dependsOn: readonly ID[];
  dependsOnComplete?: readonly ID[];
  status: GraphVertexStatus;
  incoming: readonly GraphEdge<T>[];
  slots: readonly ChildSlot<T, ID>[];
}>;

export type VisitorRecord<F> = {
  addedIndex: number;
  visitor: F;
  readonly visitorGroup?: VisitorGroupMetadata | undefined;
} & TraversalVisitorFunctionOptions;

export type IdState<T extends TreeTypeParameters> =
  | { kind: 'live'; ref: Ref<T> }
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

export interface GraphStoreContract<
  T extends TreeTypeParameters,
  ID = unknown,
> {
  readonly mode: 'tree' | 'dag';
  readonly graph: ResolvedGraph<T, ID>;
  getIdState(id: ID): IdState<T> | undefined;
  inspectIdentityStates(): readonly GraphIdentityState<ID>[];
  getTraversalSlots(ref: Ref<T>): readonly ChildSlot<T, ID>[] | null;
  getTraversalSlot(ref: Ref<T>, index: number): ChildSlot<T, ID> | undefined;
  getDiscoveryDepth(ref: Ref<T>): number;
  getDeclaredDependencies(ref: Ref<T>): ID[];
  getDeclaredCompleteDependencies(ref: Ref<T>): ID[];
  hasCompleteDependencies(ref: Ref<T>): boolean;
  getTopologyVersion(): number;
  insertVertex(input: {
    ref: Ref<T>;
    id: ID;
    dependsOn: readonly ID[];
    dependsOnComplete?: readonly ID[];
    depth: number;
  }): void;
  setRoot(ref: Ref<T> | null): void;
  setStatus(ref: Ref<T>, status: GraphVertexStatus): void;
  resetTraversal(ref: Ref<T>): void;
  prepareSlots(ref: Ref<T>, hints: readonly T['VertexHint'][]): void;
  linkSlot(
    parent: Ref<T>,
    index: number,
    child: Ref<T>,
    legacyTopologyAlreadyLinked?: boolean,
  ): void;
  closeSlot(
    parent: Ref<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: HintVertexId<ID>,
  ): void;
  markOmitted(id: ID): void;
  markDeleted(id: ID): void;
  removeVertices(refs: ReadonlySet<Ref<T>>): void;
  getTreeRecord(ref: Ref<T>): VertexResolved<T> | null;
  setTreeRecord(ref: Ref<T>, record: VertexResolved<T>): void;
}
