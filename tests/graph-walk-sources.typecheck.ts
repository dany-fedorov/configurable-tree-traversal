import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  GraphWalkObservationKind,
  copyAndNormalizeDagDefinition,
  graphWalk,
  materializeGraphWalkSourceFromVertexRecords,
  materializeSynchronousGraphWalkSourceFromAsyncRecords,
  materializeGraphWalkSourceFromDagDeclarationRelations,
} from '../src';
import type {
  GraphWalkDiscoverySource,
  GraphWalkDagDeclarationRelation,
} from '../src';
import { materializeGraphWalkSourceFromVertexRecords as familyFactory } from '../src/traversals/graph-walk';
import type { GraphWalkDagDeclarationRelation as FamilyRelation } from '../src/traversals/graph-walk';

type Item = { id: symbol; label: string };
type Link = { kind: 'reference' | 'import' };
const id = Symbol('id');
const items: Item[] = [{ id, label: 'root' }];
const edge: Link = { kind: 'reference' };
const source = materializeGraphWalkSourceFromVertexRecords(items, {
  getVertexId: (item) => item.id,
  enumerateOutgoingLinks: () => [{ toVertexId: id, edgeData: edge }],
  rootVertexIds: [id],
});
const typed: GraphWalkDiscoverySource<Item, Link, symbol> = source;
const familyTyped: typeof materializeGraphWalkSourceFromVertexRecords =
  familyFactory;
const namespaceTyped: typeof materializeGraphWalkSourceFromVertexRecords =
  graphWalk.materializeGraphWalkSourceFromVertexRecords;
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
}).registerVisitorForObservationKind(
  GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
  (event) => {
    const vertexId: symbol = event.edge.toVertexId;
    const item: Item = event.fromVertex.vertexData;
    const relation: Link = event.edge.edgeData;
    void [vertexId, item, relation];
  },
);
const asynchronous: Promise<GraphWalkDiscoverySource<Item, Link, symbol>> =
  materializeSynchronousGraphWalkSourceFromAsyncRecords(
    (async function* () {
      yield items[0]!;
    })(),
    {
      getVertexId: async (item) => item.id,
      enumerateOutgoingLinks: async () =>
        (async function* () {
          yield { toVertexId: id, edgeData: edge };
        })(),
      rootVertexIds: (async function* () {
        yield id;
      })(),
    },
  );
asynchronous.then((materialized) => {
  const synchronous: GraphWalkDiscoverySource<Item, Link, symbol> =
    materialized;
  new GraphWalkBuilder({ graphWalkDiscoverySource: synchronous });
  new AsyncGraphWalkBuilder({ graphWalkDiscoverySource: synchronous });
});

const definition = copyAndNormalizeDagDefinition({
  vertexDeclarations: [
    {
      vertexId: undefined,
      data: items[0]!,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: { kind: 'root', vertexId: undefined },
});
const dag = materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
  includeDeclarationRelations: [
    'parentToChildSlots',
    'dependentToWorkPrerequisites',
    'dependentToSubgraphCompletionPrerequisites',
  ],
});
const dagTyped: GraphWalkDiscoverySource<
  Item,
  GraphWalkDagDeclarationRelation,
  undefined
> = dag;
const adapterMode: 'resolverWithOptionalInlineResolution' =
  dag.vertexResolutionMode;
const child: FamilyRelation = {
  kind: 'structuralChildSlot',
  childSlotIndex: 0,
};
const work: GraphWalkDagDeclarationRelation = { kind: 'workPrerequisite' };
const completion: GraphWalkDagDeclarationRelation = {
  kind: 'subgraphCompletionPrerequisite',
};
new GraphWalkBuilder({
  graphWalkDiscoverySource: dag,
}).registerVisitorForObservationKind(
  GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
  (event) => {
    const vertexId: undefined = event.edge.toVertexId;
    const item: Item = event.fromVertex.vertexData;
    if (event.edge.edgeData.kind === 'structuralChildSlot') {
      const childSlotIndex: number = event.edge.edgeData.childSlotIndex;
      void childSlotIndex;
    } else {
      // @ts-expect-error Only child relationships carry a structural slot index.
      event.edge.edgeData.childSlotIndex;
    }
    void [vertexId, item];
  },
);

// @ts-expect-error Catalog roots are explicit.
materializeGraphWalkSourceFromVertexRecords(items, {
  getVertexId: (item) => item.id,
  enumerateOutgoingLinks: () => [],
});
materializeGraphWalkSourceFromVertexRecords(items, {
  // @ts-expect-error Sync catalog ID selectors cannot return promises.
  getVertexId: async (item) => item.id,
  enumerateOutgoingLinks: () => [],
  rootVertexIds: [id],
});
materializeGraphWalkSourceFromVertexRecords(items, {
  getVertexId: (item) => item.id,
  // @ts-expect-error Sync catalog links cannot be asynchronous.
  enumerateOutgoingLinks: async () => [],
  rootVertexIds: [id],
});
// @ts-expect-error DAG relation selection is required.
materializeGraphWalkSourceFromDagDeclarationRelations(definition);
materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
  // @ts-expect-error DAG relation selection cannot be empty.
  includeDeclarationRelations: [],
});
materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
  // @ts-expect-error DAG relation names are closed.
  includeDeclarationRelations: ['workWaitsForWorkOf'],
});
// @ts-expect-error Child relation metadata includes its authored slot index.
const missingIndex: GraphWalkDagDeclarationRelation = {
  kind: 'structuralChildSlot',
};

void [
  adapterMode,
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
