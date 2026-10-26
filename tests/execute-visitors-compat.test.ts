import { CTTRef } from '../src/core/CTTRef';
import {
  executeVisitors,
  sortVisitorRecords,
} from '../src/core/executeVisitors';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
  type TraversalVisitorCommand,
  type TraversalVisitorRecord,
} from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';

type Tree = VertexTypes<string, string>;
type Record = TraversalVisitorRecord<'ORDER', Tree, Tree>;

test('yields for an external halt after the first callback batch', () => {
  const vertexRef = new CTTRef(new Vertex<Tree>({ $d: 'root', $c: [] }));
  const calls: string[] = [];
  let halted = false;
  let firstBatch = true;
  const execution = executeVisitors({
    vertexRef,
    records: [
      {
        addedIndex: 0,
        priority: 100,
        resolutionStyle: Style.SEQUENTIAL,
        visitor: () => {
          calls.push('sequential');
        },
      },
    ],
    state: {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
    },
    getOptions: () => null as never,
    executeCommands: (commands) => {
      expect(commands).toEqual([]);
      halted = firstBatch;
      firstBatch = false;
      return {};
    },
    isHalted: () => halted,
    isDeleted: () => false,
  });

  expect(execution.next()).toEqual({ done: false, value: undefined });
  expect(calls).toEqual(['sequential']);
  halted = false;
  expect(execution.next()).toEqual({ done: true, value: undefined });
  expect(calls).toEqual(['sequential']);
});

test('synchronously drives grouped callbacks while retaining halt metadata', () => {
  const vertexRef = new CTTRef(new Vertex<Tree>({ $d: 'root', $c: [] }));
  const calls: unknown[] = [];
  const commandBatches: TraversalVisitorCommand<Tree>[][] = [];
  let halted = false;
  const records: Record[] = [
    {
      addedIndex: 0,
      priority: 100,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: (_vertex, options) => {
        calls.push(['sequential', options.visitorChainState]);
      },
    },
    {
      addedIndex: 1,
      priority: 100,
      resolutionStyle: Style.CONCURRENT,
      visitor: (_vertex, options) => {
        calls.push(['concurrent', options.visitorChainState]);
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL },
            {
              commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
              commandArguments: { vertexVisitorsChainState: undefined },
            },
          ],
        };
      },
    },
  ];
  const state = {
    phaseVisitIndex: 7,
    visitorIndex: 42,
    previousPhaseVertexRef: null,
  };
  const execution = executeVisitors({
    vertexRef,
    records: records.slice().reverse(),
    state,
    getOptions: (registration, visitorChainState) => ({
      resolvedTree: null as never,
      notMutatedResolvedTree: null,
      phaseVisitIndex: state.phaseVisitIndex,
      visitorIndex: state.visitorIndex,
      previousPhaseVertexRef: state.previousPhaseVertexRef,
      isTreeRoot: true,
      isTraversalRoot: true,
      vertexRef,
      visitorChainState,
      registration,
      phase: 'ORDER',
    }),
    executeCommands: (commands) => {
      commandBatches.push(commands);
      if (
        commands.some(
          (command) => command.commandName === Command.PAUSE_TRAVERSAL,
        )
      ) {
        halted = true;
      }
      return commands.some(
        (command) =>
          command.commandName === Command.SET_VERTEX_VISITORS_CHAIN_STATE,
      )
        ? { visitorChainState: undefined }
        : {};
    },
    isHalted: () => halted,
    isDeleted: () => false,
  });

  expect(execution.next()).toEqual({ done: false, value: undefined });
  expect(calls).toEqual([['concurrent', null]]);
  expect(commandBatches).toEqual([
    [
      { commandName: Command.PAUSE_TRAVERSAL },
      {
        commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
        commandArguments: { vertexVisitorsChainState: undefined },
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
    phaseVisitIndex: 8,
    visitorIndex: 2,
    previousPhaseVertexRef: vertexRef,
  });
});

test('validates all styles before invoking a compatibility callback', () => {
  const vertexRef = new CTTRef(new Vertex<Tree>({ $d: 'root', $c: [] }));
  const calls: string[] = [];
  const records: Record[] = [
    {
      addedIndex: 0,
      priority: 100,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: () => {
        calls.push('valid');
      },
    },
    {
      addedIndex: 1,
      priority: 100,
      resolutionStyle: 'ASYNC' as Style,
      visitor: () => {
        calls.push('invalid');
      },
    },
  ];
  const execution = executeVisitors({
    vertexRef,
    records,
    state: {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
    },
    getOptions: () => null as never,
    executeCommands: () => ({}),
    isHalted: () => false,
    isDeleted: () => false,
  });

  expect(() => execution.next()).toThrow(/unknown visitor resolution style/i);
  expect(calls).toEqual([]);
});

test('sortVisitorRecords returns priority and registration order copies', () => {
  const visitor = () => undefined;
  const late = {
    addedIndex: 2,
    priority: 100,
    resolutionStyle: Style.SEQUENTIAL,
    visitor,
  };
  const high = {
    addedIndex: 1,
    priority: 200,
    resolutionStyle: Style.SEQUENTIAL,
    visitor,
  };
  const early = {
    addedIndex: 0,
    priority: 100,
    resolutionStyle: Style.SEQUENTIAL,
    visitor,
  };

  const sorted = sortVisitorRecords<'ORDER', Tree, Tree>([late, high, early]);

  expect(
    sorted.map(({ priority, addedIndex }) => [priority, addedIndex]),
  ).toEqual([
    [200, 1],
    [100, 0],
    [100, 2],
  ]);
  expect(sorted[0]).not.toBe(high);
});
