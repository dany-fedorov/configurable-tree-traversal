import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { AsyncDepthFirstTraversal } from './AsyncDepthFirstTraversal';
import type { AsyncDepthFirstTraversalInstanceConfigInput } from './lib/AsyncDepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalOrder } from './lib/DepthFirstTraversalOrder';
import type { AsyncDepthFirstTraversalRunner } from './lib/AsyncDepthFirstTraversalRunner';

export type AsyncDepthFirstTraversalVisitorsSimple<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  preOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstTraversalOrder.PRE_ORDER,
    TTP,
    RW_TTP
  >;
  postOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstTraversalOrder.POST_ORDER,
    TTP,
    RW_TTP
  >;
  inOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstTraversalOrder.IN_ORDER,
    TTP,
    RW_TTP
  >;
};

/** Options for a single-call DepthFirst traversal with phase-keyed callbacks. */
export type AsyncDepthFirstTraversalHelperOptions<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Omit<
  AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: AsyncTraversableTree<TTP, RW_TTP> } & {
  visitors?: {
    [K in DepthFirstTraversalOrder]?: AsyncTraversalVisitor<K, TTP, RW_TTP>;
  };
};

export function traverseDepthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  options: AsyncDepthFirstTraversalHelperOptions<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTraversalRunner<TTP, RW_TTP>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDepthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: AsyncTraversableTree<TTP, RW_TTP>,
  visitors: AsyncDepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTraversalRunner<TTP, RW_TTP>>;
export function traverseDepthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  sourceOrOptions:
    | AsyncTraversableTree<TTP, RW_TTP>
    | AsyncDepthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitors?: AsyncDepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTraversalRunner<TTP, RW_TTP>> {
  let traversalConfig: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>;
  let preOrderVisitor = visitors?.preOrderVisitor;
  let inOrderVisitor = visitors?.inOrderVisitor;
  let postOrderVisitor = visitors?.postOrderVisitor;
  if (arguments.length === 1) {
    const { visitors: callbacks, ...options } =
      sourceOrOptions as AsyncDepthFirstTraversalHelperOptions<TTP, RW_TTP>;
    traversalConfig = options;
    preOrderVisitor = callbacks?.[DepthFirstTraversalOrder.PRE_ORDER];
    inOrderVisitor = callbacks?.[DepthFirstTraversalOrder.IN_ORDER];
    postOrderVisitor = callbacks?.[DepthFirstTraversalOrder.POST_ORDER];
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as AsyncTraversableTree<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new AsyncDepthFirstTraversal<TTP, RW_TTP>(traversalConfig);
  if (preOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      preOrderVisitor,
    );
  }
  if (inOrderVisitor) {
    traversal.addVisitorFor(DepthFirstTraversalOrder.IN_ORDER, inOrderVisitor);
  }
  if (postOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.POST_ORDER,
      postOrderVisitor,
    );
  }
  return traversal.makeRunner().run();
}
