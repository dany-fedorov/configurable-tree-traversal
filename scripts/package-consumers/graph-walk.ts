import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  DagVisitorPhase as DagPhase,
  TraversalVisitorCommandName as Command,
  graphWalk,
  createAndRunGraphWalkUntilSuspendedOrTerminal,
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync,
  materializeGraphWalkSourceFromVertexRecords,
  materializeSynchronousGraphWalkSourceFromAsyncRecords,
  materializeGraphWalkSourceFromDagDeclarationRelations,
  copyAndNormalizeDagDefinition,
  type GraphWalkDiscoverySource,
  type AsyncGraphWalkDiscoverySource,
  type GraphWalkRunner,
  type AsyncGraphWalkRunner,
  type GraphWalkEvent,
  type GraphWalkEventForObservationKind,
  type GraphWalkVertexResolutionTarget,
  type GraphWalkDagDeclarationRelation,
} from 'configurable-tree-traversal';
import * as walking from 'configurable-tree-traversal/traversals/graph-walk';
import type rootCjs = require('configurable-tree-traversal');
import walkingCjs = require('configurable-tree-traversal/traversals/graph-walk');

const symbolId = Symbol('id');
const objectId = { key: 'identity' };
type ID =
  | typeof symbolId
  | typeof objectId
  | undefined
  | null
  | number
  | 'root';
type Data = { label: string };
type Relation = { kind: 'imports' | 'references' };
const relation: Relation = { kind: 'references' };
const target: GraphWalkVertexResolutionTarget<Data, ID> = {
  vertexId: objectId,
  resolutionIfNotPreviouslyAdmitted: {
    kind: 'found',
    vertexData: { label: 'root' },
  },
};
const source: GraphWalkDiscoverySource<Data, Relation, ID> = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
  enumerateRootTargets: () => [
    target,
    {
      vertexId: undefined,
      resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' },
    },
  ],
  resolveVertexDataById: (vertexId) => {
    const id: ID = vertexId;
    void id;
    return { kind: 'omitted' };
  },
  enumerateOutgoingLinks: (vertex) => {
    const id: ID = vertex.vertexId;
    const data: Data = vertex.vertexData;
    void [id, data];
    return [
      {
        targetToResolveOnAdmission: { vertexId: symbolId },
        edgeData: relation,
      },
    ];
  },
};
const asyncSource: AsyncGraphWalkDiscoverySource<Data, Relation, ID> = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
  async *enumerateRootTargets() {
    yield target;
  },
  resolveVertexDataById: async () => ({ kind: 'omitted' }),
  async *enumerateOutgoingLinks(vertex) {
    const id: ID = vertex.vertexId;
    const data: Data = vertex.vertexData;
    void [id, data];
    yield {
      targetToResolveOnAdmission: {
        vertexId: null,
        resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' as const },
      },
      edgeData: relation,
    };
  },
};
const result = createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    [Phase.VERTEX_OCCURRENCE]: (event, context) => {
      const id: ID = event.vertex.vertexId;
      const data: Data = event.vertex.vertexData;
      const phase: Phase.VERTEX_OCCURRENCE = context.observationKind;
      // @ts-expect-error Vertex callbacks cannot see relationship records.
      event.edge;
      void [id, data, phase];
    },
    [Phase.ADMITTED_EDGE_OCCURRENCE]: (event) => {
      const from: ID = event.edge.fromVertexId;
      const to: ID = event.edge.toVertexId;
      const data: Relation = event.edge.edgeData;
      const sourceData: Data = event.fromVertex.vertexData;
      if (event.targetResolution.kind === 'found') {
        const targetData: Data = event.targetResolution.vertex.vertexData;
        const targetId: ID = event.targetResolution.vertex.vertexId;
        void [targetData, targetId];
      } else {
        const omitted: 'omitted' = event.targetResolution.kind;
        // @ts-expect-error Omitted targets have no fabricated vertex.
        event.targetResolution.vertex;
        void omitted;
      }
      void [from, to, data, sourceData];
      return { commands: [{ commandName: Command.NO_OPERATION }] };
    },
  },
});
const inferred: GraphWalkRunner<Data, Relation, ID> = result;
const subpath: walking.GraphWalkRunner<Data, Relation, ID> = inferred;
const namespace: graphWalk.GraphWalkRunner<Data, Relation, ID> = subpath;
const required: rootCjs.GraphWalkRunner<Data, Relation, ID> = namespace;
const requiredSubpath: walkingCjs.GraphWalkRunner<Data, Relation, ID> =
  required;
const constructorIdentity: typeof GraphWalkBuilder =
  walkingCjs.GraphWalkBuilder;
const helperIdentity: typeof createAndRunGraphWalkUntilSuspendedOrTerminal =
  walking.createAndRunGraphWalkUntilSuspendedOrTerminal;
const namespaceIdentity: typeof createAndRunGraphWalkUntilSuspendedOrTerminal =
  graphWalk.createAndRunGraphWalkUntilSuspendedOrTerminal;
const asyncConstructorIdentity: typeof AsyncGraphWalkBuilder =
  walking.AsyncGraphWalkBuilder;
const asyncRequiredConstructorIdentity: typeof AsyncGraphWalkBuilder =
  walkingCjs.AsyncGraphWalkBuilder;
const asyncHelperIdentity: typeof createAndRunGraphWalkUntilSuspendedOrTerminalAsync =
  walkingCjs.createAndRunGraphWalkUntilSuspendedOrTerminalAsync;
const asynchronous = createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: asyncSource,
  visitorsByObservationKind: {
    [Phase.ADMITTED_EDGE_OCCURRENCE]: async (event) => {
      const data: Relation = event.edge.edgeData;
      const id: ID = event.edge.toVertexId;
      void [data, id];
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    },
  },
});
const promised: Promise<AsyncGraphWalkRunner<Data, Relation, ID>> =
  asynchronous;
asynchronous.then((runner) => {
  const sub: walking.AsyncGraphWalkRunner<Data, Relation, ID> = runner;
  const cjs: walkingCjs.AsyncGraphWalkRunner<Data, Relation, ID> = sub;
  const ns: graphWalk.AsyncGraphWalkRunner<Data, Relation, ID> = cjs;
  const mixed: AsyncGenerator<
    GraphWalkEventForObservationKind<
      Data,
      Relation,
      Phase.ADMITTED_EDGE_OCCURRENCE | Phase.VERTEX_OCCURRENCE,
      ID
    >,
    void,
    unknown
  > = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [
      Phase.ADMITTED_EDGE_OCCURRENCE,
      Phase.VERTEX_OCCURRENCE,
    ],
  });
  // @ts-expect-error No explicit selector retains the full event union.
  const narrow: typeof mixed =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  void [ns, mixed, narrow];
});
const mixed: Generator<
  GraphWalkEventForObservationKind<
    Data,
    Relation,
    Phase.VERTEX_OCCURRENCE | Phase.ADMITTED_EDGE_OCCURRENCE,
    ID
  >,
  void,
  unknown
> = result.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  deliveredEventKinds: [
    Phase.VERTEX_OCCURRENCE,
    Phase.ADMITTED_EDGE_OCCURRENCE,
  ],
});
for (const event of mixed) {
  if (event.eventKind === 'admittedEdgeOccurrence') {
    const edge: Relation = event.edge.edgeData;
    void edge;
  } else {
    const data: Data = event.vertex.vertexData;
    void data;
  }
  // @ts-expect-error Explicit mixed selectors exclude path records.
  event.verticesInRootToTargetOrder;
}
const all: Generator<
  GraphWalkEvent<Data, Relation, ID>,
  void,
  unknown
> = result.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const narrowLegacy: typeof mixed =
  result.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    // @ts-expect-error Legacy selectors are not canonical execution inputs.
    iterateOver: [Phase.ADMITTED_EDGE_OCCURRENCE],
  });
// @ts-expect-error No selector cannot promise only the selected phases.
const narrowAll: typeof mixed =
  result.runAndIterateObservationEventsUntilSuspendedOrTerminal();

createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
  limits: { maxRouteHopDepth: 2 },
  visitorsByObservationKind: {
    [Phase.ROUTE_PREFIX]: (event) => {
      const ids: readonly ID[] = event.verticesInRootToTargetOrder.map(
        (vertex) => vertex.vertexId,
      );
      const relationships: readonly Relation[] =
        event.edgesInRootToTargetOrder.map((edge) => edge.edgeData);
      void [ids, relationships];
    },
  },
});
createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: asyncSource,
  routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
  limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 10 },
});
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
}).patchOptionsForFutureRunners({
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
});
new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: asyncSource,
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
}).patchOptionsForFutureRunners({
  shouldAdmitOutgoingLinkTarget: null,
  shouldExpandVertexOccurrence: null,
});
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
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  // @ts-expect-error Nullable reset does not admit nonfunction predicates.
}).patchOptionsForFutureRunners({ shouldAdmitOutgoingLinkTarget: false });
new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: asyncSource,
}).patchOptionsForFutureRunners({
  // @ts-expect-error Async predicates accept callbacks or null, never booleans.
  shouldExpandVertexOccurrence: false,
});
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
}).patchOptionsForFutureRunners({
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
});
new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: source,
}).patchOptionsForFutureRunners({
  routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
});
// @ts-expect-error Route enumeration always requires depth or step bounds.
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
});
// @ts-expect-error Occurrence limits alone do not bound route expansion.
createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
  limits: { maxAdmittedRootOrLinkTargetOccurrences: 2 },
});
// @ts-expect-error New helpers accept only the canonical options object.
createAndRunGraphWalkUntilSuspendedOrTerminal(source, {});
// @ts-expect-error Async helpers have no obsolete positional visitor overload.
createAndRunGraphWalkUntilSuspendedOrTerminalAsync(source, null);
createAndRunGraphWalkUntilSuspendedOrTerminal({
  // @ts-expect-error Sync source callbacks cannot return promises.
  graphWalkDiscoverySource: { ...source, enumerateRootTargets: async () => [] },
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: {
    ...source,
    // @ts-expect-error Sync resolution cannot return a promise.
    resolveVertexDataById: async () => ({ kind: 'omitted' }),
  },
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: {
    ...source,
    // @ts-expect-error Sync outgoing cannot return an async iterator.
    enumerateOutgoingLinks: async function* () {
      yield { targetToResolveOnAdmission: target, edgeData: relation };
    },
  },
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  // @ts-expect-error Sync predicates cannot return promises.
  shouldAdmitOutgoingLinkTarget: async () => true,
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    // @ts-expect-error Sync visitors cannot return promises.
    [Phase.ADMITTED_EDGE_OCCURRENCE]: async () => undefined,
  },
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  // @ts-expect-error DAG phases are not graph walking observation phases.
  deliveredEventKinds: [DagPhase.ON_WORK_READY],
});
createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: source,
  // @ts-expect-error Async execution cannot accept DAG phases either.
  admittedVisitorCallbackPhases: [DagPhase.ON_SUBGRAPH_COMPLETION_READY],
});
result.runUntilSuspendedOrTerminal({
  // @ts-expect-error Runners remain family-safe.
  deliveredEventKinds: [DagPhase.ON_WORK_READY],
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    // @ts-expect-error Walking does not support work settlement commands.
    [Phase.ADMITTED_EDGE_OCCURRENCE]: () => ({
      commands: [
        {
          commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
        },
      ],
    }),
  },
});
createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    // @ts-expect-error Async walking cannot mutate the tree topology.
    [Phase.VERTEX_OCCURRENCE]: async () => ({
      commands: [
        {
          commandName:
            Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
        },
      ],
    }),
  },
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    // @ts-expect-error Walking does not support rewrite commands.
    [Phase.ADMITTED_EDGE_OCCURRENCE]: () => ({
      commands: [
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: { replacementVertexData: 'value' },
        },
      ],
    }),
  },
});

const items = [{ id: symbolId, label: 'item' }];
const catalog = materializeGraphWalkSourceFromVertexRecords(items, {
  getVertexId: (item) => item.id,
  enumerateOutgoingLinks: (item) => [
    { toVertexId: item.id, edgeData: relation },
  ],
  rootVertexIds: [symbolId],
});
const catalogTyped: walking.GraphWalkDiscoverySource<
  typeof items[number],
  Relation,
  symbol
> = catalog;
const materialized: Promise<
  GraphWalkDiscoverySource<typeof items[number], Relation, symbol>
> = materializeSynchronousGraphWalkSourceFromAsyncRecords(items, {
  getVertexId: async (item) => item.id,
  enumerateOutgoingLinks: async (item) => [
    { toVertexId: item.id, edgeData: relation },
  ],
  rootVertexIds: [symbolId],
});
materialized.then((value) => {
  new GraphWalkBuilder({ graphWalkDiscoverySource: value });
  new AsyncGraphWalkBuilder({ graphWalkDiscoverySource: value });
});
const definition = copyAndNormalizeDagDefinition<Data, ID>({
  vertexDeclarations: [
    {
      vertexId: objectId,
      data: { label: 'task' },
      childDiscoverySlots: [
        { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
      ],
      workWaitsForWorkOf: [objectId],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [undefined],
  entry: { kind: 'root', vertexId: objectId },
});
const dag = materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
  includeDeclarationRelations: [
    'parentToChildSlots',
    'dependentToWorkPrerequisites',
  ],
});
const projected: GraphWalkDiscoverySource<
  Data,
  GraphWalkDagDeclarationRelation,
  ID
> = dag;
const child: walking.GraphWalkDagDeclarationRelation = {
  kind: 'structuralChildSlot',
  childSlotIndex: 0,
};
const namespaceRelation: graphWalk.GraphWalkDagDeclarationRelation = child;
new GraphWalkBuilder({
  graphWalkDiscoverySource: dag,
}).registerVisitorForObservationKind(Phase.ADMITTED_EDGE_OCCURRENCE, (event) => {
  if (event.edge.edgeData.kind === 'structuralChildSlot') {
    const index: number = event.edge.edgeData.childSlotIndex;
    void index;
  } else {
    // @ts-expect-error Milestone labels have no structural child slot.
    event.edge.edgeData.childSlotIndex;
  }
});
// @ts-expect-error DAG projection must explicitly choose relationships.
materializeGraphWalkSourceFromDagDeclarationRelations(definition);
materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
  // @ts-expect-error The relationship selection is nonempty.
  includeDeclarationRelations: [],
});
void [
  requiredSubpath,
  constructorIdentity,
  helperIdentity,
  namespaceIdentity,
  asyncConstructorIdentity,
  asyncRequiredConstructorIdentity,
  asyncHelperIdentity,
  promised,
  all,
  narrowLegacy,
  narrowAll,
  catalogTyped,
  materialized,
  projected,
  namespaceRelation,
];

const canonicalEdgePredicate: import('configurable-tree-traversal').GraphWalkLinkTargetAdmissionPredicate<
  string,
  Relation,
  ID
> = () => true;
const canonicalExpansionPredicate: import('configurable-tree-traversal').GraphWalkVertexOccurrenceExpansionPredicate<
  string,
  Relation,
  ID
> = () => false;
const canonicalAsyncEdgePredicate: import('configurable-tree-traversal').AsyncGraphWalkLinkTargetAdmissionPredicate<
  string,
  Relation,
  ID
> = async () => true;
const canonicalAsyncExpansionPredicate: import('configurable-tree-traversal').AsyncGraphWalkVertexOccurrenceExpansionPredicate<
  string,
  Relation,
  ID
> = async () => false;
const walkingCounts: {
  rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number;
  admittedRootOrLinkTargetOccurrences: number;
  resolvedFoundVertexIdCount: number;
  resolvedOmittedVertexIdCount: number;
  freshSourceOutgoingLinkCount: number;
  acknowledgedObservationCountsByKind: Readonly<Record<Phase, number>>;
} = result.captureProgressSnapshot().counts;
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
}).registerVisitorForObservationKind(
  Phase.ADMITTED_EDGE_OCCURRENCE,
  (event, context) => {
    const coordinates: number[] = [
      event.edge.sourceOutgoingLinkIndexBeforeFiltering,
      context.admittedTargetOccurrenceIndex,
      context.observationIndexWithinKind,
    ];
    void coordinates;
  },
);
void [
  canonicalEdgePredicate,
  canonicalExpansionPredicate,
  canonicalAsyncEdgePredicate,
  canonicalAsyncExpansionPredicate,
  walkingCounts,
];

const catalogRelation: rootCjs.GraphWalkCatalogOutgoingLinkToVertexId<
  Relation,
  symbol
> = {
  toVertexId: symbolId,
  edgeData: relation,
};
const namedSelectors: walking.GraphWalkRecordMaterializationOptions<
  typeof items[number],
  Relation,
  symbol
> = {
  getVertexId: (item) => item.id,
  enumerateOutgoingLinks: () => [catalogRelation],
  rootVertexIds: [symbolId],
};
const rootSelectors: graphWalk.GraphWalkRecordMaterializationOptions<
  typeof items[number],
  Relation,
  symbol
> = namedSelectors;
const namedAsyncSelectors: walkingCjs.AsyncGraphWalkRecordMaterializationOptions<
  typeof items[number],
  Relation,
  symbol
> = {
  getVertexId: async (item) => item.id,
  enumerateOutgoingLinks: async function* () {
    yield catalogRelation;
  },
  rootVertexIds: [symbolId],
};
const rootAsyncSelectors: rootCjs.AsyncGraphWalkRecordMaterializationOptions<
  typeof items[number],
  Relation,
  symbol
> = namedAsyncSelectors;
// @ts-expect-error Catalog relation endpoints are readonly.
catalogRelation.toVertexId = symbolId;
// @ts-expect-error Catalog relation data fields are readonly.
catalogRelation.edgeData = relation;
const declaredSource = materializeGraphWalkSourceFromVertexRecords(
  items,
  rootSelectors,
);
const declaredMode: 'resolverWithOptionalInlineResolution' =
  declaredSource.vertexResolutionMode;
declaredSource.resolveVertexDataById(symbolId);
materializeSynchronousGraphWalkSourceFromAsyncRecords(
  items,
  rootAsyncSelectors,
).then((value) => {
  const mode: 'resolverWithOptionalInlineResolution' =
    value.vertexResolutionMode;
  const resolution: walking.GraphWalkVertexResolutionResult<
    typeof items[number]
  > = value.resolveVertexDataById(symbolId);
  new GraphWalkBuilder({ graphWalkDiscoverySource: value });
  void [mode, resolution];
});
// @ts-expect-error Walking hydration mode is required.
const noMode: walking.GraphWalkDiscoverySource<Data, Relation, ID> = {
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: () => [],
};
// @ts-expect-error Resolver sources require resolveVertex.
const noResolver: walking.GraphWalkDiscoverySource<Data, Relation, ID> = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution',
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: () => [],
};
const cachedSource: rootCjs.GraphWalkDiscoverySource<Data, Relation, ID> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  enumerateRootTargets: () => [
    {
      kind: 'inlineResolution',
      vertexId: objectId,
      resolutionIfNotPreviouslyAdmitted: {
        kind: 'found',
        vertexData: { label: 'root' },
      },
    },
  ],
  enumerateOutgoingLinks: () => [
    {
      targetToResolveOnAdmission: {
        kind: 'previouslyAdmittedVertex',
        vertexId: objectId,
      },
      edgeData: relation,
    },
  ],
};
// @ts-expect-error No-resolver walking sources require tagged targets.
const untaggedSource: walking.GraphWalkDiscoverySource<Data, Relation, ID> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  enumerateRootTargets: () => [{ vertexId: objectId }],
  enumerateOutgoingLinks: () => [],
};
void [declaredMode, noMode, noResolver, cachedSource, untaggedSource];
