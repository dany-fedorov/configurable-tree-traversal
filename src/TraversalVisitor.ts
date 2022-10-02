import type { TreeTypeParameters } from './TreeTypeParameters';
import type { Vertex } from './Vertex';
import type { ResolvedTree } from './ResolvedTree';
import type { Ref } from './Ref';

export enum TraversalVisitorCommandName {
  HALT_TRAVERSAL = 'HALT_TRAVERSAL',
  REWRITE_VERTEX_DATA = 'REWRITE_VERTEX_DATA',
}

export interface TraversalVisitorCommandArguments<
  TTP extends TreeTypeParameters,
> {
  [TraversalVisitorCommandName.HALT_TRAVERSAL]: void;
  [TraversalVisitorCommandName.REWRITE_VERTEX_DATA]: {
    newData: TTP['VertexData'];
  };
}

export interface TraversalVisitorCommand<
  TTP extends TreeTypeParameters,
  T extends TraversalVisitorCommandName = TraversalVisitorCommandName,
> {
  commandName: T;
  commandArguments?: TraversalVisitorCommandArguments<TTP>[T];
}

export interface TraversalVisitorResult<TTP extends TreeTypeParameters> {
  commands?: TraversalVisitorCommand<TTP>[];
}

export type TraversalVisitorOptions<TTP extends TreeTypeParameters> = {
  resolvedTree: ResolvedTree<TTP>;
  visitIndex: number;
  previousVisitedVertexRef: Ref<Vertex<TTP>> | null;
  isRoot: boolean;
  vertexRef: Ref<Vertex<TTP>>;
};

export type TraversalVisitor<TTP extends TreeTypeParameters> = (
  vertex: Vertex<TTP>,
  options: TraversalVisitorOptions<TTP>,
) => TraversalVisitorResult<TTP> | undefined;
