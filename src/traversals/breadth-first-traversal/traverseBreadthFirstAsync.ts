import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncBreadthFirstTreeTraversal } from './AsyncBreadthFirstTraversal';
import type {
  AsyncBreadthFirstTreeOptions,
  AsyncBreadthFirstTreeOptionsPatch,
} from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { AsyncBreadthFirstTreeRunner } from './lib/AsyncBreadthFirstTraversalRunner';
import { BreadthFirstPhase } from './lib/BreadthFirstTraversalOrder';

export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: AsyncBreadthFirstTreeOptions<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: AsyncTreeSource<TTP, RW_TTP>,
  visitor: AsyncTraversalVisitor<BreadthFirstPhase, TTP, RW_TTP> | null,
  config?: AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>>;
export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions:
    | AsyncTreeSource<TTP, RW_TTP>
    | AsyncBreadthFirstTreeOptions<TTP, RW_TTP>,
  visitor?: AsyncTraversalVisitor<BreadthFirstPhase, TTP, RW_TTP> | null,
  config?: AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>> {
  let traversalConfig: AsyncBreadthFirstTreeOptions<TTP, RW_TTP>;
  const levelOrderVisitor = visitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as AsyncBreadthFirstTreeOptions<
      TTP,
      RW_TTP
    >;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as AsyncTreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new AsyncBreadthFirstTreeTraversal<TTP, RW_TTP>(
    traversalConfig,
  );
  if (levelOrderVisitor) {
    traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, levelOrderVisitor);
  }
  return traversal.createRunner().run();
}
