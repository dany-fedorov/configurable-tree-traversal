import { dagRunnerCapabilities } from '../src/traversals/dag-traversal/lib/dagRunnerCapabilities';
import type { AsyncBreadthFirstTreeOptions } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeOptions } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig';
import type { AsyncDepthFirstTreeOptions } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeOptions } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

import { InternalDepthFirstTreeRunner } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTreeRunner } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
  type DepthFirstTreeResolvedOptions,
  type DepthFirstTreeOptionsPatch,
} from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTreeTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';

export function createInternalDepthFirstTreeRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: DepthFirstTreeOptionsPatch<T, R> & {
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
  type AsyncDepthFirstTreeOptionsPatch,
} from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import { AsyncDepthFirstTreeTraversal } from '../src/traversals/depth-first-traversal/AsyncDepthFirstTraversal';

export function createInternalAsyncDepthFirstTreeRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: AsyncDepthFirstTreeOptionsPatch<T, R> & {
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
  type BreadthFirstTreeOptionsPatch,
} from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTreeTraversal } from '../src/traversals/breadth-first-traversal/BreadthFirstTraversal';

export function createInternalBreadthFirstTreeRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: BreadthFirstTreeOptionsPatch<T, R> & {
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
  type AsyncBreadthFirstTreeOptionsPatch,
} from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import { AsyncBreadthFirstTreeTraversal } from '../src/traversals/breadth-first-traversal/AsyncBreadthFirstTraversal';

export function createInternalAsyncBreadthFirstTreeRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: AsyncBreadthFirstTreeOptionsPatch<T, R> & {
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
  type DagOptions,
} from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';

export function createInternalDagTraversalRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  input: DagOptions<T, R, ID> & {
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
  type AsyncDagOptions,
} from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';

export function createInternalAsyncDagTraversalRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  input: AsyncDagOptions<T, R, ID> & {
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

export type TraversalInternals<R> = R extends DepthFirstTreeTraversal<
  infer T,
  infer W
>
  ? {
      icfg: DepthFirstTreeTraversal<T, W>['icfg'];
      visitors: DepthFirstTreeTraversal<T, W>['visitors'];
    }
  : R extends AsyncDepthFirstTreeTraversal<infer T, infer W>
  ? {
      icfg: AsyncDepthFirstTreeTraversal<T, W>['icfg'];
      visitors: AsyncDepthFirstTreeTraversal<T, W>['visitors'];
    }
  : R extends BreadthFirstTreeTraversal<infer T, infer W>
  ? {
      icfg: BreadthFirstTreeTraversal<T, W>['icfg'];
      visitors: BreadthFirstTreeTraversal<T, W>['visitors'];
    }
  : R extends AsyncBreadthFirstTreeTraversal<infer T, infer W>
  ? {
      icfg: AsyncBreadthFirstTreeTraversal<T, W>['icfg'];
      visitors: AsyncBreadthFirstTreeTraversal<T, W>['visitors'];
    }
  : R extends DagTraversal<infer T, infer W, infer ID>
  ? {
      icfg: DagTraversal<T, W, ID>['icfg'];
      visitors: DagTraversal<T, W, ID>['visitors'];
    }
  : R extends AsyncDagTraversal<infer T, infer W, infer ID>
  ? {
      icfg: AsyncDagTraversal<T, W, ID>['icfg'];
      visitors: AsyncDagTraversal<T, W, ID>['visitors'];
    }
  : never;

export function traversalInternals<R>(traversal: R): TraversalInternals<R> {
  return traversal as unknown as TraversalInternals<R>;
}

export function createInternalDepthFirstTreeTraversal<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: DepthFirstTreeOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      DepthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): DepthFirstTreeTraversal<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new DepthFirstTreeTraversal<T, R>(
    options as DepthFirstTreeOptions<T, R>,
  );
  traversal.createRunner = () =>
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
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: AsyncDepthFirstTreeOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDepthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): AsyncDepthFirstTreeTraversal<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new AsyncDepthFirstTreeTraversal<T, R>(
    options as AsyncDepthFirstTreeOptions<T, R>,
  );
  traversal.createRunner = () =>
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
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: BreadthFirstTreeOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      BreadthFirstTreeResolvedOptions<T, R>['traversalRunnerInternalObjects']
    >;
  },
): BreadthFirstTreeTraversal<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new BreadthFirstTreeTraversal<T, R>(
    options as BreadthFirstTreeOptions<T, R>,
  );
  traversal.createRunner = () =>
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
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
>(
  input: AsyncBreadthFirstTreeOptions<T, R> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncBreadthFirstTreeResolvedOptions<
        T,
        R
      >['traversalRunnerInternalObjects']
    >;
  },
): AsyncBreadthFirstTreeTraversal<T, R> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new AsyncBreadthFirstTreeTraversal<T, R>(
    options as AsyncBreadthFirstTreeOptions<T, R>,
  );
  traversal.createRunner = () =>
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
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  input: DagOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      DagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): DagTraversal<T, R, ID> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new DagTraversal<T, R, ID>(options as DagOptions<T, R, ID>);
  traversal.createRunner = () =>
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
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  input: AsyncDagOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): AsyncDagTraversal<T, R, ID> {
  const { traversalRunnerInternalObjects, ...options } = input;
  const traversal = new AsyncDagTraversal<T, R, ID>(
    options as AsyncDagOptions<T, R, ID>,
  );
  traversal.createRunner = () =>
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
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  Constructor: unknown,
  input: AsyncDagOptions<T, R, ID> & {
    traversalRunnerInternalObjects?: Partial<
      AsyncDagResolvedOptions<T, R, ID>['traversalRunnerInternalObjects']
    >;
  },
): DagTraversal<T, R, ID> | AsyncDagTraversal<T, R, ID> {
  return Constructor === DagTraversal
    ? createInternalDagTraversal(input as DagOptions<T, R, ID>)
    : createInternalAsyncDagTraversal(input);
}

export function inspectInternalDagState(runner: object) {
  return dagRunnerCapabilities.get(runner)!.inspectState();
}
