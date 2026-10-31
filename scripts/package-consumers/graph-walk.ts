import {
  GraphWalk,
  AsyncGraphWalk,
  GraphWalkPhase as Phase,
  DagVisitorPhase as DagPhase,
  TraversalVisitorCommandName as Command,
  graphWalk,
  walkGraph,
  walkGraphAsync,
  materializeWalkSourceFromRecords,
  materializeWalkSourceFromRecordsAsync,
  materializeWalkSourceFromDagDefinition,
  defineDag,
  type GraphWalkSource,
  type AsyncGraphWalkSource,
  type GraphWalkRunner,
  type AsyncGraphWalkRunner,
  type GraphWalkEvent,
  type GraphWalkEventFor,
  type GraphWalkTarget,
  type GraphWalkDagRelation,
} from 'configurable-tree-traversal';
import * as walking from 'configurable-tree-traversal/traversals/graph-walk';
import rootCjs = require('configurable-tree-traversal');
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
const target: GraphWalkTarget<Data, ID> = {
  vertexId: objectId,
  resolution: { kind: 'found', data: { label: 'root' } },
};
const source: GraphWalkSource<Data, Relation, ID> = {
  hydration: 'resolver' as const,
  roots: () => [
    target,
    { vertexId: undefined, resolution: { kind: 'omitted' } },
  ],
  resolveVertex: (vertexId) => {
    const id: ID = vertexId;
    void id;
    return { kind: 'omitted' };
  },
  outgoing: (vertex) => {
    const id: ID = vertex.vertexId;
    const data: Data = vertex.data;
    void [id, data];
    return [{ target: { vertexId: symbolId }, data: relation }];
  },
};
const asyncSource: AsyncGraphWalkSource<Data, Relation, ID> = {
  hydration: 'resolver' as const,
  async *roots() {
    yield target;
  },
  resolveVertex: async () => ({ kind: 'omitted' }),
  async *outgoing(vertex) {
    const id: ID = vertex.vertexId;
    const data: Data = vertex.data;
    void [id, data];
    yield {
      target: { vertexId: null, resolution: { kind: 'omitted' as const } },
      data: relation,
    };
  },
};
const result = walkGraph({
  source,
  visitors: {
    [Phase.VERTEX]: (event, context) => {
      const id: ID = event.vertex.vertexId;
      const data: Data = event.vertex.data;
      const phase: Phase.VERTEX = context.phase;
      // @ts-expect-error Vertex callbacks cannot see relationship records.
      event.edge;
      void [id, data, phase];
    },
    [Phase.EDGE]: (event) => {
      const from: ID = event.edge.from;
      const to: ID = event.edge.to;
      const data: Relation = event.edge.data;
      const sourceData: Data = event.fromVertex.data;
      if (event.target.kind === 'found') {
        const targetData: Data = event.target.vertex.data;
        const targetId: ID = event.target.vertex.vertexId;
        void [targetData, targetId];
      } else {
        const omitted: 'omitted' = event.target.kind;
        // @ts-expect-error Omitted targets have no fabricated vertex.
        event.target.vertex;
        void omitted;
      }
      void [from, to, data, sourceData];
      return { commands: [{ commandName: Command.NOOP }] };
    },
  },
});
const inferred: GraphWalkRunner<Data, Relation, ID> = result;
const subpath: walking.GraphWalkRunner<Data, Relation, ID> = inferred;
const namespace: graphWalk.GraphWalkRunner<Data, Relation, ID> = subpath;
const required: rootCjs.GraphWalkRunner<Data, Relation, ID> = namespace;
const requiredSubpath: walkingCjs.GraphWalkRunner<Data, Relation, ID> =
  required;
const constructorIdentity: typeof GraphWalk = walkingCjs.GraphWalk;
const helperIdentity: typeof walkGraph = walking.walkGraph;
const namespaceIdentity: typeof walkGraph = graphWalk.walkGraph;
const asyncConstructorIdentity: typeof AsyncGraphWalk = walking.AsyncGraphWalk;
const asyncRequiredConstructorIdentity: typeof AsyncGraphWalk =
  walkingCjs.AsyncGraphWalk;
const asyncHelperIdentity: typeof walkGraphAsync = walkingCjs.walkGraphAsync;
const asynchronous = walkGraphAsync({
  source: asyncSource,
  visitors: {
    [Phase.EDGE]: async (event) => {
      const data: Relation = event.edge.data;
      const id: ID = event.edge.to;
      void [data, id];
      return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
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
    GraphWalkEventFor<Data, Relation, Phase.EDGE | Phase.VERTEX, ID>,
    void,
    unknown
  > = runner.iterateEvents({ emitEvents: [Phase.EDGE, Phase.VERTEX] });
  // @ts-expect-error No explicit selector retains the full event union.
  const narrow: typeof mixed = runner.iterateEvents();
  void [ns, mixed, narrow];
});
const mixed: Generator<
  GraphWalkEventFor<Data, Relation, Phase.VERTEX | Phase.EDGE, ID>,
  void,
  unknown
> = result.iterateEvents({ emitEvents: [Phase.VERTEX, Phase.EDGE] });
for (const event of mixed) {
  if (event.kind === 'edge') {
    const edge: Relation = event.edge.data;
    void edge;
  } else {
    const data: Data = event.vertex.data;
    void data;
  }
  // @ts-expect-error Explicit mixed selectors exclude path records.
  event.vertices;
}
const all: Generator<
  GraphWalkEvent<Data, Relation, ID>,
  void,
  unknown
> = result.iterateEvents();
const narrowLegacy: typeof mixed = result.iterateEvents({
  // @ts-expect-error Legacy selectors are not canonical execution inputs.
  iterateOver: [Phase.EDGE],
});
// @ts-expect-error No selector cannot promise only the selected phases.
const narrowAll: typeof mixed = result.iterateEvents();

walkGraph({
  source,
  revisit: 'walks',
  limits: { maxDepth: 2 },
  visitors: {
    [Phase.PATH]: (event) => {
      const ids: readonly ID[] = event.vertices.map(
        (vertex) => vertex.vertexId,
      );
      const relationships: readonly Relation[] = event.edges.map(
        (edge) => edge.data,
      );
      void [ids, relationships];
    },
  },
});
walkGraphAsync({
  source: asyncSource,
  revisit: 'simplePaths',
  limits: { maxCandidateReadAttempts: 10 },
});
new GraphWalk({
  source,
  shouldFollowEdge: null,
  shouldExpandVertex: null,
}).configure({
  shouldFollowEdge: null,
  shouldExpandVertex: null,
});
new AsyncGraphWalk({
  source: asyncSource,
  shouldFollowEdge: null,
  shouldExpandVertex: null,
}).configure({
  shouldFollowEdge: null,
  shouldExpandVertex: null,
});
new GraphWalk({
  source,
  shouldFollowEdge: undefined,
  shouldExpandVertex: undefined,
}).configure({
  shouldFollowEdge: undefined,
  shouldExpandVertex: undefined,
});
new AsyncGraphWalk({
  source: asyncSource,
  shouldFollowEdge: undefined,
  shouldExpandVertex: undefined,
}).configure({
  shouldFollowEdge: undefined,
  shouldExpandVertex: undefined,
});
// @ts-expect-error Nullable reset does not admit nonfunction predicates.
new GraphWalk({ source }).configure({ shouldFollowEdge: false });
new AsyncGraphWalk({ source: asyncSource }).configure({
  // @ts-expect-error Async predicates accept callbacks or null, never booleans.
  shouldExpandVertex: false,
});
new GraphWalk({ source }).configure({ revisit: 'walks' });
new AsyncGraphWalk({ source }).configure({ revisit: 'simplePaths' });
// @ts-expect-error Route enumeration always requires depth or step bounds.
walkGraph({ source, revisit: 'walks' });
// @ts-expect-error Occurrence limits alone do not bound route expansion.
walkGraphAsync({
  source,
  revisit: 'simplePaths',
  limits: { maxAdmittedTargets: 2 },
});
// @ts-expect-error New helpers accept only the canonical options object.
walkGraph(source, {});
// @ts-expect-error Async helpers have no obsolete positional visitor overload.
walkGraphAsync(source, null);
// @ts-expect-error Sync source callbacks cannot return promises.
walkGraph({ source: { ...source, roots: async () => [] } });
walkGraph({
  // @ts-expect-error Sync resolution cannot return a promise.
  source: { ...source, resolveVertex: async () => ({ kind: 'omitted' }) },
});
walkGraph({
  source: {
    ...source,
    // @ts-expect-error Sync outgoing cannot return an async iterator.
    outgoing: async function* () {
      yield { target, data: relation };
    },
  },
});
// @ts-expect-error Sync predicates cannot return promises.
walkGraph({ source, shouldFollowEdge: async () => true });
// @ts-expect-error Sync visitors cannot return promises.
walkGraph({ source, visitors: { [Phase.EDGE]: async () => undefined } });
// @ts-expect-error DAG phases are not graph walking observation phases.
walkGraph({ source, emitEvents: [DagPhase.ON_WORK_READY] });
// @ts-expect-error Async execution cannot accept DAG phases either.
walkGraphAsync({ source, visitorPhases: [DagPhase.ON_SUBGRAPH_READY] });
// @ts-expect-error Runners remain family-safe.
result.run({ emitEvents: [DagPhase.ON_WORK_READY] });
walkGraph({
  source,
  visitors: {
    // @ts-expect-error Walking does not support work settlement commands.
    [Phase.EDGE]: () => ({
      commands: [{ commandName: Command.DEFER_WORK_COMPLETION }],
    }),
  },
});
walkGraphAsync({
  source,
  visitors: {
    // @ts-expect-error Async walking cannot mutate the tree topology.
    [Phase.VERTEX]: async () => ({
      commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
    }),
  },
});
walkGraph({
  source,
  visitors: {
    // @ts-expect-error Walking does not support rewrite commands.
    [Phase.EDGE]: () => ({
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: { newData: 'value' },
        },
      ],
    }),
  },
});

const items = [{ id: symbolId, label: 'item' }];
const catalog = materializeWalkSourceFromRecords(items, {
  id: (item) => item.id,
  outgoing: (item) => [{ to: item.id, data: relation }],
  roots: [symbolId],
});
const catalogTyped: walking.GraphWalkSource<
  typeof items[number],
  Relation,
  symbol
> = catalog;
const materialized: Promise<
  GraphWalkSource<typeof items[number], Relation, symbol>
> = materializeWalkSourceFromRecordsAsync(items, {
  id: async (item) => item.id,
  outgoing: async (item) => [{ to: item.id, data: relation }],
  roots: [symbolId],
});
materialized.then((value) => {
  new GraphWalk({ source: value });
  new AsyncGraphWalk({ source: value });
});
const definition = defineDag<Data, ID>({
  vertices: [
    {
      vertexId: objectId,
      data: { label: 'task' },
      slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
      dependsOnWork: [objectId],
      dependsOnSubgraphCompletion: [],
    },
  ],
  omittedIds: [undefined],
  entry: { kind: 'root', vertexId: objectId },
});
const dag = materializeWalkSourceFromDagDefinition(definition, {
  relations: ['children', 'workDependencies'],
});
const projected: GraphWalkSource<Data, GraphWalkDagRelation, ID> = dag;
const child: walking.GraphWalkDagRelation = { kind: 'child', slotIndex: 0 };
const namespaceRelation: graphWalk.GraphWalkDagRelation = child;
new GraphWalk({ source: dag }).addVisitorFor(Phase.EDGE, (event) => {
  if (event.edge.data.kind === 'child') {
    const index: number = event.edge.data.slotIndex;
    void index;
  } else {
    // @ts-expect-error Milestone labels have no structural child slot.
    event.edge.data.slotIndex;
  }
});
// @ts-expect-error DAG projection must explicitly choose relationships.
materializeWalkSourceFromDagDefinition(definition);
// @ts-expect-error The relationship selection is nonempty.
materializeWalkSourceFromDagDefinition(definition, { relations: [] });
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

const canonicalEdgePredicate: import('configurable-tree-traversal').GraphWalkEdgePredicate<
  string,
  Relation,
  ID
> = () => true;
const canonicalExpansionPredicate: import('configurable-tree-traversal').GraphWalkExpansionPredicate<
  string,
  Relation,
  ID
> = () => false;
const canonicalAsyncEdgePredicate: import('configurable-tree-traversal').AsyncGraphWalkEdgePredicate<
  string,
  Relation,
  ID
> = async () => true;
const canonicalAsyncExpansionPredicate: import('configurable-tree-traversal').AsyncGraphWalkExpansionPredicate<
  string,
  Relation,
  ID
> = async () => false;
const walkingCounts: {
  candidateReadAttempts: number;
  admittedTargets: number;
  uniqueFoundVertices: number;
  uniqueOmittedVertices: number;
  discoveredLinks: number;
  processedObservations: Readonly<Record<Phase, number>>;
} = result.summary().counts;
new GraphWalk({ source }).addVisitorFor(Phase.EDGE, (event, context) => {
  const coordinates: number[] = [
    event.edge.outgoingIndex,
    context.admissionIndex,
    context.phaseObservationIndex,
  ];
  void coordinates;
});
void [
  canonicalEdgePredicate,
  canonicalExpansionPredicate,
  canonicalAsyncEdgePredicate,
  canonicalAsyncExpansionPredicate,
  walkingCounts,
];

const catalogRelation: rootCjs.GraphWalkCatalogLink<Relation, symbol> = {
  to: symbolId,
  data: relation,
};
const namedSelectors: walking.GraphWalkRecordSelectors<
  typeof items[number],
  Relation,
  symbol
> = {
  id: (item) => item.id,
  outgoing: () => [catalogRelation],
  roots: [symbolId],
};
const rootSelectors: graphWalk.GraphWalkRecordSelectors<
  typeof items[number],
  Relation,
  symbol
> = namedSelectors;
const namedAsyncSelectors: walkingCjs.AsyncGraphWalkRecordSelectors<
  typeof items[number],
  Relation,
  symbol
> = {
  id: async (item) => item.id,
  outgoing: async function* () {
    yield catalogRelation;
  },
  roots: [symbolId],
};
const rootAsyncSelectors: rootCjs.AsyncGraphWalkRecordSelectors<
  typeof items[number],
  Relation,
  symbol
> = namedAsyncSelectors;
// @ts-expect-error Catalog relation endpoints are readonly.
catalogRelation.to = symbolId;
// @ts-expect-error Catalog relation data fields are readonly.
catalogRelation.data = relation;
const declaredSource = materializeWalkSourceFromRecords(items, rootSelectors);
const declaredMode: 'resolver' = declaredSource.hydration;
declaredSource.resolveVertex(symbolId);
materializeWalkSourceFromRecordsAsync(items, rootAsyncSelectors).then(
  (value) => {
    const mode: 'resolver' = value.hydration;
    const resolution: walking.GraphWalkVertexResult<typeof items[number]> =
      value.resolveVertex(symbolId);
    new GraphWalk({ source: value });
    void [mode, resolution];
  },
);
// @ts-expect-error Walking hydration mode is required.
const noMode: walking.GraphWalkSource<Data, Relation, ID> = {
  roots: () => [],
  outgoing: () => [],
};
// @ts-expect-error Resolver sources require resolveVertex.
const noResolver: walking.GraphWalkSource<Data, Relation, ID> = {
  hydration: 'resolver',
  roots: () => [],
  outgoing: () => [],
};
const cachedSource: rootCjs.GraphWalkSource<Data, Relation, ID> = {
  hydration: 'inlineOrCached',
  roots: () => [
    {
      kind: 'inline',
      vertexId: objectId,
      resolution: { kind: 'found', data: { label: 'root' } },
    },
  ],
  outgoing: () => [
    { target: { kind: 'cached', vertexId: objectId }, data: relation },
  ],
};
// @ts-expect-error No-resolver walking sources require tagged targets.
const untaggedSource: walking.GraphWalkSource<Data, Relation, ID> = {
  hydration: 'inlineOrCached',
  roots: () => [{ vertexId: objectId }],
  outgoing: () => [],
};
void [declaredMode, noMode, noResolver, cachedSource, untaggedSource];
