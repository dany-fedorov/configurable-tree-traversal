import type { CTTRef } from '@core/CTTRef';
import type { TraversalVisitorFunctionResolutionStyle } from '@core/TraversalVisitor';
import type { TraversalVisitorResult } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { VertexResolved } from '@core/ResolvedTree';

export type VertexId = unknown;

export type MaybePromise<T> = T | PromiseLike<T>;

export type Ref<T extends TreeTypeParameters> = CTTRef<Vertex<T>>;

export type VisitResult<R extends TreeTypeParameters> =
  | TraversalVisitorResult<R>
  | undefined
  | void;

export type HintVertexId = { vertexId: VertexId };

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

export type GraphVertex<T extends TreeTypeParameters> = Readonly<{
  vertexRef: Ref<T>;
  vertex: Vertex<T>;
  vertexId: VertexId;
  discoveryDepth: number;
  dependsOn: readonly VertexId[];
  status: GraphVertexStatus;
  incoming: readonly GraphEdge<T>[];
  slots: readonly ChildSlot<T>[];
}>;

export type VisitorRecord<F> = {
  addedIndex: number;
  priority: number;
  resolutionStyle: TraversalVisitorFunctionResolutionStyle;
  visitor: F;
};

export type IdState<T extends TreeTypeParameters> =
  | { kind: 'live'; ref: Ref<T> }
  | { kind: 'omitted' }
  | { kind: 'deleted' };

export interface GraphStoreContract<T extends TreeTypeParameters> {
  readonly mode: 'tree' | 'dag';
  readonly graph: ResolvedGraph<T>;
  getIdState(id: VertexId): IdState<T> | undefined;
  insertVertex(input: {
    ref: Ref<T>;
    id: VertexId;
    dependsOn: readonly VertexId[];
    depth: number;
  }): void;
  setRoot(ref: Ref<T> | null): void;
  setStatus(ref: Ref<T>, status: GraphVertexStatus): void;
  resetTraversal(ref: Ref<T>): void;
  prepareSlots(ref: Ref<T>, hints: readonly T['VertexHint'][]): void;
  linkSlot(parent: Ref<T>, index: number, child: Ref<T>): void;
  closeSlot(
    parent: Ref<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
  ): void;
  markOmitted(id: VertexId): void;
  markDeleted(id: VertexId): void;
  removeVertices(refs: ReadonlySet<Ref<T>>): void;
  getTreeRecord(ref: Ref<T>): VertexResolved<T> | null;
  setTreeRecord(ref: Ref<T>, record: VertexResolved<T>): void;
}
