import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { CTTRef } from '@core/CTTRef';
import type { CoreInspection } from '@core/CoreInspection';
import type { SyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';

export type TraversalRunnerIteratorResultContent<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  vertex: Vertex<TTP | RW_TTP>;
  vertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
  order: ORDER;
  isTreeRoot: boolean;
  isTraversalRoot: boolean;
};

export type TraversalStopReason =
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

export abstract class TraversalRunnerIterable<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> implements Iterable<TraversalRunnerIteratorResultContent<ORDER, TTP, RW_TTP>>
{
  abstract [Symbol.iterator](): Iterator<
    TraversalRunnerIteratorResultContent<ORDER, TTP, RW_TTP>
  >;
}

export abstract class TraversalRunner<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> implements
    SyncTraversalExecution<
      ORDER,
      TraversalRunnerIteratorResultContent<ORDER, TTP, RW_TTP>
    >
{
  abstract getStatus(): TraversalRunnerStatus;

  abstract getStopReason(): TraversalStopReason | null;

  abstract isHalted(): boolean;

  abstract inspect(): CoreInspection;

  abstract requestPause(): boolean;

  abstract run: (config?: TraversalIterableConfigInput<ORDER>) => this;

  abstract getIterable: (
    config?: TraversalIterableConfigInput<ORDER>,
  ) => Generator<
    TraversalRunnerIteratorResultContent<ORDER, TTP, RW_TTP>,
    void,
    unknown
  >;
}
