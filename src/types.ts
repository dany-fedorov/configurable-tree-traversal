export interface TreeTypeParameters<VD = unknown, VH = unknown> {
  VertexData: VD;
  VertexHint: VH;
}

export interface Vertex<TTP extends TreeTypeParameters> {
  readonly $d: TTP['VertexData'];
  readonly $c: TTP['VertexHint'][];
}

export type MakeVertexOptions<TTP extends TreeTypeParameters> =
  TreeResolution<TTP> & Omit<IVertexContext<TTP>, 'hint'>;

export interface TraversableTree<TTP extends TreeTypeParameters> {
  makeRoot(): Vertex<TTP> | null;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP>,
  ): Vertex<TTP> | null;
}

export type VertexContextMap<TTP extends TreeTypeParameters> = Map<
  Vertex<TTP>,
  IVertexContext<TTP> | null
>;

export type ResolvedTreeMap<TTP extends TreeTypeParameters> = Map<
  Vertex<TTP>,
  Array<Vertex<TTP>>
>;

export interface TreeResolution<TTP extends TreeTypeParameters> {
  vertexContextMap: VertexContextMap<TTP>;
  resolvedTreeMap: ResolvedTreeMap<TTP>;
}

export interface TraversalVisitorOptions<TTP extends TreeTypeParameters>
  extends TreeResolution<TTP> {
  visitIndex: number;
  previousVisitedVertex: Vertex<TTP> | null;
  isLeafVertex: boolean;
  isRootVertex: boolean;
}

export enum TraversalVisitorCommandName {
  HALT_TRAVERSAL = 'HALT_TRAVERSAL',
}

export interface TraversalVisitorCommandArguments {
  [TraversalVisitorCommandName.HALT_TRAVERSAL]: void;
}

export interface TraversalVisitorCommand<
  T extends TraversalVisitorCommandName,
> {
  commandName: T;
  commandArguments?: TraversalVisitorCommandArguments[T];
}

export interface TraversalVisitorResult {
  commands?: TraversalVisitorCommand<TraversalVisitorCommandName>[];
}

export type TraversalVisitor<TTP extends TreeTypeParameters> = (
  vertex: Vertex<TTP>,
  options: TraversalVisitorOptions<TTP>,
) => TraversalVisitorResult | undefined;

export interface IVertexContext<TTP extends TreeTypeParameters> {
  parentVertex: Vertex<TTP>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
  hint: TTP['VertexHint'];
}
