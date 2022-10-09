import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex, VertexContent } from '@core/Vertex';
import type { CTTRef } from '@core/CTTRef';
import type { CTTAbstractParent } from '@core/CTTAbstractParent';
import { AbstractTraversableTree } from '@core/TraversableTree';
import type { ResolvedTreeTypeParameters } from '@core/ResolvedTreeTypeParameters';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export type VertexResolutionContext<TTP extends TreeTypeParameters> = {
  depth: number;
  parentVertex: Vertex<TTP>;
  parentVertexRef: CTTRef<Vertex<TTP>>;
  hintIndex: number;
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

  setResolutionContext(
    resolutionContext: VertexResolutionContext<TTP> | null,
  ): void {
    this.$d.resolutionContext = resolutionContext;
  }

  getChildren(): CTTRef<Vertex<TTP>>[] {
    return this.$c;
  }

  getParent(): CTTRef<Vertex<TTP>> | null {
    return this.$d.resolutionContext?.parentVertexRef ?? null;
  }

  clone(content?: Partial<VertexResolvedContent<TTP>>): VertexResolved<TTP> {
    return new VertexResolved<TTP>({
      $d: content?.$d ?? this.$d,
      $c: content?.$c ?? this.$c,
    });
  }
}

export type ResolvedTreeMap<TTP extends TreeTypeParameters> = Map<
  CTTRef<Vertex<TTP>>,
  VertexResolved<TTP>
>;

export type GetPathToOptions = {
  noRoot?: boolean;
  noSelf?: boolean;
};

export class ResolvedTree<
  TTP extends TreeTypeParameters,
> extends AbstractTraversableTree<ResolvedTreeTypeParameters<TTP>> {
  private map: ResolvedTreeMap<TTP>;
  private root: CTTRef<Vertex<TTP>> | null;

  constructor(/*config: ResolvedTreeConfig<TTP, RW_TTP>*/) {
    super();
    this.map = new Map();
    this.root = null;
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

  getParentOf(vertexRef: CTTRef<Vertex<TTP>>): CTTRef<Vertex<TTP>> | null {
    return this.get(vertexRef)?.getParent() ?? null;
  }

  private deleteChildOf(
    parent: CTTRef<Vertex<TTP>>,
    child: CTTRef<Vertex<TTP>>,
  ): void {
    const resolved = this.get(parent);
    if (resolved !== null) {
      const newResolved = resolved.clone({
        $c: resolved.getChildren().filter((c) => c !== child),
      });
      this.set(parent, newResolved);
    }
  }

  delete(vertexRef: CTTRef<Vertex<TTP>>): void {
    const parent = this.getParentOf(vertexRef);
    if (parent !== null) {
      this.deleteChildOf(parent, vertexRef);
    }
    this.map.delete(vertexRef);
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

  getPathTo(
    vertexRef: CTTRef<Vertex<TTP>>,
    options?: GetPathToOptions,
  ): CTTRef<Vertex<TTP>>[] {
    let curVertex = vertexRef;
    const reversedPath: CTTRef<Vertex<TTP>>[] =
      options?.noSelf === true ? [] : [curVertex];
    while (true) {
      const parent = this.getParentOf(curVertex);
      if (parent === null) {
        break;
      } else {
        reversedPath.push(parent);
        curVertex = parent;
      }
    }
    const straightPath = reversedPath.reverse();
    if (options?.noRoot === true) {
      return straightPath.slice(1);
    } else {
      return straightPath;
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
