import type { TreeTypeParameters } from './TreeTypeParameters';
import type { Vertex, VertexContent } from './Vertex';
import type { CTTRef } from './CTTRef';
import type { CTTAbstractParent } from './CTTAbstractParent';
import { jsonStringifySafe } from '../utils/jsonStringifySafe';
import { AbstractTraversableTree, TraversableTree } from './TraversableTree';
import type { ResolvedTreeTypeParameters } from './ResolvedTreeTypeParameters';

export type VertexResolutionContext<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  depth: number;
  parentVertex: Vertex<TTP | RW_TTP>;
  parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
  vertexHintOriginalOrderIndex: number;
  vertexHintTraversalOrderIndex: number;
  vertexHint: TTP['VertexHint'];
};

export type VertexResolvedData<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolutionContext: VertexResolutionContext<TTP, RW_TTP> | null;
};

export type VertexResolvedContent<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = CTTAbstractParent<
  VertexResolvedData<TTP, RW_TTP>,
  CTTRef<Vertex<TTP | RW_TTP>>
>;

export class VertexResolved<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> implements VertexResolvedContent<TTP, RW_TTP>
{
  readonly $d: VertexResolvedData<TTP, RW_TTP>;
  readonly $c: CTTRef<Vertex<TTP | RW_TTP>>[];

  constructor(vertexContent: VertexResolvedContent<TTP, RW_TTP>) {
    this.$d = vertexContent.$d;
    this.$c = vertexContent.$c;
  }

  pushChildren(children: Array<CTTRef<Vertex<TTP | RW_TTP>>>): void {
    this.$c.push(...children);
  }

  getResolutionContext(): VertexResolutionContext<TTP, RW_TTP> | null {
    return this.$d.resolutionContext;
  }

  getChildren(): CTTRef<Vertex<TTP | RW_TTP>>[] {
    return this.$c;
  }

  getParent(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.$d.resolutionContext?.parentVertexRef ?? null;
  }

  clone(
    content?: Partial<VertexResolvedContent<TTP, RW_TTP>>,
  ): VertexResolved<TTP, RW_TTP> {
    return new VertexResolved<TTP, RW_TTP>({
      $d: content?.$d ?? this.$d,
      $c: content?.$c ?? this.$c,
    });
  }
}

export type ResolvedTreeMap<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Map<CTTRef<Vertex<TTP | RW_TTP>>, VertexResolved<TTP, RW_TTP>>;

// type ResolvedTreeConfig<
//   TTP extends TreeTypeParameters,
//   RW_TTP extends TreeTypeParameters,
// > = {};

export type GetPathToOptions = {
  noRoot?: boolean;
  noSelf?: boolean;
};

export class ResolvedTree<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> extends AbstractTraversableTree<ResolvedTreeTypeParameters<TTP | RW_TTP>> {
  private _isResolved = false;
  private map: ResolvedTreeMap<TTP, RW_TTP>;
  private root: CTTRef<Vertex<TTP | RW_TTP>> | null;

  constructor(/*config: ResolvedTreeConfig<TTP, RW_TTP>*/) {
    super();
    this.map = new Map();
    this.root = null;
  }

  markAsResolved() {
    this._isResolved = true;
  }

  isResolved(): boolean {
    return this._isResolved;
  }

  getRoot(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.root;
  }

  setRoot(root: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.root = root;
  }

  getChildrenOf(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): Array<CTTRef<Vertex<TTP | RW_TTP>>> | null {
    return this.map.get(vertexRef)?.getChildren() ?? null;
  }

  getParentOf(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.get(vertexRef)?.getParent() ?? null;
  }

  deleteChildOf(
    parent: CTTRef<Vertex<TTP | RW_TTP>>,
    child: CTTRef<Vertex<TTP | RW_TTP>>,
  ): void {
    const resolved = this.get(parent);
    if (resolved !== null) {
      const newResolved = resolved.clone({
        $c: resolved
          .getChildren()
          .filter((c: CTTRef<Vertex<TTP | RW_TTP>>) => c !== child),
      });
      this.set(parent, newResolved);
    }
  }

  delete(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    const parent = this.getParentOf(vertexRef);
    if (parent !== null) {
      this.deleteChildOf(parent, vertexRef);
    }
    this.map.delete(vertexRef);
  }

  has(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return this.map.has(vertexRef);
  }

  get(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): VertexResolved<TTP, RW_TTP> | null {
    return this.map.get(vertexRef) ?? null;
  }

  set(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexResolved: VertexResolved<TTP, RW_TTP>,
  ): void {
    this.map.set(vertexRef, vertexResolved);
  }

  getResolutionContextOf(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): VertexResolutionContext<TTP, RW_TTP> | null {
    return this.get(vertexRef)?.getResolutionContext() ?? null;
  }

  pushChildrenTo(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    children: Array<CTTRef<Vertex<TTP | RW_TTP>>>,
  ): void {
    const parentVertexResolved = this.get(vertexRef);
    if (parentVertexResolved == null) {
      throw new Error(`Could not find ref - ${jsonStringifySafe(vertexRef)}`);
    }
    parentVertexResolved.pushChildren(children);
  }

  getPathTo(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    options?: GetPathToOptions,
  ): CTTRef<Vertex<TTP | RW_TTP>>[] {
    let curVertex = vertexRef;
    const reversedPath: CTTRef<Vertex<TTP | RW_TTP>>[] =
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

  onPreOrderVisit(
    vertexRef: CTTRef<Vertex<TTP>>,
    vertexContext: VertexResolutionContext<TTP, TTP> | null,
  ): void {
    this.set(
      vertexRef,
      new VertexResolved<TTP, TTP>({
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

  makeRoot(): VertexContent<ResolvedTreeTypeParameters<TTP | RW_TTP>> | null {
    if (this.root === null) {
      return null;
    }
    return {
      $d: this.root,
      $c: this.getChildrenOf(this.root) ?? [],
    };
  }

  makeVertex(
    vertexHint: ResolvedTreeTypeParameters<TTP | RW_TTP>['VertexHint'],
  ): VertexContent<ResolvedTreeTypeParameters<TTP | RW_TTP>> | null {
    return {
      $d: vertexHint,
      $c: this.getChildrenOf(vertexHint) ?? [],
    };
  }
}
