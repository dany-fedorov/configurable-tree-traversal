import type {
  MakeMutationCommandFunctionFactoryConfiguration,
  TraversableObject,
  TraversableObjectProp,
  TraversableObjectPropKey,
  TraversableObjectTreeInstanceConfigInput,
  TraversableObjectTTP,
} from '../traversable-tree-implementations/TraversableObjectTree';
import type { Vertex } from '../core/Vertex';
import type { TraversalVisitorOptions } from '../core/TraversalVisitor';
import type { MakeMutationCommandFunctionInput } from '../core/MakeMutationCommandFunctionFactory';
import { TraversableObjectTree } from '../traversable-tree-implementations/TraversableObjectTree';
import { traverseDepthFirst } from '../traversals/traverseDepthFirst';

export type RewriteFn<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = (
  prop: TraversableObjectProp<InK, InV> | TraversableObjectProp<OutK, OutV>,
  options: TraversalVisitorOptions<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  > & {
    vertex: Vertex<
      TraversableObjectTTP<InK, InV> | TraversableObjectTTP<OutK, OutV>
    >;
  },
) =>
  | MakeMutationCommandFunctionInput<Partial<TraversableObjectProp<OutK, OutV>>>
  | undefined;

export const __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ =
  '__REWRITE_OBJECT_DEFAULT_ROOT_KEY__';

export type RewriteObjectResult<Out> = {
  result: Out | null;
};

type RewriteObjectOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  Out,
  OutK extends TraversableObjectPropKey,
  OutV,
> = Partial<
  Omit<TraversableObjectTreeInstanceConfigInput<In, InK, InV>, 'host'> &
    MakeMutationCommandFunctionFactoryConfiguration<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >
> & {
  getResultFromRootValue?: (value: OutV | null) => Out;
};

export function rewriteObject<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  Out = In,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
>(
  obj: In,
  rewrite: RewriteFn<InK, InV, OutK, OutV>,
  options?: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>,
): RewriteObjectResult<Out> {
  const tree = new TraversableObjectTree<In, InK, InV, OutK, OutV>({
    getPropertyFromHost:
      options?.getPropertyFromHost ??
      TraversableObjectTree.getPropertyFromHostDefault(
        __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ as InK,
      ),
    ...(!options?.getPropertyFromHost
      ? {}
      : { getPropertyFromHost: options.getPropertyFromHost }),
    host: obj,
  });
  const makeMutationCommandFactory =
    TraversableObjectTree.makeMutationCommandFactory<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >({
      ...(options?.isArray ? { isArray: options.isArray } : {}),
      ...(options?.isObject ? { isObject: options.isObject } : {}),
      ...(options?.assembleArray
        ? { assembleArray: options.assembleArray }
        : {}),
      ...(options?.assembleObject
        ? { assembleObject: options.assembleObject }
        : {}),
    });
  const { resolvedTree } = traverseDepthFirst<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  >(tree, {
    postOrderVisitor: (
      vertex: Vertex<
        TraversableObjectTTP<InK, InV> | TraversableObjectTTP<OutK, OutV>
      >,
      options: TraversalVisitorOptions<
        TraversableObjectTTP<InK, InV>,
        TraversableObjectTTP<OutK, OutV>
      >,
    ) => {
      const makeMutationCommand = makeMutationCommandFactory(vertex, options);
      const rw = rewrite(vertex.getData(), { ...options, vertex });
      const hasDelete =
        rw && Object.prototype.hasOwnProperty.call(rw, 'delete');
      const hasRewrite =
        rw && Object.prototype.hasOwnProperty.call(rw, 'rewrite');
      return {
        commands: [
          makeMutationCommand({
            ...(!hasDelete ? {} : { delete: rw.delete }),
            ...(!hasRewrite ? {} : { rewrite: rw.rewrite }),
          }),
        ],
      };
    },
  });
  const rootValue =
    (resolvedTree.getRoot()?.unref().getData().value as unknown as OutV) ??
    null;
  const result =
    typeof options?.getResultFromRootValue === 'function'
      ? options.getResultFromRootValue(rootValue)
      : (rootValue as unknown as Out) ?? null;
  return {
    result,
  };
}
