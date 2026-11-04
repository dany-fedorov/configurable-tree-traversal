import type {
  AsyncGraphWalkBuilderOptions,
  AsyncGraphWalkBuilderOptionsPatch,
  AsyncGraphWalkDiscoverySource,
  GraphWalkEvent,
  GraphWalkEventForObservationKind,
  GraphWalkBuilderOptions,
  GraphWalkBuilderOptionsPatch,
  GraphWalkDiscoverySource,
  GraphWalkVertexResolutionTarget,
  GraphWalkVisitorResult,
} from '../src';
import {
  AsyncGraphWalkBuilder,
  DepthFirstTreeVisitPhase,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalVisitorCommandName as Command,
} from '../src';
import type { TraversalExecutionSelections } from '../src/core/CoreInspection';

const source: GraphWalkDiscoverySource<string, number, undefined> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [
    {
      kind: 'inlineResolution' as const,
      vertexId: undefined,
      resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'root' },
    },
  ],
  enumerateOutgoingLinks: (vertex) => [
    {
      targetToResolveOnAdmission: {
        kind: 'previouslyAdmittedVertex' as const,
        vertexId: vertex.vertexId,
      },
      edgeData: 1,
    },
  ],
};
const asyncSource: AsyncGraphWalkDiscoverySource<string, number, undefined> =
  source;
const asyncOptions: AsyncGraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: asyncSource,
  shouldAdmitOutgoingLinkTarget: async () => true,
  shouldExpandVertexOccurrence: async () => false,
  visitorsByObservationKind: {
    [Phase.ADMITTED_EDGE_OCCURRENCE]: async (event) => {
      const id: undefined = event.edge.toVertexId;
      void id;
    },
  },
};
const syncOptions: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
  limits: { maxRouteHopDepth: 0 },
  visitorsByObservationKind: {
    [Phase.VERTEX_OCCURRENCE]: (event) => {
      const id: undefined = event.vertex.vertexId;
      void id;
    },
    [Phase.ADMITTED_EDGE_OCCURRENCE]: (event) => {
      const data: number = event.edge.edgeData;
      void data;
    },
    [Phase.ROUTE_PREFIX]: (event) => {
      const vertices: readonly string[] = event.verticesInRootToTargetOrder.map(
        (v) => v.vertexData,
      );
      void vertices;
    },
  },
  shouldExpandVertexOccurrence: (_vertex, context) =>
    context.routeEnumerationPolicy === 'firstAdmittedFoundRoutePerVertex' ||
    context.routePrefix.routeHopLength >= 0,
  shouldAdmitOutgoingLinkTarget: (_edge, context) => {
    const data: string = context.fromVertex.vertexData;
    void data;
    return true;
  },
};
const patch: GraphWalkBuilderOptionsPatch<string, number, undefined> = {
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
};
const asyncPatch: AsyncGraphWalkBuilderOptionsPatch<string, number, undefined> =
  patch;
const symbol = Symbol('id');
const target: GraphWalkVertexResolutionTarget<string, typeof symbol> = {
  vertexId: symbol,
};
const objectId = {
  vertexId: 'arbitrary',
  resolutionIfNotPreviouslyAdmitted: 'id field',
};
const objectSource: GraphWalkDiscoverySource<
  undefined,
  undefined,
  typeof objectId
> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [
    {
      kind: 'inlineResolution' as const,
      vertexId: objectId,
      resolutionIfNotPreviouslyAdmitted: {
        kind: 'found',
        vertexData: undefined,
      },
    },
  ],
  enumerateOutgoingLinks: (vertex) => {
    const id: typeof objectId = vertex.vertexId;
    void id;
    return [];
  },
};
const symbolSource: GraphWalkDiscoverySource<string, number, typeof symbol> = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
  enumerateRootTargets: () => [target],
  enumerateOutgoingLinks: () => [],
  resolveVertexDataById: () => ({ kind: 'omitted' }),
};
const phaseEvent = (
  event: GraphWalkEventForObservationKind<
    string,
    number,
    Phase.ADMITTED_EDGE_OCCURRENCE,
    undefined
  >,
) => event.edge;
const unionEvent = (event: GraphWalkEvent<string, number, undefined>) => {
  if (event.eventKind === 'vertexOccurrence') {
    const data: string = event.vertex.vertexData;
    void data;
  }
};
const command: GraphWalkVisitorResult = {
  commands: [
    { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
    { commandName: Command.NO_OPERATION },
  ],
};
// @ts-expect-error Route enumeration requires maxDepth or maxCandidateReadAttempts.
const unbounded: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
};
// @ts-expect-error Occurrence caps alone do not bound route exploration.
const occurrenceBound: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
  limits: { maxAdmittedRootOrLinkTargetOccurrences: 4 },
};
const promiseRoots: GraphWalkDiscoverySource<string, number, undefined> = {
  ...source,
  // @ts-expect-error Sync roots cannot return promises.
  enumerateRootTargets: async () => [],
};
const promiseResolver: GraphWalkDiscoverySource<string, number, undefined> = {
  ...source,
  // @ts-expect-error Sync resolvers cannot return promises.
  resolveVertexDataById: async () => ({ kind: 'omitted' }),
};
const promiseOutgoing: GraphWalkDiscoverySource<string, number, undefined> = {
  ...source,
  // @ts-expect-error Sync outgoing cannot return async iterables.
  enumerateOutgoingLinks: async function* () {
    return;
  },
};
const promisePredicate: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  // @ts-expect-error Sync predicates cannot return promises.
  shouldAdmitOutgoingLinkTarget: async () => true,
};
const promiseVisitor: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    // @ts-expect-error Sync visitors cannot return promises.
    [Phase.VERTEX_OCCURRENCE]: async () => undefined,
  },
};
const wrongPhase: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  // @ts-expect-error Walking rejects another family's phases.
  deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
};
const mixedSelectors: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
  // @ts-expect-error Legacy selectors are not canonical input.
  iterateOver: [Phase.ROUTE_PREFIX],
};
const defer: GraphWalkVisitorResult = {
  commands: [
    // @ts-expect-error Walking has no settlement command.
    { commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
  ],
};
const argumentsCommand: GraphWalkVisitorResult = {
  commands: [
    {
      commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
      // @ts-expect-error The shared halt command forbids arguments.
      commandArguments: {},
    },
  ],
};
const rewrite: GraphWalkVisitorResult = {
  commands: [
    {
      // @ts-expect-error Walking has no rewrite command.
      commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
      // @ts-expect-error Walking commands forbid rewrite arguments.
      commandArguments: { replacementVertexData: 1 },
    },
  ],
};
const concurrency: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  // @ts-expect-error Walking does not expose a concurrency option.
  concurrency: 1,
};
declare const filters: TraversalExecutionSelections<Phase>;
const selected: readonly `${Phase}`[] = filters.deliveredEventKinds;
declare const legacy: TraversalExecutionSelections;
// @ts-expect-error Default inspection phases remain tree/DAG phases.
const widened: readonly Phase[] = legacy.deliveredEventKinds;
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
const runner = new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const execution: import('../src').SyncTraversalExecution<
  Phase,
  GraphWalkEvent<string, number, undefined>,
  import('../src').GraphWalkExecutionSnapshot
> = runner;
const common: import('../src').SyncTraversalExecution<
  Phase,
  GraphWalkEvent<string, number, undefined>,
  import('../src').TraversalExecutionSnapshot
> = runner;
const edgeEvents: Generator<
  GraphWalkEventForObservationKind<
    string,
    number,
    Phase.ADMITTED_EDGE_OCCURRENCE,
    undefined
  >,
  void,
  unknown
> = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
});
const allEvents: Generator<
  GraphWalkEvent<string, number, undefined>,
  void,
  unknown
> = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
// @ts-expect-error Unselected calls cannot promise only edge events.
const unsafeEdges: typeof edgeEvents =
  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const legacyEdges: typeof edgeEvents =
  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    // @ts-expect-error Legacy selectors are not canonical execution inputs.
    iterateOver: [Phase.ADMITTED_EDGE_OCCURRENCE],
  });
runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error A walking runner cannot accept another family's phase.
  deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
});
// @ts-expect-error Function-property variance forbids phase widening.
const wideExecution: import('../src').SyncTraversalExecution<
  string,
  GraphWalkEvent<string, number, undefined>,
  import('../src').TraversalExecutionSnapshot
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
const persisted = new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
}).createIndependentRunnerFromCurrentOptions();
const persistedAll: typeof allEvents =
  persisted.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const emptyPatchAll: typeof allEvents =
  persisted.runAndIterateObservationEventsUntilSuspendedOrTerminal({});
// @ts-expect-error Empty patches retain the full union.
const unsafeEmptyPatch: typeof edgeEvents =
  persisted.runAndIterateObservationEventsUntilSuspendedOrTerminal({});
const noEvents: Generator<never, void, unknown> =
  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  });
const mixedEvents: Generator<
  GraphWalkEventForObservationKind<
    string,
    number,
    Phase.VERTEX_OCCURRENCE | Phase.ADMITTED_EDGE_OCCURRENCE,
    undefined
  >,
  void,
  unknown
> = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  deliveredEventKinds: [
    Phase.VERTEX_OCCURRENCE,
    Phase.ADMITTED_EDGE_OCCURRENCE,
  ],
});
// @ts-expect-error Explicit mixed selectors exclude paths.
const unsafePaths: Generator<
  GraphWalkEventForObservationKind<
    string,
    number,
    Phase.ROUTE_PREFIX,
    undefined
  >,
  void,
  unknown
> = mixedEvents;
const promisedCounts: {
  resolvedFoundVertexIdCount: number;
  resolvedOmittedVertexIdCount: number;
  freshSourceOutgoingLinkCount: number;
} = runner.captureProgressSnapshot().counts;
// @ts-expect-error Interim short counter names are not public.
runner.captureProgressSnapshot().counts.found;
void [
  persistedAll,
  emptyPatchAll,
  unsafeEmptyPatch,
  noEvents,
  mixedEvents,
  unsafePaths,
  promisedCounts,
];

const registered = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
const sameFactory: typeof registered = registered.registerVisitorForObservationKind(
  Phase.ADMITTED_EDGE_OCCURRENCE,
  (event, context) => {
    const phase: Phase.ADMITTED_EDGE_OCCURRENCE = context.observationKind;
    const kind: 'admittedEdgeOccurrence' = event.eventKind;
    const edgeData: number = event.edge.edgeData;
    const id: undefined = event.fromVertex.vertexId;
    // @ts-expect-error Exact phase registration cannot see a vertex event.
    event.vertex;
    // @ts-expect-error Context metadata exposes no executable callback.
    context.visitorRegistrationMetadata.visitor;
    void [phase, kind, edgeData, id];
    return { commands: [{ commandName: Command.NO_OPERATION }] };
  },
);
registered.appendVisitorGroupForObservationKind(Phase.ROUTE_PREFIX, {
  visitors: [
    (event) => {
      const data: string = event.verticesInRootToTargetOrder[0]!.vertexData;
      // @ts-expect-error A path callback cannot receive an edge event.
      event.edge;
      void data;
    },
  ],
});
registered.replaceVisitorDefinitionsForObservationKind(
  Phase.VERTEX_OCCURRENCE,
  (event, context) => {
    const phase: Phase.VERTEX_OCCURRENCE = context.observationKind;
    const data: string = event.vertex.vertexData;
    void [phase, data];
  },
);
const exactRecords: import('../src/core/graph/types').VisitorRecord<
  import('../src').GraphWalkVisitor<
    string,
    number,
    Phase.ADMITTED_EDGE_OCCURRENCE,
    undefined
  >
>[] = registered.listVisitorRegistrationsForObservationKind(
  Phase.ADMITTED_EDGE_OCCURRENCE,
);
registered.registerVisitorForObservationKind(
  Phase.VERTEX_OCCURRENCE,
  // @ts-expect-error Appending async visitors to a sync factory is forbidden.
  async () => undefined,
);
registered.registerVisitorForObservationKind(Phase.ADMITTED_EDGE_OCCURRENCE, () => ({
  commands: [
    {
      // @ts-expect-error Invalid return commands must not widen the registered phase.
      commandName:
        Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
    },
  ],
}));
registered.appendVisitorGroupForObservationKind(Phase.ADMITTED_EDGE_OCCURRENCE, {
  visitors: [
    // @ts-expect-error Group callbacks cannot widen the registered phase.
    (
      _event: GraphWalkEventForObservationKind<
        string,
        number,
        Phase.VERTEX_OCCURRENCE,
        undefined
      >,
    ) => undefined,
  ],
});
registered.replaceVisitorDefinitionsForObservationKind(
  Phase.ADMITTED_EDGE_OCCURRENCE,
  // @ts-expect-error Setter callbacks cannot widen the registered phase.
  (
    _event: GraphWalkEventForObservationKind<
      string,
      number,
      Phase.ROUTE_PREFIX,
      undefined
    >,
  ) => undefined,
);
void [sameFactory, exactRecords];

const asyncWalk = new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: asyncSource,
});
const asyncRegistered: typeof asyncWalk =
  asyncWalk.registerVisitorForObservationKind(
    Phase.ADMITTED_EDGE_OCCURRENCE,
    async (event, context) => {
      const kind: 'admittedEdgeOccurrence' = event.eventKind;
      const data: number = event.edge.edgeData;
      const id: undefined = event.edge.toVertexId;
      const phase: Phase.ADMITTED_EDGE_OCCURRENCE = context.observationKind;
      // @ts-expect-error Exact async phase inference does not widen.
      event.vertex;
      void [kind, data, id, phase];
      return { commands: [{ commandName: Command.NO_OPERATION }] };
    },
  );
asyncWalk.appendVisitorGroupForObservationKind(Phase.ROUTE_PREFIX, {
  visitors: [
    async (event) => {
      const data: string = event.verticesInRootToTargetOrder[0]!.vertexData;
      void data;
    },
  ],
});
asyncWalk.replaceVisitorDefinitionsForObservationKind(
  Phase.VERTEX_OCCURRENCE,
  async (event) => {
    const data: string = event.vertex.vertexData;
    void data;
  },
);
const asyncRecords: import('../src/core/graph/types').VisitorRecord<
  import('../src').AsyncGraphWalkVisitor<
    string,
    number,
    Phase.ADMITTED_EDGE_OCCURRENCE,
    undefined
  >
>[] = asyncWalk.listVisitorRegistrationsForObservationKind(
  Phase.ADMITTED_EDGE_OCCURRENCE,
);
asyncWalk.patchOptionsForFutureRunners({
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
});
asyncWalk.replaceVisitorDefinitionsForObservationKind(
  Phase.VERTEX_OCCURRENCE,
  // @ts-expect-error Wrong-phase async callback cannot widen registration phase.
  async (
    _event: GraphWalkEventForObservationKind<
      string,
      number,
      Phase.ADMITTED_EDGE_OCCURRENCE,
      undefined
    >,
  ) => undefined,
);
// @ts-expect-error Walking cannot accept topology commands.
asyncWalk.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async () => ({
  commands: [
    {
      commandName:
        Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
    },
  ],
}));
const asyncRunner = asyncWalk.createIndependentRunnerFromCurrentOptions();
const asyncCapability: import('../src').AsyncTraversalExecution<
  Phase,
  GraphWalkEvent<string, number, undefined>,
  import('../src').GraphWalkExecutionSnapshot
> = asyncRunner;
const asyncRunResult: Promise<typeof asyncRunner> =
  asyncRunner.runUntilSuspendedOrTerminal();
const asyncEdges: AsyncGenerator<
  GraphWalkEventForObservationKind<
    string,
    number,
    Phase.ADMITTED_EDGE_OCCURRENCE,
    undefined
  >,
  void,
  unknown
> = asyncRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
});
const asyncAll: AsyncGenerator<
  GraphWalkEvent<string, number, undefined>,
  void,
  unknown
> = asyncRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
// @ts-expect-error No-selector iteration includes persisted mixed phases.
const asyncNarrowAll: typeof asyncEdges =
  asyncRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const asyncNarrowLegacy: typeof asyncEdges =
  asyncRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    // @ts-expect-error Legacy selectors are not canonical execution inputs.
    iterateOver: [Phase.ADMITTED_EDGE_OCCURRENCE],
  });
asyncCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error Walking phases remain family-safe.
  deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
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

new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
  limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 10 },
  shouldAdmitOutgoingLinkTarget(edge, context) {
    if (context.routeEnumerationPolicy === 'firstAdmittedFoundRoutePerVertex') {
      // @ts-expect-error Once predicates do not expose alternative route context.
      void context.routePrefix;
    } else {
      const id: undefined =
        context.routePrefix.verticesInRootToTargetOrder[0]!.vertexId;
      const data: string =
        context.routePrefix.verticesInRootToTargetOrder[0]!.vertexData;
      const weight: number =
        context.routePrefix.edgesInRootToTargetOrder[0]!.edgeData;
      const to: undefined = edge.toVertexId;
      void [id, data, weight, to];
      // @ts-expect-error Route arrays are readonly snapshots.
      context.routePrefix.verticesInRootToTargetOrder.push({
        vertexId: undefined,
        vertexData: '',
      });
    }
    return true;
  },
});
new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: asyncSource,
  routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
  limits: { maxRouteHopDepth: 2 },
  async shouldExpandVertexOccurrence(vertex, context) {
    if (context.routeEnumerationPolicy !== 'firstAdmittedFoundRoutePerVertex') {
      const path: GraphWalkEventForObservationKind<
        string,
        number,
        Phase.ROUTE_PREFIX,
        undefined
      > = context.routePrefix;
      const data: string = vertex.vertexData;
      void [path, data];
    }
    return true;
  },
});

// Null explicitly clears optional predicates in both initial options and patches.
const nullSyncOptions: GraphWalkBuilderOptions<string, number, undefined> = {
  graphWalkDiscoverySource: source,
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
};
const nullAsyncOptions: AsyncGraphWalkBuilderOptions<
  string,
  number,
  undefined
> = {
  graphWalkDiscoverySource: asyncSource,
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
};
const nullPatch: GraphWalkBuilderOptionsPatch<string, number, undefined> = {
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
};
const nullAsyncPatch: AsyncGraphWalkBuilderOptionsPatch<
  string,
  number,
  undefined
> = nullPatch;
new GraphWalkBuilder(nullSyncOptions).patchOptionsForFutureRunners(nullPatch);
new AsyncGraphWalkBuilder(nullAsyncOptions).patchOptionsForFutureRunners(
  nullAsyncPatch,
);
const invalidPredicates: GraphWalkBuilderOptionsPatch<
  string,
  number,
  undefined
> = {
  // @ts-expect-error Predicates accept callbacks or null, never booleans.
  shouldAdmitOutgoingLinkTarget: false,
  // @ts-expect-error Predicates accept callbacks or null, never numbers.
  shouldExpandVertexOccurrence: 0,
};
const invalidAsyncPredicates: AsyncGraphWalkBuilderOptionsPatch<
  string,
  number,
  undefined
> = {
  // @ts-expect-error Async predicates accept callbacks or null, never booleans.
  shouldAdmitOutgoingLinkTarget: false,
  // @ts-expect-error Async predicates accept callbacks or null, never numbers.
  shouldExpandVertexOccurrence: 0,
};
void [invalidPredicates, invalidAsyncPredicates];

new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  shouldAdmitOutgoingLinkTarget: undefined,
  shouldExpandVertexOccurrence: undefined,
}).patchOptionsForFutureRunners({
  shouldAdmitOutgoingLinkTarget: undefined,
  shouldExpandVertexOccurrence: undefined,
});
new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: asyncSource,
  shouldAdmitOutgoingLinkTarget: undefined,
  shouldExpandVertexOccurrence: undefined,
}).patchOptionsForFutureRunners({
  shouldAdmitOutgoingLinkTarget: undefined,
  shouldExpandVertexOccurrence: undefined,
});

const edgePredicate: import('../src').GraphWalkLinkTargetAdmissionPredicate<
  string,
  number,
  undefined
> = () => true;
const expansionPredicate: import('../src').GraphWalkVertexOccurrenceExpansionPredicate<
  string,
  number,
  undefined
> = () => true;
const asyncEdgePredicate: import('../src').AsyncGraphWalkLinkTargetAdmissionPredicate<
  string,
  number,
  undefined
> = async () => true;
const asyncExpansionPredicate: import('../src').AsyncGraphWalkVertexOccurrenceExpansionPredicate<
  string,
  number,
  undefined
> = async () => true;
void [
  edgePredicate,
  expansionPredicate,
  asyncEdgePredicate,
  asyncExpansionPredicate,
];
// @ts-expect-error Previous predicate type names are removed.
type RemovedEdgePredicate = import('../src').GraphWalkFollowEdge<
  string,
  number,
  undefined
>;
// @ts-expect-error Previous expansion type names are removed.
type RemovedExpansionPredicate = import('../src').GraphWalkExpandVertex<
  string,
  number,
  undefined
>;
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  // @ts-expect-error Previous predicate options are removed.
  followEdge: () => true,
});
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
  // @ts-expect-error Previous read budget is removed, including in bounded revisit mode.
  limits: { maxSteps: 1 },
});
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  // @ts-expect-error Previous admission budget is removed.
  limits: { maxOccurrences: 1 },
});
const canonicalCounts: {
  rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number;
  admittedRootOrLinkTargetOccurrences: number;
  acknowledgedObservationCountsByKind: Readonly<Record<Phase, number>>;
} = runner.captureProgressSnapshot().counts;
// @ts-expect-error Previous count fields are removed.
runner.captureProgressSnapshot().counts.steps;
// @ts-expect-error Previous inspection field is removed.
runner.captureExecutionSnapshot().iterableConfig;
// @ts-expect-error Previous visitor coordinate is removed.
runner.captureExecutionSnapshot().visitorChainPosition?.position;
registered.registerVisitorForObservationKind(
  Phase.ADMITTED_EDGE_OCCURRENCE,
  (event, context) => {
    const coordinates: readonly number[] = [
      context.admittedTargetOccurrenceIndex,
      context.observationIndexWithinKind,
      event.edge.sourceOutgoingLinkIndexBeforeFiltering,
    ];
    // @ts-expect-error Previous admission coordinate is removed.
    context.occurrenceIndex;
    // @ts-expect-error Previous phase observation coordinate is removed.
    context.observationIndex;
    // @ts-expect-error Previous edge coordinate is removed.
    event.edge.index;
    void coordinates;
  },
);
void (null as unknown as RemovedEdgePredicate);
void (null as unknown as RemovedExpansionPredicate);
void canonicalCounts;
