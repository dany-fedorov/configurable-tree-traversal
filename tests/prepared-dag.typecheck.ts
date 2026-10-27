import {
  materializeDagInputFromRecords,
  prepareDag,
  prepareDagAsync,
  type PreparedDag,
  type PrepareDagResult,
} from '../src';

type ID = 'research' | 'review';
type Task = { id: ID; title: string; requires: ID[] };
const source = materializeDagInputFromRecords<Task, ID>(
  [{ id: 'research', title: 'Read', requires: [] }],
  {
    id: (item) => item.id,
    dependsOnWork: (item) => item.requires,
  },
);
const prepared = prepareDag(source);
if (prepared.kind === 'valid') {
  const dag: PreparedDag<Task, ID> = prepared.dag;
  const id: ID = dag.vertices[0]!.vertexId;
  const data: Task = dag.vertices[0]!.data;
  const runner = dag.createRunner({ completedWork: new Set<ID>(['research']) });
  for (const event of runner.iterateEvents()) {
    const eventId: ID = event.vertexId;
    const hints: ID[] = event.vertex.getChildrenHints();
    void [eventId, hints];
  }
  // @ts-expect-error Prepared topology arrays are readonly.
  dag.vertices[0]!.children.push('review');
  // @ts-expect-error Sessions preserve the identity domain.
  dag.createWorkSession({ completedWork: new Set(['wrong']) });
  // @ts-expect-error Prepared runners own their source.
  dag.createRunner({ traversableGraph: source.traversableGraph });
  const injected = { traversalRunnerInternalObjects: {} };
  // @ts-expect-error Pretyped continuation options cannot bypass source ownership.
  dag.createRunner(injected);
  // @ts-expect-error Explicit undefined source replacement is forbidden.
  dag.createRunner({ traversableTree: undefined });
  void [id, data];
} else {
  const definitionResult: PrepareDagResult<Task, ID> = prepared;
  const preparationResult: PrepareDagResult<Task, ID> = definitionResult;
  for (const issue of prepared.issues) {
    if (issue.kind === 'milestone') {
      const missing: ID[] = issue.diagnostics.unknownPrerequisiteIds;
      void missing;
    }
  }
  // @ts-expect-error Invalid preparation exposes issues with no diagnostics alias.
  prepared.diagnostics;
  // @ts-expect-error An invalid result has no executable definition.
  prepared.dag.createRunner();
  void preparationResult;
}
async function checkAsync() {
  const result = await prepareDagAsync(source);
  if (result.kind !== 'valid') return;
  const runner = await result.dag.createAsyncRunner();
  for await (const event of runner.iterateEvents()) {
    const id: ID = event.vertexId;
    void id;
  }
  const session = await result.dag.createAsyncWorkSession({ concurrency: 2 });
  const boundary = await session.advance();
  if (boundary.kind === 'awaitingSettlement') {
    const id: ID = boundary.workTickets[0]!.vertexId;
    session.completeWork(boundary.workTickets[0]!);
    void id;
  }
}
// @ts-expect-error Preparation cannot accept work seeds.
prepareDag({ ...source, completedWork: new Set<ID>() });
// @ts-expect-error Preparation cannot run visitors.
prepareDagAsync({ ...source, visitors: {} });
void checkAsync;
