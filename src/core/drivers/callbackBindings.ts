import { resolutionContextView } from '../observationFacets';
import {
  mapSourceResult,
  normalizeSourceResult,
} from './normalizeSourceResult';
import type {
  DagSourceVertexResolution,
  TreeSourceVertexResolution,
} from '@core/TraversableTree';
import type { MutableTreeChildDiscoveryContext } from '@core/ResolvedTree';
import type {
  MakeVertexResult,
  TreeDiscoverySource,
} from '@core/TraversableTree';
import type { AsyncTreeDiscoverySource } from '@core/AsyncTraversableTree';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
} from '@core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type {
  ChildHintVertexIdentity,
  MaybePromise,
  VertexId,
} from '@core/graph/types';
import type { VisitorCallbackReturnValue } from '@core/graph/types';
import type {
  CallbackBindings,
  CallSpec,
  RawCallbackResult,
  TreeOrDagVisitorPhase,
} from '@core/effects/types';

export interface BoundSource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  resolvePrerequisite?(
    id: VertexId,
  ): MaybePromise<MakeVertexResult<InputVertexTypes> | undefined>;
  resolveRoot(): MaybePromise<MakeVertexResult<InputVertexTypes>>;
  resolveChild(
    context: MutableTreeChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
  ): MaybePromise<MakeVertexResult<InputVertexTypes>>;
  getVertexIdFromHint?(
    hint: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'],
  ): MaybePromise<ChildHintVertexIdentity | undefined>;
}

type AnyTreeSource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> =
  | TreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>
  | AsyncTreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>;

type GraphSource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
> =
  | DagDiscoverySource<InputVertexTypes, RewrittenVertexTypes, VertexId>
  | AsyncDagDiscoverySource<InputVertexTypes, RewrittenVertexTypes, VertexId>;

function normalizeVertexResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  result: DagSourceVertexResolution<InputVertexTypes>,
): MakeVertexResult<InputVertexTypes> {
  return normalizeSourceResult(result, false)!;
}

function validateTreeResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  result: MaybePromise<TreeSourceVertexResolution<InputVertexTypes>>,
  runnerName?: string,
): MaybePromise<MakeVertexResult<InputVertexTypes>> {
  return mapSourceResult(
    result,
    (value) =>
      normalizeSourceResult(
        value,
        false,
        runnerName === undefined ? 'Tree source' : `${runnerName} tree source`,
      )!,
  );
}

function asInputHint<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  hint: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'],
): InputVertexTypes['ChildHint'] {
  return hint as InputVertexTypes['ChildHint'];
}

export function bindTreeSource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  adapter: AnyTreeSource<InputVertexTypes, RewrittenVertexTypes>,
  container: ResolvedGraphsContainer<InputVertexTypes, RewrittenVertexTypes>,
  runnerName?: string,
): BoundSource<InputVertexTypes, RewrittenVertexTypes> {
  const treeContainer = container.treeContainer;
  if (treeContainer === null) {
    throw new TypeError('Tree source binding requires a tree graph container');
  }
  return {
    resolveRoot: () =>
      validateTreeResult(adapter.resolveRootVertex(), runnerName),
    resolveChild: (context) =>
      validateTreeResult(
        adapter.resolveChildVertexFromHint(
          asInputHint<InputVertexTypes, RewrittenVertexTypes>(
            context.childDiscoveryHint,
          ),
          {
            childDiscoveryContext: resolutionContextView(context)!,
            liveResolvedTreeView:
              treeContainer.resolvedTree.getLiveReadOnlyTreeView(),
            livePreCommandDiscoveredTreeView:
              treeContainer.livePreCommandDiscoveredTreeView?.getLiveReadOnlyTreeView() ??
              null,
          },
        ),
        runnerName,
      ),
  };
}

export function bindGraphSource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
  VertexId = unknown,
>(
  adapter: GraphSource<InputVertexTypes, RewrittenVertexTypes, VertexId>,
  container: ResolvedGraphsContainer<
    InputVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
): BoundSource<InputVertexTypes, RewrittenVertexTypes> {
  if (container.sourceMode !== 'graph') {
    throw new TypeError('Graph source binding requires a graph-mode container');
  }
  const bound: BoundSource<InputVertexTypes, RewrittenVertexTypes> = {
    resolveRoot: () =>
      mapSourceResult(adapter.resolveRootVertex(), normalizeVertexResult),
    resolveChild: (context) =>
      mapSourceResult(
        adapter.resolveChildVertexFromHint(
          asInputHint<InputVertexTypes, RewrittenVertexTypes>(
            context.childDiscoveryHint,
          ),
          {
            structuralChildResolution:
              context.parentVertexReference === container.syntheticRootRef
                ? Object.freeze({
                    discoveryDepthInEdges: context.discoveryDepthInEdges,
                    parentChildHintIndex: context.parentChildHintIndex,
                    childDiscoveryHint: context.childDiscoveryHint,
                    parentVertexAtChildResolution: null,
                    parentVertexHandle: null,
                  })
                : resolutionContextView(context)!,
            liveResolvedGraphView: container.publicResolvedGraph,
            livePreCommandDiscoveredGraphView:
              container.livePreCommandDiscoveredGraphView,
          },
        ),
        normalizeVertexResult,
      ),
  };
  if (adapter.tryGetVertexIdentityFromHint !== undefined) {
    bound.getVertexIdFromHint = (hint) =>
      adapter.tryGetVertexIdentityFromHint!(
        asInputHint<InputVertexTypes, RewrittenVertexTypes>(hint),
      );
  }
  if (adapter.resolvePrerequisiteByVertexId !== undefined) {
    bound.resolvePrerequisite = (id) =>
      mapSourceResult(
        // Kernel prerequisite IDs originate from this source's typed dependencies.
        adapter.resolvePrerequisiteByVertexId!(id as VertexId),
        (value) =>
          normalizeSourceResult<InputVertexTypes, VertexId>(value, true),
      );
  }
  return bound;
}

export type BoundVisit<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = (
  call: Extract<
    CallSpec<InputVertexTypes, RewrittenVertexTypes>,
    { kind: 'VISIT' }
  >,
) => MaybePromise<
  VisitorCallbackReturnValue<
    RewrittenVertexTypes,
    never,
    'tree' | 'dag',
    InputVertexTypes['ChildHint']
  >
>;

export function createCallbackBindings<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(input: {
  source: BoundSource<InputVertexTypes, RewrittenVertexTypes>;
  sortHints?: (
    hints: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][],
  ) => MaybePromise<(InputVertexTypes | RewrittenVertexTypes)['ChildHint'][]>;
  visit: Partial<
    Record<
      TreeOrDagVisitorPhase,
      BoundVisit<InputVertexTypes, RewrittenVertexTypes>
    >
  >;
}): CallbackBindings<InputVertexTypes, RewrittenVertexTypes> {
  return {
    invoke(call): RawCallbackResult<InputVertexTypes, RewrittenVertexTypes> {
      switch (call.kind) {
        case 'MAKE_ROOT':
          return { kind: call.kind, value: input.source.resolveRoot() };
        case 'RESOLVE_PREREQUISITE':
          return {
            kind: call.kind,
            value: input.source.resolvePrerequisite?.(call.vertexId),
          };
        case 'MAKE_VERTEX':
          return {
            kind: call.kind,
            value: input.source.resolveChild(call.context),
          };
        case 'SORT_HINTS':
          return {
            kind: call.kind,
            value: input.sortHints?.(call.hints.slice()) ?? call.hints.slice(),
          };
        case 'HINT_ID':
          return {
            kind: call.kind,
            value: input.source.getVertexIdFromHint?.(call.hint),
          };
        case 'VISIT': {
          const visitor = input.visit[call.order];
          if (visitor === undefined) {
            throw new Error(`No callback binding for ${call.order}`);
          }
          return { kind: call.kind, value: visitor(call) };
        }
      }
    },
  };
}
