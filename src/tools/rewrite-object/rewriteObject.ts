import { assertPublicOptions } from '@core/assertPublicOptions';
import type { MutationRequest } from '@core/MakeMutationCommandFunctionFactory';
import type { GetPathToOptions } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeVisitorContext } from '@core/TraversalVisitor';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTreeOptionsPatch } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import { DepthFirstTreeTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import type {
  ObjectMutationOptions,
  ObjectPropertyPatch,
} from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { ObjectCompositeClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { ObjectTreeOptions } from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { ObjectTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import { ObjectTreeSource } from '@traversable-object-tree/TraversableObjectTree';

export type ObjectRewriteContext<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = TreeVisitorContext<
  DepthFirstPhase.POST_ORDER,
  ObjectTreeVertexTypes<InK, InV>,
  ObjectTreeVertexTypes<OutK, OutV>
> &
  ObjectCompositeClassification & {
    vertex: Vertex<
      ObjectTreeVertexTypes<InK, InV> | ObjectTreeVertexTypes<OutK, OutV>
    >;
    getKeyPath: (options?: GetPathToOptions) => (InK | OutK)[];
  };

export type ObjectRewriteInput<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = TraversableObjectProp<InK | OutK, InV | OutV> & {
  assembledComposite?: OutV;
};

export type ObjectRewriteCallback<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = (
  prop: ObjectRewriteInput<InK, InV, OutK, OutV>,
  context: ObjectRewriteContext<InK, InV, OutK, OutV>,
) =>
  | MutationRequest<ObjectPropertyPatch<ObjectTreeVertexTypes<OutK, OutV>>>
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
    ObjectTreeVertexTypes<InK, InV>,
    ObjectTreeVertexTypes<OutK, OutV>
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
  ObjectTreeOptions<In, InK, InV, OutK, OutV> &
    ObjectMutationOptions<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectTreeVertexTypes<OutK, OutV>
    > &
    Omit<
      DepthFirstTreeOptionsPatch<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >,
      'traversableTree'
    >
> & {
  traversableTree?: never;
  rewrite?: ObjectRewriteCallback<InK, InV, OutK, OutV>;
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
  if (options) assertPublicOptions(options);
  if (options && 'makeVertexHook' in options) {
    throw new TypeError('makeVertexHook is unsupported; use resolveVertexHook');
  }

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
  const tree = new ObjectTreeSource<In, InK, InV, OutK, OutV>(object, {
    ...(resolveVertexHook === undefined ? {} : { resolveVertexHook }),
    ...(!options?.['getChildrenOfProperty']
      ? {}
      : {
          getChildrenOfProperty: options?.['getChildrenOfProperty'],
        }),
    getRootPropertyFromInputObject:
      options?.['getRootPropertyFromInputObject'] ??
      ObjectTreeSource.createRootPropertyMapper(
        __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ as InK,
      ),
  });
  const bindObjectMutation = ObjectTreeSource.createObjectMutationBinder<
    ObjectTreeVertexTypes<InK, InV>,
    ObjectTreeVertexTypes<OutK, OutV>
  >({
    ...(options?.isArray ? { isArray: options.isArray } : {}),
    ...(options?.isObject ? { isObject: options.isObject } : {}),
    ...(options?.assembleArray ? { assembleArray: options.assembleArray } : {}),
    ...(options?.assembleObject
      ? { assembleObject: options.assembleObject }
      : {}),
    ...(options?.assembledMap
      ? { assembledMap: options.assembledMap }
      : { assembledMap: new Map() }),
  });
  const traversal = new DepthFirstTreeTraversal<
    ObjectTreeVertexTypes<InK, InV>,
    ObjectTreeVertexTypes<OutK, OutV>
  >({
    traversableTree: tree,
    ...{
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
    },
  });
  traversal.addVisitorFor(
    DepthFirstPhase.POST_ORDER,
    (
      vertex: Vertex<
        ObjectTreeVertexTypes<InK, InV> | ObjectTreeVertexTypes<OutK, OutV>
      >,
      context: TreeVisitorContext<
        DepthFirstPhase.POST_ORDER,
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >,
    ) => {
      const {
        makeMutationCommand,
        isComposite,
        isObject,
        isArray,
        assembleComposite,
      } = bindObjectMutation(vertex, context);
      let rwInput: ObjectRewriteInput<InK, InV, OutK, OutV> = vertex.getData();
      if (assembleCompositeBeforeVisit && isComposite) {
        rwInput = { ...rwInput, assembledComposite: assembleComposite() };
      }
      const rw = rewrite?.(rwInput, {
        ...context,
        isComposite,
        isObject,
        isArray,
        vertex,
        getKeyPath: (thisOptions?: GetPathToOptions) =>
          context.resolvedTree
            .getPathTo(context.vertexRef, thisOptions)
            .map((ps) => ps.getValue().getData().key),
      });
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
  );
  const traversalRunner = traversal.createRunner().run();
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
