import type { LiveObjectPropertyVertexTypes } from '@traversable-object-tree/lib/ObjectCurrentVertexTypes';
import type {
  TreeChildResolverContext,
  TreeVertexResolutionFound,
  TreeVertexResolutionOmitted,
} from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ObjectPropertyRecord } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { ObjectPropertyTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';

export type ObjectChildPropertyResolutionOverrideResult<
  T extends VertexDataAndChildHintTypes,
> =
  | {
      kind: 'useDefaultChildPropertyResolution';
      vertexId?: never;
      omittedVertexIdentity?: never;
      workWaitsForWorkOf?: never;
      workWaitsForSubgraphCompletionOf?: never;
      satisfiesWorkAndSubgraphCompletionPrerequisites?: never;
      dependsOnWork?: never;
      dependsOnSubgraphCompletion?: never;
      satisfiesDependencies?: never;
    }
  | TreeVertexResolutionFound<T>
  | TreeVertexResolutionOmitted;

export type ObjectPropertyTreeBaseOptions<
  InputValue,
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = {
  enumerateChildPropertyHints?: (
    prop: ObjectPropertyRecord<InputPropertyKey, InputPropertyValue>,
  ) => ObjectPropertyTreeVertexTypes<
    InputPropertyKey,
    InputPropertyValue
  >['ChildHint'][];
  mapInputToRootProperty?: (
    inputObj: InputValue,
  ) => ObjectPropertyRecord<InputPropertyKey, InputPropertyValue>;
  resolveChildPropertyOrUseDefault?: (
    childDiscoveryHint: ObjectPropertyTreeVertexTypes<
      InputPropertyKey,
      InputPropertyValue
    >['ChildHint'],
    context: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >,
  ) => ObjectChildPropertyResolutionOverrideResult<
    ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>
  >;
};

/** Both adapters establish a narrow discovery domain, including its root. */
export type ObjectPropertyTreeAdapters<
  InputValue,
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
> = Required<
  Pick<
    ObjectPropertyTreeBaseOptions<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      InputPropertyKey,
      InputPropertyValue
    >,
    'mapInputToRootProperty' | 'enumerateChildPropertyHints'
  >
>;

export type ObjectPropertyTreeSourceOptions<
  InputValue,
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = ObjectPropertyTreeBaseOptions<
  InputValue,
  InputPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey,
  RewrittenPropertyValue
> &
  ([ObjectPropertyKey, unknown] extends [InputPropertyKey, InputPropertyValue]
    ? unknown
    : ObjectPropertyTreeAdapters<
        InputValue,
        InputPropertyKey,
        InputPropertyValue
      >);

export type NormalizedObjectPropertyTreeSourceOptions<
  InputValue,
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = Required<
  Omit<
    ObjectPropertyTreeBaseOptions<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    >,
    'resolveChildPropertyOrUseDefault'
  >
> & {
  resolveChildPropertyOrUseDefault: ObjectPropertyTreeBaseOptions<
    InputValue,
    InputPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  >['resolveChildPropertyOrUseDefault'];
};
