import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { TraversableTree } from '@core/TraversableTree';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { BreadthFirstTraversal } from './BreadthFirstTraversal';
import type { BreadthFirstTraversalInstanceConfigInput } from './lib/BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalRunner } from './lib/BreadthFirstTraversalRunner';

/** Options for a single-call BreadthFirst traversal with phase-keyed callbacks. */
export type BreadthFirstTraversalHelperOptions<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Omit<
  BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: TraversableTree<TTP, RW_TTP> } & {
  visitors?: {
    [K in BreadthFirstTraversalOrder]?: VisitorPhaseInput<
      TraversalVisitor<K, TTP, RW_TTP>
    >;
  };
};

export function traverseBreadthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  options: BreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
): BreadthFirstTraversalRunner<TTP, RW_TTP>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseBreadthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: TraversableTree<TTP, RW_TTP>,
  visitor: TraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP> | null,
  config?: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): BreadthFirstTraversalRunner<TTP, RW_TTP>;
export function traverseBreadthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  sourceOrOptions:
    | TraversableTree<TTP, RW_TTP>
    | BreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitor?: TraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP> | null,
  config?: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): BreadthFirstTraversalRunner<TTP, RW_TTP> {
  let traversalConfig: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>;
  const levelOrderVisitor = visitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as BreadthFirstTraversalHelperOptions<
      TTP,
      RW_TTP
    >;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as TraversableTree<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new BreadthFirstTraversal<TTP, RW_TTP>(traversalConfig);
  if (levelOrderVisitor) {
    traversal.addVisitorFor(
      BreadthFirstTraversalOrder.LEVEL_ORDER,
      levelOrderVisitor,
    );
  }
  return traversal.makeRunner().run();
}
