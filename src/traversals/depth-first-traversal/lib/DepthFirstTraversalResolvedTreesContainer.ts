import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { CTTRef } from '@core/CTTRef';
import {
  ResolvedTree,
  VertexResolutionContext,
  VertexResolved,
} from '@core/ResolvedTree';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export type NotMutatedResolvedTreeRefsMap<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Map<CTTRef<Vertex<TTP | RW_TTP>>, CTTRef<Vertex<TTP>>>;

export class DepthFirstTraversalResolvedTreesContainer<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
    TTP,
    RW_TTP
  > | null;

  constructor(cfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
    this.resolvedTree =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.resolvedTree != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .resolvedTree
        : new ResolvedTree<TTP | RW_TTP>();
    this.notMutatedResolvedTree =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.notMutatedResolvedTree != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .notMutatedResolvedTree
        : cfg.saveNotMutatedResolvedTree
        ? new ResolvedTree<TTP>()
        : null;
    this.notMutatedResolvedTreeRefsMap =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.notMutatedResolvedTreeRefsMap != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .notMutatedResolvedTreeRefsMap
        : cfg.saveNotMutatedResolvedTree
        ? new Map()
        : null;
  }

  set(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexResolved: VertexResolved<TTP | RW_TTP>,
  ): void {
    if (this.notMutatedResolvedTree && this.notMutatedResolvedTreeRefsMap) {
      const vertex = (vertexRef as CTTRef<Vertex<TTP>>).unref();
      const notMutatedRef =
        this.notMutatedResolvedTreeRefsMap.get(vertexRef) ??
        new CTTRef<Vertex<TTP>>(
          vertex.clone({ $c: vertex.getChildrenHints().slice() }),
        );
      const resolutionContext = vertexResolved.getResolutionContext();
      const notMutatedChildren = vertexResolved.getChildren().map((child) => {
        const notMutatedChild = this.notMutatedResolvedTreeRefsMap?.get(child);
        if (notMutatedChild === undefined) {
          throw new Error(
            `Could not find not mutated child ref - ${jsonStringifySafe(
              child,
            )}`,
          );
        }
        return notMutatedChild;
      });
      const notMutatedVertexResolved = vertexResolved.clone({
        $c: notMutatedChildren,
      });
      if (resolutionContext === null) {
        notMutatedVertexResolved.setResolutionContext(null);
      } else {
        const notMutatedVertexParentRef =
          this.notMutatedResolvedTreeRefsMap.get(
            resolutionContext.parentVertexRef,
          );
        if (notMutatedVertexParentRef === undefined) {
          throw new Error(
            `Could not find not mutated parent ref - ${jsonStringifySafe(
              resolutionContext.parentVertexRef,
            )}`,
          );
        }
        notMutatedVertexResolved.setResolutionContext({
          ...resolutionContext,
          parentVertexRef: notMutatedVertexParentRef,
          parentVertex: notMutatedVertexParentRef.unref(),
        });
      }
      this.resolvedTree.set(vertexRef, vertexResolved);
      this.notMutatedResolvedTreeRefsMap.set(vertexRef, notMutatedRef);
      this.notMutatedResolvedTree.set(
        notMutatedRef,
        notMutatedVertexResolved as VertexResolved<TTP>,
      );
      return;
    }
    this.resolvedTree.set(vertexRef, vertexResolved);
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
    const notMutatedRootRef =
      this.notMutatedResolvedTreeRefsMap?.get(vertexRef);
    if (this.notMutatedResolvedTree && notMutatedRootRef) {
      this.notMutatedResolvedTree.setRoot(notMutatedRootRef);
    }
  }

  delete(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.delete(vertexRef);
  }

  pushChildrenTo(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    childrenVertexRefs: CTTRef<Vertex<TTP | RW_TTP>>[],
  ): void {
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
      this.resolvedTree.pushChildrenTo(parentVertexRef, childrenVertexRefs);
      nmParentVertexResolved.pushChildren(nmChildrenVertexRefs);
      return;
    }
    this.resolvedTree.pushChildrenTo(parentVertexRef, childrenVertexRefs);
  }
}
