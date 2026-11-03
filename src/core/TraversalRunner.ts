import type { VertexHandle } from '@core/CTTRef';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { VertexView } from '@core/Vertex';

export type TreeTraversalEvent<
  Phase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  vertex: VertexView<InputVertexTypes | RewrittenVertexTypes>;
  vertexHandle: VertexHandle<InputVertexTypes | RewrittenVertexTypes>;
  eventKind: Phase;
  isTreeRoot: boolean;
};

export type TraversalStopReason =
  | 'prepared'
  | 'paused'
  | 'awaitingSettlement'
  | 'finished'
  | 'failed';

export enum TraversalRunnerStatus {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  SUSPENDED = 'SUSPENDED',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED',
}
