import { dagRunnerCapabilities } from '../src/traversals/dag-traversal/lib/dagRunnerCapabilities';
import type { AsyncBreadthFirstTreeTraversalBuilderOptions } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeTraversalBuilderOptions } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig';
import type { AsyncDepthFirstTreeTraversalBuilderOptions } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeTraversalBuilderOptions } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

import { InternalDepthFirstTreeRunner } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTreeRunner } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
  type DepthFirstTreeResolvedOptions,
  type DepthFirstTreeTraversalBuilderOptionsPatch,
} from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';

export function createInternalDepthFirstTreeRunner<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: DepthFirstTreeTraversalBuilderOptionsPatch<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      DepthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): DepthFirstTreeRunner<T, R> {
  const resolved = mergeInstanceConfigs(
    DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTreeResolvedOptions<
      T,
      R
    >,
    input,
  );
  return new InternalDepthFirstTreeRunner({
    ...resolved,
    traversalRunnerInternalObjects: {
      ...resolved.traversalRunnerInternalObjects,
      ...input.traversalRunnerInternalObjects,
    },
  });
}

import { InternalAsyncDepthFirstTreeRunner } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalRunner';
import type { AsyncDepthFirstTreeRunner } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalRunner';
import {
  ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTreeResolvedOptions,
  type AsyncDepthFirstTreeTraversalBuilderOptionsPatch,
} from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import { AsyncDepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal/AsyncDepthFirstTraversal';

export function createInternalAsyncDepthFirstTreeRunner<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: AsyncDepthFirstTreeTraversalBuilderOptionsPatch<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDepthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): AsyncDepthFirstTreeRunner<T, R> {
  const resolved = mergeAsyncDepthFirstTraversalInstanceConfigs(
    ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDepthFirstTreeResolvedOptions<
      T,
      R
    >,
    input,
  );
  return new InternalAsyncDepthFirstTreeRunner({
    ...resolved,
    traversalRunnerInternalObjects: {
      ...resolved.traversalRunnerInternalObjects,
      ...input.traversalRunnerInternalObjects,
    },
  });
}

import { InternalBreadthFirstTreeRunner } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunner';
import type { BreadthFirstTreeRunner } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunner';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeBreadthFirstTraversalInstanceConfigs,
  type BreadthFirstTreeResolvedOptions,
  type BreadthFirstTreeTraversalBuilderOptionsPatch,
} from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTreeTraversalBuilder } from '../src/traversals/breadth-first-traversal/BreadthFirstTraversal';

export function createInternalBreadthFirstTreeRunner<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: BreadthFirstTreeTraversalBuilderOptionsPatch<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      BreadthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): BreadthFirstTreeRunner<T, R> {
  const resolved = mergeBreadthFirstTraversalInstanceConfigs(
    BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as BreadthFirstTreeResolvedOptions<
      T,
      R
    >,
    input,
  );
  return new InternalBreadthFirstTreeRunner({
    ...resolved,
    traversalRunnerInternalObjects: {
      ...resolved.traversalRunnerInternalObjects,
      ...input.traversalRunnerInternalObjects,
    },
  });
}

import { InternalAsyncBreadthFirstTreeRunner } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalRunner';
import type { AsyncBreadthFirstTreeRunner } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalRunner';
import {
  ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTreeResolvedOptions,
  type AsyncBreadthFirstTreeTraversalBuilderOptionsPatch,
} from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import { AsyncBreadthFirstTreeTraversalBuilder } from '../src/traversals/breadth-first-traversal/AsyncBreadthFirstTraversal';

export function createInternalAsyncBreadthFirstTreeRunner<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncBreadthFirstTreeResolvedOptions<
        T,
        R
      >['traversalRunnerInternalObjects']
    >;
  },
): AsyncBreadthFirstTreeRunner<T, R> {
  const resolved = mergeAsyncBreadthFirstTraversalInstanceConfigs(
    ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncBreadthFirstTreeResolvedOptions<
      T,
      R
    >,
    input,
  );
  return new InternalAsyncBreadthFirstTreeRunner({
    ...resolved,
    traversalRunnerInternalObjects: {
      ...resolved.traversalRunnerInternalObjects,
      ...input.traversalRunnerInternalObjects,
    },
  });
}

import { InternalDagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import {
  DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeDagTraversalInstanceConfigs,
  type DagResolvedOptions,
  type DagTraversalBuilderOptions,
} from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';

export function createInternalDagTraversalRunner<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
  ID = unknown,
>(
  input: DagTraversalBuilderOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      DagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): DagTraversalRunner<T, R, ID> {
  const resolved = mergeDagTraversalInstanceConfigs(
    DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DagResolvedOptions<
      T,
      R,
      ID
    >,
    input,
  );
  return new InternalDagTraversalRunner({
    ...resolved,
    traversalRunnerInternalObjects: {
      ...resolved.traversalRunnerInternalObjects,
      ...input.traversalRunnerInternalObjects,
    },
  });
}

import { InternalAsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import {
  ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagResolvedOptions,
  type AsyncDagTraversalBuilderOptions,
} from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';

export function createInternalAsyncDagTraversalRunner<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
  ID = unknown,
>(
  input: AsyncDagTraversalBuilderOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): AsyncDagTraversalRunner<T, R, ID> {
  const resolved = mergeAsyncDagTraversalInstanceConfigs(
    ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDagResolvedOptions<
      T,
      R,
      ID
    >,
    input,
  );
  return new InternalAsyncDagTraversalRunner({
    ...resolved,
    traversalRunnerInternalObjects: {
      ...resolved.traversalRunnerInternalObjects,
      ...input.traversalRunnerInternalObjects,
    },
  });
}

export type RunnerInternals<R> = R extends AsyncDagTraversalRunner<
  infer T,
  infer W,
  infer ID
>
  ? {
      icfg: InternalAsyncDagTraversalRunner<T, W, ID>['icfg'];
      state: InternalAsyncDagTraversalRunner<T, W, ID>['state'];
      resolvedGraphsContainer: InternalAsyncDagTraversalRunner<
        T,
        W,
        ID
      >['resolvedGraphsContainer'];
    }
  : R extends DagTraversalRunner<infer T, infer W, infer ID>
  ? {
      icfg: InternalDagTraversalRunner<T, W, ID>['icfg'];
      state: InternalDagTraversalRunner<T, W, ID>['state'];
      resolvedGraphsContainer: InternalDagTraversalRunner<
        T,
        W,
        ID
      >['resolvedGraphsContainer'];
    }
  : R extends AsyncBreadthFirstTreeRunner<infer T, infer W>
  ? {
      icfg: InternalAsyncBreadthFirstTreeRunner<T, W>['icfg'];
      state: InternalAsyncBreadthFirstTreeRunner<T, W>['state'];
      resolvedTreesContainer: InternalAsyncBreadthFirstTreeRunner<
        T,
        W
      >['resolvedTreesContainer'];
    }
  : R extends BreadthFirstTreeRunner<infer T, infer W>
  ? {
      icfg: InternalBreadthFirstTreeRunner<T, W>['icfg'];
      state: InternalBreadthFirstTreeRunner<T, W>['state'];
      resolvedTreesContainer: InternalBreadthFirstTreeRunner<
        T,
        W
      >['resolvedTreesContainer'];
    }
  : R extends AsyncDepthFirstTreeRunner<infer T, infer W>
  ? {
      icfg: InternalAsyncDepthFirstTreeRunner<T, W>['icfg'];
      state: InternalAsyncDepthFirstTreeRunner<T, W>['state'];
      resolvedTreesContainer: InternalAsyncDepthFirstTreeRunner<
        T,
        W
      >['resolvedTreesContainer'];
    }
  : R extends DepthFirstTreeRunner<infer T, infer W>
  ? {
      icfg: InternalDepthFirstTreeRunner<T, W>['icfg'];
      state: InternalDepthFirstTreeRunner<T, W>['state'];
      resolvedTreesContainer: InternalDepthFirstTreeRunner<
        T,
        W
      >['resolvedTreesContainer'];
    }
  : never;

export function runnerInternals<R>(runner: R): RunnerInternals<R> {
  return runner as unknown as RunnerInternals<R>;
}

export type TraversalInternals<R> = R extends DepthFirstTreeTraversalBuilder<
  infer T,
  infer W
>
  ? {
      icfg: DepthFirstTreeTraversalBuilder<T, W>['icfg'];
      visitors: DepthFirstTreeTraversalBuilder<T, W>['visitors'];
    }
  : R extends AsyncDepthFirstTreeTraversalBuilder<infer T, infer W>
  ? {
      icfg: AsyncDepthFirstTreeTraversalBuilder<T, W>['icfg'];
      visitors: AsyncDepthFirstTreeTraversalBuilder<T, W>['visitors'];
    }
  : R extends BreadthFirstTreeTraversalBuilder<infer T, infer W>
  ? {
      icfg: BreadthFirstTreeTraversalBuilder<T, W>['icfg'];
      visitors: BreadthFirstTreeTraversalBuilder<T, W>['visitors'];
    }
  : R extends AsyncBreadthFirstTreeTraversalBuilder<infer T, infer W>
  ? {
      icfg: AsyncBreadthFirstTreeTraversalBuilder<T, W>['icfg'];
      visitors: AsyncBreadthFirstTreeTraversalBuilder<T, W>['visitors'];
    }
  : R extends DagTraversalBuilder<infer T, infer W, infer ID>
  ? {
      icfg: DagTraversalBuilder<T, W, ID>['icfg'];
      visitors: DagTraversalBuilder<T, W, ID>['visitors'];
    }
  : R extends AsyncDagTraversalBuilder<infer T, infer W, infer ID>
  ? {
      icfg: AsyncDagTraversalBuilder<T, W, ID>['icfg'];
      visitors: AsyncDagTraversalBuilder<T, W, ID>['visitors'];
    }
  : never;

export function traversalInternals<R>(traversal: R): TraversalInternals<R> {
  return traversal as unknown as TraversalInternals<R>;
}

export function createInternalDepthFirstTreeTraversal<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: DepthFirstTreeTraversalBuilderOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      DepthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): DepthFirstTreeTraversalBuilder<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new DepthFirstTreeTraversalBuilder<T, R>(
    options as DepthFirstTreeTraversalBuilderOptions<T, R>,
  );
  traversal.createIndependentRunnerFromCurrentOptions = () =>
    new InternalDepthFirstTreeRunner({
      ...traversalInternals(traversal).icfg,
      visitors: traversalInternals(traversal).visitors,
      traversalRunnerInternalObjects: {
        ...traversalInternals(traversal).icfg.traversalRunnerInternalObjects,
        ...traversalRunnerInternalObjects,
      },
    });
  return traversal;
}

export function createInternalAsyncDepthFirstTreeTraversal<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: AsyncDepthFirstTreeTraversalBuilderOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDepthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): AsyncDepthFirstTreeTraversalBuilder<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new AsyncDepthFirstTreeTraversalBuilder<T, R>(
    options as AsyncDepthFirstTreeTraversalBuilderOptions<T, R>,
  );
  traversal.createIndependentRunnerFromCurrentOptions = () =>
    new InternalAsyncDepthFirstTreeRunner({
      ...traversalInternals(traversal).icfg,
      visitors: traversalInternals(traversal).visitors,
      traversalRunnerInternalObjects: {
        ...traversalInternals(traversal).icfg.traversalRunnerInternalObjects,
        ...traversalRunnerInternalObjects,
      },
    });
  return traversal;
}

export function createInternalBreadthFirstTreeTraversal<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: BreadthFirstTreeTraversalBuilderOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      BreadthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): BreadthFirstTreeTraversalBuilder<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new BreadthFirstTreeTraversalBuilder<T, R>(
    options as BreadthFirstTreeTraversalBuilderOptions<T, R>,
  );
  traversal.createIndependentRunnerFromCurrentOptions = () =>
    new InternalBreadthFirstTreeRunner({
      ...traversalInternals(traversal).icfg,
      visitors: traversalInternals(traversal).visitors,
      traversalRunnerInternalObjects: {
        ...traversalInternals(traversal).icfg.traversalRunnerInternalObjects,
        ...traversalRunnerInternalObjects,
      },
    });
  return traversal;
}

export function createInternalAsyncBreadthFirstTreeTraversal<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
>(
  input: AsyncBreadthFirstTreeTraversalBuilderOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncBreadthFirstTreeResolvedOptions<
        T,
        R
      >['traversalRunnerInternalObjects']
    >;
  },
): AsyncBreadthFirstTreeTraversalBuilder<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new AsyncBreadthFirstTreeTraversalBuilder<T, R>(
    options as AsyncBreadthFirstTreeTraversalBuilderOptions<T, R>,
  );
  traversal.createIndependentRunnerFromCurrentOptions = () =>
    new InternalAsyncBreadthFirstTreeRunner({
      ...traversalInternals(traversal).icfg,
      visitors: traversalInternals(traversal).visitors,
      traversalRunnerInternalObjects: {
        ...traversalInternals(traversal).icfg.traversalRunnerInternalObjects,
        ...traversalRunnerInternalObjects,
      },
    });
  return traversal;
}

export function createInternalDagTraversal<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
  ID = unknown,
>(
  input: DagTraversalBuilderOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      DagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): DagTraversalBuilder<T, R, ID> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new DagTraversalBuilder<T, R, ID>(options as DagTraversalBuilderOptions<T, R, ID>);
  traversal.createIndependentRunnerFromCurrentOptions = () =>
    new InternalDagTraversalRunner({
      ...traversalInternals(traversal).icfg,
      visitors: traversalInternals(traversal).visitors,
      traversalRunnerInternalObjects: {
        ...traversalInternals(traversal).icfg.traversalRunnerInternalObjects,
        ...traversalRunnerInternalObjects,
      },
    });
  return traversal;
}

export function createInternalAsyncDagTraversal<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
  ID = unknown,
>(
  input: AsyncDagTraversalBuilderOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): AsyncDagTraversalBuilder<T, R, ID> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new AsyncDagTraversalBuilder<T, R, ID>(
    options as AsyncDagTraversalBuilderOptions<T, R, ID>,
  );
  traversal.createIndependentRunnerFromCurrentOptions = () =>
    new InternalAsyncDagTraversalRunner({
      ...traversalInternals(traversal).icfg,
      visitors: traversalInternals(traversal).visitors,
      traversalRunnerInternalObjects: {
        ...traversalInternals(traversal).icfg.traversalRunnerInternalObjects,
        ...traversalRunnerInternalObjects,
      },
    });
  return traversal;
}

export function createInternalDagTraversalFor<
  T extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
  ID = unknown,
>(
  Constructor: unknown,
  input: AsyncDagTraversalBuilderOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): DagTraversalBuilder<T, R, ID> | AsyncDagTraversalBuilder<T, R, ID> {
  return Constructor === DagTraversalBuilder
    ? createInternalDagTraversal(input as DagTraversalBuilderOptions<T, R, ID>)
    : createInternalAsyncDagTraversal(input);
}

export function inspectInternalDagState(runner: object) {
  return dagRunnerCapabilities.get(runner)!.inspectState();
}

/** Deliberate engine-fixture access, never an ordinary runner capability. */
export function internalTreeStore<T extends VertexDataAndChildHintTypes>(runner: {
  getLiveResolvedTreeView(): import('../src').LiveResolvedTreeView<T> | null;
}): import('../src').MutableResolvedTreeStore<T> {
  const state = runner as unknown as {
    resolvedTreesContainer?: {
      resolvedTree: import('../src').MutableResolvedTreeStore<T>;
    };
    resolvedGraphsContainer?: {
      treeContainer: { resolvedTree: import('../src').MutableResolvedTreeStore<T> };
    };
  };
  return (
    state.resolvedTreesContainer?.resolvedTree ??
    state.resolvedGraphsContainer!.treeContainer.resolvedTree
  );
}
