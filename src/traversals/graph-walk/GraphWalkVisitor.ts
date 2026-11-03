import type { MaybePromise } from '@core/graph/types';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
  VisitorRegistrationMetadata,
} from '@core/TraversalVisitor';
import type { GraphWalkObservationKind } from './GraphWalkPhase';
import type { GraphWalkEventForObservationKind } from './GraphWalkEvent';

export type GraphWalkVisitorResult = void | {
  commands?: readonly TraversalVisitorCommand<
    VertexDataAndChildHintTypes,
    | TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY
    | TraversalVisitorCommandName.NO_OPERATION
  >[];
};

export type GraphWalkVisitorContext<
  ObservationKind extends GraphWalkObservationKind,
> = Readonly<{
  observationKind: ObservationKind;
  admittedTargetOccurrenceIndex: number;
  observationIndexWithinKind: number;
  visitorIndexInObservationChain: number;
  visitorRegistrationMetadata: VisitorRegistrationMetadata;
}>;

export type GraphWalkVisitor<
  VertexData,
  EdgeData,
  ObservationKind extends GraphWalkObservationKind,
  VertexId,
> = (
  event: GraphWalkEventForObservationKind<
    VertexData,
    EdgeData,
    ObservationKind,
    VertexId
  >,
  context: GraphWalkVisitorContext<ObservationKind>,
) => GraphWalkVisitorResult;

export type AsyncGraphWalkVisitor<
  VertexData,
  EdgeData,
  ObservationKind extends GraphWalkObservationKind,
  VertexId,
> = (
  event: GraphWalkEventForObservationKind<
    VertexData,
    EdgeData,
    ObservationKind,
    VertexId
  >,
  context: GraphWalkVisitorContext<ObservationKind>,
) => MaybePromise<GraphWalkVisitorResult>;
