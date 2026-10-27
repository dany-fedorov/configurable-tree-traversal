import type { MutableRef } from '@core/CTTRef';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';

export type TreeTraversalEvent<
  Phase extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  vertex: Vertex<TTP | RW_TTP>;
  vertexRef: MutableRef<Vertex<TTP | RW_TTP>>;
  phase: Phase;
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
