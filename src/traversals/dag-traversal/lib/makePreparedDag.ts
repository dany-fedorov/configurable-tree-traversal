import type { TraversableGraph } from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { SourceVertexResult } from '@core/TraversableTree';
import type { Ref } from '@core/graph/types';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { DagTraversal } from '../DagTraversal';
import { AsyncDagTraversal } from '../AsyncDagTraversal';
import { coordinateDag, coordinateDagAsync } from '../coordinateDag';
import type {
  PreparedDag,
  PreparedDagVertex,
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
export function makePreparedDag<T extends TreeTypeParameters, ID>(
  container: ResolvedGraphsContainer<T, T, ID>,
  candidates: ReadonlySet<ID>,
  rootDependencies: 'honor' | 'ignore',
): PreparedDag<T['VertexData'], ID> {
  type Data = T['VertexData'];
  type Replay = TreeTypeParameters<Data, ID>;
  const graph = container.publicResolvedGraph;
  const discoveryHints = (ref: Ref<T>): readonly ID[] => {
    const hints: ID[] = [];
    for (const slot of container.resolvedGraph.get(ref)!.slots) {
      if (slot.kind === 'linked') hints.push(graph.getVertexId(slot.childRef));
      else if (
        slot.kind === 'omitted' &&
        Object.prototype.hasOwnProperty.call(slot, 'vertexId')
      ) {
        // Omitted identities originate in the caller source, never the private holder.
        hints.push(slot.vertexId as ID);
      }
    }
    return hints;
  };
  const hintsById = new Map<ID, readonly ID[]>(
    graph
      .getVertexRefs()
      .map((ref) => [graph.getVertexId(ref), discoveryHints(ref)]),
  );
  const vertices = Object.freeze(
    graph.getVertexRefs().map((ref) => {
      const vertex = graph.get(ref)!;
      return Object.freeze({
        vertexId: vertex.vertexId,
        data: vertex.vertex.getData(),
        children: Object.freeze(
          graph.getChildrenOf(ref)!.map((child) => graph.getVertexId(child)),
        ),
        dependsOn: Object.freeze(vertex.dependsOn.slice()),
        dependsOnComplete: Object.freeze(
          (vertex.dependsOnComplete ?? []).slice(),
        ),
      });
    }),
  );
  const byId = new Map<ID, PreparedDagVertex<Data, ID>>(
    vertices.map((vertex) => [vertex.vertexId, vertex]),
  );
  const omitted = [...candidates].filter(
    (id) => container.store.getIdState(id)?.kind === 'omitted',
  );
  const omittedIds = new Set(omitted);
  const root = graph.getRoot();
  const rootEntry = root === null ? null : byId.get(graph.getVertexId(root))!;
  const holder = container.syntheticRootRef;
  const rootChildren = holder === null ? omitted : discoveryHints(holder);
  const syntheticRoot =
    container.syntheticRoot || (rootEntry === null && omitted.length > 0);

  function makeSource(): TraversableGraph<Replay, Replay, ID> {
    const resolve = (id: ID): SourceVertexResult<Replay, ID> => {
      if (omittedIds.has(id))
        return { kind: 'omitted', vertexId: id, satisfiesDependencies: true };
      const entry = byId.get(id)!;
      return {
        kind: 'found',
        vertex: {
          vertexId: entry.vertexId,
          dependsOn: entry.dependsOn.slice(),
          dependsOnComplete: entry.dependsOnComplete.slice(),
          vertexContent: {
            $data: entry.data,
            $childHints: hintsById.get(id)!.slice(),
          },
        },
      };
    };
    return {
      makeRoot: () => {
        if (syntheticRoot) {
          // The engine replaces this private holder ID and never exposes its data.
          return {
            kind: 'found',
            vertex: {
              vertexId: undefined as ID,
              vertexContent: {
                $data: undefined as Data,
                $childHints: rootChildren.slice(),
              },
            },
          };
        }
        return rootEntry === null
          ? { kind: 'omitted', satisfiesDependencies: true }
          : resolve(rootEntry.vertexId);
      },
      makeVertex: resolve,
      resolvePrerequisite: resolve,
      getVertexIdFromHint: (vertexId) => ({ vertexId }),
    };
  }
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
      traversableGraph: makeSource(),
      syntheticRoot,
      rootDependencies,
      implicitParentDependency: false,
    })
      .makeRunner()
      .prepare();
  };
  const createAsyncRunner = async (
    options: PreparedAsyncDagRunnerOptions<Data, ID> = {},
  ) => {
    assertPreparedOptions(options, [...runnerFields, 'concurrency']);
    return new AsyncDagTraversal<Replay, Replay, ID>({
      ...options,
      traversableGraph: makeSource(),
      syntheticRoot,
      rootDependencies,
      implicitParentDependency: false,
    })
      .makeRunner()
      .prepare();
  };
  return Object.freeze({
    vertices,
    createRunner,
    createAsyncRunner,
    createSession: (options = {}) => {
      assertPreparedOptions(options, ['completedWork']);
      return coordinateDag(
        createRunner({ ...options, workCompletion: 'externalSettlement' }),
      );
    },
    createAsyncSession: async (options = {}) => {
      assertPreparedOptions(options, ['completedWork', 'concurrency']);
      return coordinateDagAsync(
        await createAsyncRunner({
          ...options,
          workCompletion: 'externalSettlement',
        }),
      );
    },
  });
}
