import type { DepthFirstTraversalRunnerIterableConfig } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export function shouldYieldForOrder(
  iterableConfig: DepthFirstTraversalRunnerIterableConfig,
  order: DepthFirstTreeVisitPhase,
): boolean {
  if (Array.isArray(iterableConfig.iterateOver)) {
    return iterableConfig.iterateOver.includes(order);
  }
  return true;
}
