import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { Vertex } from '@core/Vertex';
import type {
  HintVertexId,
  MaybePromise,
  Ref,
  VisitResult,
} from '@core/graph/types';
import type { KernelInspection } from '@core/CoreInspection';

export type VisitOrder =
  | 'PRE_ORDER'
  | 'IN_ORDER'
  | 'POST_ORDER'
  | 'LEVEL_ORDER'
  | 'ON_READY'
  | 'ON_COMPLETE';

export type Outcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export type PumpMode = 'drive' | 'settle' | 'drain';

export type OwnerToken = {
  kind: 'root' | 'frame' | 'chain';
  id: number;
  epoch: number;
};

export type VisitMetadata<T extends TreeTypeParameters> = {
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: Ref<T> | null;
  vertexVisitorsChainState: unknown;
};

export type CallSpec<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = { requestId: number; owner: OwnerToken } & (
  | { kind: 'MAKE_ROOT' }
  | { kind: 'SORT_HINTS'; hints: (T | R)['VertexHint'][] }
  | { kind: 'HINT_ID'; hint: (T | R)['VertexHint']; hintIndex: number }
  | { kind: 'MAKE_VERTEX'; context: VertexResolutionContext<T | R> }
  | {
      kind: 'VISIT';
      ref: Ref<T | R>;
      order: VisitOrder;
      recordIndex: number;
      metadata: VisitMetadata<T | R>;
    }
);

export type CallbackValues<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  MAKE_ROOT: MakeVertexResult<T>;
  MAKE_VERTEX: MakeVertexResult<T>;
  SORT_HINTS: (T | R)['VertexHint'][];
  HINT_ID: HintVertexId | undefined;
  VISIT: VisitResult<R>;
};

export type CallbackReply<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  [K in keyof CallbackValues<T, R>]: {
    requestId: number;
    kind: K;
    outcome: Outcome<CallbackValues<T, R>[K]>;
  };
}[keyof CallbackValues<T, R>];

export type RawCallbackResult<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  [K in keyof CallbackValues<T, R>]: {
    kind: K;
    value: MaybePromise<CallbackValues<T, R>[K]>;
  };
}[keyof CallbackValues<T, R>];

export interface CallbackBindings<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  invoke(call: CallSpec<T, R>): RawCallbackResult<T, R>;
}

export type KernelEvent<T extends TreeTypeParameters> = {
  vertex: Vertex<T>;
  vertexRef: Ref<T>;
  order: VisitOrder;
  isRoot: boolean;
  isTraversalRoot: boolean;
};

export type KernelAction<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> =
  | { kind: 'CALL'; call: CallSpec<T, R> }
  | { kind: 'EVENT'; event: KernelEvent<T | R>; boundaryId: number }
  | { kind: 'WAIT' }
  | { kind: 'HALTED' }
  | { kind: 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };

export interface KernelPort<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  poll(mode: PumpMode): KernelAction<T, R>;
  submit(reply: CallbackReply<T, R>): void;
  discardRequest(requestId: number): void;
  acknowledgeEvent(boundaryId: number): void;
  requestHalt(): void;
  resume(config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>): void;
  isRequestEligible(requestId: number, mode: PumpMode): boolean;
  isRequestValid(requestId: number): boolean;
  isHaltRequested(): boolean;
  getFailure(): { error: unknown } | null;
  getStatus(): TraversalRunnerStatus;
  inspect(): KernelInspection;
}
