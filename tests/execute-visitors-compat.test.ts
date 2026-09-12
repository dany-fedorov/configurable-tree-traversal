import { CTTRef } from '../src/core/CTTRef';
import { executeVisitors } from '../src/core/executeVisitors';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
  type TraversalVisitorCommand,
  type TraversalVisitorRecord,
} from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';

type Tree = TreeTypeParameters<string, string>;
type Record = TraversalVisitorRecord<'ORDER', Tree, Tree>;

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
        calls.push(['sequential', options.vertexVisitorsChainState]);
      },
    },
    {
      addedIndex: 1,
      priority: 100,
      resolutionStyle: Style.CONCURRENT,
      visitor: (_vertex, options) => {
        calls.push(['concurrent', options.vertexVisitorsChainState]);
        return {
          commands: [
            { commandName: Command.HALT_TRAVERSAL },
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
    vertexVisitIndex: 7,
    curVertexVisitorVisitIndex: 42,
    previousVisitedVertexRef: null,
  };
  const execution = executeVisitors({
    vertexRef,
    records,
    state,
    getOptions: (visitorRecord, vertexVisitorsChainState) => ({
      resolvedTree: null as never,
      notMutatedResolvedTree: null,
      vertexVisitIndex: state.vertexVisitIndex,
      curVertexVisitorVisitIndex: state.curVertexVisitorVisitIndex,
      previousVisitedVertexRef: state.previousVisitedVertexRef,
      isTreeRoot: true,
      isTraversalRoot: true,
      vertexRef,
      vertexVisitorsChainState,
      visitorRecord,
      order: 'ORDER',
    }),
    executeCommands: (commands) => {
      commandBatches.push(commands);
      if (
        commands.some(
          (command) => command.commandName === Command.HALT_TRAVERSAL,
        )
      ) {
        halted = true;
      }
      return commands.some(
        (command) =>
          command.commandName === Command.SET_VERTEX_VISITORS_CHAIN_STATE,
      )
        ? { vertexVisitorsChainState: undefined }
        : {};
    },
    isHalted: () => halted,
    isDeleted: () => false,
  });

  expect(execution.next()).toEqual({ done: false, value: undefined });
  expect(calls).toEqual([['concurrent', null]]);
  expect(commandBatches).toEqual([
    [
      { commandName: Command.HALT_TRAVERSAL },
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
    vertexVisitIndex: 8,
    curVertexVisitorVisitIndex: 2,
    previousVisitedVertexRef: vertexRef,
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
      vertexVisitIndex: 0,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: null,
    },
    getOptions: () => null as never,
    executeCommands: () => ({}),
    isHalted: () => false,
    isDeleted: () => false,
  });

  expect(() => execution.next()).toThrow(/unknown visitor resolution style/i);
  expect(calls).toEqual([]);
});
