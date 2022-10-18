import type { DepthFirstTraversalRunnerIterableConfig } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export function shouldYieldForOrder(
  iterableConfig: DepthFirstTraversalRunnerIterableConfig,
  order: DepthFirstTraversalOrder,
): boolean {
  if (Array.isArray(iterableConfig.iterateOver)) {
    return iterableConfig.iterateOver.includes(order);
  }
  return true;
}
