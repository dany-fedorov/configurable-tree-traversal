import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { TreeSource } from '@core/TraversableTree';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { BreadthFirstTreeTraversal } from './BreadthFirstTraversal';
import type { BreadthFirstTraversalInstanceConfigInput } from './lib/BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';
import type { BreadthFirstTreeRunner } from './lib/BreadthFirstTraversalRunner';

/** Options for a single-call BreadthFirst traversal with phase-keyed callbacks. */
export type BreadthFirstTraversalHelperOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: TreeSource<TTP, RW_TTP> } & {
  visitors?: {
    [K in BreadthFirstTraversalOrder]?: VisitorPhaseInput<
      TraversalVisitor<K, TTP, RW_TTP>
    >;
  };
};

export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: BreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: TreeSource<TTP, RW_TTP>,
  visitor: TraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP> | null,
  config?: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP>;
export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions:
    | TreeSource<TTP, RW_TTP>
    | BreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitor?: TraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP> | null,
  config?: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP> {
  let traversalConfig: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>;
  const levelOrderVisitor = visitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as BreadthFirstTraversalHelperOptions<
      TTP,
      RW_TTP
    >;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as TreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new BreadthFirstTreeTraversal<TTP, RW_TTP>(traversalConfig);
  if (levelOrderVisitor) {
    traversal.addVisitorFor(
      BreadthFirstTraversalOrder.LEVEL_ORDER,
      levelOrderVisitor,
    );
  }
  return traversal.createRunner().run();
}
