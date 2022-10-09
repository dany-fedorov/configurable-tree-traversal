export export export export export export export export export export class DepthFirstTraversalState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
  postOrderNotVisitedChildrenCountMap: Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >;
  visitorsState: DepthFirstTraversalVisitorsState<TTP, RW_TTP>;
  traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  status: TraversalStatus;

  constructor(cfg: {
    internalObjects: {
      traversalState?: DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['internalObjects']['traversalState'];
    };
  }) {
    this.STACK =
      cfg.internalObjects?.traversalState?.STACK != null
        ? cfg.internalObjects?.traversalState?.STACK
        : [];
    this.postOrderNotVisitedChildrenCountMap =
      cfg.internalObjects?.traversalState
        ?.postOrderNotVisitedChildrenCountMap != null
        ? cfg.internalObjects?.traversalState
            ?.postOrderNotVisitedChildrenCountMap
        : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
    this.visitorsState =
      cfg.internalObjects?.traversalState?.visitorsState != null
        ? cfg.internalObjects?.traversalState?.visitorsState
        : initDepthFirstVisitorsState();
    this.traversalRootVertexRef =
      cfg.internalObjects?.traversalState?.traversalRootVertexRef != null
        ? cfg.internalObjects?.traversalState?.traversalRootVertexRef
        : null;
    this.status =
      cfg.internalObjects?.traversalState?.status != null
        ? cfg.internalObjects?.traversalState?.status
        : TraversalStatus.INITIAL;
  }
}
