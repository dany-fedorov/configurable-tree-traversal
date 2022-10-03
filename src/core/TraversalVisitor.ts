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

export type TraversalVisitorCommandArguments<TTP extends TreeTypeParameters> = {
  [TraversalVisitorCommandName.NOOP]: void;
  [TraversalVisitorCommandName.HALT_TRAVERSAL]: void;
  [TraversalVisitorCommandName.DELETE_VERTEX]: void;
  [TraversalVisitorCommandName.REWRITE_VERTEX_DATA]: {
    newData: TTP['VertexData'];
  };
};

export type TraversalVisitorCommand<
  TTP extends TreeTypeParameters,
  T extends TraversalVisitorCommandName = TraversalVisitorCommandName,
> = {
  commandName: T;
  commandArguments?: TraversalVisitorCommandArguments<TTP>[T];
};

export interface TraversalVisitorResult<TTP extends TreeTypeParameters> {
  commands?: TraversalVisitorCommand<TTP>[];
}

export type TraversalVisitorOptions<TTP extends TreeTypeParameters> = {
  resolvedTree: ResolvedTree<TTP>;
  visitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<TTP>> | null;
  isRoot: boolean;
  vertexRef: CTTRef<Vertex<TTP>>;
};

export type TraversalVisitor<TTP extends TreeTypeParameters> = (
  vertex: Vertex<TTP>,
  options: TraversalVisitorOptions<TTP>,
) => TraversalVisitorResult<TTP> | undefined | void;
