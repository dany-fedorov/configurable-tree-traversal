import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { ResolvedTree } from '@core/ResolvedTree';
import type { CTTRef } from '@core/CTTRef';

export enum TraversalVisitorCommandName {
  NOOP = 'NOOP',
  HALT_TRAVERSAL = 'HALT_TRAVERSAL',
  DELETE_VERTEX = 'DELETE_VERTEX',
  SET_VERTEX_VISITORS_CHAIN_STATE = 'SET_VERTEX_VISITORS_CHAIN_STATE',
  REWRITE_VERTEX_DATA = 'REWRITE_VERTEX_DATA',
  DISABLE_SUBTREE_TRAVERSAL = 'DISABLE_SUBTREE_TRAVERSAL',
  REWRITE_VERTEX_HINTS_ON_PRE_ORDER = 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
}

export type TraversalVisitorCommandArguments<
  RW_TTP extends TreeTypeParameters,
> = {
  [TraversalVisitorCommandName.NOOP]: never;
  [TraversalVisitorCommandName.HALT_TRAVERSAL]: never;
  [TraversalVisitorCommandName.DELETE_VERTEX]: never;
  [TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE]: {
    vertexVisitorsChainState: unknown;
  };
  [TraversalVisitorCommandName.REWRITE_VERTEX_DATA]: {
    newData: RW_TTP['VertexData'];
  };
  [TraversalVisitorCommandName.DISABLE_SUBTREE_TRAVERSAL]: never;
  [TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER]: {
    newHints: RW_TTP['VertexHint'][];
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

export type TraversalVisitorInputOptions<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  isTreeRoot: boolean;
  isTraversalRoot: boolean;
  vertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
  vertexVisitorsChainState: unknown;
  visitorRecord: TraversalVisitorRecord<ORDER, TTP, RW_TTP>;
  order: ORDER;
};

export enum TraversalVisitorFunctionResolutionStyle {
  SEQUENTIAL = 'SEQUENTIAL',
  CONCURRENT = 'CONCURRENT',
}

export type TraversalVisitorFunctionOptions = {
  priority: number;
  resolutionStyle: TraversalVisitorFunctionResolutionStyle;
};

export type TraversalVisitorRecord<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  addedIndex: number;
  priority: number;
  resolutionStyle: TraversalVisitorFunctionResolutionStyle;
  visitor: TraversalVisitor<ORDER, TTP, RW_TTP>;
};

export const DEFAULT_VISITOR_PRIORITY = 100;

export const DEFAULT_VISITOR_FN_OPTIONS = {
  priority: DEFAULT_VISITOR_PRIORITY,
  resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
};

export type TraversalVisitor<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = (
  vertex: Vertex<TTP | RW_TTP>,
  options: TraversalVisitorInputOptions<ORDER, TTP, RW_TTP>,
) => TraversalVisitorResult<RW_TTP> | undefined | void;
