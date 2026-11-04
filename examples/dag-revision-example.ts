import {
  copyAndNormalizeDagDefinition,
  validateAndPrepareDagDefinition,
  applyDagDefinitionRevisionBatch,
  diffDagDefinitionDeclarationsShallowly,
} from '../src';
import assert from 'node:assert/strict';

async function main() {
  const initial = validateAndPrepareDagDefinition(
    copyAndNormalizeDagDefinition({
      vertexDeclarations: [
        {
          vertexId: 'build',
          data: 'build',
          childDiscoverySlots: [],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        },
        {
          vertexId: 'review',
          data: 'review v1',
          childDiscoverySlots: [],
          workWaitsForWorkOf: ['build'],
          workWaitsForSubgraphCompletionOf: [],
        },
      ],
      omittedVertexIds: [],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'vertex', vertexId: 'build' },
          { kind: 'vertex', vertexId: 'review' },
        ],
      },
    }),
  );
  if (initial.kind !== 'valid') throw new Error('Invalid initial definition');
  const old = initial.validatedTopology.createExternalWorkSession();
  const build = old.runUntilWorkBoundary();
  if (build.kind !== 'awaitingSettlement') throw new Error('Expected build');
  old.acceptCompletedWork(build.workSettlementTickets[0]!);
  const review = old.runUntilWorkBoundary();
  if (review.kind !== 'awaitingSettlement') throw new Error('Expected review');
  const oldTicket = review.workSettlementTickets[0]!;
  const revised = applyDagDefinitionRevisionBatch(initial.validatedTopology, [
    {
      kind: 'replaceVertexDeclaration',
      vertexDeclaration: {
        ...initial.validatedTopology.definition.vertexDeclarations[1]!,
        data: 'review v2',
      },
    },
  ]);
  if (revised.kind !== 'valid') throw new Error('Invalid revision');
  assert.deepEqual(
    revised.declarationDiff,
    diffDagDefinitionDeclarationsShallowly(
      initial.validatedTopology.definition,
      revised.validatedTopology.definition,
    ),
  );
  assert.deepEqual(revised.declarationDiff.changedVertexDeclarations, [
    { vertexId: 'review', changedDeclarationFields: ['data'] },
  ]);
  for (const fresh of [
    revised.validatedTopology.createExternalWorkSession(),
    await revised.validatedTopology.createAsyncExternalWorkSession(),
  ]) {
    assert.deepEqual(
      fresh.captureProgressSnapshot().workCompletionCommittedVertexIds,
      [],
    );
    assert.throws(() => fresh.acceptCompletedWork(oldTicket), TypeError);
  }
  assert.equal(old.acceptCompletedWork(oldTicket).kind, 'accepted');
  assert.equal(old.runUntilWorkBoundary().kind, 'finished');
  // The host independently accepts build's unchanged artifact for the new revision.
  // It deliberately does not carry the old review artifact forward.
  const acceptedForRevision = ['build'];
  const knownIds = new Set([
    ...revised.validatedTopology.liveVertexSummaries.map(
      (vertex) => vertex.vertexId,
    ),
    ...revised.validatedTopology.definition.omittedVertexIds,
  ]);
  const next = await revised.validatedTopology.createAsyncExternalWorkSession({
    acceptedCompletedWorkVertexIds: new Set(
      acceptedForRevision.filter((id) => knownIds.has(id)),
    ),
  });
  const nextReview = await next.runUntilWorkBoundary();
  if (nextReview.kind !== 'awaitingSettlement')
    throw new Error('Expected revised review');
  assert.deepEqual(
    nextReview.workSettlementTickets.map((ticket) => ticket.vertexId),
    ['review'],
  );
  next.acceptCompletedWork(nextReview.workSettlementTickets[0]!);
  assert.equal((await next.runUntilWorkBoundary()).kind, 'finished');
  console.log(
    'Validated DAG revisions: isolated tickets and host-selected facts passed',
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
