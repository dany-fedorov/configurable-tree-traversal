import type { ChildHintSorter } from '@core/ChildHintSorter';
import type { VisitorRecord } from '@core/graph/types';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { TreeSource } from '@core/TraversableTree';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import { captureDagConfigPatch, captureDagSourcePatch } from './dagSourcePatch';
import { DagVisitorPhase } from './DagTraversalOrder';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import type { DagVisitor } from './DagTraversalVisitor';

export type DagSchedulingOptions = {
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
  [K in DagVisitorPhase]: VisitorRecord<DagVisitor<T, R, K, ID>>[];
};

type DagTraversalOptions<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = DagSchedulingOptions & {
  completedWork?: ReadonlySet<ID>;
  sortChildrenHints: ChildHintSorter<T> | null;
  visitors: DagTraversalVisitors<T, R, ID>;
  retainOriginalGraphStructure: boolean;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<T, R, ID>['resolvedGraphsContainer']
      | null;
    state: DagTraversalRunnerInternalObjects<T, R, ID>['state'] | null;
  };
};

export type DagResolvedOptions<
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
};

export type DagOptions<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = DagSource<T, R, ID> & DagTraversalOptionsInput<T, R, ID>;

export type DagOptionsPatch<
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
    [DagVisitorPhase.ON_WORK_READY]: [],
    [DagVisitorPhase.ON_SUBGRAPH_READY]: [],
  },
  retainOriginalGraphStructure: false,
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
  base: DagResolvedOptions<T, R, ID>,
  input: DagOptionsPatch<T, R, ID>,
  sources = captureDagSourcePatch(input),
): DagResolvedOptions<T, R, ID> {
  const capturedInput = captureDagConfigPatch(input, sources);
  assertDagWorkCompletion(capturedInput.workCompletion);
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  return {
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
  } as DagResolvedOptions<T, R, ID>;
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
