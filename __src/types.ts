export interface TreeTypeParameters<VD = unknown, VH = unknown> {
  VertexData: VD;
  VertexHint: VH;
}

export interface VertexContent<TTP extends TreeTypeParameters> {
  readonly $d: TTP['VertexData'];
  readonly $c: TTP['VertexHint'][];
}

export type MakeVertexOptions<TTP extends TreeTypeParameters> =
  TreeResolution<TTP> & Omit<VertexResolutionContext<TTP>, 'hint'>;

export interface TraversableTree<TTP extends TreeTypeParameters> {
  makeRoot(): VertexContent<TTP> | null;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP>,
  ): VertexContent<TTP> | null;
}

export type VertexResolutionContextMap<TTP extends TreeTypeParameters> = Map<
  VertexContent<TTP>,
  VertexResolutionContext<TTP> | null
>;

export type ResolvedTreeMap<TTP extends TreeTypeParameters> = Map<
  VertexContent<TTP>,
  Array<VertexContent<TTP>>
>;

export interface TreeResolution<TTP extends TreeTypeParameters> {
  vertexContextMap: VertexResolutionContextMap<TTP>;
  resolvedTreeMap: ResolvedTreeMap<TTP>;
}

export interface TraversalVisitorOptions<TTP extends TreeTypeParameters>
  extends TreeResolution<TTP> {
  visitIndex: number;
  previousVisitedVertex: VertexContent<TTP> | null;
  isLeafVertex: boolean;
  isRootVertex: boolean;
}

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

export type TraversalVisitor<TTP extends TreeTypeParameters> = (
  vertex: VertexContent<TTP>,
  options: TraversalVisitorOptions<TTP>,
) => TraversalVisitorResult<TTP> | undefined;

export interface VertexResolutionContext<TTP extends TreeTypeParameters> {
  parentVertex: VertexContent<TTP>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
  hint: TTP['VertexHint'];
}
