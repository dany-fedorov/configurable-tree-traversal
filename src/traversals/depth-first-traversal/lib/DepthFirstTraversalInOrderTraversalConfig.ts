import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import type { ZeroBasedOrEndRelativeChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';

export type DepthFirstChildBoundaryVisitOptions = {
  visitAfterChildIndices: ZeroBasedOrEndRelativeChildIndexSelection;
  visitAfterChildIndicesWhenPrimarySelectionIsEmpty: ZeroBasedOrEndRelativeChildIndexSelection;
  alsoVisitAfterOnlyChild: boolean;
  allowBoundaryVisitsAfterOmittedChildSlots: boolean;
};

export type DepthFirstChildBoundaryVisitOptionsPatch = {
  [K in keyof DepthFirstChildBoundaryVisitOptions]?:
    | DepthFirstChildBoundaryVisitOptions[K]
    | undefined;
};

function clonePositions(
  value: ZeroBasedOrEndRelativeChildIndexSelection,
): ZeroBasedOrEndRelativeChildIndexSelection {
  assertOwnKeys(value, ['indices', 'ranges']);
  const indices = Object.prototype.hasOwnProperty.call(value, 'indices');
  const ranges = Object.prototype.hasOwnProperty.call(value, 'ranges');
  if (indices === ranges)
    throw new TypeError(
      'Child positions require exactly one of indices or ranges',
    );
  const captured = definedOptions(value);
  const integer = (n: unknown) =>
    typeof n === 'number' && Number.isSafeInteger(n);
  if (indices) {
    if (!Array.isArray(captured.indices))
      throw new TypeError('Child indices must be an array');
    const positions = Array.from(captured.indices);
    if (!positions.every(integer))
      throw new TypeError('Child indices must be safe integers');
    return { indices: positions };
  }
  if (!Array.isArray(captured.ranges))
    throw new TypeError('Child ranges must be an array');
  return {
    ranges: Array.from(captured.ranges, (range) => {
      assertOwnKeys(range, ['fromInclusive', 'throughInclusive']);
      const from: unknown = Reflect.get(range, 'fromInclusive');
      const through: unknown = Reflect.get(range, 'throughInclusive');
      if (
        typeof from !== 'number' ||
        typeof through !== 'number' ||
        !integer(from) ||
        !integer(through)
      )
        throw new TypeError('Child range endpoints must be safe integers');
      return { fromInclusive: from, throughInclusive: through };
    }),
  };
}

export function mergeInOrderOptions(
  base: DepthFirstChildBoundaryVisitOptions,
  input?: DepthFirstChildBoundaryVisitOptionsPatch,
): DepthFirstChildBoundaryVisitOptions {
  if (input !== undefined)
    assertOwnKeys(input, [
      'visitAfterChildIndices',
      'visitAfterChildIndicesWhenPrimarySelectionIsEmpty',
      'alsoVisitAfterOnlyChild',
      'allowBoundaryVisitsAfterOmittedChildSlots',
    ]);
  const merged = { ...base, ...definedOptions(input ?? {}) };
  if (
    typeof merged.alsoVisitAfterOnlyChild !== 'boolean' ||
    typeof merged.allowBoundaryVisitsAfterOmittedChildSlots !== 'boolean'
  )
    throw new TypeError('In-order visit policies must be boolean');
  return {
    ...merged,
    visitAfterChildIndices: clonePositions(merged.visitAfterChildIndices),
    visitAfterChildIndicesWhenPrimarySelectionIsEmpty: clonePositions(
      merged.visitAfterChildIndicesWhenPrimarySelectionIsEmpty,
    ),
  };
}
