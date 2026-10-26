import {
  GraphWalk,
  AsyncGraphWalk,
  GraphWalkPhase,
  defineDag,
  graphWalk,
  walkSourceFrom,
  walkSourceFromAsync,
  walkSourceFromDag,
} from '../src';
import type { GraphWalkSource, GraphWalkDagRelation } from '../src';
import { walkSourceFrom as familyFactory } from '../src/traversals/graph-walk';
import type { GraphWalkDagRelation as FamilyRelation } from '../src/traversals/graph-walk';

type Item = { id: symbol; label: string };
type Link = { kind: 'reference' | 'import' };
const id = Symbol('id');
const items: Item[] = [{ id, label: 'root' }];
const edge: Link = { kind: 'reference' };
const source = walkSourceFrom(items, {
  id: (item) => item.id,
  outgoing: () => [{ to: id, data: edge }],
  roots: [id],
});
const typed: GraphWalkSource<Item, Link, symbol> = source;
const familyTyped: typeof walkSourceFrom = familyFactory;
const namespaceTyped: typeof walkSourceFrom = graphWalk.walkSourceFrom;
new GraphWalk({ source }).addVisitorFor(GraphWalkPhase.EDGE, (event) => {
  const vertexId: symbol = event.edge.to;
  const item: Item = event.source.data;
  const relation: Link = event.edge.data;
  void [vertexId, item, relation];
});
const asynchronous: Promise<GraphWalkSource<Item, Link, symbol>> =
  walkSourceFromAsync(
    (async function* () {
      yield items[0]!;
    })(),
    {
      id: async (item) => item.id,
      outgoing: async () =>
        (async function* () {
          yield { to: id, data: edge };
        })(),
      roots: (async function* () {
        yield id;
      })(),
    },
  );
asynchronous.then((materialized) => {
  const synchronous: GraphWalkSource<Item, Link, symbol> = materialized;
  new GraphWalk({ source: synchronous });
  new AsyncGraphWalk({ source: synchronous });
});

const definition = defineDag({
  vertices: [
    {
      vertexId: undefined,
      data: items[0]!,
      slots: [],
      dependsOn: [],
      dependsOnComplete: [],
    },
  ],
  omittedIds: [],
  entry: { kind: 'root', vertexId: undefined },
});
const dag = walkSourceFromDag(definition, {
  relations: ['children', 'workDependencies', 'completionDependencies'],
});
const dagTyped: GraphWalkSource<Item, GraphWalkDagRelation, undefined> = dag;
const child: FamilyRelation = { kind: 'child', slotIndex: 0 };
const work: GraphWalkDagRelation = { kind: 'workDependency' };
const completion: GraphWalkDagRelation = { kind: 'completionDependency' };
new GraphWalk({ source: dag }).addVisitorFor(GraphWalkPhase.EDGE, (event) => {
  const vertexId: undefined = event.edge.to;
  const item: Item = event.source.data;
  if (event.edge.data.kind === 'child') {
    const slotIndex: number = event.edge.data.slotIndex;
    void slotIndex;
  } else {
    // @ts-expect-error Only child relationships carry a structural slot index.
    event.edge.data.slotIndex;
  }
  void [vertexId, item];
});

// @ts-expect-error Catalog roots are explicit.
walkSourceFrom(items, { id: (item) => item.id, outgoing: () => [] });
walkSourceFrom(items, {
  // @ts-expect-error Sync catalog ID selectors cannot return promises.
  id: async (item) => item.id,
  outgoing: () => [],
  roots: [id],
});
walkSourceFrom(items, {
  id: (item) => item.id,
  // @ts-expect-error Sync catalog links cannot be asynchronous.
  outgoing: async () => [],
  roots: [id],
});
// @ts-expect-error DAG relation selection is required.
walkSourceFromDag(definition);
// @ts-expect-error DAG relation selection cannot be empty.
walkSourceFromDag(definition, { relations: [] });
// @ts-expect-error DAG relation names are closed.
walkSourceFromDag(definition, { relations: ['dependsOn'] });
// @ts-expect-error Child relation metadata includes its authored slot index.
const missingIndex: GraphWalkDagRelation = { kind: 'child' };

void [
  typed,
  familyTyped,
  namespaceTyped,
  asynchronous,
  dagTyped,
  child,
  work,
  completion,
  missingIndex,
];
