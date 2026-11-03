import { preparationIssue } from './lib/preparationIssue';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
} from '@core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from './AsyncDagTraversal';
import { capturePreparedSource } from './lib/capturePreparedSource';
import type { DagTopologyValidationResult } from './lib/DagDefinition';
import { dagRunnerCapabilities } from './lib/dagRunnerCapabilities';
import { assertPreparedOptions, makePreparedDag } from './lib/makePreparedDag';
import { prepareDagSource } from './lib/prepareDagSource';

export type DagTopologyDiscoveryOptions = {
  sourceRootIsHiddenEntryHolder?: boolean;
  rootWorkPrerequisitePolicy?: 'honor' | 'ignore';
  undeclaredWorkPrerequisitePolicy?: 'none' | 'waitForDiscoveringParentWork';
  treeDiscoverySource?: never;
  visitors?: never;
  acceptedCompletedWorkVertexIds?: never;
  traversalRunnerInternalObjects?: never;
  workCompletionPolicy?: never;
  discoveryTiming?: never;
  transformChildHintsBeforeResolution?: never;
  retainDiscoveredGraphBeforeVisitorCommands?: never;
};
export type DagTopologyDiscoveryInput<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = DagTopologyDiscoveryOptions & {
  dagDiscoverySource: DagDiscoverySource<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >;
};
export type AsyncDagTopologyDiscoveryInput<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = DagTopologyDiscoveryOptions & {
  dagDiscoverySource: AsyncDagDiscoverySource<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >;
  maxConcurrentCallbackInvocations?: number;
};

const preparationFields = [
  'dagDiscoverySource',
  'sourceRootIsHiddenEntryHolder',
  'rootWorkPrerequisitePolicy',
  'undeclaredWorkPrerequisitePolicy',
];

/** Discover and validate without visitors; caller source errors retain exact identity. */
export function discoverValidateAndCaptureDag<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  input: DagTopologyDiscoveryInput<SourceVertexTypes, VertexId>,
): DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId> {
  return prepareDagSource(input);
}

/** Async discovery produces the same reusable in-memory definition. */
export function discoverValidateAndCaptureDagAsync<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  input: DagTopologyDiscoveryInput<SourceVertexTypes, VertexId> & {
    maxConcurrentCallbackInvocations?: number;
  },
): Promise<
  DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId>
>;
export function discoverValidateAndCaptureDagAsync<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  input: AsyncDagTopologyDiscoveryInput<SourceVertexTypes, VertexId>,
): Promise<
  DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId>
>;
export async function discoverValidateAndCaptureDagAsync<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  input: AsyncDagTopologyDiscoveryInput<SourceVertexTypes, VertexId>,
): Promise<
  DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId>
> {
  assertPreparedOptions(input, [
    ...preparationFields,
    'maxConcurrentCallbackInvocations',
  ]);
  const captured = capturePreparedSource<SourceVertexTypes, VertexId>(
    input.dagDiscoverySource,
    true,
  );
  const runner = new AsyncDagTraversalBuilder<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >({
    ...input,
    dagDiscoverySource: captured.adapter,
  }).createIndependentRunnerFromCurrentOptions();
  try {
    await runner.discoverValidateAndFreezeTopology();
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
    ),
  };
}
