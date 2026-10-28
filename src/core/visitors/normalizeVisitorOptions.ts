import {
  DEFAULT_VISITOR_PRIORITY,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';

export function normalizeVisitorOptions(
  options: Partial<TraversalVisitorFunctionOptions>,
): Required<TraversalVisitorFunctionOptions> {
  const { priority, commandCommitMode } = options;
  if (
    priority !== undefined &&
    (typeof priority !== 'number' || !Number.isFinite(priority))
  )
    throw new TypeError('Visitor priority must be finite');
  if (
    commandCommitMode !== undefined &&
    commandCommitMode !== 'afterEachVisitor' &&
    commandCommitMode !== 'afterGroup'
  ) {
    throw new TypeError('Unknown visitor command commit mode');
  }
  return {
    priority: priority ?? DEFAULT_VISITOR_PRIORITY,
    commandCommitMode: commandCommitMode ?? 'afterEachVisitor',
  };
}
