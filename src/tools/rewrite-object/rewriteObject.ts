import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeVisitorContext } from '@core/TraversalVisitor';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type { ObjectCompositeClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { Vertex } from '@core/Vertex';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { MutationRequest } from '@core/MakeMutationCommandFunctionFactory';
import type { TraversableObjectTreeInstanceConfigInput } from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type {
  ObjectMutationOptions,
  ObjectMutationPatch,
} from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { DepthFirstTraversalInstanceConfigInput } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import { ObjectTreeSource } from '@traversable-object-tree/TraversableObjectTree';
import { traverseTreeDepthFirst } from '@depth-first-traversal/traverseDepthFirst';
import type { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';

export type RewriteFnOptions<
  InK extends TraversableObjectPropKey,
  InV,
> = TreeVisitorContext<
  DepthFirstPhase.POST_ORDER,
  TraversableObjectTTP<InK, InV>,
  TraversableObjectTTP<InK, InV>
> &
  ObjectCompositeClassification & {
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
  | MutationRequest<ObjectMutationPatch<TraversableObjectTTP<OutK, OutV>>>
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
  /** Converted output captured at return, possibly partial before completion. */
  outputAtReturn: Out | null;
  /** Final converted output; throws until the runner has finished. */
  getOutput(): Out | null;
  traversalRunner: DepthFirstTreeRunner<
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
  TraversableObjectTreeInstanceConfigInput<In, InK, InV, OutK, OutV> &
    ObjectMutationOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    > &
    Omit<
      DepthFirstTraversalInstanceConfigInput<
        TraversableObjectTTP<InK, InV>,
        TraversableObjectTTP<OutK, OutV>
      >,
      'traversableTree'
    >
> & {
  traversableTree?: never;
  rewrite?: RewriteFn<InK, InV, OutK, OutV>;
  getOutputObjectFromRootValue?: (value: OutV | null) => Out;
  assembleCompositesBeforeRewrite?: boolean;
};

export function rewriteObject<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  Out = unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
>(
  object: In,
  options?: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>,
): RewriteObjectResult<InK, InV, Out, OutK, OutV> {
  if (options && 'traversableTree' in options) {
    throw new TypeError(
      'rewriteObject owns its source; traversableTree is unsupported',
    );
  }
  const assembleCompositeBeforeVisit =
    options?.assembleCompositesBeforeRewrite ?? false;
  const rewrite =
    typeof options?.rewrite === 'function' ? options.rewrite : null;
  const getOutputObjectFromRootValue =
    typeof options?.getOutputObjectFromRootValue === 'function'
      ? options.getOutputObjectFromRootValue
      : (rootValue: OutV | null) => rootValue as unknown as Out;
  const resolveVertexHook = options?.resolveVertexHook;
  const makeVertexHook = options?.makeVertexHook;
  const tree = new ObjectTreeSource<In, InK, InV, OutK, OutV>(object, {
    ...(resolveVertexHook === undefined ? {} : { resolveVertexHook }),
    ...(!makeVertexHook
      ? {}
      : {
          makeVertexHook,
        }),
    ...(!options?.['getChildrenOfProperty']
      ? {}
      : {
          getChildrenOfProperty: options?.['getChildrenOfProperty'],
        }),
    getRootPropertyFromInputObject:
      options?.['getRootPropertyFromInputObject'] ??
      ObjectTreeSource.getRootPropertyFromInputObjectDefault(
        __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ as InK,
      ),
  });
  const bindObjectMutation =
    ObjectTreeSource.createObjectMutationBinder<
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
  const traversalRunner = traverseTreeDepthFirst<
    TraversableObjectTTP<InK, InV>,
    TraversableObjectTTP<OutK, OutV>
  >(
    tree,
    {
      postOrderVisitor: (
        /**
         * [1] No guarantee here by traverseTreeDepthFirst that it wasn't rewritten to Vertex<TraversableObjectTTP<OutK,OutV>>
         * on preorder
         */
        vertex: Vertex<
          TraversableObjectTTP<InK, InV> | TraversableObjectTTP<OutK, OutV>
        >,
        options: TreeVisitorContext<
          DepthFirstPhase.POST_ORDER,
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
        } = bindObjectMutation(vertex, options);
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
          getKeyPath: (thisOptions?: GetPathToOptions) =>
            options.resolvedTree
              .getPathTo(options.vertexRef, thisOptions)
              .map((ps) => ps.getValue().getData().key),
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
      ...(options?.sortChildrenHints === undefined
        ? {}
        : { sortChildrenHints: options.sortChildrenHints }),
      ...(options?.visitors === undefined
        ? {}
        : { visitors: options.visitors }),
      ...(options?.inOrder === undefined ? {} : { inOrder: options.inOrder }),
      ...(options?.retainOriginalTreeStructure === undefined
        ? {}
        : {
            retainOriginalTreeStructure: options.retainOriginalTreeStructure,
          }),
      ...(options?.traversalRunnerInternalObjects === undefined
        ? {}
        : {
            traversalRunnerInternalObjects:
              options.traversalRunnerInternalObjects,
          }),
    },
  );
  const convertCurrentRoot = () => {
    const resolvedTree = traversalRunner.getResolvedTreeView();
    const rootRef = resolvedTree.getRoot();
    const rootValue =
      rootRef === null || !resolvedTree.has(rootRef)
        ? null
        : (rootRef.getValue().getData().value as unknown as OutV);
    return getOutputObjectFromRootValue(rootValue);
  };
  const outputAtReturn = convertCurrentRoot();
  let hasFinalOutput =
    traversalRunner.getStatus() === TraversalRunnerStatus.FINISHED;
  let finalOutput = outputAtReturn;
  return {
    outputAtReturn,
    traversalRunner,
    getOutput() {
      if (traversalRunner.getStatus() !== TraversalRunnerStatus.FINISHED) {
        throw new Error('Rewrite output is not complete');
      }
      if (!hasFinalOutput) {
        finalOutput = convertCurrentRoot();
        hasFinalOutput = true;
      }
      return finalOutput;
    },
  };
}

/** Select an output type as a caller assertion, without runtime schema validation. */
export function rewriteObjectAs<Out>(
  object: unknown,
  options?: RewriteObjectOptions<
    unknown,
    TraversableObjectPropKey,
    unknown,
    Out,
    TraversableObjectPropKey,
    unknown
  >,
): RewriteObjectResult<
  TraversableObjectPropKey,
  unknown,
  Out,
  TraversableObjectPropKey,
  unknown
> {
  return rewriteObject<
    unknown,
    TraversableObjectPropKey,
    unknown,
    Out,
    TraversableObjectPropKey,
    unknown
  >(object, options);
}
