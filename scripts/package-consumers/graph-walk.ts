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
      const sourceData: Data = event.source.data;
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
// @ts-expect-error Legacy selectors deliberately retain the full event union.
const narrowLegacy: typeof mixed = result.iterateEvents({
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
  limits: { maxSteps: 10 },
});
new GraphWalk({ source, followEdge: null, expandVertex: null }).configure({
  followEdge: null,
  expandVertex: null,
});
new AsyncGraphWalk({
  source: asyncSource,
  followEdge: null,
  expandVertex: null,
}).configure({
  followEdge: null,
  expandVertex: null,
});
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
// @ts-expect-error Nullable reset does not admit nonfunction predicates.
new GraphWalk({ source }).configure({ followEdge: false });
// @ts-expect-error Async predicates accept callbacks or null, never booleans.
new AsyncGraphWalk({ source: asyncSource }).configure({ expandVertex: false });
new GraphWalk({ source }).configure({ revisit: 'walks' });
new AsyncGraphWalk({ source }).configure({ revisit: 'simplePaths' });
// @ts-expect-error Route enumeration always requires depth or step bounds.
walkGraph({ source, revisit: 'walks' });
// @ts-expect-error Occurrence limits alone do not bound route expansion.
walkGraphAsync({
  source,
  revisit: 'simplePaths',
  limits: { maxOccurrences: 2 },
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
walkGraph({ source, followEdge: async () => true });
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
    [Phase.EDGE]: () => ({ commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] }),
  },
});
walkGraphAsync({
  source,
  visitors: {
    // @ts-expect-error Async walking cannot mutate the tree topology.
    [Phase.VERTEX]: async () => ({
      commands: [{ commandName: Command.DELETE_VERTEX }],
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
