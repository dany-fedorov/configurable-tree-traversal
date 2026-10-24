import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { AsyncBreadthFirstTraversal } from './AsyncBreadthFirstTraversal';
import type { AsyncBreadthFirstTraversalInstanceConfigInput } from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';
import type { AsyncBreadthFirstTraversalRunner } from './lib/AsyncBreadthFirstTraversalRunner';

/** Options for a single-call BreadthFirst traversal with phase-keyed callbacks. */
export type AsyncBreadthFirstTraversalHelperOptions<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Omit<
  AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: AsyncTraversableTree<TTP, RW_TTP> } & {
  visitors?: {
    [K in BreadthFirstTraversalOrder]?: VisitorPhaseInput<
      AsyncTraversalVisitor<K, TTP, RW_TTP>
    >;
  };
};

export function traverseBreadthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  options: AsyncBreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTraversalRunner<TTP, RW_TTP>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseBreadthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: AsyncTraversableTree<TTP, RW_TTP>,
  visitor: AsyncTraversalVisitor<
    BreadthFirstTraversalOrder,
    TTP,
    RW_TTP
  > | null,
  config?: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTraversalRunner<TTP, RW_TTP>>;
export function traverseBreadthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  sourceOrOptions:
    | AsyncTraversableTree<TTP, RW_TTP>
    | AsyncBreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitor?: AsyncTraversalVisitor<
    BreadthFirstTraversalOrder,
    TTP,
    RW_TTP
  > | null,
  config?: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTraversalRunner<TTP, RW_TTP>> {
  let traversalConfig: AsyncBreadthFirstTraversalInstanceConfigInput<
    TTP,
    RW_TTP
  >;
  const levelOrderVisitor = visitor;
  if (arguments.length === 1) {
    traversalConfig =
      sourceOrOptions as AsyncBreadthFirstTraversalHelperOptions<TTP, RW_TTP>;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as AsyncTraversableTree<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new AsyncBreadthFirstTraversal<TTP, RW_TTP>(
    traversalConfig,
  );
  if (levelOrderVisitor) {
    traversal.addVisitorFor(
      BreadthFirstTraversalOrder.LEVEL_ORDER,
      levelOrderVisitor,
    );
  }
  return traversal.makeRunner().run();
}
