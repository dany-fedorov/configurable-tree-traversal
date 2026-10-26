import type { TreeSource } from '@core/TraversableTree';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { DepthFirstTreeTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import type {
  DepthFirstTreeOptions,
  DepthFirstTreeOptionsPatch,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';

export type DepthFirstTraversalVisitorsSimple<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  preOrderVisitor?: TraversalVisitor<DepthFirstPhase.PRE_ORDER, TTP, RW_TTP>;
  postOrderVisitor?: TraversalVisitor<DepthFirstPhase.POST_ORDER, TTP, RW_TTP>;
  inOrderVisitor?: TraversalVisitor<DepthFirstPhase.IN_ORDER, TTP, RW_TTP>;
};

export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: DepthFirstTreeOptions<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: TreeSource<TTP, RW_TTP>,
  visitors: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTreeOptionsPatch<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP>;
export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions: TreeSource<TTP, RW_TTP> | DepthFirstTreeOptions<TTP, RW_TTP>,
  visitors?: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTreeOptionsPatch<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP> {
  let traversalConfig: DepthFirstTreeOptions<TTP, RW_TTP>;
  const preOrderVisitor = visitors?.preOrderVisitor;
  const inOrderVisitor = visitors?.inOrderVisitor;
  const postOrderVisitor = visitors?.postOrderVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as DepthFirstTreeOptions<TTP, RW_TTP>;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as TreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new DepthFirstTreeTraversal<TTP, RW_TTP>(traversalConfig);
  if (preOrderVisitor) {
    traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, preOrderVisitor);
  }
  if (inOrderVisitor) {
    traversal.addVisitorFor(DepthFirstPhase.IN_ORDER, inOrderVisitor);
  }
  if (postOrderVisitor) {
    traversal.addVisitorFor(DepthFirstPhase.POST_ORDER, postOrderVisitor);
  }
  return traversal.createRunner().run();
}
