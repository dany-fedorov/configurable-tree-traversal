import { MutableValueReference } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { VisitorChain } from '../src/core/visitors/VisitorChain';

type Tree = VertexDataAndChildHintTypes<string, string>;

const ref = () =>
  new MutableValueReference(
    new Vertex<Tree>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
const metadata = () => ({
  phaseVisitorChainIndex: 4,
  visitorCallbackIndexInPhaseChain: 99,
  previousCommittedVisitVertexHandleForSamePhase: null,
  currentVertexPhaseChainState: 'ignored at admission',
});
const record = (
  visitorCommandCommitTiming: import('../src').VisitorCommandCommitTiming,
) => ({
  phaseRegistrationInsertionIndex: 0,
  descendingExecutionPriorityWithinGroup: 100,
  visitorCommandCommitTiming,
});

test('starts directly with the first callback and committed state is initially null', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record('afterEachVisitorCallback')],
    metadata: metadata(),
    family: 'tree',
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: { currentVertexPhaseChainState: null },
  });
});

test('waits for a sequential command batch and resumes after its halt', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [
      record('afterEachVisitorCallback'),
      record('afterEachVisitorCallback'),
    ],
    metadata: metadata(),
    family: 'tree',
  });

  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: {
      phaseVisitorChainIndex: 4,
      visitorCallbackIndexInPhaseChain: 0,
    },
  });
  expect(chain.poll()).toEqual({ kind: 'WAIT' });
  chain.submit({
    ok: true,
    value: {
      commands: [
        { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
      ],
    },
  });
  expect(chain.poll()).toEqual({
    kind: 'COMMANDS',
    commands: [
      { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
    ],
  });
  expect(chain.poll()).toEqual({ kind: 'WAIT' });
  chain.commitBatch({ halt: true, deleted: false });
  expect(chain.poll()).toEqual({ kind: 'PAUSED' });
  chain.resume();
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 1,
    metadata: { visitorCallbackIndexInPhaseChain: 1 },
  });
});

test('batches concurrent records in input order and passes null chain state', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [
      record('afterContiguousVisitorBatch'),
      record('afterContiguousVisitorBatch'),
      record('afterEachVisitorCallback'),
    ],
    metadata: metadata(),
    family: 'dag',
  });

  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: { currentVertexPhaseChainState: null },
  });
  chain.submit({
    ok: true,
    value: { commands: [{ commandName: Command.NO_OPERATION }] },
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 1,
    metadata: {
      visitorCallbackIndexInPhaseChain: 1,
      currentVertexPhaseChainState: null,
    },
  });
  chain.submit({
    ok: true,
    value: {
      commands: [
        {
          commandName:
            Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
        },
      ],
    },
  });
  expect(chain.poll()).toEqual({
    kind: 'COMMANDS',
    commands: [
      { commandName: Command.NO_OPERATION },
      {
        commandName:
          Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
      },
    ],
  });
  chain.commitBatch({
    halt: false,
    deleted: false,
    currentVertexPhaseChainState: undefined,
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 2,
    metadata: {
      visitorCallbackIndexInPhaseChain: 2,
      currentVertexPhaseChainState: undefined,
    },
  });
});

test('does not pause for a halt that was not requested by its command batch', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [
      record('afterEachVisitorCallback'),
      record('afterEachVisitorCallback'),
    ],
    metadata: metadata(),
    family: 'dag',
  });

  chain.poll();
  chain.submit({ ok: true, value: undefined });
  expect(chain.poll()).toEqual({ kind: 'COMMANDS', commands: [] });
  chain.commitBatch({ halt: true, deleted: false });

  expect(chain.poll()).toMatchObject({ kind: 'VISIT', recordIndex: 1 });
});

test('stops before another callback after deletion or invalidation', () => {
  const deleted = new VisitorChain<Tree>({
    ref: ref(),
    records: [
      record('afterEachVisitorCallback'),
      record('afterEachVisitorCallback'),
    ],
    metadata: metadata(),
    family: 'tree',
  });
  deleted.poll();
  deleted.submit({ ok: true, value: undefined });
  deleted.poll();
  deleted.commitBatch({ halt: false, deleted: true });
  expect(deleted.poll()).toEqual({ kind: 'DONE' });
  expect(deleted.poll()).toEqual({ kind: 'DONE' });

  const invalid = new VisitorChain<Tree>({
    ref: ref(),
    records: [record('afterEachVisitorCallback')],
    metadata: metadata(),
    family: 'dag',
  });
  invalid.invalidate();
  expect(invalid.poll()).toEqual({ kind: 'DONE' });
});

test('rejects submit and commit calls outside their transition boundaries', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record('afterEachVisitorCallback')],
    metadata: metadata(),
    family: 'tree',
  });

  expect(() => chain.submit({ ok: true, value: undefined })).toThrow(
    /not waiting for an outcome/i,
  );
  expect(() => chain.commitBatch({ halt: false, deleted: false })).toThrow(
    /no command batch to commit/i,
  );

  chain.poll();
  chain.submit({ ok: true, value: undefined });
  expect(() => chain.commitBatch({ halt: false, deleted: false })).toThrow(
    /no command batch to commit/i,
  );

  chain.invalidate();
  expect(() => chain.submit({ ok: true, value: undefined })).toThrow(
    /not waiting for an outcome/i,
  );
  expect(() => chain.commitBatch({ halt: false, deleted: false })).toThrow(
    /no command batch to commit/i,
  );
});

test('rejects every unknown command commit mode at admission and rethrows callback errors', () => {
  expect(
    () =>
      new VisitorChain<Tree>({
        ref: ref(),
        records: [
          record('afterEachVisitorCallback'),
          record('ASYNC' as import('../src').VisitorCommandCommitTiming),
        ],
        metadata: metadata(),
        family: 'tree',
      }),
  ).toThrow(/unknown visitor command commit mode/i);

  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record('afterEachVisitorCallback')],
    metadata: metadata(),
    family: 'tree',
  });
  const failure = { reason: 'visitor failed' };
  chain.poll();
  let caught: unknown;
  try {
    chain.submit({ ok: false, error: failure });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(failure);
});

test('tree visitor chains reject canonical deferral before exposing a command batch', () => {
  const chain = new VisitorChain<Tree>({
    ref: new MutableValueReference(
      new Vertex<Tree>({ $vertexData: 'root', $childDiscoveryHints: [] }),
    ),
    family: 'tree',
    records: [
      {
        phaseRegistrationInsertionIndex: 0,
        descendingExecutionPriorityWithinGroup: 1,
        visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      },
    ],
    metadata: {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
      currentVertexPhaseChainState: null,
    },
  });
  expect(chain.poll().kind).toBe('VISIT');
  expect(() =>
    chain.submit({
      ok: true,
      value: {
        commands: [
          {
            commandName:
              Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
          },
        ],
      },
    }),
  ).toThrow(/ON_WORK_READY/);
});
