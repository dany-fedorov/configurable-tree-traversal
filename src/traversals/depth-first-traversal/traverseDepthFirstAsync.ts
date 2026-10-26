import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncDepthFirstTreeTraversal } from './AsyncDepthFirstTraversal';
import type { AsyncDepthFirstTraversalInstanceConfigInput } from './lib/AsyncDepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from './lib/DepthFirstTraversalOrder';
import type { AsyncDepthFirstTreeRunner } from './lib/AsyncDepthFirstTraversalRunner';

export type AsyncDepthFirstTraversalVisitorsSimple<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  preOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstPhase.PRE_ORDER,
    TTP,
    RW_TTP
  >;
  postOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstPhase.POST_ORDER,
    TTP,
    RW_TTP
  >;
  inOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstPhase.IN_ORDER,
    TTP,
    RW_TTP
  >;
};

/** Options for a single-call DepthFirst traversal with phase-keyed callbacks. */
export type AsyncDepthFirstTraversalHelperOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: AsyncTreeSource<TTP, RW_TTP> } & {
  visitors?: {
    [K in DepthFirstPhase]?: VisitorPhaseInput<
      AsyncTraversalVisitor<K, TTP, RW_TTP>
    >;
  };
};

export function traverseTreeDepthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: AsyncDepthFirstTraversalHelperOptions<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTreeRunner<TTP, RW_TTP>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeDepthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: AsyncTreeSource<TTP, RW_TTP>,
  visitors: AsyncDepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTreeRunner<TTP, RW_TTP>>;
export function traverseTreeDepthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions:
    | AsyncTreeSource<TTP, RW_TTP>
    | AsyncDepthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitors?: AsyncDepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTreeRunner<TTP, RW_TTP>> {
  let traversalConfig: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>;
  const preOrderVisitor = visitors?.preOrderVisitor;
  const inOrderVisitor = visitors?.inOrderVisitor;
  const postOrderVisitor = visitors?.postOrderVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as AsyncDepthFirstTraversalHelperOptions<
      TTP,
      RW_TTP
    >;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as AsyncTreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new AsyncDepthFirstTreeTraversal<TTP, RW_TTP>(traversalConfig);
  if (preOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstPhase.PRE_ORDER,
      preOrderVisitor,
    );
  }
  if (inOrderVisitor) {
    traversal.addVisitorFor(DepthFirstPhase.IN_ORDER, inOrderVisitor);
  }
  if (postOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstPhase.POST_ORDER,
      postOrderVisitor,
    );
  }
  return traversal.createRunner().run();
}
