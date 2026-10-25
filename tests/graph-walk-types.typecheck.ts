import {
  TraversalVisitorCommandName as Command,
  DepthFirstTraversalOrder,
} from '../src';
import type { InspectionFilters } from '../src/core/CoreInspection';
import { GraphWalkPhase as Phase } from '../src/traversals/graph-walk/GraphWalkPhase';
import type {
  GraphWalkSource,
  AsyncGraphWalkSource,
  GraphWalkTarget,
} from '../src/traversals/graph-walk/GraphWalkSource';
import type {
  GraphWalkOptions,
  AsyncGraphWalkOptions,
  GraphWalkConfigureInput,
  AsyncGraphWalkConfigureInput,
} from '../src/traversals/graph-walk/GraphWalkOptions';
import type {
  GraphWalkEvent,
  GraphWalkEventFor,
} from '../src/traversals/graph-walk/GraphWalkEvent';
import type { GraphWalkVisitorResult } from '../src/traversals/graph-walk/GraphWalkVisitor';

const source: GraphWalkSource<string, number, undefined> = {
  roots: () => [
    { vertexId: undefined, resolution: { kind: 'found', data: 'root' } },
  ],
  outgoing: (vertex) => [{ target: { vertexId: vertex.vertexId }, data: 1 }],
};
const asyncSource: AsyncGraphWalkSource<string, number, undefined> = source;
const asyncOptions: AsyncGraphWalkOptions<string, number, undefined> = {
  source: asyncSource,
  followEdge: async () => true,
  expandVertex: async () => false,
  visitors: {
    [Phase.EDGE]: async (event) => {
      const id: undefined = event.edge.to;
      void id;
    },
  },
};
const syncOptions: GraphWalkOptions<string, number, undefined> = {
  source,
  revisit: 'simplePaths',
  limits: { maxDepth: 0 },
  visitors: {
    [Phase.VERTEX]: (event) => {
      const id: undefined = event.vertex.vertexId;
      void id;
    },
    [Phase.EDGE]: (event) => {
      const data: number = event.edge.data;
      void data;
    },
    [Phase.PATH]: (event) => {
      const vertices: readonly string[] = event.vertices.map((v) => v.data);
      void vertices;
    },
  },
  expandVertex: (_vertex, context) =>
    context.revisit === 'once' || context.path.depth >= 0,
  followEdge: (_edge, context) => {
    const data: string = context.source.data;
    void data;
    return true;
  },
};
const patch: GraphWalkConfigureInput<string, number, undefined> = {
  revisit: 'walks',
};
const asyncPatch: AsyncGraphWalkConfigureInput<string, number, undefined> =
  patch;
const symbol = Symbol('id');
const target: GraphWalkTarget<string, typeof symbol> = { vertexId: symbol };
const objectId = { vertexId: 'arbitrary', resolution: 'id field' };
const objectSource: GraphWalkSource<undefined, undefined, typeof objectId> = {
  roots: () => [
    { vertexId: objectId, resolution: { kind: 'found', data: undefined } },
  ],
  outgoing: (vertex) => {
    const id: typeof objectId = vertex.vertexId;
    void id;
    return [];
  },
};
const symbolSource: GraphWalkSource<string, number, typeof symbol> = {
  roots: () => [target],
  outgoing: () => [],
  resolveVertex: () => ({ kind: 'omitted' }),
};
const phaseEvent = (
  event: GraphWalkEventFor<string, number, Phase.EDGE, undefined>,
) => event.edge;
const unionEvent = (event: GraphWalkEvent<string, number, undefined>) => {
  if (event.kind === 'vertex') {
    const data: string = event.vertex.data;
    void data;
  }
};
const command: GraphWalkVisitorResult = {
  commands: [
    { commandName: Command.HALT_TRAVERSAL },
    { commandName: Command.NOOP },
  ],
};
// @ts-expect-error Route enumeration requires maxDepth or maxSteps.
const unbounded: GraphWalkOptions<string, number, undefined> = {
  source,
  revisit: 'walks',
};
// @ts-expect-error Occurrence caps alone do not bound route exploration.
const occurrenceBound: GraphWalkOptions<string, number, undefined> = {
  source,
  revisit: 'simplePaths',
  limits: { maxOccurrences: 4 },
};
const promiseRoots: GraphWalkSource<string, number, undefined> = {
  ...source,
  // @ts-expect-error Sync roots cannot return promises.
  roots: async () => [],
};
const promiseResolver: GraphWalkSource<string, number, undefined> = {
  ...source,
  // @ts-expect-error Sync resolvers cannot return promises.
  resolveVertex: async () => ({ kind: 'omitted' }),
};
const promiseOutgoing: GraphWalkSource<string, number, undefined> = {
  ...source,
  // @ts-expect-error Sync outgoing cannot return async iterables.
  outgoing: async function* () {
    return;
  },
};
const promisePredicate: GraphWalkOptions<string, number, undefined> = {
  source,
  // @ts-expect-error Sync predicates cannot return promises.
  followEdge: async () => true,
};
const promiseVisitor: GraphWalkOptions<string, number, undefined> = {
  source,
  // @ts-expect-error Sync visitors cannot return promises.
  visitors: { [Phase.VERTEX]: async () => undefined },
};
const wrongPhase: GraphWalkOptions<string, number, undefined> = {
  source,
  // @ts-expect-error Walking rejects another family's phases.
  emitPhases: [DepthFirstTraversalOrder.PRE_ORDER],
};
// @ts-expect-error Canonical and legacy emission selectors are exclusive.
const mixedSelectors: GraphWalkOptions<string, number, undefined> = {
  source,
  emitPhases: [Phase.EDGE],
  iterateOver: [Phase.PATH],
};
const defer: GraphWalkVisitorResult = {
  // @ts-expect-error Walking has no settlement command.
  commands: [{ commandName: Command.DEFER_READY }],
};
const argumentsCommand: GraphWalkVisitorResult = {
  // @ts-expect-error The shared halt command forbids arguments.
  commands: [{ commandName: Command.HALT_TRAVERSAL, commandArguments: {} }],
};
const rewrite: GraphWalkVisitorResult = {
  commands: [
    {
      // @ts-expect-error Walking has no rewrite command.
      commandName: Command.REWRITE_VERTEX_DATA,
      // @ts-expect-error Walking commands forbid rewrite arguments.
      commandArguments: { newData: 1 },
    },
  ],
};
const concurrency: GraphWalkOptions<string, number, undefined> = {
  source,
  // @ts-expect-error Walking does not expose a concurrency option.
  concurrency: 1,
};
declare const filters: InspectionFilters<Phase>;
const selected: readonly Phase[] = filters.emitPhases;
declare const legacy: InspectionFilters;
// @ts-expect-error Default inspection phases remain tree/DAG phases.
const widened: readonly Phase[] = legacy.emitPhases;
void [
  asyncOptions,
  syncOptions,
  patch,
  asyncPatch,
  objectSource,
  symbolSource,
  phaseEvent,
  unionEvent,
  command,
  unbounded,
  occurrenceBound,
  promiseRoots,
  promiseResolver,
  promiseOutgoing,
  promisePredicate,
  promiseVisitor,
  wrongPhase,
  mixedSelectors,
  defer,
  argumentsCommand,
  rewrite,
  concurrency,
  selected,
  widened,
];
