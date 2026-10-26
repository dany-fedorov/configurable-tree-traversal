import { CTTRef } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { VisitorChain } from '../src/core/visitors/VisitorChain';

type Tree = VertexTypes<string, string>;

const ref = () => new CTTRef(new Vertex<Tree>({ $d: 'root', $c: [] }));
const metadata = () => ({
  phaseVisitIndex: 4,
  visitorIndex: 99,
  previousPhaseVertexRef: null,
  visitorChainState: 'ignored at admission',
});
const record = (resolutionStyle: Style) => ({
  addedIndex: 0,
  priority: 100,
  resolutionStyle,
});

test('starts directly with the first callback and committed state is initially null', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record(Style.SEQUENTIAL)],
    metadata: metadata(),
    family: 'tree',
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: { visitorChainState: null },
  });
});

test('waits for a sequential command batch and resumes after its halt', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record(Style.SEQUENTIAL), record(Style.SEQUENTIAL)],
    metadata: metadata(),
    family: 'tree',
  });

  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: { phaseVisitIndex: 4, visitorIndex: 0 },
  });
  expect(chain.poll()).toEqual({ kind: 'WAIT' });
  chain.submit({
    ok: true,
    value: { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] },
  });
  expect(chain.poll()).toEqual({
    kind: 'COMMANDS',
    commands: [{ commandName: Command.PAUSE_TRAVERSAL }],
  });
  expect(chain.poll()).toEqual({ kind: 'WAIT' });
  chain.commitBatch({ halt: true, deleted: false });
  expect(chain.poll()).toEqual({ kind: 'PAUSED' });
  chain.resume();
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 1,
    metadata: { visitorIndex: 1 },
  });
});

test('batches concurrent records in input order and passes null chain state', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [
      record(Style.CONCURRENT),
      record(Style.CONCURRENT),
      record(Style.SEQUENTIAL),
    ],
    metadata: metadata(),
    family: 'dag',
  });

  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: { visitorChainState: null },
  });
  chain.submit({
    ok: true,
    value: { commands: [{ commandName: Command.NOOP }] },
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 1,
    metadata: {
      visitorIndex: 1,
      visitorChainState: null,
    },
  });
  chain.submit({
    ok: true,
    value: { commands: [{ commandName: Command.DELETE_VERTEX }] },
  });
  expect(chain.poll()).toEqual({
    kind: 'COMMANDS',
    commands: [
      { commandName: Command.NOOP },
      { commandName: Command.DELETE_VERTEX },
    ],
  });
  chain.commitBatch({
    halt: false,
    deleted: false,
    visitorChainState: undefined,
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 2,
    metadata: {
      visitorIndex: 2,
      visitorChainState: undefined,
    },
  });
});

test('does not pause for a halt that was not requested by its command batch', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record(Style.SEQUENTIAL), record(Style.SEQUENTIAL)],
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
    records: [record(Style.SEQUENTIAL), record(Style.SEQUENTIAL)],
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
    records: [record(Style.SEQUENTIAL)],
    metadata: metadata(),
    family: 'dag',
  });
  invalid.invalidate();
  expect(invalid.poll()).toEqual({ kind: 'DONE' });
});

test('rejects submit and commit calls outside their transition boundaries', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record(Style.SEQUENTIAL)],
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

test('rejects every unknown style at admission and rethrows callback errors', () => {
  expect(
    () =>
      new VisitorChain<Tree>({
        ref: ref(),
        records: [record(Style.SEQUENTIAL), record('ASYNC' as Style)],
        metadata: metadata(),
        family: 'tree',
      }),
  ).toThrow(/unknown visitor resolution style/i);

  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [record(Style.SEQUENTIAL)],
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
    ref: new CTTRef(new Vertex<Tree>({ $d: 'root', $c: [] })),
    family: 'tree',
    records: [
      { addedIndex: 0, priority: 1, commandCommitMode: 'afterEachVisitor' },
    ],
    metadata: {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
      visitorChainState: null,
    },
  });
  expect(chain.poll().kind).toBe('VISIT');
  expect(() =>
    chain.submit({
      ok: true,
      value: { commands: [{ commandName: Command.DEFER_READY }] },
    }),
  ).toThrow(/ON_WORK_READY/);
});
