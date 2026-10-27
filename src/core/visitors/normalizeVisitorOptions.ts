import {
  DEFAULT_VISITOR_PRIORITY,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';

export function normalizeVisitorOptions(
  options: Partial<TraversalVisitorFunctionOptions>,
): Required<TraversalVisitorFunctionOptions> {
  if ('resolutionStyle' in options) {
    throw new TypeError(
      'resolutionStyle is unsupported; use commandCommitMode',
    );
  }
  const { commandCommitMode } = options;
  if (
    commandCommitMode !== undefined &&
    commandCommitMode !== 'afterEachVisitor' &&
    commandCommitMode !== 'afterGroup'
  ) {
    throw new TypeError('Unknown visitor command commit mode');
  }
  return {
    priority: options.priority ?? DEFAULT_VISITOR_PRIORITY,
    commandCommitMode: commandCommitMode ?? 'afterEachVisitor',
  };
}
