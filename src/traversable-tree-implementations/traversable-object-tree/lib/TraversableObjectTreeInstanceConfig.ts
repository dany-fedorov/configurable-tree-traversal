import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type { MakeVertexOptions } from '@core/TraversableTree';
import type { VertexContent } from '@core/Vertex';

export type TraversableObjectTreeInstanceConfig_makeVertexHook<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = (
  vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
  _options: MakeVertexOptions<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  >,
) => {
  returnMe?: VertexContent<TraversableObjectTTP<InK, InV>> | null;
};

export type TraversableObjectTreeInstanceConfigInput<
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
  makeVertexHook?: TraversableObjectTreeInstanceConfig_makeVertexHook<
    InK,
    InV,
    OutK,
    OutV
  > | null;
};

export type TraversableObjectTreeInstanceConfig<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = Required<
  TraversableObjectTreeInstanceConfigInput<In, InK, InV, OutK, OutV>
>;
