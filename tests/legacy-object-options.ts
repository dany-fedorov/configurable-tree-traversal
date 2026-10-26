import type { LegacyObjectTreeOptions } from '../src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { TraversableObjectPropKey } from '../src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectPropKey';
import type { RewriteObjectOptions } from '../src/tools/rewrite-object/rewriteObject';

/** Explicit compatibility fixtures; canonical object construction omits the legacy hook. */
export function legacyObjectOptions<In>(
  options: LegacyObjectTreeOptions<
    In,
    TraversableObjectPropKey,
    unknown,
    TraversableObjectPropKey,
    unknown
  > &
    RewriteObjectOptions<
      In,
      TraversableObjectPropKey,
      unknown,
      unknown,
      TraversableObjectPropKey,
      unknown
    >,
) {
  return options;
}
