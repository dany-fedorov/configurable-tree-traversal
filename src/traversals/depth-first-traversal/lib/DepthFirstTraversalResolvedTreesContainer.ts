import { MutableRef } from '@core/CTTRef';
import {
  ResolvedTreeStore,
  TreeVertexRecord,
  VertexResolutionContext,
} from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export type OriginalTreeRefsMap<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = Map<MutableRef<Vertex<TTP | RW_TTP>>, MutableRef<Vertex<TTP>>>;

export class DepthFirstTraversalResolvedTreesContainer<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> {
  resolvedTree: ResolvedTreeStore<TTP | RW_TTP>;
  originalTreeView: ResolvedTreeStore<TTP> | null;
  originalTreeRefsMap: OriginalTreeRefsMap<TTP, RW_TTP> | null;

  constructor(
    cfg: Pick<
      DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
      'retainOriginalTreeStructure'
    > & {
      traversalRunnerInternalObjects: Pick<
        DepthFirstTreeResolvedOptions<
          TTP,
          RW_TTP
        >['traversalRunnerInternalObjects'],
        'resolvedTreesContainer'
      >;
    },
  ) {
    this.resolvedTree =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.resolvedTree != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .resolvedTree
        : new ResolvedTreeStore<TTP | RW_TTP>();
    this.originalTreeView =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.originalTreeView != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .originalTreeView
        : cfg.retainOriginalTreeStructure
        ? new ResolvedTreeStore<TTP>()
        : null;
    this.originalTreeRefsMap =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.originalTreeRefsMap != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .originalTreeRefsMap
        : cfg.retainOriginalTreeStructure
        ? new Map()
        : null;
  }

  set(
    vertexRef: MutableRef<Vertex<TTP | RW_TTP>>,
    vertexResolved: TreeVertexRecord<TTP | RW_TTP>,
  ): void {
    const resolutionContext = vertexResolved.getResolutionContext();
    this.validateSavedResolutionContext(resolutionContext);
    if (this.originalTreeView && this.originalTreeRefsMap) {
      const vertex = (vertexRef as MutableRef<Vertex<TTP>>).getValue();
      const notMutatedRef =
        this.originalTreeRefsMap.get(vertexRef) ??
        new MutableRef<Vertex<TTP>>(
          vertex.clone({ $childHints: vertex.getChildrenHints().slice() }),
        );
      const notMutatedChildren = vertexResolved.getChildren().map((child) => {
        const notMutatedChild = this.originalTreeRefsMap?.get(child);
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
        children: notMutatedChildren,
      });
      if (resolutionContext === null) {
        notMutatedVertexResolved.setResolutionContext(null);
      } else {
        const notMutatedVertexParentRef = this.originalTreeRefsMap.get(
          resolutionContext.parentVertexRef,
        )!;
        notMutatedVertexResolved.setResolutionContext({
          ...resolutionContext,
          parentVertexRef: notMutatedVertexParentRef,
          parentVertex: notMutatedVertexParentRef.getValue(),
        });
      }
      this.resolvedTree.set(vertexRef, vertexResolved);
      this.originalTreeRefsMap.set(vertexRef, notMutatedRef);
      this.originalTreeView.set(
        notMutatedRef,
        notMutatedVertexResolved as TreeVertexRecord<TTP>,
      );
      return;
    }
    this.resolvedTree.set(vertexRef, vertexResolved);
  }

  validateSavedResolutionContext(
    resolutionContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    if (
      this.originalTreeView !== null &&
      this.originalTreeRefsMap !== null &&
      resolutionContext !== null &&
      !this.originalTreeRefsMap.has(resolutionContext.parentVertexRef)
    ) {
      throw new Error(
        `Could not find not mutated parent ref - ${jsonStringifySafe(
          resolutionContext.parentVertexRef,
        )}`,
      );
    }
  }

  setWithResolutionContext(
    vertexRef: MutableRef<Vertex<TTP | RW_TTP>>,
    vertexResolutionContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    this.set(
      vertexRef,
      new TreeVertexRecord<TTP | RW_TTP>({
        metadata: { resolutionContext: vertexResolutionContext },
        children: [],
      }),
    );
  }

  setRoot(vertexRef: MutableRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.setRoot(vertexRef);
    this.setWithResolutionContext(vertexRef, null);
    const notMutatedRootRef = this.originalTreeRefsMap?.get(vertexRef);
    if (this.originalTreeView && notMutatedRootRef) {
      this.originalTreeView.setRoot(notMutatedRootRef);
    }
  }

  delete(vertexRef: MutableRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.deleteSubtree(vertexRef);
  }

  pushChildrenTo(
    parentVertexRef: MutableRef<Vertex<TTP | RW_TTP>>,
    childrenVertexRefs: MutableRef<Vertex<TTP | RW_TTP>>[],
  ): void {
    if (this.originalTreeView && this.originalTreeRefsMap) {
      const nmParentVertexRef = this.originalTreeRefsMap?.get(parentVertexRef);
      if (nmParentVertexRef == null) {
        throw new Error(
          `Could not find not mutated ref by resolved ref - ${jsonStringifySafe(
            parentVertexRef,
          )}`,
        );
      }
      const nmParentVertexResolved =
        this.originalTreeView.get(nmParentVertexRef);
      if (nmParentVertexResolved == null) {
        throw new Error(
          `Could not find not mutated ref - ${jsonStringifySafe(
            nmParentVertexRef,
          )}`,
        );
      }
      const nmChildrenVertexRefs = childrenVertexRefs.map((ch) => {
        const nmCh = this.originalTreeRefsMap?.get(ch);
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
