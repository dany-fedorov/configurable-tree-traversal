import { DepthFirstTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversableTree } from '@core/TraversableTree';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { DepthFirstTraversalRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTraversalInstanceConfigInput } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';

export type DepthFirstTraversalVisitorsSimple<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  preOrderVisitor?: TraversalVisitor<
    DepthFirstTraversalOrder.PRE_ORDER,
    TTP,
    RW_TTP
  >;
  postOrderVisitor?: TraversalVisitor<
    DepthFirstTraversalOrder.POST_ORDER,
    TTP,
    RW_TTP
  >;
  inOrderVisitor?: TraversalVisitor<
    DepthFirstTraversalOrder.IN_ORDER,
    TTP,
    RW_TTP
  >;
};

/** Options for a single-call DepthFirst traversal with phase-keyed callbacks. */
export type DepthFirstTraversalHelperOptions<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Omit<
  DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: TraversableTree<TTP, RW_TTP> } & {
  visitors?: {
    [K in DepthFirstTraversalOrder]?: TraversalVisitor<K, TTP, RW_TTP>;
  };
};

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  options: DepthFirstTraversalHelperOptions<TTP, RW_TTP>,
): DepthFirstTraversalRunner<TTP, RW_TTP>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: TraversableTree<TTP, RW_TTP>,
  visitors: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalRunner<TTP, RW_TTP>;
export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  sourceOrOptions:
    | TraversableTree<TTP, RW_TTP>
    | DepthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitors?: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalRunner<TTP, RW_TTP> {
  let traversalConfig: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>;
  let preOrderVisitor = visitors?.preOrderVisitor;
  let inOrderVisitor = visitors?.inOrderVisitor;
  let postOrderVisitor = visitors?.postOrderVisitor;
  if (arguments.length === 1) {
    const { visitors: callbacks, ...options } =
      sourceOrOptions as DepthFirstTraversalHelperOptions<TTP, RW_TTP>;
    traversalConfig = options;
    preOrderVisitor = callbacks?.[DepthFirstTraversalOrder.PRE_ORDER];
    inOrderVisitor = callbacks?.[DepthFirstTraversalOrder.IN_ORDER];
    postOrderVisitor = callbacks?.[DepthFirstTraversalOrder.POST_ORDER];
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as TraversableTree<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new DepthFirstTraversal<TTP, RW_TTP>(traversalConfig);
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
