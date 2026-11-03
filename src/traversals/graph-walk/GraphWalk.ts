import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import type {
  PreventVisitorReturnFromWideningPhase,
  VisitorRegistrationOptions,
  VisitorGroupDefinition,
  VisitorDefinitionsForPhase,
} from '@core/TraversalVisitor';
import {
  appendVisitorDefinition,
  appendVisitorGroup,
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type {
  GraphWalkBuilderOptions,
  GraphWalkBuilderOptionsPatch,
} from './GraphWalkOptions';
import { GraphWalkObservationKind } from './GraphWalkPhase';
import {
  InternalGraphWalkRunner,
  type GraphWalkRunner,
} from './GraphWalkRunner';
import type { GraphWalkVisitor } from './GraphWalkVisitor';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { normalizeWalkOptions } from './lib/normalizeWalkOptions';

export class GraphWalkBuilder<VertexData, EdgeData, VertexId> {
  private options: GraphWalkResolvedOptions<VertexData, EdgeData, VertexId>;
  constructor(
    options: GraphWalkBuilderOptions<VertexData, EdgeData, VertexId>,
  ) {
    this.options = normalizeWalkOptions(options);
  }
  patchOptionsForFutureRunners(
    patch: GraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId>,
  ): this {
    this.options = normalizeWalkOptions(patch, this.options);
    return this;
  }
  addVisitorForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
    visitor: GraphWalkVisitor<
      VertexData,
      EdgeData,
      PreventVisitorReturnFromWideningPhase<ObservationKind>,
      VertexId
    >,
    options: Partial<VisitorRegistrationOptions> = {},
  ): this {
    assertOwnKeys(options, [
      'descendingExecutionPriorityWithinGroup',
      'visitorCommandCommitTiming',
    ]);
    const records = appendVisitorDefinition(this.recordsFor(observationKind), {
      visitor,
      ...definedOptions(options),
    });
    this.options = {
      ...this.options,
      visitorsByObservationKind: {
        ...this.options.visitorsByObservationKind,
        [observationKind]: records,
      },
    };
    return this;
  }
  addVisitorGroupForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
    group: VisitorGroupDefinition<
      GraphWalkVisitor<
        VertexData,
        EdgeData,
        PreventVisitorReturnFromWideningPhase<ObservationKind>,
        VertexId
      >
    >,
  ): this {
    const records = appendVisitorGroup(this.recordsFor(observationKind), group);
    this.options = {
      ...this.options,
      visitorsByObservationKind: {
        ...this.options.visitorsByObservationKind,
        [observationKind]: records,
      },
    };
    return this;
  }
  replaceVisitorsForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
    input: VisitorDefinitionsForPhase<
      GraphWalkVisitor<
        VertexData,
        EdgeData,
        PreventVisitorReturnFromWideningPhase<ObservationKind>,
        VertexId
      >
    >,
  ): this {
    this.recordsFor(observationKind);
    const records = normalizeVisitorDefinitions(input);
    this.options = {
      ...this.options,
      visitorsByObservationKind: {
        ...this.options.visitorsByObservationKind,
        [observationKind]: records,
      },
    };
    return this;
  }
  listVisitorRegistrationsForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
  ): VisitorRecord<
    GraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
  >[] {
    return copyVisitorRecords(this.recordsFor(observationKind));
  }
  private recordsFor<ObservationKind extends GraphWalkObservationKind>(
    observationKind: ObservationKind,
  ): VisitorRecord<
    GraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
  >[] {
    if (!Object.values(GraphWalkObservationKind).includes(observationKind))
      throw new TypeError('Unknown walking observation kind');
    // The sync facade only accepts synchronous visitorsByObservationKind; normalization is shared with async walking.
    return this.options.visitorsByObservationKind[
      observationKind
    ] as VisitorRecord<
      GraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
    >[];
  }
  createIndependentRunnerFromCurrentOptions(): GraphWalkRunner<
    VertexData,
    EdgeData,
    VertexId
  > {
    return new InternalGraphWalkRunner(normalizeWalkOptions({}, this.options));
  }
}
