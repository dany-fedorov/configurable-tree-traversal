import { jsonStringifySafe } from '../../../utils/jsonStringifySafe';
import {
  CTTRef,
  ResolvedTree,
  TreeTypeParameters,
  Vertex, VertexResolutionContext, VertexResolved,
} from '../../../core';
import type { DepthFirstTraversalInstanceConfig } from './DepthFirstTraversalInstanceConfig';

export type NotMutatedResolvedTreeRefsMap<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Map<CTTRef<Vertex<TTP | RW_TTP>>, CTTRef<Vertex<TTP>>>;

export class ResolvedTreesContainer<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
    TTP,
    RW_TTP
  > | null;

  constructor(cfg: {
    saveNotMutatedResolvedTree: DepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['saveNotMutatedResolvedTree'];
    internalObjects: {
      resolvedTreesContainer?: DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['internalObjects']['resolvedTreesContainer'];
    };
  }) {
    this.resolvedTree =
      cfg?.internalObjects?.resolvedTreesContainer?.resolvedTree != null
        ? cfg?.internalObjects?.resolvedTreesContainer.resolvedTree
        : new ResolvedTree<TTP | RW_TTP>();
    this.notMutatedResolvedTree =
      cfg?.internalObjects?.resolvedTreesContainer?.notMutatedResolvedTree !=
      null
        ? cfg?.internalObjects?.resolvedTreesContainer.notMutatedResolvedTree
        : cfg.saveNotMutatedResolvedTree
        ? new ResolvedTree<TTP>()
        : null;
    this.notMutatedResolvedTreeRefsMap =
      cfg?.internalObjects?.resolvedTreesContainer
        ?.notMutatedResolvedTreeRefsMap != null
        ? cfg?.internalObjects?.resolvedTreesContainer
            .notMutatedResolvedTreeRefsMap
        : cfg.saveNotMutatedResolvedTree
        ? new Map()
        : null;
  }

  set(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexResolved: VertexResolved<TTP | RW_TTP>,
  ): void {
    this.resolvedTree.set(vertexRef, vertexResolved);
    if (this.notMutatedResolvedTree && this.notMutatedResolvedTreeRefsMap) {
      const notMutatedRef = new CTTRef<Vertex<TTP>>(
        (vertexRef as CTTRef<Vertex<TTP>>).unref().clone(),
      );
      this.notMutatedResolvedTreeRefsMap.set(vertexRef, notMutatedRef);
      const resolutionContext = vertexResolved.getResolutionContext();
      const parentVertexRef = resolutionContext?.parentVertexRef ?? null;
      const notMutatedVertexParentRef = !parentVertexRef
        ? null
        : this.notMutatedResolvedTreeRefsMap.get(parentVertexRef);
      const notMutatedVertexResolved = vertexResolved.clone();
      notMutatedVertexResolved.setResolutionContext(
        !notMutatedVertexParentRef || !resolutionContext
          ? null
          : {
              ...resolutionContext,
              parentVertexRef: notMutatedVertexParentRef,
              parentVertex: notMutatedVertexParentRef?.unref(),
            },
      );
      this.notMutatedResolvedTree.set(
        notMutatedRef,
        notMutatedVertexResolved as VertexResolved<TTP>,
      );
    }
  }

  getRoot(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.resolvedTree.getRoot();
  }

  setWithResolutionContext(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexResolutionContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    this.set(
      vertexRef,
      new VertexResolved<TTP | RW_TTP>({
        $d: { resolutionContext: vertexResolutionContext },
        $c: [],
      }),
    );
  }

  setRoot(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.setRoot(vertexRef);
    this.setWithResolutionContext(vertexRef, null);
  }

  delete(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.delete(vertexRef);
  }

  pushChildrenTo(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    childrenVertexRefs: CTTRef<Vertex<TTP | RW_TTP>>[],
  ): void {
    this.resolvedTree.pushChildrenTo(parentVertexRef, childrenVertexRefs);
    if (this.notMutatedResolvedTree && this.notMutatedResolvedTreeRefsMap) {
      const nmParentVertexRef =
        this.notMutatedResolvedTreeRefsMap?.get(parentVertexRef);
      if (nmParentVertexRef == null) {
        throw new Error(
          `Could not find not mutated ref by resolved ref - ${jsonStringifySafe(
            parentVertexRef,
          )}`,
        );
      }
      const nmParentVertexResolved =
        this.notMutatedResolvedTree.get(nmParentVertexRef);
      if (nmParentVertexResolved == null) {
        throw new Error(
          `Could not find not mutated ref - ${jsonStringifySafe(
            nmParentVertexRef,
          )}`,
        );
      }
      const nmChildrenVertexRefs = childrenVertexRefs.map((ch) => {
        const nmCh = this.notMutatedResolvedTreeRefsMap?.get(ch);
        if (!nmCh) {
          throw new Error(
            `Could not find not mutated child ref - ${jsonStringifySafe(ch)}`,
          );
        }
        return nmCh;
      });
      nmParentVertexResolved.pushChildren(nmChildrenVertexRefs);
    }
  }
}
