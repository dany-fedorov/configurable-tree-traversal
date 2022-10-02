import type { TreeTypeParameters } from './TreeTypeParameters';
import type { Vertex } from './Vertex';
import type { Ref } from './Ref';
import type { CTTAbstractParent } from './CTTAbstractParent';
import { jsonStringifySafe } from './utils/jsonStringifySafe';

export type VertexResolutionContext<TTP extends TreeTypeParameters> = {
  parentVertex: Vertex<TTP>;
  parentVertexRef: Ref<Vertex<TTP>>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
  vertexHint: TTP['VertexHint'];
};

export type VertexResolvedData<TTP extends TreeTypeParameters> = {
  resolutionContext: VertexResolutionContext<TTP> | null;
};

export type VertexResolvedContent<TTP extends TreeTypeParameters> =
  CTTAbstractParent<VertexResolvedData<TTP>, Ref<Vertex<TTP>>>;

export class VertexResolved<TTP extends TreeTypeParameters>
  implements VertexResolvedContent<TTP>
{
  readonly $d: VertexResolvedData<TTP>;
  readonly $c: Array<Ref<Vertex<TTP>>>;

  constructor(vertexContent: VertexResolvedContent<TTP>) {
    this.$d = vertexContent.$d;
    this.$c = vertexContent.$c;
  }

  pushChildren(children: Array<Ref<Vertex<TTP>>>): void {
    this.$c.push(...children);
  }

  getResolutionContext(): VertexResolutionContext<TTP> | null {
    return this.$d.resolutionContext;
  }
}

export type ResolvedTreeMap<TTP extends TreeTypeParameters> = Map<
  Ref<Vertex<TTP>>,
  VertexResolved<TTP>
>;

export class ResolvedTree<TTP extends TreeTypeParameters> {
  private map: ResolvedTreeMap<TTP>;
  private root: Ref<Vertex<TTP>> | null;

  constructor() {
    this.map = new Map();
    this.root = null;
  }

  getRoot(): Ref<Vertex<TTP>> | null {
    return this.root;
  }

  setRoot(root: Ref<Vertex<TTP>>): void {
    this.root = root;
  }

  getChildrenOf(vertexRef: Ref<Vertex<TTP>>): Array<Ref<Vertex<TTP>>> | null {
    return this.map.get(vertexRef)?.$c ?? null;
  }

  has(vertexRef: Ref<Vertex<TTP>>): boolean {
    return this.map.has(vertexRef);
  }

  get(vertexRef: Ref<Vertex<TTP>>): VertexResolved<TTP> | null {
    return this.map.get(vertexRef) ?? null;
  }

  set(vertexRef: Ref<Vertex<TTP>>, vertexResolved: VertexResolved<TTP>): void {
    this.map.set(vertexRef, vertexResolved);
  }

  pushChildrenTo(
    vertexRef: Ref<Vertex<TTP>>,
    children: Array<Ref<Vertex<TTP>>>,
  ): void {
    const parentVertexResolved = this.get(vertexRef);
    if (parentVertexResolved == null) {
      throw new Error(`Could not find ref - ${jsonStringifySafe(vertexRef)}`);
    }
    parentVertexResolved.pushChildren(children);
  }

  onPreOrderVisit(
    vertexRef: Ref<Vertex<TTP>>,
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
}
