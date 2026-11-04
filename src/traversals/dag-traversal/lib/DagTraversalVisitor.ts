import type { VertexHandle } from '@core/CTTRef';
import type {
  LiveResolvedGraphView,
  LivePreCommandDiscoveredGraphView,
} from '@core/ResolvedGraphView';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { VertexView } from '@core/Vertex';
import type {
  MaybePromise,
  VisitorCallbackReturnValue,
} from '@core/graph/types';
import type { VisitorRegistrationMetadata } from '@core/TraversalVisitor';
import type { DagVisitorPhase } from './DagTraversalOrder';

export type DagVisitorContext<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
> = {
  liveResolvedGraphView: LiveResolvedGraphView<
    SourceVertexTypes | RewrittenVertexTypes,
    VertexId
  >;
  livePreCommandDiscoveredGraphView: LivePreCommandDiscoveredGraphView<
    SourceVertexTypes,
    VertexId
  > | null;
  vertexHandle: VertexHandle<SourceVertexTypes | RewrittenVertexTypes>;
  visitorPhase: Phase;
  isVisibleSourceRoot: boolean;
  phaseVisitorChainAdmissionIndex: number;
  visitorCallbackIndexInPhaseChain: number;
  previousCommittedVisitVertexHandleForSamePhase: VertexHandle<
    SourceVertexTypes | RewrittenVertexTypes
  > | null;
  currentVertexPhaseChainState: unknown;
  visitorRegistrationMetadata: VisitorRegistrationMetadata;
};

export type DagVisitor<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
> = VisitorCallbackReturnValue<
  RewrittenVertexTypes,
  Phase,
  'dag',
  SourceVertexTypes['ChildHint']
> extends infer VisitorResult
  ? (
      vertex: VertexView<SourceVertexTypes | RewrittenVertexTypes>,
      context: DagVisitorContext<
        SourceVertexTypes,
        RewrittenVertexTypes,
        Phase,
        VertexId
      >,
    ) => VisitorResult
  : never;

export type AsyncDagVisitor<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
> = VisitorCallbackReturnValue<
  RewrittenVertexTypes,
  Phase,
  'dag',
  SourceVertexTypes['ChildHint']
> extends infer VisitorResult
  ? (
      vertex: VertexView<SourceVertexTypes | RewrittenVertexTypes>,
      context: DagVisitorContext<
        SourceVertexTypes,
        RewrittenVertexTypes,
        Phase,
        VertexId
      >,
    ) => MaybePromise<VisitorResult>
  : never;

/**
 * Committed milestone observation: `workCompleted` emits after W, including
 * deferred settlement, while an `ON_WORK_READY` visitor runs before work.
 * Dispatch external work from coordinator frontier tickets or a pre-work visitor.
 */
export type DagCommittedMilestoneEvent<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = {
  vertexId: VertexId;
  vertex: VertexView<SourceVertexTypes>;
  vertexHandle: VertexHandle<SourceVertexTypes>;
  isVisibleSourceRoot: boolean;
} & (
  | { eventKind: 'workCompletionCommitted' }
  | { eventKind: 'subgraphCompletionCommitted' }
);
