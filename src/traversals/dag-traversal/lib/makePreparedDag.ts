import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { DagDefinition } from './DagDefinition';
import { captureDagDefinition, definitionSource } from './definitionSource';
import { DagTraversalBuilder } from '../DagTraversal';
import { AsyncDagTraversalBuilder } from '../AsyncDagTraversal';
import {
  bindDagExternalWorkSession,
  bindAsyncDagExternalWorkSession,
} from '../coordinateDag';
import type {
  ValidatedReusableDagTopology,
  ValidatedDagTopologyRunnerOptions,
  ValidatedDagTopologyAsyncRunnerOptions,
} from './PreparedDag';

export function assertPreparedOptions(
  options: object,
  allowed: readonly string[],
): void {
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== 'string' || !allowed.includes(key)) {
      throw new TypeError(
        'Unsupported option: prepared DAGs own source and topology',
      );
    }
  }
}

/** Snapshot accepted topology; replay uses fresh vertices and normalized ID hints. */
export function makePreparedDag<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  container: ResolvedGraphsContainer<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >,
  candidates: ReadonlySet<VertexId>,
  rootWorkPrerequisitePolicy: 'honor' | 'ignore',
  authoredDefinition?: DagDefinition<SourceVertexTypes['VertexData'], VertexId>,
): ValidatedReusableDagTopology<SourceVertexTypes['VertexData'], VertexId> {
  type Data = SourceVertexTypes['VertexData'];
  type Replay = VertexDataAndChildHintTypes<Data, VertexId>;
  // Definition preparation can retain authored entry mode and declaration order,
  // rather than recapturing the hidden holder used for omitted empty entries.
  const definition =
    authoredDefinition ?? captureDagDefinition(container, candidates);
  const liveVertexSummaries = Object.freeze(
    definition.vertexDeclarations.map((vertex) =>
      Object.freeze({
        vertexId: vertex.vertexId,
        data: vertex.data,
        liveStructuralChildVertexIds: Object.freeze(
          vertex.childDiscoverySlots.flatMap((slot) =>
            slot.kind === 'vertex' ? [slot.vertexId] : [],
          ),
        ),
        workWaitsForWorkOf: vertex.workWaitsForWorkOf,
        workWaitsForSubgraphCompletionOf:
          vertex.workWaitsForSubgraphCompletionOf,
      }),
    ),
  );
  const runnerFields = [
    'visitors',
    'acceptedCompletedWorkVertexIds',
    'workCompletionPolicy',
    'retainDiscoveredGraphBeforeVisitorCommands',
  ];
  const createIndependentRunnerFromValidatedTopology = (
    options: ValidatedDagTopologyRunnerOptions<Data, VertexId> = {},
  ) => {
    assertPreparedOptions(options, runnerFields);
    return new DagTraversalBuilder<Replay, Replay, VertexId>({
      ...options,
      ...definitionSource(definition),
      rootWorkPrerequisitePolicy,
      undeclaredWorkPrerequisitePolicy: 'none',
    })
      .createIndependentRunnerFromCurrentOptions()
      .discoverValidateAndFreezeTopology();
  };
  const createIndependentAsyncRunnerFromValidatedTopology = async (
    options: ValidatedDagTopologyAsyncRunnerOptions<Data, VertexId> = {},
  ) => {
    assertPreparedOptions(options, [
      ...runnerFields,
      'maxConcurrentCallbackInvocations',
    ]);
    return new AsyncDagTraversalBuilder<Replay, Replay, VertexId>({
      ...options,
      ...definitionSource(definition),
      rootWorkPrerequisitePolicy,
      undeclaredWorkPrerequisitePolicy: 'none',
    })
      .createIndependentRunnerFromCurrentOptions()
      .discoverValidateAndFreezeTopology();
  };
  return Object.freeze({
    liveVertexSummaries,
    definition,
    createIndependentRunnerFromValidatedTopology,
    createIndependentAsyncRunnerFromValidatedTopology,
    createExternalWorkSession: (options = {}) => {
      assertPreparedOptions(options, ['acceptedCompletedWorkVertexIds']);
      return bindDagExternalWorkSession(
        createIndependentRunnerFromValidatedTopology({
          ...options,
          workCompletionPolicy: 'requireExternalWorkSettlement',
        }),
      );
    },
    createAsyncExternalWorkSession: async (options = {}) => {
      assertPreparedOptions(options, [
        'acceptedCompletedWorkVertexIds',
        'maxConcurrentCallbackInvocations',
      ]);
      return bindAsyncDagExternalWorkSession(
        await createIndependentAsyncRunnerFromValidatedTopology({
          ...options,
          workCompletionPolicy: 'requireExternalWorkSettlement',
        }),
      );
    },
  });
}
