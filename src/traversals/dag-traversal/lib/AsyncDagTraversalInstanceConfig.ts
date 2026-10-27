import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncChildHintSorter } from '@core/ChildHintSorter';
import type { VisitorRecord } from '@core/graph/types';
import type { AsyncDagDiscoverySource } from '@core/TraversableGraph';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import { captureDagConfigPatch, captureDagSourcePatch } from './dagSourcePatch';
import type { DagSchedulingOptions } from './DagTraversalInstanceConfig';
import {
  assertDagWorkCompletion,
  assertDagDependencyPolicies,
} from './DagTraversalInstanceConfig';
import { DagVisitorPhase } from './DagTraversalOrder';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import type { AsyncDagVisitor } from './DagTraversalVisitor';

export type AsyncDagSource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> =
  | {
      traversableGraph: AsyncDagDiscoverySource<T, R, ID>;
      traversableTree?: undefined;
    }
  | {
      traversableTree: unknown extends ID ? AsyncTreeSource<T, R> : never;
      traversableGraph?: undefined;
    };

export type AsyncDagTraversalVisitors<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = {
  [K in DagVisitorPhase]: VisitorRecord<AsyncDagVisitor<T, R, K, ID>>[];
};

type AsyncDagTraversalOptions<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = DagSchedulingOptions & {
  completedWork?: ReadonlySet<ID>;
  sortChildrenHints: AsyncChildHintSorter<T> | null;
  visitors: AsyncDagTraversalVisitors<T, R, ID>;
  retainOriginalGraphStructure: boolean;
  concurrency: number;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<T, R, ID>['resolvedGraphsContainer']
      | null;
    state: DagTraversalRunnerInternalObjects<T, R, ID>['state'] | null;
  };
};

export type AsyncDagResolvedOptions<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = AsyncDagSource<T, R, ID> & AsyncDagTraversalOptions<T, R, ID>;

type AsyncDagTraversalOptionsInput<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = DagSchedulingOptions & {
  completedWork?: ReadonlySet<ID>;
  sortChildrenHints?: AsyncChildHintSorter<T> | null;
  visitors?: VisitorInputs<AsyncDagTraversalVisitors<T, R, ID>>;
  retainOriginalGraphStructure?: boolean;
  concurrency?: number;
};

export type AsyncDagOptions<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = AsyncDagSource<T, R, ID> &
  AsyncDagTraversalOptionsInput<T, R, ID> &
  (
    | { traversableGraph: AsyncDagDiscoverySource<T, R, ID> }
    | { rootWorkDependencies?: never; omittedWorkDependencies?: never }
  );

export type AsyncDagOptionsPatch<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = AsyncDagTraversalOptionsInput<T, R, ID> &
  (
    | {
        traversableGraph?: AsyncDagDiscoverySource<T, R, ID> | undefined;
        traversableTree?: undefined;
      }
    | {
        rootWorkDependencies?: never;
        omittedWorkDependencies?: never;
        traversableTree?:
          | (unknown extends ID ? AsyncTreeSource<T, R> : never)
          | undefined;
        traversableGraph?: undefined;
      }
  );

export const ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [DagVisitorPhase.ON_WORK_READY]: [],
    [DagVisitorPhase.ON_SUBGRAPH_READY]: [],
  },
  retainOriginalGraphStructure: false,
  concurrency: Infinity,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
}) as unknown as Omit<
  AsyncDagResolvedOptions<VertexTypes>,
  'traversableGraph' | 'traversableTree'
>;

export function mergeAsyncDagTraversalInstanceConfigs<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
>(
  base: AsyncDagResolvedOptions<T, R, ID>,
  input: AsyncDagOptionsPatch<T, R, ID>,
  sources = captureDagSourcePatch(input),
): AsyncDagResolvedOptions<T, R, ID> {
  const capturedInput = captureDagConfigPatch(input, sources);
  assertDagWorkCompletion(capturedInput.workCompletion);
  assertDagDependencyPolicies(
    capturedInput,
    sources.traversableGraph !== undefined ||
      base.traversableGraph !== undefined,
    input,
  );
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  const merged = {
    ...base,
    ...capturedInput,
    visitors: {
      [DagVisitorPhase.ON_WORK_READY]: normalizeVisitorDefinitions(
        visitors[DagVisitorPhase.ON_WORK_READY],
      ),
      [DagVisitorPhase.ON_SUBGRAPH_READY]: normalizeVisitorDefinitions(
        visitors[DagVisitorPhase.ON_SUBGRAPH_READY],
      ),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
    },
  } as AsyncDagResolvedOptions<T, R, ID>;
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
