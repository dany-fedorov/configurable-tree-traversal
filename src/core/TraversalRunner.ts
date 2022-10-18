import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { CTTRef } from '@core/CTTRef';
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

export enum TraversalRunnerStatus {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  HALTED = 'HALTED',
  FINISHED = 'FINISHED',
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
> {
  abstract getStatus(): TraversalRunnerStatus;

  abstract run(): this;

  // abstract halt(): this;

  abstract getIterable(
    config: TraversalIterableConfigInput<ORDER>,
  ): TraversalRunnerIterable<ORDER, TTP, RW_TTP>;
}
