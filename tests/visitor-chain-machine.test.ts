import { CTTRef } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { VisitorChain } from '../src/core/visitors/VisitorChain';

type Tree = TreeTypeParameters<string, string>;

const ref = () => new CTTRef(new Vertex<Tree>({ $d: 'root', $c: [] }));
const metadata = () => ({
  vertexVisitIndex: 4,
  curVertexVisitorVisitIndex: 99,
  previousVisitedVertexRef: null,
  vertexVisitorsChainState: 'ignored at admission',
});
const record = (resolutionStyle: Style) => ({
  addedIndex: 0,
  priority: 100,
  resolutionStyle,
  visitor: () => undefined,
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
    metadata: { vertexVisitIndex: 4, curVertexVisitorVisitIndex: 0 },
  });
  expect(chain.poll()).toEqual({ kind: 'WAIT' });
  chain.submit({
    ok: true,
    value: { commands: [{ commandName: Command.HALT_TRAVERSAL }] },
  });
  expect(chain.poll()).toEqual({
    kind: 'COMMANDS',
    commands: [{ commandName: Command.HALT_TRAVERSAL }],
  });
  expect(chain.poll()).toEqual({ kind: 'WAIT' });
  chain.commitBatch({ halt: true, deleted: false });
  expect(chain.poll()).toEqual({ kind: 'PAUSED' });
  chain.resume();
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 1,
    metadata: { curVertexVisitorVisitIndex: 1 },
  });
});

test('batches concurrent records in input order and passes null chain state', () => {
  const chain = new VisitorChain<Tree>({
    ref: ref(),
    records: [
      record(Style.SEQUENTIAL),
      record(Style.CONCURRENT),
      record(Style.CONCURRENT),
    ],
    metadata: metadata(),
    family: 'dag',
  });

  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 1,
    metadata: { vertexVisitorsChainState: null },
  });
  chain.submit({
    ok: true,
    value: { commands: [{ commandName: Command.NOOP }] },
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 2,
    metadata: {
      curVertexVisitorVisitIndex: 1,
      vertexVisitorsChainState: null,
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
    vertexVisitorsChainState: undefined,
  });
  expect(chain.poll()).toMatchObject({
    kind: 'VISIT',
    recordIndex: 0,
    metadata: {
      curVertexVisitorVisitIndex: 2,
      vertexVisitorsChainState: undefined,
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

  const invalid = new VisitorChain<Tree>({
    ref: ref(),
    records: [record(Style.SEQUENTIAL)],
    metadata: metadata(),
    family: 'dag',
  });
  invalid.invalidate();
  expect(invalid.poll()).toEqual({ kind: 'DONE' });
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
