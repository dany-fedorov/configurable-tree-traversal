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
import {
  InternalAsyncGraphWalkRunner,
  type AsyncGraphWalkRunner,
} from './AsyncGraphWalkRunner';
import type {
  AsyncGraphWalkBuilderOptions,
  AsyncGraphWalkBuilderOptionsPatch,
} from './GraphWalkOptions';
import { GraphWalkObservationKind } from './GraphWalkPhase';
import type { AsyncGraphWalkVisitor } from './GraphWalkVisitor';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { normalizeWalkOptions } from './lib/normalizeWalkOptions';

export class AsyncGraphWalkBuilder<VertexData, EdgeData, VertexId> {
  private options: GraphWalkResolvedOptions<VertexData, EdgeData, VertexId>;
  constructor(
    options: AsyncGraphWalkBuilderOptions<VertexData, EdgeData, VertexId>,
  ) {
    this.options = normalizeWalkOptions(options);
  }
  patchOptionsForFutureRunners(
    patch: AsyncGraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId>,
  ): this {
    this.options = normalizeWalkOptions(patch, this.options);
    return this;
  }
  registerVisitorForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
    visitor: AsyncGraphWalkVisitor<
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
  appendVisitorGroupForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
    group: VisitorGroupDefinition<
      AsyncGraphWalkVisitor<
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
  replaceVisitorDefinitionsForObservationKind<
    ObservationKind extends GraphWalkObservationKind,
  >(
    observationKind: ObservationKind,
    input: VisitorDefinitionsForPhase<
      AsyncGraphWalkVisitor<
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
    AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
  >[] {
    return copyVisitorRecords(this.recordsFor(observationKind));
  }
  private recordsFor<ObservationKind extends GraphWalkObservationKind>(
    observationKind: ObservationKind,
  ): VisitorRecord<
    AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
  >[] {
    if (!Object.values(GraphWalkObservationKind).includes(observationKind))
      throw new TypeError('Unknown walking observation kind');
    // ObservationKind-keyed normalized records preserve the registered callback event type.
    return this.options.visitorsByObservationKind[
      observationKind
    ] as VisitorRecord<
      AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
    >[];
  }
  createIndependentRunnerFromCurrentOptions(): AsyncGraphWalkRunner<
    VertexData,
    EdgeData,
    VertexId
  > {
    return new InternalAsyncGraphWalkRunner(
      normalizeWalkOptions({}, this.options),
    );
  }
}
