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

export type ChildSlot<T extends TreeTypeParameters> =
  | Readonly<{ kind: 'pending'; hint: T['VertexHint'] }>
  | Readonly<{
      kind: 'linked';
      hint: T['VertexHint'];
      childRef: Ref<T>;
    }>
  | Readonly<{
      kind: 'omitted' | 'deleted' | 'disabled';
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
  slots: readonly ChildSlot<T>[];
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

export interface GraphStoreContract<
  T extends TreeTypeParameters,
  ID = unknown,
> {
  readonly mode: 'tree' | 'dag';
  readonly graph: ResolvedGraph<T, ID>;
  getIdState(id: ID): IdState<T> | undefined;
  getTraversalSlots(ref: Ref<T>): readonly ChildSlot<T>[] | null;
  getTraversalSlot(ref: Ref<T>, index: number): ChildSlot<T> | undefined;
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
  ): void;
  markOmitted(id: ID): void;
  markDeleted(id: ID): void;
  removeVertices(refs: ReadonlySet<Ref<T>>): void;
  getTreeRecord(ref: Ref<T>): VertexResolved<T> | null;
  setTreeRecord(ref: Ref<T>, record: VertexResolved<T>): void;
}
