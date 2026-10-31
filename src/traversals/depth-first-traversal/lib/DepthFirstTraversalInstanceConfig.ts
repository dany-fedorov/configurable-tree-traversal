import {
  mergeInOrderOptions,
  type InOrderOptionsPatch,
} from './DepthFirstTraversalInOrderTraversalConfig';
import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { ChildHintTransformer } from '@core/ChildHintTransformer';
import type { TreeSource } from '@core/TraversableTree';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { InOrderOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalRunnerInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerInternalObjects';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import type { OrNullAllFields } from '@depth-first-traversal/type-helpers/OrNullAllFields';
import { deepFreeze } from '@utils/deepFreeze';

export type DepthFirstTreeResolvedOptions<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  traversableTree: TreeSource<TTP, RW_TTP>;
  transformChildHints: ChildHintTransformer<TTP> | null;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  inOrder: InOrderOptions;
  retainOriginalTreeStructure: boolean;
  traversalRunnerInternalObjects: Partial<
    OrNullAllFields<DepthFirstTraversalRunnerInternalObjects<TTP, RW_TTP>>
  >;
};

export const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTreeResolvedOptions<VertexTypes, VertexTypes>,
  'traversableTree'
> = deepFreeze({
  transformChildHints: null,
  inOrder: {
    afterChildIndices: { ranges: [{ from: 0, through: -2 }] },
    fallbackChildIndices: { indices: [-2] },
    visitSingleChildParent: true,
    visitAfterOmittedChildren: true,
  },
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: [],
    [DepthFirstPhase.IN_ORDER]: [],
    [DepthFirstPhase.POST_ORDER]: [],
  },
  retainOriginalTreeStructure: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export type DepthFirstTreeOptionsPatch<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  traversableTree?: TreeSource<TTP, RW_TTP> | undefined;
  transformChildHints?: ChildHintTransformer<TTP> | null | undefined;
  visitors?:
    | VisitorInputs<DepthFirstTraversalVisitors<TTP, RW_TTP>>
    | undefined;
  retainOriginalTreeStructure?: boolean | undefined;
  inOrder?: InOrderOptionsPatch | undefined;
};

export type DepthFirstTreeOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = DepthFirstTreeOptionsPatch<TTP, RW_TTP> & {
  traversableTree: TreeSource<TTP, RW_TTP>;
};

export function mergeInstanceConfigs<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  base: DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
  input: DepthFirstTreeOptionsPatch<TTP, RW_TTP>,
): DepthFirstTreeResolvedOptions<TTP, RW_TTP> {
  const capturedInput = definedOptions(input);
  assertTraversalFields(capturedInput, Object.values(DepthFirstPhase));
  const inOrder = mergeInOrderOptions(base.inOrder, capturedInput.inOrder);
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  return {
    ...base,
    ...capturedInput,
    visitors: {
      [DepthFirstPhase.PRE_ORDER]: normalizeVisitorDefinitions(
        visitors[DepthFirstPhase.PRE_ORDER],
      ),
      [DepthFirstPhase.IN_ORDER]: normalizeVisitorDefinitions(
        visitors[DepthFirstPhase.IN_ORDER],
      ),
      [DepthFirstPhase.POST_ORDER]: normalizeVisitorDefinitions(
        visitors[DepthFirstPhase.POST_ORDER],
      ),
    },
    inOrder,
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
    },
  };
}
