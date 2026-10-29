import type { ObjectCurrentVertexTypes } from '@traversable-object-tree/lib/ObjectCurrentVertexTypes';
import type {
  TreeChildResolutionContext,
  TreeVertexFound,
  TreeVertexOmitted,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { ObjectTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';

export type ObjectChildHookResult<T extends VertexTypes> =
  | {
      kind: 'useDefault';
      vertexId?: never;
      dependsOnWork?: never;
      dependsOnSubgraphCompletion?: never;
      satisfiesDependencies?: never;
    }
  | TreeVertexFound<T>
  | TreeVertexOmitted;

export type ObjectTreeBaseOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = {
  getChildrenOfProperty?: (
    prop: TraversableObjectProp<InK, InV>,
  ) => ObjectTreeVertexTypes<InK, InV>['VertexHint'][];
  getRootPropertyFromInputObject?: (
    inputObj: In,
  ) => TraversableObjectProp<InK, InV>;
  resolveChildHook?: (
    vertexHint: ObjectTreeVertexTypes<InK, InV>['VertexHint'],
    context: TreeChildResolutionContext<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >,
  ) => ObjectChildHookResult<ObjectTreeVertexTypes<InK, InV>>;
};

/** Both adapters establish a narrow discovery domain, including its root. */
export type ObjectTreePropertyAdapters<
  In,
  InK extends TraversableObjectPropKey,
  InV,
> = Required<
  Pick<
    ObjectTreeBaseOptions<In, InK, InV, InK, InV>,
    'getRootPropertyFromInputObject' | 'getChildrenOfProperty'
  >
>;

export type ObjectTreeOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> &
  ([TraversableObjectPropKey, unknown] extends [InK, InV]
    ? unknown
    : ObjectTreePropertyAdapters<In, InK, InV>);

export type ObjectTreeResolvedOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = Required<
  Omit<ObjectTreeBaseOptions<In, InK, InV, OutK, OutV>, 'resolveChildHook'>
> & {
  resolveChildHook: ObjectTreeBaseOptions<
    In,
    InK,
    InV,
    OutK,
    OutV
  >['resolveChildHook'];
};
