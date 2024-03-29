import {
  AbstractTraversableTree,
  MakeVertexOptions,
  MakeVertexResult,
} from '@core/TraversableTree';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type {
  TraversableObjectTreeInstanceConfig,
  TraversableObjectTreeInstanceConfigInput,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import { getChildrenOfPropertyDefault } from '@traversable-object-tree/lib/getChildrenOfPropertyDefault';
import { getRootPropertyFromInputObjectDefault } from '@traversable-object-tree/lib/getRootPropertyFromInputObjectDefault';
import { makeMutationCommandFactory } from '@traversable-object-tree/lib/makeMutationCommandFactory';

export class TraversableObjectTree<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
> extends AbstractTraversableTree<
  TraversableObjectTTP<InK, InV>,
  TraversableObjectTTP<OutK, OutV>
> {
  private readonly icfg: TraversableObjectTreeInstanceConfig<
    In,
    InK,
    InV,
    OutK,
    OutV
  >;
  public readonly rootObject: In;

  static getChildrenOfPropertyDefault = getChildrenOfPropertyDefault;
  static getRootPropertyFromInputObjectDefault =
    getRootPropertyFromInputObjectDefault;

  constructor(
    rootObject: In,
    icfgInput?: TraversableObjectTreeInstanceConfigInput<
      In,
      InK,
      InV,
      OutK,
      OutV
    >,
  ) {
    super();
    this.rootObject = rootObject;
    this.icfg = {
      makeVertexHook: null,
      getChildrenOfProperty:
        icfgInput?.getChildrenOfProperty ??
        TraversableObjectTree.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        icfgInput?.getRootPropertyFromInputObject ??
        TraversableObjectTree.getRootPropertyFromInputObjectDefault(),
      ...(icfgInput || {}),
    };
  }

  static makeMutationCommandFactory = makeMutationCommandFactory;

  makeRoot(): MakeVertexResult<TraversableObjectTTP<InK, InV>> {
    const { getChildrenOfProperty, getRootPropertyFromInputObject } = this.icfg;
    const rootProp = getRootPropertyFromInputObject(this.rootObject);
    return {
      vertexContent: {
        $d: rootProp,
        $c: getChildrenOfProperty(rootProp),
      },
    };
  }

  makeVertex(
    vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
    options: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): MakeVertexResult<TraversableObjectTTP<InK, InV>> {
    const res = this.icfg.makeVertexHook?.(vertexHint, options);
    if (res?.returnMe !== undefined) {
      return { vertexContent: res.returnMe };
    }
    const { getChildrenOfProperty } = this.icfg;
    const hints = getChildrenOfProperty(vertexHint);
    return {
      vertexContent: {
        $d: vertexHint,
        $c: hints,
      },
    };
  }
}
