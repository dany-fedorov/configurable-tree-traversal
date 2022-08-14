export interface ITreeTypeParameters<
  VertexData = unknown,
  VertexHint = unknown,
> {
  VertexData: VertexData;
  VertexHint: VertexHint;
}

export interface ContextForGetVertex<
  TreeTypeParameters extends ITreeTypeParameters,
> {
  parentVertex: IVertex<TreeTypeParameters>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
}

export interface IVertex<TreeTypeParameters extends ITreeTypeParameters> {
  readonly $d: TreeTypeParameters['VertexData'];
  readonly $c: TreeTypeParameters['VertexHint'][];
}

export interface ITraversableTree<
  TreeTypeParameters extends ITreeTypeParameters,
> {
  makeRoot(): IVertex<TreeTypeParameters> | null;

  makeVertex(
    vertexHint: TreeTypeParameters['VertexHint'],
    contextForGetVertex: ContextForGetVertex<TreeTypeParameters>,
  ): IVertex<TreeTypeParameters> | null;
}

export type VertexContextMap<TreeTypeParameters extends ITreeTypeParameters> =
  Map<IVertex<TreeTypeParameters>, IVertexContext<TreeTypeParameters> | null>;

export type ResolvedTreeMap<TreeTypeParameters extends ITreeTypeParameters> =
  Map<IVertex<TreeTypeParameters>, Array<IVertex<TreeTypeParameters>>>;

export interface TraversalVisitorOptions<
  TreeTypeParameters extends ITreeTypeParameters,
> {
  vertexContextMap: VertexContextMap<TreeTypeParameters>;
  resolvedTreeMap: ResolvedTreeMap<TreeTypeParameters>;
  visitIndex: number;
  previousVisitedVertex: IVertex<TreeTypeParameters> | null;
  isLeafVertex: boolean;
  isRootVertex: boolean;
}

export enum TraversalVisitorCommand {
  HALT_TRAVERSAL = 'HALT_TRAVERSAL',
}

export interface TraversalVisitorResult {
  command?: TraversalVisitorCommand;
}

export type TraversalVisitor<TreeTypeParameters extends ITreeTypeParameters> = (
  vertex: IVertex<TreeTypeParameters>,
  options: TraversalVisitorOptions<TreeTypeParameters>,
) => TraversalVisitorResult | undefined;

export interface IVertexContext<TreeTypeParameters extends ITreeTypeParameters>
  extends ContextForGetVertex<TreeTypeParameters> {
  hint: TreeTypeParameters['VertexHint'];
}
