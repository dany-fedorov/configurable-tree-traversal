import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import type { ChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';

export type InOrderOptions = {
  afterChildIndices: ChildIndexSelection;
  fallbackChildIndices: ChildIndexSelection;
  visitSingleChildParent: boolean;
  visitAfterOmittedChildren: boolean;
};

export type InOrderOptionsPatch = {
  [K in keyof InOrderOptions]?: InOrderOptions[K] | undefined;
};

function clonePositions(value: ChildIndexSelection): ChildIndexSelection {
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
      assertOwnKeys(range, ['from', 'through']);
      const from: unknown = Reflect.get(range, 'from');
      const through: unknown = Reflect.get(range, 'through');
      if (
        typeof from !== 'number' ||
        typeof through !== 'number' ||
        !integer(from) ||
        !integer(through)
      )
        throw new TypeError('Child range endpoints must be safe integers');
      return { from, through };
    }),
  };
}

export function mergeInOrderOptions(
  base: InOrderOptions,
  input?: InOrderOptionsPatch,
): InOrderOptions {
  if (input !== undefined)
    assertOwnKeys(input, [
      'afterChildIndices',
      'fallbackChildIndices',
      'visitSingleChildParent',
      'visitAfterOmittedChildren',
    ]);
  const merged = { ...base, ...definedOptions(input ?? {}) };
  if (
    typeof merged.visitSingleChildParent !== 'boolean' ||
    typeof merged.visitAfterOmittedChildren !== 'boolean'
  )
    throw new TypeError('In-order visit policies must be boolean');
  return {
    ...merged,
    afterChildIndices: clonePositions(merged.afterChildIndices),
    fallbackChildIndices: clonePositions(merged.fallbackChildIndices),
  };
}
