import assert from 'node:assert/strict';
import {
  defineDag,
  defineDagFragment,
  instantiateDagFragment,
  composeDag,
} from '../src';

async function main() {
  type LocalID = 'build' | 'review';
  const fragment = defineDagFragment(
    defineDag<{ role: string }, LocalID>({
      vertices: [
        {
          vertexId: 'build',
          data: { role: 'builder' },
          slots: [],
          dependsOn: [],
          dependsOnComplete: [],
        },
        {
          vertexId: 'review',
          data: { role: 'reviewer' },
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
    { start: 'build', finish: 'review' },
  );
  // The host owns stable identity and task-specific policy. CTT invents no ID scheme.
  const first = instantiateDagFragment(fragment, {
    mapId: (local) => ({ project: 'first', local }),
  });
  const second = instantiateDagFragment(fragment, {
    mapId: (local) => ({ project: 'second', local }),
  });
  const result = composeDag([first, second], {
    dependencies: [
      {
        dependent: second.ports.start,
        prerequisite: { vertexId: first.ports.finish, milestone: 'completion' },
      },
    ],
  });
  assert.equal(result.kind, 'valid');
  if (result.kind !== 'valid') throw new Error('Invalid composition');
  for (const session of [
    result.dag.createWorkSession(),
    await result.dag.createAsyncWorkSession(),
  ]) {
    const observed: string[] = [];
    for (;;) {
      const advance = await session.advance();
      if (advance.kind === 'finished') break;
      assert.equal(advance.kind, 'awaitingSettlement');
      if (advance.kind !== 'awaitingSettlement')
        throw new Error('Unexpected pause');
      for (const ticket of advance.frontier) {
        observed.push(`${ticket.vertexId.project}/${ticket.vertexId.local}`);
        assert.equal(session.complete(ticket).kind, 'accepted');
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
