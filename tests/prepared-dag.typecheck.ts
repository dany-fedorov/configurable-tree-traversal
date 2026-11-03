import {
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
  type ValidatedReusableDagTopology,
  type DagTopologyValidationResult,
} from '../src';

type ID = 'research' | 'review';
type Task = { id: ID; title: string; requires: ID[] };
const source = materializeMultiEntryDagInputFromRecordCatalog<Task, ID>(
  [{ id: 'research', title: 'Read', requires: [] }],
  {
    selectVertexId: (item) => item.id,
    selectWorkPrerequisiteVertexIds: (item) => item.requires,
  },
);
const prepared = discoverValidateAndCaptureDag(source);
if (prepared.kind === 'valid') {
  const dag: ValidatedReusableDagTopology<Task, ID> =
    prepared.validatedTopology;
  const id: ID = dag.liveVertexSummaries[0]!.vertexId;
  const data: Task = dag.liveVertexSummaries[0]!.data;
  const runner = dag.createIndependentRunnerFromValidatedTopology({
    acceptedCompletedWorkVertexIds: new Set<ID>(['research']),
  });
  for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    const eventId: ID = event.vertexId;
    const hints: readonly ID[] = event.vertex.getDetachedChildDiscoveryHints();
    void [eventId, hints];
  }
  // @ts-expect-error Prepared topology arrays are readonly.
  dag.liveVertexSummaries[0]!.liveStructuralChildVertexIds.push('review');
  dag.createExternalWorkSession({
    // @ts-expect-error Sessions preserve the identity domain.
    acceptedCompletedWorkVertexIds: new Set(['wrong']),
  });
  dag.createIndependentRunnerFromValidatedTopology({
    // @ts-expect-error Prepared runners own their source.
    dagDiscoverySource: source.dagDiscoverySource,
  });
  const injected = { traversalRunnerInternalObjects: {} };
  // @ts-expect-error Pretyped continuation options cannot bypass source ownership.
  dag.createIndependentRunnerFromValidatedTopology(injected);
  // @ts-expect-error Explicit undefined source replacement is forbidden.
  dag.createIndependentRunnerFromValidatedTopology({
    treeDiscoverySource: undefined,
  });
  void [id, data];
} else {
  const definitionResult: DagTopologyValidationResult<Task, ID> = prepared;
  const preparationResult: DagTopologyValidationResult<Task, ID> =
    definitionResult;
  for (const issue of prepared.issues) {
    if (issue.kind === 'milestoneDependencyStall') {
      const missing: readonly ID[] =
        issue.diagnostics.unresolvedPrerequisiteVertexIds;
      void missing;
    }
  }
  // @ts-expect-error Invalid preparation exposes issues with no diagnostics alias.
  prepared.diagnostics;
  // @ts-expect-error An invalid result has no executable definition.
  prepared.dag.createIndependentRunnerFromCurrentOptions();
  void preparationResult;
}
async function checkAsync() {
  const result = await discoverValidateAndCaptureDagAsync(source);
  if (result.kind !== 'valid') return;
  const runner =
    await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology();
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    const id: ID = event.vertexId;
    void id;
  }
  const session = await result.validatedTopology.createAsyncExternalWorkSession(
    { maxConcurrentCallbackInvocations: 2 },
  );
  const boundary = await session.runUntilWorkBoundary();
  if (boundary.kind === 'awaitingSettlement') {
    const id: ID = boundary.workSettlementTickets[0]!.vertexId;
    session.acceptCompletedWork(boundary.workSettlementTickets[0]!);
    void id;
  }
}
discoverValidateAndCaptureDag({
  ...source,
  // @ts-expect-error Preparation cannot accept work seeds.
  acceptedCompletedWorkVertexIds: new Set<ID>(),
});
// @ts-expect-error Preparation cannot run visitors.
discoverValidateAndCaptureDagAsync({ ...source, visitors: {} });
void checkAsync;
