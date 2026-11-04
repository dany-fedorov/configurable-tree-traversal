import { MutableValueReference } from '@core/CTTRef';
import {
  MutableResolvedTreeStore,
  MutableTreeVertexTopologyRecord,
  MutableTreeChildDiscoveryContext,
} from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export type OriginalTreeRefsMap<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = Map<
  MutableValueReference<Vertex<InputVertexTypes | RewrittenVertexTypes>>,
  MutableValueReference<Vertex<InputVertexTypes>>
>;

export class DepthFirstTraversalResolvedTreesContainer<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> {
  resolvedTree: MutableResolvedTreeStore<
    InputVertexTypes | RewrittenVertexTypes
  >;
  livePreCommandDiscoveredTreeView: MutableResolvedTreeStore<InputVertexTypes> | null;
  originalTreeRefsMap: OriginalTreeRefsMap<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null;

  constructor(
    cfg: Pick<
      DepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
      'retainDiscoveredTreeBeforeVisitorCommands'
    > & {
      traversalRunnerInternalObjects: Pick<
        DepthFirstTreeResolvedOptions<
          InputVertexTypes,
          RewrittenVertexTypes
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
        : new MutableResolvedTreeStore<
            InputVertexTypes | RewrittenVertexTypes
          >();
    this.livePreCommandDiscoveredTreeView =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.livePreCommandDiscoveredTreeView != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .livePreCommandDiscoveredTreeView
        : cfg.retainDiscoveredTreeBeforeVisitorCommands
        ? new MutableResolvedTreeStore<InputVertexTypes>()
        : null;
    this.originalTreeRefsMap =
      cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
        ?.originalTreeRefsMap != null
        ? cfg?.traversalRunnerInternalObjects?.resolvedTreesContainer
            .originalTreeRefsMap
        : cfg.retainDiscoveredTreeBeforeVisitorCommands
        ? new Map()
        : null;
  }

  set(
    vertexHandle: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
    vertexResolved: MutableTreeVertexTopologyRecord<
      InputVertexTypes | RewrittenVertexTypes
    >,
  ): void {
    const childDiscoveryContext =
      vertexResolved.getMutableChildDiscoveryContextOrNull();
    this.validateSavedResolutionContext(childDiscoveryContext);
    if (this.livePreCommandDiscoveredTreeView && this.originalTreeRefsMap) {
      const vertex = (
        vertexHandle as MutableValueReference<Vertex<InputVertexTypes>>
      ).getReferencedValue();
      const notMutatedRef =
        this.originalTreeRefsMap.get(vertexHandle) ??
        new MutableValueReference<Vertex<InputVertexTypes>>(
          vertex.createEditableShallowCloneWithContentOverrides({
            $childDiscoveryHints: vertex
              .getMutableChildDiscoveryHints()
              .slice(),
          }),
        );
      const notMutatedChildren = vertexResolved
        .getMutableChildReferenceList()
        .map((child) => {
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
      const notMutatedVertexResolved =
        vertexResolved.shallowCloneWithRecordOverrides({
          childReferences: notMutatedChildren,
        });
      if (childDiscoveryContext === null) {
        notMutatedVertexResolved.replaceChildDiscoveryContext(null);
      } else {
        const notMutatedVertexParentRef = this.originalTreeRefsMap.get(
          childDiscoveryContext.parentVertexReference,
        )!;
        notMutatedVertexResolved.replaceChildDiscoveryContext({
          ...childDiscoveryContext,
          parentVertexReference: notMutatedVertexParentRef,
          parentVertexAtChildResolution:
            notMutatedVertexParentRef.getReferencedValue(),
        });
      }
      this.resolvedTree.setVertexRecord(vertexHandle, vertexResolved);
      this.originalTreeRefsMap.set(vertexHandle, notMutatedRef);
      this.livePreCommandDiscoveredTreeView.setVertexRecord(
        notMutatedRef,
        notMutatedVertexResolved as MutableTreeVertexTopologyRecord<InputVertexTypes>,
      );
      return;
    }
    this.resolvedTree.setVertexRecord(vertexHandle, vertexResolved);
  }

  validateSavedResolutionContext(
    childDiscoveryContext: MutableTreeChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    > | null,
  ): void {
    if (
      this.livePreCommandDiscoveredTreeView !== null &&
      this.originalTreeRefsMap !== null &&
      childDiscoveryContext !== null &&
      !this.originalTreeRefsMap.has(childDiscoveryContext.parentVertexReference)
    ) {
      throw new Error(
        `Could not find not mutated parent ref - ${jsonStringifySafe(
          childDiscoveryContext.parentVertexReference,
        )}`,
      );
    }
  }

  setWithResolutionContext(
    vertexHandle: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
    vertexResolutionContext: MutableTreeChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    > | null,
  ): void {
    this.set(
      vertexHandle,
      new MutableTreeVertexTopologyRecord<
        InputVertexTypes | RewrittenVertexTypes
      >({
        metadata: { childDiscoveryContext: vertexResolutionContext },
        childReferences: [],
      }),
    );
  }

  setRoot(
    vertexHandle: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
  ): void {
    this.resolvedTree.setRootVertexReference(vertexHandle);
    this.setWithResolutionContext(vertexHandle, null);
    const notMutatedRootRef = this.originalTreeRefsMap?.get(vertexHandle);
    if (this.livePreCommandDiscoveredTreeView && notMutatedRootRef) {
      this.livePreCommandDiscoveredTreeView.setRootVertexReference(
        notMutatedRootRef,
      );
    }
  }

  delete(
    vertexHandle: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
  ): void {
    this.resolvedTree.deleteSubtree(vertexHandle);
  }

  pushChildrenTo(
    parentVertexRef: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
    childrenVertexRefs: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >[],
  ): void {
    if (this.livePreCommandDiscoveredTreeView && this.originalTreeRefsMap) {
      const nmParentVertexRef = this.originalTreeRefsMap?.get(parentVertexRef);
      if (nmParentVertexRef == null) {
        throw new Error(
          `Could not find not mutated ref by resolved ref - ${jsonStringifySafe(
            parentVertexRef,
          )}`,
        );
      }
      const nmParentVertexResolved =
        this.livePreCommandDiscoveredTreeView.getMutableVertexRecordOrNull(
          nmParentVertexRef,
        );
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
      this.resolvedTree.appendChildReferencesTo(
        parentVertexRef,
        childrenVertexRefs,
      );
      nmParentVertexResolved.appendChildReferences(nmChildrenVertexRefs);
      return;
    }
    this.resolvedTree.appendChildReferencesTo(
      parentVertexRef,
      childrenVertexRefs,
    );
  }
}
