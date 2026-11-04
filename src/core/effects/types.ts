import type { MutableTreeChildDiscoveryContext } from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { Vertex } from '@core/Vertex';
import type {
  ChildHintVertexIdentity,
  MaybePromise,
  InternalVertexRef,
  VertexId,
  VisitorCallbackReturnValue,
} from '@core/graph/types';
import type { TreeOrDagSchedulerSnapshot } from '@core/CoreInspection';

export type TreeOrDagVisitorPhase =
  | 'BEFORE_CHILD_EXPANSION'
  | 'AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES'
  | 'AFTER_CHILD_SUBTREES'
  | 'AT_LEVEL_ORDER_VERTEX'
  | 'ON_WORK_READY'
  | 'ON_SUBGRAPH_COMPLETION_READY';

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export type PumpMode = 'drive' | 'settle' | 'drain';

export type SchedulingOwnerValidityToken = {
  ownerKind:
    | 'rootResolution'
    | 'vertexTraversalFrame'
    | 'vertexPhaseVisitorChain'
    | 'prerequisiteResolution';
  runnerLocalOwnerId: number;
  validityGeneration: number;
};

export type VisitMetadata<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  phaseVisitorChainIndex: number;
  visitorCallbackIndexInPhaseChain: number;
  previousCommittedVisitVertexHandleForSamePhase: InternalVertexRef<InputVertexTypes> | null;
  currentVertexPhaseChainState: unknown;
};

export type CallSpec<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  requestId: number;
  owner: SchedulingOwnerValidityToken;
} & (
  | { kind: 'MAKE_ROOT' }
  | { kind: 'RESOLVE_PREREQUISITE'; vertexId: VertexId }
  | {
      kind: 'SORT_HINTS';
      hints: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][];
    }
  | {
      kind: 'HINT_ID';
      hint: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'];
      hintIndex: number;
    }
  | {
      kind: 'MAKE_VERTEX';
      context: MutableTreeChildDiscoveryContext<
        InputVertexTypes | RewrittenVertexTypes
      >;
    }
  | {
      kind: 'VISIT';
      ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
      order: TreeOrDagVisitorPhase;
      recordIndex: number;
      metadata: VisitMetadata<InputVertexTypes | RewrittenVertexTypes>;
    }
);

export type CallbackValues<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  MAKE_ROOT: MakeVertexResult<InputVertexTypes>;
  RESOLVE_PREREQUISITE: MakeVertexResult<InputVertexTypes> | undefined;
  MAKE_VERTEX: MakeVertexResult<InputVertexTypes>;
  SORT_HINTS: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][];
  HINT_ID: ChildHintVertexIdentity | undefined;
  VISIT: VisitorCallbackReturnValue<
    RewrittenVertexTypes,
    never,
    'tree' | 'dag',
    InputVertexTypes['ChildHint']
  >;
};

export type CallbackReply<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  [K in keyof CallbackValues<InputVertexTypes, RewrittenVertexTypes>]: {
    requestId: number;
    kind: K;
    outcome: Outcome<CallbackValues<InputVertexTypes, RewrittenVertexTypes>[K]>;
  };
}[keyof CallbackValues<InputVertexTypes, RewrittenVertexTypes>];

export type RawCallbackResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  [K in keyof CallbackValues<InputVertexTypes, RewrittenVertexTypes>]: {
    kind: K;
    value: MaybePromise<
      CallbackValues<InputVertexTypes, RewrittenVertexTypes>[K]
    >;
  };
}[keyof CallbackValues<InputVertexTypes, RewrittenVertexTypes>];

export interface CallbackBindings<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  invoke(
    call: CallSpec<InputVertexTypes, RewrittenVertexTypes>,
  ): RawCallbackResult<InputVertexTypes, RewrittenVertexTypes>;
}

export type KernelEvent<InputVertexTypes extends VertexDataAndChildHintTypes> =
  {
    vertex: Vertex<InputVertexTypes>;
    vertexHandle: InternalVertexRef<InputVertexTypes>;
    order: TreeOrDagVisitorPhase;
    isRoot: boolean;
  };

export type KernelAction<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> =
  | { kind: 'CALL'; call: CallSpec<InputVertexTypes, RewrittenVertexTypes> }
  | {
      kind: 'EVENT';
      event: KernelEvent<InputVertexTypes | RewrittenVertexTypes>;
      boundaryId: number;
    }
  | { kind: 'WAIT' }
  | { kind: 'SUSPENDED' }
  | { kind: 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };

export interface KernelPort<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  poll(mode: PumpMode): KernelAction<InputVertexTypes, RewrittenVertexTypes>;
  submit(reply: CallbackReply<InputVertexTypes, RewrittenVertexTypes>): void;
  discardRequest(requestId: number): void;
  acknowledgeEvent(boundaryId: number): void;
  shouldEmit(phase: TreeOrDagVisitorPhase): boolean;
  requestHalt(): void;
  resume(
    config?: TraversalIterableConfigInput<TreeOrDagVisitorPhase>,
    preparation?: boolean,
  ): void;
  isRequestEligible(requestId: number, mode: PumpMode): boolean;
  isRequestValid(requestId: number): boolean;
  isHaltRequested(): boolean;
  getFailure(): { error: unknown } | null;
  getTraversalLifecycleStatus(): TraversalRunnerStatus;
  getTraversalStopReason(): TraversalStopReason | null;
  captureExecutionSnapshot(): TreeOrDagSchedulerSnapshot;
}
