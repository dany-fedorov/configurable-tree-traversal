import {
  defineDag,
  prepareDagDefinition,
  reviseDag,
  diffDagDefinitions,
} from '../src';
import assert from 'node:assert/strict';

async function main() {
  const initial = prepareDagDefinition(
    defineDag({
      vertices: [
        {
          vertexId: 'build',
          data: 'build',
          slots: [],
          dependsOnWork: [],
          dependsOnSubgraphCompletion: [],
        },
        {
          vertexId: 'review',
          data: 'review v1',
          slots: [],
          dependsOnWork: ['build'],
          dependsOnSubgraphCompletion: [],
        },
      ],
      omittedIds: [],
      entry: {
        kind: 'roots',
        slots: [
          { kind: 'vertex', vertexId: 'build' },
          { kind: 'vertex', vertexId: 'review' },
        ],
      },
    }),
  );
  if (initial.kind !== 'valid') throw new Error('Invalid initial definition');
  const old = initial.dag.createWorkSession();
  const build = old.advance();
  if (build.kind !== 'awaitingSettlement') throw new Error('Expected build');
  old.completeWork(build.workTickets[0]!);
  const review = old.advance();
  if (review.kind !== 'awaitingSettlement') throw new Error('Expected review');
  const oldTicket = review.workTickets[0]!;
  const revised = reviseDag(initial.dag, [
    {
      kind: 'replaceVertex',
      vertex: { ...initial.dag.definition.vertices[1]!, data: 'review v2' },
    },
  ]);
  if (revised.kind !== 'valid') throw new Error('Invalid revision');
  assert.deepEqual(
    revised.changes,
    diffDagDefinitions(initial.dag.definition, revised.dag.definition),
  );
  assert.deepEqual(revised.changes.changedVertices, [
    { vertexId: 'review', aspects: ['data'] },
  ]);
  for (const fresh of [
    revised.dag.createWorkSession(),
    await revised.dag.createAsyncWorkSession(),
  ]) {
    assert.deepEqual(fresh.summary().completedWorkIds, []);
    assert.throws(() => fresh.completeWork(oldTicket), TypeError);
  }
  assert.equal(old.completeWork(oldTicket).kind, 'accepted');
  assert.equal(old.advance().kind, 'finished');
  // The host independently accepts build's unchanged artifact for the new revision.
  // It deliberately does not carry the old review artifact forward.
  const acceptedForRevision = ['build'];
  const knownIds = new Set([
    ...revised.dag.liveVertexSummaries.map((vertex) => vertex.vertexId),
    ...revised.dag.definition.omittedIds,
  ]);
  const next = await revised.dag.createAsyncWorkSession({
    completedWork: new Set(
      acceptedForRevision.filter((id) => knownIds.has(id)),
    ),
  });
  const nextReview = await next.advance();
  if (nextReview.kind !== 'awaitingSettlement')
    throw new Error('Expected revised review');
  assert.deepEqual(
    nextReview.workTickets.map((ticket) => ticket.vertexId),
    ['review'],
  );
  next.completeWork(nextReview.workTickets[0]!);
  assert.equal((await next.advance()).kind, 'finished');
  console.log(
    'Validated DAG revisions: isolated tickets and host-selected facts passed',
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
