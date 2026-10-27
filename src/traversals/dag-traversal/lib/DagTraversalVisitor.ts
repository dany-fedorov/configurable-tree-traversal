import type { MutableRef } from '@core/CTTRef';
import type { ResolvedGraph, OriginalGraphView } from '@core/ResolvedGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise, VisitResult } from '@core/graph/types';
import type { VisitorRegistrationMetadata } from '@core/TraversalVisitor';
import type { DagVisitorPhase } from './DagTraversalOrder';

export type DagVisitorContext<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
> = {
  resolvedGraph: ResolvedGraph<T | R, ID>;
  originalGraphView: OriginalGraphView<T, ID> | null;
  vertexRef: MutableRef<Vertex<T | R>>;
  phase: ORDER;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
  phaseVisitIndex: number;
  visitorIndex: number;
  previousPhaseVertexRef: MutableRef<Vertex<T | R>> | null;
  visitorChainState: unknown;
  registration: VisitorRegistrationMetadata;
};

export type DagVisitor<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
> = VisitResult<R, ORDER, 'dag', T['VertexHint']> extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: DagVisitorContext<T, R, ORDER, ID>,
    ) => RESULT
  : never;

export type AsyncDagVisitor<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
> = VisitResult<R, ORDER, 'dag', T['VertexHint']> extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: DagVisitorContext<T, R, ORDER, ID>,
    ) => MaybePromise<RESULT>
  : never;

/**
 * Committed milestone observation: `workCompleted` emits after W, including
 * deferred settlement, while an `ON_WORK_READY` visitor runs before work.
 * Dispatch external work from coordinator frontier tickets or a pre-work visitor.
 */
export type DagEvent<T extends VertexTypes, ID = unknown> = {
  vertexId: ID;
  vertex: Vertex<T>;
  vertexRef: MutableRef<Vertex<T>>;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
} & ({ kind: 'workCompleted' } | { kind: 'subgraphCompleted' });
