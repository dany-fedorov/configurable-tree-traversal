import { assertOwnKeys, definedOptions } from './assertPublicOptions';
import type { StructuralAncestorPathOptions } from './ResolvedTree';

/** Capture query controls once without touching caller data or vertex identities. */
export function normalizePathOptions(
  input?: StructuralAncestorPathOptions,
): StructuralAncestorPathOptions {
  if (input === undefined) return {};
  assertOwnKeys(input, ['includeDesignatedRoot', 'includeTargetVertex']);
  const options = definedOptions(input);
  for (const value of Object.values(options)) {
    if (typeof value !== 'boolean')
      throw new TypeError('Path options must be boolean');
  }
  return options;
}
