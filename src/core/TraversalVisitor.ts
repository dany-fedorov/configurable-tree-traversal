import type { VertexHandle } from '@core/CTTRef';
import type { VisitorRecord } from '@core/graph/types';
import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { VertexView } from '@core/Vertex';
import { deepFreeze } from '@utils/deepFreeze';

export enum TraversalVisitorCommandName {
  NO_OPERATION = 'NO_OPERATION',
  END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION = 'END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION',
  REPLACE_CURRENT_VERTEX_CHILD_HINTS = 'REPLACE_CURRENT_VERTEX_CHILD_HINTS',
  PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY = 'PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY',
  DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS = 'DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS',
  DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS = 'DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS',
  SET_CURRENT_VERTEX_PHASE_CHAIN_STATE = 'SET_CURRENT_VERTEX_PHASE_CHAIN_STATE',
  REPLACE_CURRENT_VERTEX_DATA = 'REPLACE_CURRENT_VERTEX_DATA',
  SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX = 'SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX',
}

/** Rewritten data and discovery hints have independent domains. */
export type TraversalVisitorCommandArguments<
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  SourceHint = RewrittenVertexTypes['ChildHint'],
> = {
  [TraversalVisitorCommandName.NO_OPERATION]: never;
  [TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION]: never;
  [TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS]: {
    replacementChildHints: readonly SourceHint[];
  };
  [TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY]: never;
  [TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS]: never;
  [TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS]: never;
  [TraversalVisitorCommandName.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE]: {
    phaseChainState: unknown;
  };
  [TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA]: {
    replacementVertexData: RewrittenVertexTypes['VertexData'];
  };
  [TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX]: never;
};

export type TraversalVisitorCommand<
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  T extends TraversalVisitorCommandName = TraversalVisitorCommandName,
  SourceHint = RewrittenVertexTypes['ChildHint'],
> = {
  [Name in T]: { commandName: Name } & ([
    TraversalVisitorCommandArguments<RewrittenVertexTypes, SourceHint>[Name],
  ] extends [never]
    ? { commandArguments?: never }
    : {
        commandArguments: TraversalVisitorCommandArguments<
          RewrittenVertexTypes,
          SourceHint
        >[Name];
      });
}[T];

/** Prevent callback returns from widening the visitorPhase inferred from a visitorRegistrationMetadata key. */
export type PreventVisitorReturnFromWideningPhase<P extends string> = [
  P,
][P extends string ? 0 : never];

type ChildHintReplacementCommandName =
  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS;
export type TreeOrDagDeletionCommandName =
  | TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
  | TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS;

type CommonNonHintNonDeletionNonDeferralCommandName = Exclude<
  TraversalVisitorCommandName,
  | ChildHintReplacementCommandName
  | TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION
  | TreeOrDagDeletionCommandName
>;

export type VisitorCommandsResult<
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  Phase extends string = string,
  Family extends 'tree' | 'dag' = 'tree' | 'dag',
  SourceHint = RewrittenVertexTypes['ChildHint'],
> =
  | {
      commands?: TraversalVisitorCommand<
        RewrittenVertexTypes,
        | CommonNonHintNonDeletionNonDeferralCommandName
        | (Family extends 'tree'
            ? TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
            : TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS)
        | ([Phase] extends [
            | 'BEFORE_CHILD_EXPANSION'
            | 'AT_LEVEL_ORDER_VERTEX'
            | 'ON_WORK_READY',
          ]
            ? ChildHintReplacementCommandName
            : never),
        SourceHint
      >[];
    }
  | ([Phase] extends ['ON_WORK_READY']
      ? {
          commands: [
            TraversalVisitorCommand<
              RewrittenVertexTypes,
              TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
              SourceHint
            >,
          ];
        }
      : never);

export type TreeVisitorContext<
  Phase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  liveResolvedTreeView: LiveResolvedTreeView<
    InputVertexTypes | RewrittenVertexTypes
  >;
  preCommandDiscoveredTreeView: LiveResolvedTreeView<InputVertexTypes> | null;
  phaseVisitorChainIndex: number;
  visitorCallbackIndexInPhaseChain: number;
  previousCommittedVisitVertexHandleForSamePhase: VertexHandle<
    InputVertexTypes | RewrittenVertexTypes
  > | null;
  isTreeRoot: boolean;
  vertexHandle: VertexHandle<InputVertexTypes | RewrittenVertexTypes>;
  currentVertexPhaseChainState: unknown;
  visitorRegistrationMetadata: VisitorRegistrationMetadata;
  visitorPhase: Phase;
};

export type VisitorCommandCommitTiming =
  | 'afterEachVisitorCallback'
  | 'afterContiguousVisitorBatch';

export type VisitorRegistrationOptions = {
  descendingExecutionPriorityWithinGroup: number;
  visitorCommandCommitTiming?: VisitorCommandCommitTiming | undefined;
};

/** A callback or caller definition; visitorRegistrationMetadata bookkeeping is assigned internally. */
export type VisitorRegistrationDefinition<VisitorCallback> =
  | VisitorCallback
  | ({
      visitor: VisitorCallback;
    } & Partial<VisitorRegistrationOptions>);

export type VisitorGroupMember<VisitorCallback> =
  | VisitorCallback
  | {
      visitor: VisitorCallback;
      descendingExecutionPriorityWithinGroup?: number;
      visitorCommandCommitTiming?: never;
      resolutionStyle?: never;
    };

export type VisitorGroupDefinition<VisitorCallback> = {
  visitors: readonly VisitorGroupMember<VisitorCallback>[];
  visitorCommandCommitTiming?: VisitorCommandCommitTiming;
};

export type VisitorDefinitionsForPhase<VisitorCallback> =
  | VisitorRegistrationDefinition<VisitorCallback>
  | readonly VisitorRegistrationDefinition<VisitorCallback>[]
  | { groups: readonly VisitorGroupDefinition<VisitorCallback>[] };

/** Immutable execution boundary retained by normalized list/set records. */
export type VisitorGroupMetadata = Readonly<{
  groupIdentity: symbol;
  isExplicitlyDeclaredGroup: boolean;
  visitorCommandCommitTiming: VisitorCommandCommitTiming;
}>;

/** Descriptive callback-context metadata. Executable records remain on the traversal. */
export type VisitorRegistrationMetadata = Readonly<
  VisitorRegistrationOptions & {
    phaseRegistrationInsertionIndex: number;
    visitorGroup?: VisitorGroupMetadata | undefined;
  }
>;

export type TreePhaseVisitorRegistrationRecord<
  Phase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = VisitorRecord<
  TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, Phase>
>;

export const DEFAULT_VISITOR_PRIORITY = 100;

export const DEFAULT_VISITOR_FN_OPTIONS = deepFreeze({
  descendingExecutionPriorityWithinGroup: DEFAULT_VISITOR_PRIORITY,
  visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
});

// Resolve the result before constructing the callback so TypeScript compares
// concrete return contracts structurally across phases (broad common results
// remain assignable to a narrower visitorPhase's superset of allowed commands).
export type TreeVertexPhaseVisitorCallback<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
  Phase extends string = string,
> = VisitorCommandsResult<
  RewrittenVertexTypes,
  Phase,
  'tree',
  InputVertexTypes['ChildHint']
> extends infer RESULT
  ? (
      vertex: VertexView<InputVertexTypes | RewrittenVertexTypes>,
      options: TreeVisitorContext<
        Phase,
        InputVertexTypes,
        RewrittenVertexTypes
      >,
    ) => RESULT | undefined | void
  : never;

/** Phase-keyed caller inputs corresponding to a normalized visitor map. */
export type VisitorDefinitionsByPhase<M> = {
  [K in keyof M]?: M[K] extends readonly VisitorRecord<infer VisitorCallback>[]
    ? VisitorDefinitionsForPhase<VisitorCallback> | undefined
    : never;
};
