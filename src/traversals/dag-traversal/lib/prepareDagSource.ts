import { preparationIssue } from './preparationIssue';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { DagTraversalBuilder } from '../DagTraversal';
import type { DagTopologyDiscoveryInput } from '../prepareDag';
import { capturePreparedSource } from './capturePreparedSource';
import type {
  DagDefinition,
  DagTopologyValidationResult,
} from './DagDefinition';
import { dagRunnerCapabilities } from './dagRunnerCapabilities';
import { assertPreparedOptions, makePreparedDag } from './makePreparedDag';

/** Shared source preparation keeps caller-error and W/C validation semantics. */
export function prepareDagSource<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  input: DagTopologyDiscoveryInput<SourceVertexTypes, VertexId>,
  authoredDefinition?: DagDefinition<SourceVertexTypes['VertexData'], VertexId>,
): DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId> {
  assertPreparedOptions(input, [
    'dagDiscoverySource',
    'sourceRootIsHiddenEntryHolder',
    'rootWorkPrerequisitePolicy',
    'undeclaredWorkPrerequisitePolicy',
  ]);
  const captured = capturePreparedSource<SourceVertexTypes, VertexId>(
    input.dagDiscoverySource,
    false,
  );
  const runner = new DagTraversalBuilder<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >({
    ...input,
    // This capture path invokes only the synchronous source callbacks above.
    dagDiscoverySource: captured.adapter as DagDiscoverySource<
      SourceVertexTypes,
      SourceVertexTypes,
      VertexId
    >,
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.discoverValidateAndFreezeTopology();
  } catch (error) {
    const issue = preparationIssue<VertexId>(
      dagRunnerCapabilities.get(runner)!.container.store,
      error,
    );
    if (issue === undefined) throw error;
    return { kind: 'invalid', issues: [issue] };
  }
  return {
    kind: 'valid',
    validatedTopology: makePreparedDag(
      dagRunnerCapabilities.get(runner)!
        .container as unknown as ResolvedGraphsContainer<
        SourceVertexTypes,
        SourceVertexTypes,
        VertexId
      >,
      captured.candidates,
      input.rootWorkPrerequisitePolicy ?? 'honor',
      authoredDefinition,
    ),
  };
}
