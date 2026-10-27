import type { MutableRef } from '@core/CTTRef';
import type { ResolvedGraph } from '@core/ResolvedGraph';
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

export type VertexRef<T extends VertexTypes> = MutableRef<Vertex<T>>;

export type VisitResult<
  R extends VertexTypes,
  ORDER extends string = never,
  Family extends 'tree' | 'dag' = 'tree' | 'dag',
> = TraversalVisitorResult<R, ORDER, Family> | undefined | void;

export type HintVertexId<ID = unknown> = { vertexId: ID };

export type ResolvedVertexStatus =
  | 'DISCOVERED'
  | 'READY'
  | 'PRE_VISITING'
  | 'PRE_VISITED'
  | 'COMPLETING'
  | 'COMPLETE';

export type StructuralChildEdge<T extends VertexTypes> = Readonly<{
  parentRef: VertexRef<T>;
  childRef: VertexRef<T>;
  hintIndex: number;
  hint: T['VertexHint'];
}>;

export type ChildSlot<T extends VertexTypes, ID = unknown> =
  | Readonly<{ kind: 'pending'; hint: T['VertexHint'] }>
  | Readonly<{
      kind: 'linked';
      hint: T['VertexHint'];
      childRef: VertexRef<T>;
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

export type ResolvedGraphVertex<
  T extends VertexTypes,
  ID = unknown,
> = Readonly<{
  vertexRef: VertexRef<T>;
  vertex: Vertex<T>;
  vertexId: ID;
  discoveryDepth: number;
  dependsOnWork: readonly ID[];
  dependsOnSubgraphCompletion?: readonly ID[];
  status: ResolvedVertexStatus;
  incoming: readonly StructuralChildEdge<T>[];
  slots: readonly ChildSlot<T, ID>[];
}>;

export type VisitorRecord<F> = {
  addedIndex: number;
  visitor: F;
  readonly visitorGroup?: VisitorGroupMetadata | undefined;
} & TraversalVisitorFunctionOptions;

export type IdState<T extends VertexTypes> =
  | { kind: 'live'; ref: VertexRef<T> }
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
  readonly graph: ResolvedGraph<T, ID>;
  getIdState(id: ID): IdState<T> | undefined;
  inspectIdentityStates(): readonly GraphIdentityState<ID>[];
  getTraversalSlots(ref: VertexRef<T>): readonly ChildSlot<T, ID>[] | null;
  getTraversalSlot(
    ref: VertexRef<T>,
    index: number,
  ): ChildSlot<T, ID> | undefined;
  getDiscoveryDepth(ref: VertexRef<T>): number;
  getDeclaredDependencies(ref: VertexRef<T>): ID[];
  getDeclaredCompleteDependencies(ref: VertexRef<T>): ID[];
  hasCompleteDependencies(ref: VertexRef<T>): boolean;
  getTopologyVersion(): number;
  insertVertex(input: {
    ref: VertexRef<T>;
    id: ID;
    dependsOnWork: readonly ID[];
    dependsOnSubgraphCompletion?: readonly ID[];
    depth: number;
  }): void;
  setRoot(ref: VertexRef<T> | null): void;
  setStatus(ref: VertexRef<T>, status: ResolvedVertexStatus): void;
  resetTraversal(ref: VertexRef<T>): void;
  prepareSlots(ref: VertexRef<T>, hints: readonly T['VertexHint'][]): void;
  linkSlot(
    parent: VertexRef<T>,
    index: number,
    child: VertexRef<T>,
    legacyTopologyAlreadyLinked?: boolean,
  ): void;
  closeSlot(
    parent: VertexRef<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: HintVertexId<ID>,
  ): void;
  markOmitted(id: ID): void;
  markDeleted(id: ID): void;
  removeVertices(refs: ReadonlySet<VertexRef<T>>): void;
  getTreeRecord(ref: VertexRef<T>): TreeVertexRecord<T> | null;
  setTreeRecord(ref: VertexRef<T>, record: TreeVertexRecord<T>): void;
}
