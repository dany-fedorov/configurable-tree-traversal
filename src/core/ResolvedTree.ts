import type { TreeTypeParameters } from './TreeTypeParameters';
import type { Vertex, VertexContent } from './Vertex';
import type { CTTRef } from './CTTRef';
import type { CTTAbstractParent } from './CTTAbstractParent';
import { jsonStringifySafe } from '../utils/jsonStringifySafe';
import { AbstractTraversableTree, TraversableTree } from './TraversableTree';
import type { ResolvedTreeTypeParameters } from './ResolvedTreeTypeParameters';

export type VertexResolutionContext<TTP extends TreeTypeParameters> = {
  depth: number;
  parentVertex: Vertex<TTP>;
  parentVertexRef: CTTRef<Vertex<TTP>>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
  vertexHint: TTP['VertexHint'];
};

export type VertexResolvedData<TTP extends TreeTypeParameters> = {
  resolutionContext: VertexResolutionContext<TTP> | null;
};

export type VertexResolvedContent<TTP extends TreeTypeParameters> =
  CTTAbstractParent<VertexResolvedData<TTP>, CTTRef<Vertex<TTP>>>;

export class VertexResolved<TTP extends TreeTypeParameters>
  implements VertexResolvedContent<TTP>
{
  readonly $d: VertexResolvedData<TTP>;
  readonly $c: CTTRef<Vertex<TTP>>[];

  constructor(vertexContent: VertexResolvedContent<TTP>) {
    this.$d = vertexContent.$d;
    this.$c = vertexContent.$c;
  }

  pushChildren(children: Array<CTTRef<Vertex<TTP>>>): void {
    this.$c.push(...children);
  }

  getResolutionContext(): VertexResolutionContext<TTP> | null {
    return this.$d.resolutionContext;
  }

  getChildren(): CTTRef<Vertex<TTP>>[] {
    return this.$c;
  }
}

export type ResolvedTreeMap<TTP extends TreeTypeParameters> = Map<
  CTTRef<Vertex<TTP>>,
  VertexResolved<TTP>
>;

type ResolvedTreeConfig<TTP extends TreeTypeParameters> = {
  traversableTree: TraversableTree<TTP>;
};

export class ResolvedTree<
  TTP extends TreeTypeParameters,
> extends AbstractTraversableTree<ResolvedTreeTypeParameters<TTP>> {
  private _isResolved = false;
  private map: ResolvedTreeMap<TTP>;
  private root: CTTRef<Vertex<TTP>> | null;
  public readonly traversableTree: TraversableTree<TTP>;

  constructor(config: ResolvedTreeConfig<TTP>) {
    super();
    this.map = new Map();
    this.root = null;
    this.traversableTree = config.traversableTree;
  }

  markAsResolved() {
    this._isResolved = true;
  }

  isResolved(): boolean {
    return this._isResolved;
  }

  getRoot(): CTTRef<Vertex<TTP>> | null {
    return this.root;
  }

  setRoot(root: CTTRef<Vertex<TTP>>): void {
    this.root = root;
  }

  getChildrenOf(
    vertexRef: CTTRef<Vertex<TTP>>,
  ): Array<CTTRef<Vertex<TTP>>> | null {
    return this.map.get(vertexRef)?.getChildren() ?? null;
  }

  has(vertexRef: CTTRef<Vertex<TTP>>): boolean {
    return this.map.has(vertexRef);
  }

  get(vertexRef: CTTRef<Vertex<TTP>>): VertexResolved<TTP> | null {
    return this.map.get(vertexRef) ?? null;
  }

  set(
    vertexRef: CTTRef<Vertex<TTP>>,
    vertexResolved: VertexResolved<TTP>,
  ): void {
    this.map.set(vertexRef, vertexResolved);
  }

  getResolutionContextOf(
    vertexRef: CTTRef<Vertex<TTP>>,
  ): VertexResolutionContext<TTP> | null {
    return this.get(vertexRef)?.getResolutionContext() ?? null;
  }

  pushChildrenTo(
    vertexRef: CTTRef<Vertex<TTP>>,
    children: Array<CTTRef<Vertex<TTP>>>,
  ): void {
    const parentVertexResolved = this.get(vertexRef);
    if (parentVertexResolved == null) {
      throw new Error(`Could not find ref - ${jsonStringifySafe(vertexRef)}`);
    }
    parentVertexResolved.pushChildren(children);
  }

  onPreOrderVisit(
    vertexRef: CTTRef<Vertex<TTP>>,
    vertexContext: VertexResolutionContext<TTP> | null,
  ): void {
    this.set(
      vertexRef,
      new VertexResolved<TTP>({
        $d: { resolutionContext: vertexContext },
        $c: [],
      }),
    );
    if (vertexContext !== null) {
      this.pushChildrenTo(vertexContext.parentVertexRef, [vertexRef]);
    } else {
      this.setRoot(vertexRef);
    }
  }

  makeRoot(): VertexContent<ResolvedTreeTypeParameters<TTP>> | null {
    if (this.root === null) {
      return null;
    }
    return {
      $d: this.root,
      $c: this.getChildrenOf(this.root) ?? [],
    };
  }

  makeVertex(
    vertexHint: ResolvedTreeTypeParameters<TTP>['VertexHint'],
  ): VertexContent<ResolvedTreeTypeParameters<TTP>> | null {
    return {
      $d: vertexHint,
      $c: this.getChildrenOf(vertexHint) ?? [],
    };
  }
}
