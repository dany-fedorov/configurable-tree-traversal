import {
  DEFAULT_VISITOR_PRIORITY,
  TraversalVisitorFunctionResolutionStyle as Style,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';

export function normalizeVisitorOptions(
  options: Partial<TraversalVisitorFunctionOptions>,
): Required<TraversalVisitorFunctionOptions> {
  const { commandCommitMode, resolutionStyle } = options;
  if (
    resolutionStyle !== undefined &&
    resolutionStyle !== Style.SEQUENTIAL &&
    resolutionStyle !== Style.CONCURRENT
  ) {
    throw new TypeError('Unknown visitor resolution style');
  }
  if (
    commandCommitMode !== undefined &&
    commandCommitMode !== 'afterEachVisitor' &&
    commandCommitMode !== 'afterGroup'
  ) {
    throw new TypeError('Unknown visitor command commit mode');
  }
  const legacyMode =
    resolutionStyle === Style.CONCURRENT ? 'afterGroup' : 'afterEachVisitor';
  if (
    commandCommitMode !== undefined &&
    resolutionStyle !== undefined &&
    commandCommitMode !== legacyMode
  ) {
    throw new TypeError('Conflicting commandCommitMode and resolutionStyle');
  }
  const mode = commandCommitMode ?? legacyMode;
  return {
    priority: options.priority ?? DEFAULT_VISITOR_PRIORITY,
    commandCommitMode: mode,
    resolutionStyle:
      mode === 'afterGroup' ? Style.CONCURRENT : Style.SEQUENTIAL,
  };
}
