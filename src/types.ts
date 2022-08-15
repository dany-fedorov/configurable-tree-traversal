export interface TreeTypeParameters<VD = unknown, VH = unknown> {
  VertexData: VD;
  VertexHint: VH;
}

export interface ContextForGetVertex<TTP extends TreeTypeParameters> {
  parentVertex: Vertex<TTP>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
}

export interface Vertex<TTP extends TreeTypeParameters> {
  readonly $d: TTP['VertexData'];
  readonly $c: TTP['VertexHint'][];
}

export interface TraversableTree<TTP extends TreeTypeParameters> {
  makeRoot(): Vertex<TTP> | null;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    contextForGetVertex: ContextForGetVertex<TTP>,
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

export interface TraversalVisitorOptions<TTP extends TreeTypeParameters> {
  vertexContextMap: VertexContextMap<TTP>;
  resolvedTreeMap: ResolvedTreeMap<TTP>;
  visitIndex: number;
  previousVisitedVertex: Vertex<TTP> | null;
  isLeafVertex: boolean;
  isRootVertex: boolean;
}

export enum TraversalVisitorCommand {
  HALT_TRAVERSAL = 'HALT_TRAVERSAL',
}

export interface TraversalVisitorResult {
  command?: TraversalVisitorCommand;
}

export type TraversalVisitor<TTP extends TreeTypeParameters> = (
  vertex: Vertex<TTP>,
  options: TraversalVisitorOptions<TTP>,
) => TraversalVisitorResult | undefined;

export interface IVertexContext<TTP extends TreeTypeParameters>
  extends ContextForGetVertex<TTP> {
  hint: TTP['VertexHint'];
}
