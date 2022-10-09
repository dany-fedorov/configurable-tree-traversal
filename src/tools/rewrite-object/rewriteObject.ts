import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversalVisitorInputOptions } from '@core/TraversalVisitor';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type { TO_IsCompositeAssertionsMixin } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { Vertex } from '@core/Vertex';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { MakeMutationCommandFunctionInput } from '@core/MakeMutationCommandFunctionFactory';
import type { TraversableObjectTreeInstanceConfigInput } from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { TO_MakeMutationCommandFunctionFactoryConfiguration } from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { DepthFirstTraversalInstanceConfigInput } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import { TraversableObjectTree } from '@traversable-object-tree/TraversableObjectTree';
import { traverseDepthFirst } from '@depth-first-traversal/traverseDepthFirst';
import type { DepthFirstTraversal } from '@depth-first-traversal/DepthFirstTraversal';

export type RewriteFnOptions<
  InK extends TraversableObjectPropKey,
  InV,
> = TraversalVisitorInputOptions<
  DepthFirstTraversalOrder,
  TraversableObjectTTP<InK, InV>,
  TraversableObjectTTP<InK, InV>
> &
  TO_IsCompositeAssertionsMixin & {
    vertex: Vertex<TraversableObjectTTP<InK, InV>>;
    getKeyPath: (options?: GetPathToOptions) => InK[];
  };

export type RewriteFnPropInput<
  InK extends TraversableObjectPropKey,
  InV,
  OutV,
> = TraversableObjectProp<InK, InV> & { assembledComposite?: OutV };

export type RewriteFn<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = (
  prop: RewriteFnPropInput<InK, InV, OutV>,
  options: RewriteFnOptions<InK, InV>,
) =>
  | MakeMutationCommandFunctionInput<Partial<TraversableObjectProp<OutK, OutV>>>
  | undefined;

export const __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ =
  '__REWRITE_OBJECT_DEFAULT_ROOT_KEY__';

export type RewriteObjectResult<
  InK extends TraversableObjectPropKey,
  InV,
  Out,
  OutK extends TraversableObjectPropKey,
  OutV,
> = {
  outputObject: Out;
  traversal: DepthFirstTraversal<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  >;
};

export type RewriteObjectOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  Out,
  OutK extends TraversableObjectPropKey,
  OutV,
> = Partial<
  Omit<TraversableObjectTreeInstanceConfigInput<In, InK, InV>, 'host'> &
    TO_MakeMutationCommandFunctionFactoryConfiguration<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    > &
    DepthFirstTraversalInstanceConfigInput<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >
> & {
  rewrite?: RewriteFn<InK, InV, OutK, OutV>;
  getOutputObjectFromRootValue?: (value: OutV | null) => Out;
  assembleCompositesBeforeRewrite?: boolean;
};

export function rewriteObject<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  Out = In,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
>(
  inputObject: In,
  options?: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>,
): RewriteObjectResult<InK, InV, Out, OutK, OutV> {
  const assembleCompositeBeforeVisit =
    options?.assembleCompositesBeforeRewrite ?? false;
  const rewrite =
    typeof options?.rewrite === 'function' ? options.rewrite : null;
  const getOutputObjectFromRootValue =
    typeof options?.getOutputObjectFromRootValue === 'function'
      ? options.getOutputObjectFromRootValue
      : (rootValue: OutV | null) => rootValue as unknown as Out;
  const tree = new TraversableObjectTree<In, InK, InV, OutK, OutV>({
    getRootPropertyFromInputObject:
      options?.getRootPropertyFromInputObject ??
      TraversableObjectTree.getRootPropertyFromInputObjectDefault(
        __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ as InK,
      ),
    getChildrenOfProperty:
      options?.getChildrenOfProperty ??
      TraversableObjectTree.getChildrenOfPropertyDefault,
    inputObject,
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
      ...(options?.assembledMap
        ? { assembledMap: options.assembledMap }
        : { assembledMap: new Map() }),
    });
  const traversal = traverseDepthFirst<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  >(
    tree,
    {
      postOrderVisitor: (
        /**
         * [1] No guarantee here by traverseDepthFirst that it wasn't rewritten to Vertex<TraversableObjectTTP<OutK,OutV>>
         * on preorder
         */
        vertex: Vertex<
          TraversableObjectTTP<InK, InV> | TraversableObjectTTP<OutK, OutV>
        >,
        options: TraversalVisitorInputOptions<
          DepthFirstTraversalOrder,
          TraversableObjectTTP<InK, InV>,
          TraversableObjectTTP<OutK, OutV>
        >,
      ) => {
        const {
          makeMutationCommand,
          isComposite,
          isObject,
          isArray,
          assembleComposite,
        } = makeMutationCommandFactory(vertex, options);
        let rwInput = vertex.getData() as RewriteFnPropInput<InK, InV, OutV>;
        if (assembleCompositeBeforeVisit && isComposite) {
          rwInput = { ...rwInput, assembledComposite: assembleComposite() };
        }
        /**
         * [1] But here rewriteObject guarantees that this is TraversableObjectProp<InK, InV> since we only rewrite on
         * postorder
         */
        const rw = rewrite?.(rwInput, {
          ...options,
          isComposite,
          isObject,
          isArray,
          vertex,
          getKeyPath: (thisOptions: GetPathToOptions) =>
            options.resolvedTree
              .getPathTo(options.vertexRef, thisOptions)
              .map((ps) => ps.unref().getData().key),
        } as unknown as RewriteFnOptions<InK, InV>);
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
    },
    {
      ...(!options?.saveNotMutatedResolvedTree
        ? {}
        : { saveNotMutatedResolvedTree: options?.saveNotMutatedResolvedTree }),
    },
  );
  const rootValue =
    (traversal.getResolvedTree().getRoot()?.unref().getData()
      .value as unknown as OutV) ?? null;
  const outputObject = getOutputObjectFromRootValue(rootValue);
  if (outputObject === null) {
    throw new Error(`outputObject is null`);
  }
  return {
    outputObject,
    traversal,
  };
}
