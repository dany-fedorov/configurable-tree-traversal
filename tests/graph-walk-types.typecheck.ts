import {
  GraphWalk,
  AsyncGraphWalk,
  TraversalVisitorCommandName as Command,
  DepthFirstPhase,
} from '../src';
import type { InspectionFilters } from '../src/core/CoreInspection';
import { GraphWalkPhase as Phase } from '../src';
import type {
  GraphWalkSource,
  AsyncGraphWalkSource,
  GraphWalkTarget,
} from '../src';
import type {
  GraphWalkOptions,
  AsyncGraphWalkOptions,
  GraphWalkConfigureInput,
  AsyncGraphWalkConfigureInput,
} from '../src';
import type { GraphWalkEvent, GraphWalkEventFor } from '../src';
import type { GraphWalkVisitorResult } from '../src';

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
    { commandName: Command.PAUSE_TRAVERSAL },
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
  emitEvents: [DepthFirstPhase.PRE_ORDER],
};
// @ts-expect-error Canonical and legacy emission selectors are exclusive.
const mixedSelectors: GraphWalkOptions<string, number, undefined> = {
  source,
  emitEvents: [Phase.EDGE],
  iterateOver: [Phase.PATH],
};
const defer: GraphWalkVisitorResult = {
  // @ts-expect-error Walking has no settlement command.
  commands: [{ commandName: Command.DEFER_WORK_COMPLETION }],
};
const argumentsCommand: GraphWalkVisitorResult = {
  // @ts-expect-error The shared halt command forbids arguments.
  commands: [{ commandName: Command.PAUSE_TRAVERSAL, commandArguments: {} }],
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
const selected: readonly `${Phase}`[] = filters.emitEvents;
declare const legacy: InspectionFilters;
// @ts-expect-error Default inspection phases remain tree/DAG phases.
const widened: readonly Phase[] = legacy.emitEvents;
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

// Inferred concrete runners retain exact data/ID types and the broad capability.
const runner = new GraphWalk({ source }).createRunner();
const execution: import('../src').SyncTraversalExecution<
  Phase,
  GraphWalkEvent<string, number, undefined>,
  import('../src').GraphWalkInspection
> = runner;
const common: import('../src').SyncTraversalExecution<
  Phase,
  GraphWalkEvent<string, number, undefined>,
  import('../src').ExecutionInspection
> = runner;
const edgeEvents: Generator<
  GraphWalkEventFor<string, number, Phase.EDGE, undefined>,
  void,
  unknown
> = runner.iterateEvents({ emitEvents: [Phase.EDGE] });
const allEvents: Generator<
  GraphWalkEvent<string, number, undefined>,
  void,
  unknown
> = runner.iterateEvents();
// @ts-expect-error Unselected calls cannot promise only edge events.
const unsafeEdges: typeof edgeEvents = runner.iterateEvents();
// @ts-expect-error Legacy selectors intentionally retain the full event union.
const legacyEdges: typeof edgeEvents = runner.iterateEvents({
  iterateOver: [Phase.EDGE],
});
// @ts-expect-error A walking runner cannot accept another family's phase.
runner.iterateEvents({ emitEvents: [DepthFirstPhase.PRE_ORDER] });
// @ts-expect-error Function-property variance forbids phase widening.
const wideExecution: import('../src').SyncTraversalExecution<
  string,
  GraphWalkEvent<string, number, undefined>,
  import('../src').ExecutionInspection
> = runner;
void [
  execution,
  common,
  edgeEvents,
  allEvents,
  unsafeEdges,
  legacyEdges,
  wideExecution,
];

// Only explicit canonical selectors narrow; persisted selectors are runtime state.
const persisted = new GraphWalk({
  source,
  emitEvents: [Phase.EDGE],
}).createRunner();
const persistedAll: typeof allEvents = persisted.iterateEvents();
const emptyPatchAll: typeof allEvents = persisted.iterateEvents({});
// @ts-expect-error Empty patches retain the full union.
const unsafeEmptyPatch: typeof edgeEvents = persisted.iterateEvents({});
const noEvents: Generator<never, void, unknown> = runner.iterateEvents({
  emitEvents: [],
});
const mixedEvents: Generator<
  GraphWalkEventFor<string, number, Phase.VERTEX | Phase.EDGE, undefined>,
  void,
  unknown
> = runner.iterateEvents({ emitEvents: [Phase.VERTEX, Phase.EDGE] });
// @ts-expect-error Explicit mixed selectors exclude paths.
const unsafePaths: Generator<
  GraphWalkEventFor<string, number, Phase.PATH, undefined>,
  void,
  unknown
> = mixedEvents;
const promisedCounts: {
  foundVertices: number;
  omittedVertices: number;
  observedLinks: number;
} = runner.summary().counts;
// @ts-expect-error Interim short counter names are not public.
runner.summary().counts.found;
void [
  persistedAll,
  emptyPatchAll,
  unsafeEmptyPatch,
  noEvents,
  mixedEvents,
  unsafePaths,
  promisedCounts,
];

const registered = new GraphWalk({ source });
const sameFactory: typeof registered = registered.addVisitorFor(
  Phase.EDGE,
  (event, context) => {
    const phase: Phase.EDGE = context.phase;
    const kind: 'edge' = event.kind;
    const edgeData: number = event.edge.data;
    const id: undefined = event.source.vertexId;
    // @ts-expect-error Exact phase registration cannot see a vertex event.
    event.vertex;
    // @ts-expect-error Context metadata exposes no executable callback.
    context.registration.visitor;
    void [phase, kind, edgeData, id];
    return { commands: [{ commandName: Command.NOOP }] };
  },
);
registered.addVisitorGroupFor(Phase.PATH, {
  visitors: [
    (event) => {
      const data: string = event.vertices[0]!.data;
      // @ts-expect-error A path callback cannot receive an edge event.
      event.edge;
      void data;
    },
  ],
});
registered.setVisitorsFor(Phase.VERTEX, (event, context) => {
  const phase: Phase.VERTEX = context.phase;
  const data: string = event.vertex.data;
  void [phase, data];
});
const exactRecords: import('../src/core/graph/types').VisitorRecord<
  import('../src').GraphWalkVisitor<string, number, Phase.EDGE, undefined>
>[] = registered.listVisitorsFor(Phase.EDGE);
// @ts-expect-error Appending async visitors to a sync factory is forbidden.
registered.addVisitorFor(Phase.VERTEX, async () => undefined);
registered.addVisitorFor(Phase.EDGE, () => ({
  // @ts-expect-error Invalid return commands must not widen the registered phase.
  commands: [{ commandName: Command.DELETE_VERTEX }],
}));
registered.addVisitorGroupFor(Phase.EDGE, {
  visitors: [
    // @ts-expect-error Group callbacks cannot widen the registered phase.
    (_event: GraphWalkEventFor<string, number, Phase.VERTEX, undefined>) =>
      undefined,
  ],
});
registered.setVisitorsFor(
  Phase.EDGE,
  // @ts-expect-error Setter callbacks cannot widen the registered phase.
  (_event: GraphWalkEventFor<string, number, Phase.PATH, undefined>) =>
    undefined,
);
void [sameFactory, exactRecords];

const asyncWalk = new AsyncGraphWalk({ source: asyncSource });
const asyncRegistered: typeof asyncWalk = asyncWalk.addVisitorFor(
  Phase.EDGE,
  async (event, context) => {
    const kind: 'edge' = event.kind;
    const data: number = event.edge.data;
    const id: undefined = event.edge.to;
    const phase: Phase.EDGE = context.phase;
    // @ts-expect-error Exact async phase inference does not widen.
    event.vertex;
    void [kind, data, id, phase];
    return { commands: [{ commandName: Command.NOOP }] };
  },
);
asyncWalk.addVisitorGroupFor(Phase.PATH, {
  visitors: [
    async (event) => {
      const data: string = event.vertices[0]!.data;
      void data;
    },
  ],
});
asyncWalk.setVisitorsFor(Phase.VERTEX, async (event) => {
  const data: string = event.vertex.data;
  void data;
});
const asyncRecords: import('../src/core/graph/types').VisitorRecord<
  import('../src').AsyncGraphWalkVisitor<string, number, Phase.EDGE, undefined>
>[] = asyncWalk.listVisitorsFor(Phase.EDGE);
asyncWalk.configure({ revisit: 'walks' });
asyncWalk.setVisitorsFor(
  Phase.VERTEX,
  // @ts-expect-error Wrong-phase async callback cannot widen registration phase.
  async (_event: GraphWalkEventFor<string, number, Phase.EDGE, undefined>) =>
    undefined,
);
// @ts-expect-error Walking cannot accept topology commands.
asyncWalk.addVisitorFor(Phase.VERTEX, async () => ({
  commands: [{ commandName: Command.DELETE_VERTEX }],
}));
const asyncRunner = asyncWalk.createRunner();
const asyncCapability: import('../src').AsyncTraversalExecution<
  Phase,
  GraphWalkEvent<string, number, undefined>,
  import('../src').GraphWalkInspection
> = asyncRunner;
const asyncRunResult: Promise<typeof asyncRunner> = asyncRunner.run();
const asyncEdges: AsyncGenerator<
  GraphWalkEventFor<string, number, Phase.EDGE, undefined>,
  void,
  unknown
> = asyncRunner.iterateEvents({ emitEvents: [Phase.EDGE] });
const asyncAll: AsyncGenerator<
  GraphWalkEvent<string, number, undefined>,
  void,
  unknown
> = asyncRunner.iterateEvents();
// @ts-expect-error No-selector iteration includes persisted mixed phases.
const asyncNarrowAll: typeof asyncEdges = asyncRunner.iterateEvents();
// @ts-expect-error Legacy selector does not narrow.
const asyncNarrowLegacy: typeof asyncEdges = asyncRunner.iterateEvents({
  iterateOver: [Phase.EDGE],
});
asyncCapability.iterateEvents({
  // @ts-expect-error Walking phases remain family-safe.
  emitEvents: [DepthFirstPhase.PRE_ORDER],
});
void [
  asyncRegistered,
  asyncRecords,
  asyncCapability,
  asyncRunResult,
  asyncEdges,
  asyncAll,
  asyncNarrowAll,
  asyncNarrowLegacy,
];

new GraphWalk({
  source,
  revisit: 'walks',
  limits: { maxSteps: 10 },
  followEdge(edge, context) {
    if (context.revisit === 'once') {
      // @ts-expect-error Once predicates do not expose alternative route context.
      void context.path;
    } else {
      const id: undefined = context.path.vertices[0]!.vertexId;
      const data: string = context.path.vertices[0]!.data;
      const weight: number = context.path.edges[0]!.data;
      const to: undefined = edge.to;
      void [id, data, weight, to];
      // @ts-expect-error Route arrays are readonly snapshots.
      context.path.vertices.push({ vertexId: undefined, data: '' });
    }
    return true;
  },
});
new AsyncGraphWalk({
  source: asyncSource,
  revisit: 'simplePaths',
  limits: { maxDepth: 2 },
  async expandVertex(vertex, context) {
    if (context.revisit !== 'once') {
      const path: GraphWalkEventFor<string, number, Phase.PATH, undefined> =
        context.path;
      const data: string = vertex.data;
      void [path, data];
    }
    return true;
  },
});

// Null explicitly clears optional predicates in both initial options and patches.
const nullSyncOptions: GraphWalkOptions<string, number, undefined> = {
  source,
  followEdge: null,
  expandVertex: null,
};
const nullAsyncOptions: AsyncGraphWalkOptions<string, number, undefined> = {
  source: asyncSource,
  followEdge: null,
  expandVertex: null,
};
const nullPatch: GraphWalkConfigureInput<string, number, undefined> = {
  followEdge: null,
  expandVertex: null,
};
const nullAsyncPatch: AsyncGraphWalkConfigureInput<string, number, undefined> =
  nullPatch;
new GraphWalk(nullSyncOptions).configure(nullPatch);
new AsyncGraphWalk(nullAsyncOptions).configure(nullAsyncPatch);
const invalidPredicates: GraphWalkConfigureInput<string, number, undefined> = {
  // @ts-expect-error Predicates accept callbacks or null, never booleans.
  followEdge: false,
  // @ts-expect-error Predicates accept callbacks or null, never numbers.
  expandVertex: 0,
};
const invalidAsyncPredicates: AsyncGraphWalkConfigureInput<
  string,
  number,
  undefined
> = {
  // @ts-expect-error Async predicates accept callbacks or null, never booleans.
  followEdge: false,
  // @ts-expect-error Async predicates accept callbacks or null, never numbers.
  expandVertex: 0,
};
void [invalidPredicates, invalidAsyncPredicates];

new GraphWalk({
  source,
  followEdge: undefined,
  expandVertex: undefined,
}).configure({
  followEdge: undefined,
  expandVertex: undefined,
});
new AsyncGraphWalk({
  source: asyncSource,
  followEdge: undefined,
  expandVertex: undefined,
}).configure({
  followEdge: undefined,
  expandVertex: undefined,
});
