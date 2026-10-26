import type { MaybePromise } from '@core/graph/types';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
  VisitorRegistrationMetadata,
} from '@core/TraversalVisitor';
import type { GraphWalkPhase } from './GraphWalkPhase';
import type { GraphWalkEventFor } from './GraphWalkEvent';

export type GraphWalkVisitorResult = void | {
  commands?: readonly TraversalVisitorCommand<
    VertexTypes,
    | TraversalVisitorCommandName.PAUSE_TRAVERSAL
    | TraversalVisitorCommandName.NOOP
  >[];
};

export type GraphWalkVisitorContext<Phase extends GraphWalkPhase> = Readonly<{
  phase: Phase;
  occurrenceIndex: number;
  observationIndex: number;
  visitorIndex: number;
  registration: VisitorRegistrationMetadata;
}>;

export type GraphWalkVisitor<Data, Edge, Phase extends GraphWalkPhase, ID> = (
  event: GraphWalkEventFor<Data, Edge, Phase, ID>,
  options: GraphWalkVisitorContext<Phase>,
) => GraphWalkVisitorResult;

export type AsyncGraphWalkVisitor<
  Data,
  Edge,
  Phase extends GraphWalkPhase,
  ID,
> = (
  event: GraphWalkEventFor<Data, Edge, Phase, ID>,
  options: GraphWalkVisitorContext<Phase>,
) => MaybePromise<GraphWalkVisitorResult>;
