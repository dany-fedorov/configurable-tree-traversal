import type { MutableRef } from '@core/CTTRef';
import type { VisitorRecord } from '@core/graph/types';
import type { ResolvedTreeStore } from '@core/ResolvedTree';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { deepFreeze } from '@utils/deepFreeze';

export enum TraversalVisitorCommandName {
  NOOP = 'NOOP',
  DEFER_WORK_COMPLETION = 'DEFER_WORK_COMPLETION',
  REWRITE_CHILD_HINTS = 'REWRITE_CHILD_HINTS',
  PAUSE_TRAVERSAL = 'PAUSE_TRAVERSAL',
  DELETE_VERTEX = 'DELETE_VERTEX',
  SET_VERTEX_VISITORS_CHAIN_STATE = 'SET_VERTEX_VISITORS_CHAIN_STATE',
  REWRITE_VERTEX_DATA = 'REWRITE_VERTEX_DATA',
  DISABLE_SUBTREE_TRAVERSAL = 'DISABLE_SUBTREE_TRAVERSAL',
  /** @deprecated Use REWRITE_CHILD_HINTS. */
  REWRITE_VERTEX_HINTS_ON_PRE_ORDER = 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
}

export type TraversalVisitorCommandArguments<RW_TTP extends VertexTypes> = {
  [TraversalVisitorCommandName.NOOP]: never;
  [TraversalVisitorCommandName.DEFER_WORK_COMPLETION]: never;
  [TraversalVisitorCommandName.REWRITE_CHILD_HINTS]: {
    newHints: RW_TTP['VertexHint'][];
  };
  [TraversalVisitorCommandName.PAUSE_TRAVERSAL]: never;
  [TraversalVisitorCommandName.DELETE_VERTEX]: never;
  [TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE]: {
    vertexVisitorsChainState: unknown;
  };
  [TraversalVisitorCommandName.REWRITE_VERTEX_DATA]: {
    newData: RW_TTP['VertexData'];
  };
  [TraversalVisitorCommandName.DISABLE_SUBTREE_TRAVERSAL]: never;
  [TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER]: {
    newHints: RW_TTP['VertexHint'][];
  };
};

export type TraversalVisitorCommand<
  RW_TTP extends VertexTypes,
  T extends TraversalVisitorCommandName = TraversalVisitorCommandName,
> = {
  [Name in T]: { commandName: Name } & ([
    TraversalVisitorCommandArguments<RW_TTP>[Name],
  ] extends [never]
    ? { commandArguments?: never }
    : { commandArguments: TraversalVisitorCommandArguments<RW_TTP>[Name] });
}[T];

/** Prevent callback returns from widening the phase inferred from a registration key. */
export type NoInferPhase<P extends string> = [P][P extends string ? 0 : never];

type HintCommand =
  | TraversalVisitorCommandName.REWRITE_CHILD_HINTS
  | TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER;
type CommonCommand = Exclude<
  TraversalVisitorCommandName,
  HintCommand | TraversalVisitorCommandName.DEFER_WORK_COMPLETION
>;

export type TraversalVisitorResult<
  RW_TTP extends VertexTypes,
  ORDER extends string = string,
> =
  | {
      commands?: TraversalVisitorCommand<
        RW_TTP,
        | CommonCommand
        | ([ORDER] extends ['PRE_ORDER' | 'LEVEL_ORDER' | 'ON_WORK_READY']
            ? HintCommand
            : never)
      >[];
    }
  | ([ORDER] extends ['ON_WORK_READY']
      ? {
          commands: [
            TraversalVisitorCommand<
              RW_TTP,
              TraversalVisitorCommandName.DEFER_WORK_COMPLETION
            >,
          ];
        }
      : never);

export type TreeVisitorContext<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  resolvedTree: ResolvedTreeStore<TTP | RW_TTP>;
  originalTreeView: ResolvedTreeView<TTP> | null;
  phaseVisitIndex: number;
  visitorIndex: number;
  previousPhaseVertexRef: MutableRef<Vertex<TTP | RW_TTP>> | null;
  isTreeRoot: boolean;
  isTraversalRoot: boolean;
  vertexRef: MutableRef<Vertex<TTP | RW_TTP>>;
  visitorChainState: unknown;
  registration: VisitorRegistrationMetadata;
  phase: ORDER;
};

/** @deprecated Use commandCommitMode for command batching. */
export enum TraversalVisitorFunctionResolutionStyle {
  SEQUENTIAL = 'SEQUENTIAL',
  CONCURRENT = 'CONCURRENT',
}

export type CommandCommitMode = 'afterEachVisitor' | 'afterGroup';

export type TraversalVisitorFunctionOptions = {
  priority: number;
  commandCommitMode?: CommandCommitMode | undefined;
};

/** A callback or caller definition; registration bookkeeping is assigned internally. */
export type VisitorDefinition<F> =
  | F
  | ({
      visitor: F;
      /** @deprecated Registration indexes are assigned internally. */
      addedIndex?: number;
    } & Partial<TraversalVisitorFunctionOptions>);

export type VisitorGroupMember<F> =
  | F
  | {
      visitor: F;
      priority?: number;
      commandCommitMode?: never;
      resolutionStyle?: never;
    };

export type VisitorGroupDefinition<F> = {
  visitors: readonly VisitorGroupMember<F>[];
  commandCommitMode?: CommandCommitMode;
};

export type VisitorPhaseInput<F> =
  | VisitorDefinition<F>
  | readonly VisitorDefinition<F>[]
  | { groups: readonly VisitorGroupDefinition<F>[] };

/** Immutable execution boundary retained by normalized list/set records. */
export type VisitorGroupMetadata = Readonly<{
  identity: symbol;
  explicit: boolean;
  commandCommitMode: CommandCommitMode;
}>;

/** Descriptive callback-context metadata. Executable records remain on the traversal. */
export type VisitorRegistrationMetadata = Readonly<
  TraversalVisitorFunctionOptions & {
    addedIndex: number;
    /** @deprecated Use commandCommitMode. */
    resolutionStyle?: TraversalVisitorFunctionResolutionStyle | undefined;
    visitorGroup?: VisitorGroupMetadata | undefined;
  }
>;

export type TraversalVisitorRecord<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = VisitorRecord<TraversalVisitor<ORDER, TTP, RW_TTP>>;

export const DEFAULT_VISITOR_PRIORITY = 100;

export const DEFAULT_VISITOR_FN_OPTIONS = deepFreeze({
  priority: DEFAULT_VISITOR_PRIORITY,
  commandCommitMode: 'afterEachVisitor' as const,
  resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
});

// Resolve the result before constructing the callback so TypeScript compares
// concrete return contracts structurally across phases (broad common results
// remain assignable to a narrower phase's superset of allowed commands).
export type TraversalVisitor<
  ORDER extends string = string,
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = TraversalVisitorResult<RW_TTP, ORDER> extends infer RESULT
  ? (
      vertex: Vertex<TTP | RW_TTP>,
      options: TreeVisitorContext<ORDER, TTP, RW_TTP>,
    ) => RESULT | undefined | void
  : never;

/** Phase-keyed caller inputs corresponding to a normalized visitor map. */
export type VisitorInputs<M> = {
  [K in keyof M]?: M[K] extends readonly VisitorRecord<infer F>[]
    ? VisitorPhaseInput<F>
    : never;
};
