import type {
  TreeChildResolutionContext,
  TreeVertexFound,
  TreeVertexOmitted,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
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

export type ObjectTreeResolvedOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = Required<
  Omit<ObjectTreeOptions<In, InK, InV, OutK, OutV>, 'resolveVertexHook'>
> & {
  resolveVertexHook: ObjectTreeOptions<
    In,
    InK,
    InV,
    OutK,
    OutV
  >['resolveVertexHook'];
};
