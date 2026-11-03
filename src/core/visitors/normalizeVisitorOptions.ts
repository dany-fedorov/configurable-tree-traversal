import {
  DEFAULT_VISITOR_PRIORITY,
  type VisitorRegistrationOptions,
} from '@core/TraversalVisitor';

export function normalizeVisitorOptions(
  options: Partial<VisitorRegistrationOptions>,
): Required<VisitorRegistrationOptions> {
  const {
    descendingExecutionPriorityWithinGroup:
      descendingExecutionPriorityWithinGroup,
    visitorCommandCommitTiming,
  } = options;
  if (
    descendingExecutionPriorityWithinGroup !== undefined &&
    (typeof descendingExecutionPriorityWithinGroup !== 'number' ||
      !Number.isFinite(descendingExecutionPriorityWithinGroup))
  )
    throw new TypeError(
      'Visitor descendingExecutionPriorityWithinGroup must be finite',
    );
  if (
    visitorCommandCommitTiming !== undefined &&
    visitorCommandCommitTiming !== 'afterEachVisitorCallback' &&
    visitorCommandCommitTiming !== 'afterContiguousVisitorBatch'
  ) {
    throw new TypeError('Unknown visitor command commit mode');
  }
  return {
    descendingExecutionPriorityWithinGroup:
      descendingExecutionPriorityWithinGroup ?? DEFAULT_VISITOR_PRIORITY,
    visitorCommandCommitTiming:
      visitorCommandCommitTiming ?? 'afterEachVisitorCallback',
  };
}
