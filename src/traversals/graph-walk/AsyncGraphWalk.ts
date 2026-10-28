import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import type {
  NoInferPhase,
  TraversalVisitorFunctionOptions,
  VisitorGroupDefinition,
  VisitorPhaseInput,
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
  AsyncGraphWalkOptions,
  AsyncGraphWalkOptionsPatch,
} from './GraphWalkOptions';
import { GraphWalkPhase } from './GraphWalkPhase';
import type { AsyncGraphWalkVisitor } from './GraphWalkVisitor';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { normalizeWalkOptions } from './lib/normalizeWalkOptions';

export class AsyncGraphWalk<Data, Edge, ID> {
  private options: GraphWalkResolvedOptions<Data, Edge, ID>;
  constructor(options: AsyncGraphWalkOptions<Data, Edge, ID>) {
    this.options = normalizeWalkOptions(options);
  }
  configure(patch: AsyncGraphWalkOptionsPatch<Data, Edge, ID>): this {
    this.options = normalizeWalkOptions(patch, this.options);
    return this;
  }
  addVisitorFor<Phase extends GraphWalkPhase>(
    phase: Phase,
    visitor: AsyncGraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    assertOwnKeys(options, ['priority', 'commandCommitMode']);
    const records = appendVisitorDefinition(this.recordsFor(phase), {
      visitor,
      ...definedOptions(options),
    });
    this.options = {
      ...this.options,
      visitors: { ...this.options.visitors, [phase]: records },
    };
    return this;
  }
  addVisitorGroupFor<Phase extends GraphWalkPhase>(
    phase: Phase,
    group: VisitorGroupDefinition<
      AsyncGraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>
    >,
  ): this {
    const records = appendVisitorGroup(this.recordsFor(phase), group);
    this.options = {
      ...this.options,
      visitors: { ...this.options.visitors, [phase]: records },
    };
    return this;
  }
  setVisitorsFor<Phase extends GraphWalkPhase>(
    phase: Phase,
    input: VisitorPhaseInput<
      AsyncGraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>
    >,
  ): this {
    this.recordsFor(phase);
    const records = normalizeVisitorDefinitions(input);
    this.options = {
      ...this.options,
      visitors: { ...this.options.visitors, [phase]: records },
    };
    return this;
  }
  listVisitorsFor<Phase extends GraphWalkPhase>(
    phase: Phase,
  ): VisitorRecord<AsyncGraphWalkVisitor<Data, Edge, Phase, ID>>[] {
    return copyVisitorRecords(this.recordsFor(phase));
  }
  private recordsFor<Phase extends GraphWalkPhase>(
    phase: Phase,
  ): VisitorRecord<AsyncGraphWalkVisitor<Data, Edge, Phase, ID>>[] {
    if (!Object.values(GraphWalkPhase).includes(phase))
      throw new TypeError('Unknown walking visitor phase');
    // Phase-keyed normalized records preserve the registered callback event type.
    return this.options.visitors[phase] as VisitorRecord<
      AsyncGraphWalkVisitor<Data, Edge, Phase, ID>
    >[];
  }
  createRunner(): AsyncGraphWalkRunner<Data, Edge, ID> {
    return new InternalAsyncGraphWalkRunner(
      normalizeWalkOptions({}, this.options),
    );
  }
}
