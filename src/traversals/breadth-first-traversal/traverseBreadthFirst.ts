import type { TreeSource } from '@core/TraversableTree';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { BreadthFirstTreeTraversal } from './BreadthFirstTraversal';
import type {
  BreadthFirstTreeOptions,
  BreadthFirstTreeOptionsPatch,
} from './lib/BreadthFirstTraversalInstanceConfig';
import { BreadthFirstPhase } from './lib/BreadthFirstTraversalOrder';
import type { BreadthFirstTreeRunner } from './lib/BreadthFirstTraversalRunner';

export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: BreadthFirstTreeOptions<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: TreeSource<TTP, RW_TTP>,
  visitor: TraversalVisitor<BreadthFirstPhase, TTP, RW_TTP> | null,
  config?: BreadthFirstTreeOptionsPatch<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP>;
export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions:
    | TreeSource<TTP, RW_TTP>
    | BreadthFirstTreeOptions<TTP, RW_TTP>,
  visitor?: TraversalVisitor<BreadthFirstPhase, TTP, RW_TTP> | null,
  config?: BreadthFirstTreeOptionsPatch<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP> {
  let traversalConfig: BreadthFirstTreeOptions<TTP, RW_TTP>;
  const levelOrderVisitor = visitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as BreadthFirstTreeOptions<TTP, RW_TTP>;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as TreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new BreadthFirstTreeTraversal<TTP, RW_TTP>(traversalConfig);
  if (levelOrderVisitor) {
    traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, levelOrderVisitor);
  }
  return traversal.createRunner().run();
}
