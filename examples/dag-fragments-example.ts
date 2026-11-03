import {
  copyAndNormalizeDagDefinition,
  validateAndCreateDagFragment,
  mapDagFragmentIds,
  composeAndValidateDagFragments,
} from '../src';
import assert from 'node:assert/strict';

async function main() {
  type LocalID = 'build' | 'review';
  const fragment = validateAndCreateDagFragment(
    copyAndNormalizeDagDefinition<{ role: string }, LocalID>({
      vertexDeclarations: [
        {
          vertexId: 'build',
          data: { role: 'builder' },
          childDiscoverySlots: [],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        },
        {
          vertexId: 'review',
          data: { role: 'reviewer' },
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
    { start: 'build', finish: 'review' },
  );
  // The host owns stable identity and task-specific policy. CTT invents no ID scheme.
  const first = mapDagFragmentIds(fragment, {
    mapId: (local) => ({ project: 'first', local }),
  });
  const second = mapDagFragmentIds(fragment, {
    mapId: (local) => ({ project: 'second', local }),
  });
  const result = composeAndValidateDagFragments([first, second], {
    additionalWorkPrerequisites: [
      {
        dependentWorkVertexId: second.vertexIdsByPortName.start,
        prerequisite: {
          vertexId: first.vertexIdsByPortName.finish,
          milestone: 'subgraphCompletion',
        },
      },
    ],
  });
  assert.equal(result.kind, 'valid');
  if (result.kind !== 'valid') throw new Error('Invalid composition');
  for (const session of [
    result.validatedTopology.createExternalWorkSession(),
    await result.validatedTopology.createAsyncExternalWorkSession(),
  ]) {
    const observed: string[] = [];
    for (;;) {
      const advance = await session.runUntilWorkBoundary();
      if (advance.kind === 'finished') break;
      assert.equal(advance.kind, 'awaitingSettlement');
      if (advance.kind !== 'awaitingSettlement')
        throw new Error('Unexpected pause');
      for (const ticket of advance.workSettlementTickets) {
        observed.push(`${ticket.vertexId.project}/${ticket.vertexId.local}`);
        assert.equal(session.acceptCompletedWork(ticket).kind, 'accepted');
      }
    }
    assert.deepEqual(observed, [
      'first/build',
      'first/review',
      'second/build',
      'second/review',
    ]);
  }
  console.log('Typed DAG fragments: independent sync/async sessions passed');
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
