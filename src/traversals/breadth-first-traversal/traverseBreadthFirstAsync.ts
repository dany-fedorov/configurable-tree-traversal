import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncBreadthFirstTreeTraversal } from './AsyncBreadthFirstTraversal';
import type { AsyncBreadthFirstTraversalInstanceConfigInput } from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import { BreadthFirstPhase } from './lib/BreadthFirstTraversalOrder';
import type { AsyncBreadthFirstTreeRunner } from './lib/AsyncBreadthFirstTraversalRunner';

/** Options for a single-call BreadthFirst traversal with phase-keyed callbacks. */
export type AsyncBreadthFirstTraversalHelperOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: AsyncTreeSource<TTP, RW_TTP> } & {
  visitors?: {
    [K in BreadthFirstPhase]?: VisitorPhaseInput<
      AsyncTraversalVisitor<K, TTP, RW_TTP>
    >;
  };
};

export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: AsyncBreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: AsyncTreeSource<TTP, RW_TTP>,
  visitor: AsyncTraversalVisitor<
    BreadthFirstPhase,
    TTP,
    RW_TTP
  > | null,
  config?: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>>;
export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions:
    | AsyncTreeSource<TTP, RW_TTP>
    | AsyncBreadthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitor?: AsyncTraversalVisitor<
    BreadthFirstPhase,
    TTP,
    RW_TTP
  > | null,
  config?: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>> {
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
      traversableTree: sourceOrOptions as AsyncTreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new AsyncBreadthFirstTreeTraversal<TTP, RW_TTP>(
    traversalConfig,
  );
  if (levelOrderVisitor) {
    traversal.addVisitorFor(
      BreadthFirstPhase.LEVEL_ORDER,
      levelOrderVisitor,
    );
  }
  return traversal.createRunner().run();
}
