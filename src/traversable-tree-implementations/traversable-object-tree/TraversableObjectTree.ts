import {
  AbstractTraversableTree,
  MakeVertexOptions,
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
import {makeMutationCommandFactory} from "@traversable-object-tree/lib/makeMutationCommandFactory";
import type {VertexContent} from "@core/Vertex";

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
  private readonly icfg: TraversableObjectTreeInstanceConfig<In, InK, InV>;

  static getChildrenOfPropertyDefault = getChildrenOfPropertyDefault;
  static getRootPropertyFromInputObjectDefault =
    getRootPropertyFromInputObjectDefault;

  constructor(
    icfgInput: TraversableObjectTreeInstanceConfigInput<In, InK, InV>,
  ) {
    super();
    this.icfg = {
      ...icfgInput,
      getChildrenOfProperty:
        icfgInput.getChildrenOfProperty ??
        TraversableObjectTree.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        icfgInput.getRootPropertyFromInputObject ??
        TraversableObjectTree.getRootPropertyFromInputObjectDefault(),
    };
  }

  static makeMutationCommandFactory = makeMutationCommandFactory;

  makeRoot(): VertexContent<TraversableObjectTTP<InK, InV>> | null {
    const {
      inputObject,
      getChildrenOfProperty,
      getRootPropertyFromInputObject,
    } = this.icfg;
    const rootProp = getRootPropertyFromInputObject(inputObject);
    return {
      $d: rootProp,
      $c: getChildrenOfProperty(rootProp),
    };
  }

  makeVertex(
    vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
    _options: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): VertexContent<TraversableObjectTTP<InK, InV>> | null {
    const { getChildrenOfProperty } = this.icfg;
    const hints = getChildrenOfProperty(vertexHint);
    return {
      $d: vertexHint,
      $c: hints,
    };
  }
}
