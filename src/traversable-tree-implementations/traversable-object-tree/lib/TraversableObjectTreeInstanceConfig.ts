import type {
  TreeChildResolutionContext,
  TreeVertexFound,
  TreeVertexOmitted,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VertexContentInput } from '@core/Vertex';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';

export type ObjectVertexHookResult<T extends VertexTypes> =
  | {
      kind: 'useDefault';
      vertexId?: never;
      dependsOnWork?: never;
      dependsOnSubgraphCompletion?: never;
      satisfiesDependencies?: never;
    }
  | TreeVertexFound<T>
  | TreeVertexOmitted;

/** @deprecated Use resolveVertexHook and tagged results. */
export type TraversableObjectTreeInstanceConfig_makeVertexHook<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = (
  vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
  _options: TreeChildResolutionContext<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  >,
) => {
  returnMe?: VertexContentInput<TraversableObjectTTP<InK, InV>> | null;
};

export type ObjectTreeOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = {
  getChildrenOfProperty?: (
    prop: TraversableObjectProp<InK, InV>,
  ) => TraversableObjectTTP<InK, InV>['VertexHint'][];
  getRootPropertyFromInputObject?: (
    inputObj: In,
  ) => TraversableObjectProp<InK, InV>;
  resolveVertexHook?: (
    vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
    options: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ) => ObjectVertexHookResult<TraversableObjectTTP<InK, InV>>;
};

/** @deprecated Compatibility decoding only; public construction uses ObjectTreeOptions. */
export type LegacyObjectTreeOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = ObjectTreeOptions<In, InK, InV, OutK, OutV> & {
  /** @deprecated Use resolveVertexHook. */
  makeVertexHook?:
    | TraversableObjectTreeInstanceConfig_makeVertexHook<InK, InV, OutK, OutV>
    | null
    | undefined;
};

export type ObjectTreeResolvedOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = Required<
  Omit<LegacyObjectTreeOptions<In, InK, InV, OutK, OutV>, 'resolveVertexHook'>
> & {
  resolveVertexHook: LegacyObjectTreeOptions<
    In,
    InK,
    InV,
    OutK,
    OutV
  >['resolveVertexHook'];
};
