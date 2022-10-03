import type {
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

export type RewriteFn<K extends TraversableObjectPropKey, PV> = (
  prop: TraversableObjectProp<K, PV>,
  options: TraversalVisitorOptions<TraversableObjectTTP<K, PV>> & {
    vertex: Vertex<TraversableObjectTTP<K, PV>>;
  },
) =>
  | MakeMutationCommandFunctionInput<Partial<TraversableObjectProp<K, PV>>>
  | undefined;

export const DEFAULT_ROOT_KEY = 'rewriteObject::rootKey::default';

export type RewriteObjectResult<R> = {
  result: R;
};

export function rewriteObject<
  K extends TraversableObjectPropKey = TraversableObjectPropKey,
  PV = unknown,
  R = unknown,
>(
  obj: TraversableObject<K, PV>,
  rewrite: RewriteFn<K, PV>,
  options?: Partial<
    Omit<TraversableObjectTreeInstanceConfigInput<K, PV>, 'host'>
  >,
): RewriteObjectResult<R> {
  const tree = new TraversableObjectTree({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    rootKey: options?.rootKey || DEFAULT_ROOT_KEY,
    host: obj,
  });
  const { resolvedTree } = traverseDepthFirst(tree, {
    postOrderVisitor: (
      vertex: Vertex<TraversableObjectTTP<K, PV>>,
      options: TraversalVisitorOptions<TraversableObjectTTP<K, PV>>,
    ) => {
      const makeMutationCommand =
        TraversableObjectTree.makeMutationCommandFactory<
          TraversableObjectTTP<K, PV>,
          Partial<TraversableObjectTTP<K, PV>['VertexData']>
        >(vertex, options);
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
  const result = (resolvedTree.getRoot()?.unref().getData().value ??
    null) as unknown as R;
  return {
    result,
  };
}
