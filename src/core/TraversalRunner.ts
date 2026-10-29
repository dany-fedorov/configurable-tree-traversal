import type { VertexHandle } from '@core/CTTRef';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VertexView } from '@core/Vertex';

export type TreeTraversalEvent<
  Phase extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  vertex: VertexView<TTP | RW_TTP>;
  vertexRef: VertexHandle<TTP | RW_TTP>;
  phase: Phase;
  isTreeRoot: boolean;
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
