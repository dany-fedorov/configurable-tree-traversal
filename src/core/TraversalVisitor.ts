import type { TreeTypeParameters } from './TreeTypeParameters';
import type { Vertex } from './Vertex';
import type { ResolvedTree } from './ResolvedTree';
import type { CTTRef } from './CTTRef';

export enum TraversalVisitorCommandName {
  NOOP = 'NOOP',
  HALT_TRAVERSAL = 'HALT_TRAVERSAL',
  REWRITE_VERTEX_DATA = 'REWRITE_VERTEX_DATA',
  DELETE_VERTEX = 'DELETE_VERTEX',
}

export type TraversalVisitorCommandArguments<
  RW_TTP extends TreeTypeParameters,
> = {
  [TraversalVisitorCommandName.NOOP]: void;
  [TraversalVisitorCommandName.HALT_TRAVERSAL]: void;
  [TraversalVisitorCommandName.DELETE_VERTEX]: void;
  [TraversalVisitorCommandName.REWRITE_VERTEX_DATA]: {
    newData: RW_TTP['VertexData'];
  };
};

export type TraversalVisitorCommand<
  RW_TTP extends TreeTypeParameters,
  T extends TraversalVisitorCommandName = TraversalVisitorCommandName,
> = {
  commandName: T;
  commandArguments?: TraversalVisitorCommandArguments<RW_TTP>[T];
};

export interface TraversalVisitorResult<RW_TTP extends TreeTypeParameters> {
  commands?: TraversalVisitorCommand<RW_TTP>[];
}

export type TraversalVisitorOptions<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  visitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  isRoot: boolean;
  vertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
};

export type TraversalVisitor<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = (
  vertex: Vertex<TTP | RW_TTP>,
  options: TraversalVisitorOptions<TTP, RW_TTP>,
) => TraversalVisitorResult<RW_TTP> | undefined | void;
