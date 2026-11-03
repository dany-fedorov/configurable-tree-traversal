import { createVertexHandleFacet } from '../src/core/observationFacets';
import { MutableValueReference } from '../src/core/CTTRef';
import {
  executeVisitors,
  sortVisitorRecords,
} from '../src/core/executeVisitors';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  TraversalVisitorCommandName as Command,
  type TraversalVisitorCommand,
  type TreePhaseVisitorRegistrationRecord,
} from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';

type Tree = VertexDataAndChildHintTypes<string, string>;
type Record = TreePhaseVisitorRegistrationRecord<'ORDER', Tree, Tree>;

test('yields for an external halt after the first callback batch', () => {
  const vertexHandle = new MutableValueReference(
    new Vertex<Tree>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
  const calls: string[] = [];
  let halted = false;
  let firstBatch = true;
  const execution = executeVisitors({
    vertexHandle,
    records: [
      {
        phaseRegistrationInsertionIndex: 0,
        descendingExecutionPriorityWithinGroup: 100,
        visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
        visitor: () => {
          calls.push('sequential');
        },
      },
    ],
    state: {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
    },
    getOptions: () => null as never,
    executeCommands: (commands) => {
      expect(commands).toEqual([]);
      halted = firstBatch;
      firstBatch = false;
      return {};
    },
    isSuspended: () => halted,
    isDeleted: () => false,
  });

  expect(execution.next()).toEqual({ done: false, value: undefined });
  expect(calls).toEqual(['sequential']);
  halted = false;
  expect(execution.next()).toEqual({ done: true, value: undefined });
  expect(calls).toEqual(['sequential']);
});

test('synchronously drives grouped callbacks while retaining halt metadata', () => {
  const vertexHandle = new MutableValueReference(
    new Vertex<Tree>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
  const calls: unknown[] = [];
  const commandBatches: TraversalVisitorCommand<Tree>[][] = [];
  let halted = false;
  const records: Record[] = [
    {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: (_vertex, options) => {
        calls.push(['sequential', options.currentVertexPhaseChainState]);
      },
    },
    {
      phaseRegistrationInsertionIndex: 1,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      visitor: (_vertex, options) => {
        calls.push(['concurrent', options.currentVertexPhaseChainState]);
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
            {
              commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
              commandArguments: { phaseChainState: undefined },
            },
          ],
        };
      },
    },
  ];
  const state = {
    phaseVisitorChainIndex: 7,
    visitorCallbackIndexInPhaseChain: 42,
    previousCommittedVisitVertexHandleForSamePhase: null,
  };
  const execution = executeVisitors({
    vertexHandle,
    records: records.slice().reverse(),
    state,
    getOptions: (registration, currentVertexPhaseChainState) => ({
      liveResolvedTreeView: null as never,
      preCommandDiscoveredTreeView: null,
      phaseVisitorChainIndex: state.phaseVisitorChainIndex,
      visitorCallbackIndexInPhaseChain: state.visitorCallbackIndexInPhaseChain,
      previousCommittedVisitVertexHandleForSamePhase:
        state.previousCommittedVisitVertexHandleForSamePhase,
      isTreeRoot: true,
      vertexHandle: createVertexHandleFacet(vertexHandle),
      currentVertexPhaseChainState,
      visitorRegistrationMetadata: registration,
      visitorPhase: 'ORDER',
    }),
    executeCommands: (commands) => {
      commandBatches.push(commands);
      if (
        commands.some(
          (command) =>
            command.commandName ===
            Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
        )
      ) {
        halted = true;
      }
      return commands.some(
        (command) =>
          command.commandName === Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
      )
        ? { currentVertexPhaseChainState: undefined }
        : {};
    },
    isSuspended: () => halted,
    isDeleted: () => false,
  });

  expect(execution.next()).toEqual({ done: false, value: undefined });
  expect(calls).toEqual([['concurrent', null]]);
  expect(commandBatches).toEqual([
    [
      { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
      {
        commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
        commandArguments: { phaseChainState: undefined },
      },
    ],
  ]);
  halted = false;
  expect(execution.next()).toEqual({ done: true, value: undefined });
  expect(calls).toEqual([
    ['concurrent', null],
    ['sequential', undefined],
  ]);
  expect(state).toEqual({
    phaseVisitorChainIndex: 8,
    visitorCallbackIndexInPhaseChain: 2,
    previousCommittedVisitVertexHandleForSamePhase: vertexHandle,
  });
});

test('validates all command commit modes before invoking a compatibility callback', () => {
  const vertexHandle = new MutableValueReference(
    new Vertex<Tree>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
  const calls: string[] = [];
  const records: Record[] = [
    {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => {
        calls.push('valid');
      },
    },
    {
      phaseRegistrationInsertionIndex: 1,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming:
        'ASYNC' as import('../src').VisitorCommandCommitTiming,
      visitor: () => {
        calls.push('invalid');
      },
    },
  ];
  const execution = executeVisitors({
    vertexHandle,
    records,
    state: {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
    },
    getOptions: () => null as never,
    executeCommands: () => ({}),
    isSuspended: () => false,
    isDeleted: () => false,
  });

  expect(() => execution.next()).toThrow(
    /unknown visitor command commit mode/i,
  );
  expect(calls).toEqual([]);
});

test('sortVisitorRecords returns priority and registration order copies', () => {
  const visitor = () => undefined;
  const late = {
    phaseRegistrationInsertionIndex: 2,
    descendingExecutionPriorityWithinGroup: 100,
    visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
    visitor,
  };
  const high = {
    phaseRegistrationInsertionIndex: 1,
    descendingExecutionPriorityWithinGroup: 200,
    visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
    visitor,
  };
  const early = {
    phaseRegistrationInsertionIndex: 0,
    descendingExecutionPriorityWithinGroup: 100,
    visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
    visitor,
  };

  const sorted = sortVisitorRecords<'ORDER', Tree, Tree>([late, high, early]);

  expect(
    sorted.map(
      ({
        descendingExecutionPriorityWithinGroup: priority,
        phaseRegistrationInsertionIndex,
      }) => [priority, phaseRegistrationInsertionIndex],
    ),
  ).toEqual([
    [200, 1],
    [100, 0],
    [100, 2],
  ]);
  expect(sorted[0]).not.toBe(high);
});
