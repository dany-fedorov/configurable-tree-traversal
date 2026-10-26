import type { VisitorInputs } from '@core/TraversalVisitor';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { assertDagWorkCompletion } from './DagTraversalInstanceConfig';
import type { DagDiscoveryOptions } from './DagTraversalInstanceConfig';
import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { AsyncTraversableGraph } from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { deepFreeze } from '@utils/deepFreeze';
import { captureDagSourcePatch, captureDagConfigPatch } from './dagSourcePatch';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import { DagTraversalOrder } from './DagTraversalOrder';
import type { AsyncDagVisitor } from './DagTraversalVisitor';

export type AsyncDagSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> =
  | {
      traversableGraph: AsyncTraversableGraph<T, R, ID>;
      traversableTree?: undefined;
    }
  | {
      traversableTree: unknown extends ID ? AsyncTraversableTree<T, R> : never;
      traversableGraph?: undefined;
    };

export type AsyncDagTraversalVisitors<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = {
  [K in DagTraversalOrder]: VisitorRecord<AsyncDagVisitor<T, R, K, ID>>[];
};

export type AsyncDagSortChildrenHintsFn<T extends TreeTypeParameters> = (
  childrenHints: T['VertexHint'][],
) => MaybePromise<T['VertexHint'][]>;

type AsyncDagTraversalOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ID = unknown,
> = DagDiscoveryOptions & {
  completedWork?: ReadonlySet<ID>;
  sortChildrenHints: AsyncDagSortChildrenHintsFn<T> | null;
  visitors: AsyncDagTraversalVisitors<T, R, ID>;
  saveNotMutatedResolvedGraph: boolean;
  concurrency: number;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<T, R, ID>['resolvedGraphsContainer']
      | null;
    state: DagTraversalRunnerInternalObjects<T, R, ID>['state'] | null;
  };
};

export type AsyncDagTraversalInstanceConfig<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = AsyncDagSource<T, R, ID> & AsyncDagTraversalOptions<T, R, ID>;

type AsyncDagTraversalOptionsInput<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ID = unknown,
> = Partial<
  Omit<
    AsyncDagTraversalOptions<T, R, ID>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: VisitorInputs<AsyncDagTraversalVisitors<T, R, ID>>;
  traversalRunnerInternalObjects?: Partial<
    AsyncDagTraversalOptions<T, R, ID>['traversalRunnerInternalObjects']
  >;
};

export type AsyncDagTraversalInstanceConfigInput<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = AsyncDagSource<T, R, ID> & AsyncDagTraversalOptionsInput<T, R, ID>;

export type AsyncDagTraversalConfigureInput<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = AsyncDagTraversalOptionsInput<T, R, ID> &
  (
    | {
        traversableGraph?: AsyncTraversableGraph<T, R, ID> | undefined;
        traversableTree?: undefined;
      }
    | {
        traversableTree?:
          | (unknown extends ID ? AsyncTraversableTree<T, R> : never)
          | undefined;
        traversableGraph?: undefined;
      }
  );

export const ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [DagTraversalOrder.ON_READY]: [],
    [DagTraversalOrder.ON_COMPLETE]: [],
  },
  saveNotMutatedResolvedGraph: false,
  concurrency: Infinity,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
}) as unknown as Omit<
  AsyncDagTraversalInstanceConfig<TreeTypeParameters>,
  'traversableGraph' | 'traversableTree'
>;

export function mergeAsyncDagTraversalInstanceConfigs<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ID = unknown,
>(
  base: AsyncDagTraversalInstanceConfig<T, R, ID>,
  input: AsyncDagTraversalConfigureInput<T, R, ID>,
  sources = captureDagSourcePatch(input),
): AsyncDagTraversalInstanceConfig<T, R, ID> {
  const capturedInput = captureDagConfigPatch(input, sources);
  assertDagWorkCompletion(capturedInput.workCompletion);
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  const merged = {
    ...base,
    ...capturedInput,
    visitors: {
      [DagTraversalOrder.ON_READY]: normalizeVisitorDefinitions(
        visitors[DagTraversalOrder.ON_READY],
      ),
      [DagTraversalOrder.ON_COMPLETE]: normalizeVisitorDefinitions(
        visitors[DagTraversalOrder.ON_COMPLETE],
      ),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  } as AsyncDagTraversalInstanceConfig<T, R, ID>;
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
