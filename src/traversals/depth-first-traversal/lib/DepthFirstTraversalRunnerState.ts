import type { MutableValueReference } from '@core/CTTRef';
import type { InternalChildDiscoveryContext } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalVisitorsState } from '@depth-first-traversal/lib/DepthFirstTraversalVisitorsState';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export function initDepthFirstVisitorsState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(): DepthFirstTraversalVisitorsState<InputVertexTypes, RewrittenVertexTypes> {
  const empty = {
    phaseVisitorChainIndex: 0,
    visitorCallbackIndexInPhaseChain: 0,
    previousCommittedVisitVertexHandleForSamePhase: null,
  };
  return {
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: { ...empty },
    [DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: {
      ...empty,
    },
    [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: { ...empty },
  };
}

type PopStackResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> =
  | { stackIsEmpty: true; vertexContext: null }
  | {
      stackIsEmpty: false;
      vertexContext: InternalChildDiscoveryContext<
        InputVertexTypes | RewrittenVertexTypes
      >;
    };

export class DepthFirstTraversalRunnerState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> {
  STACK: Array<
    InternalChildDiscoveryContext<InputVertexTypes | RewrittenVertexTypes>
  >;
  postOrderNotVisitedChildrenCountMap: Map<
    MutableValueReference<Vertex<InputVertexTypes | RewrittenVertexTypes>>,
    number
  >;
  visitorsState: DepthFirstTraversalVisitorsState<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  traversalRootVertexRef: MutableValueReference<
    Vertex<InputVertexTypes | RewrittenVertexTypes>
  > | null;
  status: TraversalRunnerStatus;
  subtreeTraversalDisabledRefs: Set<
    MutableValueReference<Vertex<InputVertexTypes | RewrittenVertexTypes>>
  >;
  vertexRefStackChildrenHintsRanges: Map<
    MutableValueReference<Vertex<InputVertexTypes | RewrittenVertexTypes>>,
    [number, number]
  >;

  constructor(
    cfg: Pick<
      DepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
      'traversalRunnerInternalObjects'
    >,
  ) {
    const from = cfg?.traversalRunnerInternalObjects?.state ?? null;
    this.STACK = from?.STACK != null ? from?.STACK : [];
    this.postOrderNotVisitedChildrenCountMap =
      from?.postOrderNotVisitedChildrenCountMap != null
        ? from?.postOrderNotVisitedChildrenCountMap
        : new Map<
            MutableValueReference<
              Vertex<InputVertexTypes | RewrittenVertexTypes>
            >,
            number
          >();
    this.visitorsState =
      from?.visitorsState != null
        ? from?.visitorsState
        : initDepthFirstVisitorsState();
    this.traversalRootVertexRef =
      from?.traversalRootVertexRef != null
        ? from?.traversalRootVertexRef
        : null;
    this.status =
      from?.status != null ? from?.status : TraversalRunnerStatus.NOT_STARTED;
    this.subtreeTraversalDisabledRefs =
      from?.subtreeTraversalDisabledRefs ?? new Set();
    this.vertexRefStackChildrenHintsRanges =
      from?.vertexRefStackChildrenHintsRanges ?? new Map();
  }

  countVisitedOnPostOrderAChildOf(
    parentVertexRef: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
  ): number {
    const postOrderNotVisitedChildrenCount =
      this.postOrderNotVisitedChildrenCountMap.get(parentVertexRef);
    if (postOrderNotVisitedChildrenCount == null) {
      throw new Error(
        [
          '.countVisitedOnPostOrderAChildOf::Could not find entry in postOrderNotVisitedChildrenCountMap',
          `trying to count for parent: ${jsonStringifySafe(parentVertexRef)}`,
        ].join(', '),
      );
    }
    const newCount = postOrderNotVisitedChildrenCount - 1;
    this.postOrderNotVisitedChildrenCountMap.set(parentVertexRef, newCount);
    if (newCount < 0) {
      throw new Error(
        [
          `countVisitedOnPostOrderAChildOf::Count got to < 0`,
          `trying to count for parent: ${jsonStringifySafe(parentVertexRef)}`,
        ].join(', '),
      );
    }
    if (newCount === 0) {
      this.postOrderNotVisitedChildrenCountMap.delete(parentVertexRef);
    }
    return newCount;
  }

  pushToStack(
    parentVertexRef: MutableValueReference<
      Vertex<InputVertexTypes | RewrittenVertexTypes>
    >,
    newEntries: InternalChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >[],
  ): void {
    const i0 = this.STACK.length;
    this.STACK.push(...newEntries);
    const i1 = this.STACK.length;
    this.vertexRefStackChildrenHintsRanges.set(parentVertexRef, [i0, i1]);
  }

  popStack(): PopStackResult<InputVertexTypes, RewrittenVertexTypes> {
    while (this.STACK.length > 0) {
      const vertexContext = this.STACK.pop() as InternalChildDiscoveryContext<
        InputVertexTypes | RewrittenVertexTypes
      >;
      /**
       * Update ranges
       */
      const [i0] = this.vertexRefStackChildrenHintsRanges.get(
        vertexContext.parentVertexHandle,
      ) as [number, number];
      if (this.STACK.length <= i0) {
        this.vertexRefStackChildrenHintsRanges.delete(
          vertexContext.parentVertexHandle,
        );
      } else {
        this.vertexRefStackChildrenHintsRanges.set(
          vertexContext.parentVertexHandle,
          [i0, this.STACK.length],
        );
      }
      /**
       * Check if it was disabled by a command
       */
      if (
        this.subtreeTraversalDisabledRefs.has(vertexContext.parentVertexHandle)
      ) {
        continue;
      }
      /**
       * --
       */
      return { stackIsEmpty: false, vertexContext };
    }
    return { stackIsEmpty: true, vertexContext: null };
  }
}
