import {
  defineDag,
  type DagDefinition,
  type DagDefinitionSlot,
  type DagDefinitionVertex,
  prepareDag,
  graphFrom,
} from '../src';

type ID = 'a' | 'b';
type Data = { label: string };
const slot: DagDefinitionSlot<ID> = {
  kind: 'omitted',
  identity: { vertexId: 'b' },
};
const vertex: DagDefinitionVertex<Data, ID> = {
  vertexId: 'a',
  data: { label: 'A' },
  slots: [slot],
  dependsOn: [],
  dependsOnComplete: [],
};
const definition: DagDefinition<Data, ID> = defineDag({
  vertices: [vertex],
  omittedIds: ['b'],
  entry: { kind: 'root', vertexId: 'a' },
});
// @ts-expect-error Definition vertices are immutable.
definition.vertices.push(vertex);
// @ts-expect-error Definition slot wrappers are immutable.
slot.identity = null;
defineDag<Data, ID>({
  vertices: [],
  // @ts-expect-error Definitions retain their identity domain.
  omittedIds: ['wrong'],
  entry: { kind: 'empty' },
});
const prepared = prepareDag(graphFrom<Data, ID>([], { id: () => 'a' }));
if (prepared.kind === 'valid') {
  const captured: DagDefinition<Data, ID> = prepared.dag.definition;
  const runner = prepared.dag.createRunner();
  for (const event of runner.getIterable()) {
    const hints: ID[] = event.vertex.getChildrenHints();
    void hints;
  }
  void captured;
}
void definition;
