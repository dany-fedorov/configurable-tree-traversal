import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { CTTRef } from '@core/CTTRef';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTraversalVisitorsState } from '@depth-first-traversal/lib/DepthFirstTraversalVisitorsState';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';
import { TraversalRunnerStatus } from '@core/TraversalRunner';

export function initDepthFirstVisitorsState<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(): DepthFirstTraversalVisitorsState<TTP, RW_TTP> {
  const empty = {
    phaseVisitIndex: 0,
    visitorIndex: 0,
    previousPhaseVertexRef: null,
  };
  return {
    [DepthFirstPhase.PRE_ORDER]: { ...empty },
    [DepthFirstPhase.IN_ORDER]: { ...empty },
    [DepthFirstPhase.POST_ORDER]: { ...empty },
  };
}

type PopStackResult<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> =
  | { stackIsEmpty: true; vertexContext: null }
  | {
      stackIsEmpty: false;
      vertexContext: VertexResolutionContext<TTP | RW_TTP>;
    };

export class DepthFirstTraversalRunnerState<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> {
  STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
  postOrderNotVisitedChildrenCountMap: Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >;
  visitorsState: DepthFirstTraversalVisitorsState<TTP, RW_TTP>;
  traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  status: TraversalRunnerStatus;
  subtreeTraversalDisabledRefs: Set<CTTRef<Vertex<TTP | RW_TTP>>>;
  vertexRefStackChildrenHintsRanges: Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    [number, number]
  >;

  constructor(
    cfg: Pick<
      DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
      'traversalRunnerInternalObjects'
    >,
  ) {
    const from = cfg?.traversalRunnerInternalObjects?.state ?? null;
    this.STACK = from?.STACK != null ? from?.STACK : [];
    this.postOrderNotVisitedChildrenCountMap =
      from?.postOrderNotVisitedChildrenCountMap != null
        ? from?.postOrderNotVisitedChildrenCountMap
        : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
    this.visitorsState =
      from?.visitorsState != null
        ? from?.visitorsState
        : initDepthFirstVisitorsState();
    this.traversalRootVertexRef =
      from?.traversalRootVertexRef != null
        ? from?.traversalRootVertexRef
        : null;
    this.status =
      from?.status != null ? from?.status : TraversalRunnerStatus.INITIAL;
    this.subtreeTraversalDisabledRefs =
      from?.subtreeTraversalDisabledRefs ?? new Set();
    this.vertexRefStackChildrenHintsRanges =
      from?.vertexRefStackChildrenHintsRanges ?? new Map();
  }

  countVisitedOnPostOrderAChildOf(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
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
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    newEntries: VertexResolutionContext<TTP | RW_TTP>[],
  ): void {
    const i0 = this.STACK.length;
    this.STACK.push(...newEntries);
    const i1 = this.STACK.length;
    this.vertexRefStackChildrenHintsRanges.set(parentVertexRef, [i0, i1]);
  }

  popStack(): PopStackResult<TTP, RW_TTP> {
    while (this.STACK.length > 0) {
      const vertexContext = this.STACK.pop() as VertexResolutionContext<
        TTP | RW_TTP
      >;
      /**
       * Update ranges
       */
      const [i0] = this.vertexRefStackChildrenHintsRanges.get(
        vertexContext.parentVertexRef,
      ) as [number, number];
      if (this.STACK.length <= i0) {
        this.vertexRefStackChildrenHintsRanges.delete(
          vertexContext.parentVertexRef,
        );
      } else {
        this.vertexRefStackChildrenHintsRanges.set(
          vertexContext.parentVertexRef,
          [i0, this.STACK.length],
        );
      }
      /**
       * Check if it was disabled by a command
       */
      if (
        this.subtreeTraversalDisabledRefs.has(vertexContext.parentVertexRef)
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
