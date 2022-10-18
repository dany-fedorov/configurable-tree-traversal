import type { DepthFirstTraversalRunnerIterableConfig } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export function shouldRunVisitorsForOrder(
  iterableConfig: DepthFirstTraversalRunnerIterableConfig,
  order: DepthFirstTraversalOrder,
): boolean {
  if (Array.isArray(iterableConfig.enableVisitorFunctionsFor)) {
    return iterableConfig.enableVisitorFunctionsFor.includes(order);
  }
  if (
    !Array.isArray(iterableConfig.enableVisitorFunctionsFor) &&
    Array.isArray(iterableConfig.disableVisitorFunctionsFor)
  ) {
    return iterableConfig.disableVisitorFunctionsFor.includes(order);
  }
  return true;
}
