import type { VisitorInputs } from '@core/TraversalVisitor';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { TreeSource } from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VisitorRecord } from '@core/graph/types';
import { deepFreeze } from '@utils/deepFreeze';
import { captureDagSourcePatch, captureDagConfigPatch } from './dagSourcePatch';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import { DagTraversalOrder } from './DagTraversalOrder';
import type { DagVisitor } from './DagTraversalVisitor';

export type DagDiscoveryOptions = {
  workCompletion?: 'visitorReturn' | 'externalSettlement';
  discovery?: 'lazy' | 'eager';
  rootDependencies?: 'honor' | 'ignore';
  implicitParentDependency?: boolean;
  syntheticRoot?: boolean;
};

export type DagSource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> =
  | {
      traversableGraph: DagDiscoverySource<T, R, ID>;
      traversableTree?: undefined;
    }
  | {
      traversableTree: unknown extends ID ? TreeSource<T, R> : never;
      traversableGraph?: undefined;
    };

export type DagTraversalVisitors<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = {
  [K in DagTraversalOrder]: VisitorRecord<DagVisitor<T, R, K, ID>>[];
};

export type DagSortChildrenHintsFn<T extends VertexTypes> = (
  childrenHints: T['VertexHint'][],
) => T['VertexHint'][];

type DagTraversalOptions<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = DagDiscoveryOptions & {
  completedWork?: ReadonlySet<ID>;
  sortChildrenHints: DagSortChildrenHintsFn<T> | null;
  visitors: DagTraversalVisitors<T, R, ID>;
  saveNotMutatedResolvedGraph: boolean;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<T, R, ID>['resolvedGraphsContainer']
      | null;
    state: DagTraversalRunnerInternalObjects<T, R, ID>['state'] | null;
  };
};

export type DagTraversalInstanceConfig<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = DagSource<T, R, ID> & DagTraversalOptions<T, R, ID>;

type DagTraversalOptionsInput<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = Partial<
  Omit<
    DagTraversalOptions<T, R, ID>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: VisitorInputs<DagTraversalVisitors<T, R, ID>>;
  traversalRunnerInternalObjects?: Partial<
    DagTraversalOptions<T, R, ID>['traversalRunnerInternalObjects']
  >;
};

export type DagTraversalInstanceConfigInput<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = DagSource<T, R, ID> & DagTraversalOptionsInput<T, R, ID>;

export type DagTraversalConfigureInput<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = DagTraversalOptionsInput<T, R, ID> &
  (
    | {
        traversableGraph?: DagDiscoverySource<T, R, ID> | undefined;
        traversableTree?: undefined;
      }
    | {
        traversableTree?:
          | (unknown extends ID ? TreeSource<T, R> : never)
          | undefined;
        traversableGraph?: undefined;
      }
  );

export const DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: DagTraversalOptions<
  VertexTypes,
  VertexTypes
> = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [DagTraversalOrder.ON_READY]: [],
    [DagTraversalOrder.ON_COMPLETE]: [],
  },
  saveNotMutatedResolvedGraph: false,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
});

export function mergeDagTraversalInstanceConfigs<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
>(
  base: DagTraversalInstanceConfig<T, R, ID>,
  input: DagTraversalConfigureInput<T, R, ID>,
  sources = captureDagSourcePatch(input),
): DagTraversalInstanceConfig<T, R, ID> {
  const capturedInput = captureDagConfigPatch(input, sources);
  assertDagWorkCompletion(capturedInput.workCompletion);
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  return {
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
  } as DagTraversalInstanceConfig<T, R, ID>;
}

/** Validate configuration before changing traversal ownership or executing callbacks. */
export function assertDagWorkCompletion(policy: unknown): void {
  if (
    policy !== undefined &&
    policy !== 'visitorReturn' &&
    policy !== 'externalSettlement'
  ) {
    throw new TypeError(
      'workCompletion must be visitorReturn or externalSettlement',
    );
  }
}
