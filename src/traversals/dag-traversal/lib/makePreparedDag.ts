import type { VertexTypes } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { DagDefinition } from './DagDefinition';
import { captureDagDefinition, definitionSource } from './definitionSource';
import { DagTraversal } from '../DagTraversal';
import { AsyncDagTraversal } from '../AsyncDagTraversal';
import { createDagWorkSession, createAsyncDagWorkSession } from '../coordinateDag';
import type {
  PreparedDag,
  PreparedDagRunnerOptions,
  PreparedAsyncDagRunnerOptions,
} from './PreparedDag';

export function assertPreparedOptions(
  options: object,
  allowed: readonly string[],
): void {
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== 'string' || !allowed.includes(key)) {
      throw new TypeError(
        'Unsupported option: prepared DAGs own source and topology',
      );
    }
  }
}

/** Snapshot accepted topology; replay uses fresh vertices and normalized ID hints. */
export function makePreparedDag<T extends VertexTypes, ID>(
  container: ResolvedGraphsContainer<T, T, ID>,
  candidates: ReadonlySet<ID>,
  rootDependencies: 'honor' | 'ignore',
  authoredDefinition?: DagDefinition<T['VertexData'], ID>,
): PreparedDag<T['VertexData'], ID> {
  type Data = T['VertexData'];
  type Replay = VertexTypes<Data, ID>;
  // Definition preparation can retain authored entry mode and declaration order,
  // rather than recapturing the hidden holder used for omitted empty entries.
  const definition =
    authoredDefinition ?? captureDagDefinition(container, candidates);
  const vertices = Object.freeze(
    definition.vertices.map((vertex) =>
      Object.freeze({
        vertexId: vertex.vertexId,
        data: vertex.data,
        children: Object.freeze(
          vertex.slots.flatMap((slot) =>
            slot.kind === 'vertex' ? [slot.vertexId] : [],
          ),
        ),
        dependsOn: vertex.dependsOn,
        dependsOnComplete: vertex.dependsOnComplete,
      }),
    ),
  );
  const runnerFields = [
    'visitors',
    'completedWork',
    'workCompletion',
    'saveNotMutatedResolvedGraph',
  ];
  const createRunner = (options: PreparedDagRunnerOptions<Data, ID> = {}) => {
    assertPreparedOptions(options, runnerFields);
    return new DagTraversal<Replay, Replay, ID>({
      ...options,
      ...definitionSource(definition),
      rootDependencies,
      implicitParentDependency: false,
    })
      .createRunner()
      .prepare();
  };
  const createAsyncRunner = async (
    options: PreparedAsyncDagRunnerOptions<Data, ID> = {},
  ) => {
    assertPreparedOptions(options, [...runnerFields, 'concurrency']);
    return new AsyncDagTraversal<Replay, Replay, ID>({
      ...options,
      ...definitionSource(definition),
      rootDependencies,
      implicitParentDependency: false,
    })
      .createRunner()
      .prepare();
  };
  return Object.freeze({
    vertices,
    definition,
    createRunner,
    createAsyncRunner,
    createWorkSession: (options = {}) => {
      assertPreparedOptions(options, ['completedWork']);
      return createDagWorkSession(
        createRunner({ ...options, workCompletion: 'externalSettlement' }),
      );
    },
    createAsyncWorkSession: async (options = {}) => {
      assertPreparedOptions(options, ['completedWork', 'concurrency']);
      return createAsyncDagWorkSession(
        await createAsyncRunner({
          ...options,
          workCompletion: 'externalSettlement',
        }),
      );
    },
  });
}
