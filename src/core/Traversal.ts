import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
} from '@core/TraversalVisitor';
import type { Vertex } from '@core/Vertex';
import type { CTTRef } from '@core/CTTRef';

export type TraversalIteratorResultContent<
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

export enum TraversalStatus {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  HALTED = 'HALTED',
  FINISHED = 'FINISHED',
}

export abstract class TraversalIterable<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> implements Iterable<TraversalIteratorResultContent<ORDER, TTP, RW_TTP>>
{
  abstract [Symbol.iterator](): Iterator<
    TraversalIteratorResultContent<ORDER, TTP, RW_TTP>
  >;
}

export abstract class Traversal<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  abstract getStatus(): TraversalStatus;

  abstract run(): this;

  abstract addVisitorFor(
    order: ORDER,
    visitor: TraversalVisitor<ORDER, TTP, RW_TTP>,
    options?: TraversalVisitorFunctionOptions,
  ): this;

  abstract setVisitorsFor(
    order: ORDER,
    visitorRecords: TraversalVisitorRecord<ORDER, TTP, RW_TTP>[],
  ): this;

  abstract listVisitorsFor(
    order: ORDER,
  ): TraversalVisitorRecord<ORDER, TTP, RW_TTP>[];

  abstract getIterable(
    runVisitorFunctions: boolean,
    orders: ORDER | ORDER[],
  ): TraversalIterable<ORDER, TTP, RW_TTP>;
}
