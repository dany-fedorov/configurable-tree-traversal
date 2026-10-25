import assert from 'node:assert/strict';
import {
  defineDag,
  prepareDagDefinition,
  reviseDag,
  diffDagDefinitions,
} from '../src';

async function main() {
  const initial = prepareDagDefinition(
    defineDag({
      vertices: [
        {
          vertexId: 'build',
          data: 'build',
          slots: [],
          dependsOn: [],
          dependsOnComplete: [],
        },
        {
          vertexId: 'review',
          data: 'review v1',
          slots: [],
          dependsOn: ['build'],
          dependsOnComplete: [],
        },
      ],
      omittedIds: [],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'vertex', vertexId: 'build' },
          { kind: 'vertex', vertexId: 'review' },
        ],
      },
    }),
  );
  if (initial.kind !== 'valid') throw new Error('Invalid initial definition');
  const old = initial.dag.createSession();
  const build = old.advance();
  if (build.kind !== 'awaitingSettlement') throw new Error('Expected build');
  old.complete(build.frontier[0]!);
  const review = old.advance();
  if (review.kind !== 'awaitingSettlement') throw new Error('Expected review');
  const oldTicket = review.frontier[0]!;
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
    revised.dag.createSession(),
    await revised.dag.createAsyncSession(),
  ]) {
    assert.deepEqual(fresh.summary().completedWorkIds, []);
    assert.throws(() => fresh.complete(oldTicket), TypeError);
  }
  assert.equal(old.complete(oldTicket).kind, 'accepted');
  assert.equal(old.advance().kind, 'finished');
  // The host independently accepts build's unchanged artifact for the new revision.
  // It deliberately does not carry the old review artifact forward.
  const next = await revised.dag.createAsyncSession({
    completedWork: new Set(['build']),
  });
  const nextReview = await next.advance();
  if (nextReview.kind !== 'awaitingSettlement')
    throw new Error('Expected revised review');
  assert.deepEqual(
    nextReview.frontier.map((ticket) => ticket.vertexId),
    ['review'],
  );
  next.complete(nextReview.frontier[0]!);
  assert.equal((await next.advance()).kind, 'finished');
  console.log(
    'Validated DAG revisions: isolated tickets and host-selected facts passed',
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
