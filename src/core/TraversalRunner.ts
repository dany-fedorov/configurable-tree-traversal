import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MutableRef } from '@core/CTTRef';
import type { CoreInspection } from '@core/CoreInspection';
import type { SyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';

export type TreeTraversalEvent<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  vertex: Vertex<TTP | RW_TTP>;
  vertexRef: MutableRef<Vertex<TTP | RW_TTP>>;
  phase: ORDER;
  isTreeRoot: boolean;
  isTraversalRoot: boolean;
};

export type TraversalStopReason =
  | 'prepared'
  | 'paused'
  | 'awaitingSettlement'
  | 'finished'
  | 'failed';

export enum TraversalRunnerStatus {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  HALTED = 'HALTED',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED',
}

export abstract class TreeTraversalIterable<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> implements Iterable<TreeTraversalEvent<ORDER, TTP, RW_TTP>>
{
  abstract [Symbol.iterator](): Iterator<
    TreeTraversalEvent<ORDER, TTP, RW_TTP>
  >;
}

/** Historical sync tree-only base; DAG and walking runners expose execution capabilities. */
export abstract class TreeTraversalRunner<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> implements
    SyncTraversalExecution<
      ORDER,
      TreeTraversalEvent<ORDER, TTP, RW_TTP>
    >
{
  abstract getStatus(): TraversalRunnerStatus;

  abstract getStopReason(): TraversalStopReason | null;

  abstract isHalted(): boolean;

  abstract inspect(): CoreInspection;

  abstract requestPause(): boolean;

  abstract run: (config?: TraversalIterableConfigInput<ORDER, ORDER>) => this;

  abstract iterateEvents: (
    config?: TraversalIterableConfigInput<ORDER, ORDER>,
  ) => Generator<
    TreeTraversalEvent<ORDER, TTP, RW_TTP>,
    void,
    unknown
  >;
}
