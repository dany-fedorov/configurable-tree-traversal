import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { InternalVertexRef, VertexId } from '@core/graph/types';

export type EligibleVisit<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  ref: InternalVertexRef<InputVertexTypes>;
  order: 'ON_WORK_READY' | 'ON_SUBGRAPH_COMPLETION_READY';
};

export type GraphStall<InputVertexTypes extends VertexDataAndChildHintTypes> = {
  dependencies: Array<{ id: VertexId; missing: VertexId[] }>;
  incomplete: InternalVertexRef<InputVertexTypes>[];
};

export type VertexWork<InputVertexTypes extends VertexDataAndChildHintTypes> = {
  ref: InternalVertexRef<InputVertexTypes>;
  unmet: Set<VertexId>;
  unmetComplete: Set<VertexId>;
  expansion: 'unprepared' | 'open' | 'closed';
  initialAdmitted: boolean;
  initialCommitted: boolean;
  completionAdmitted: boolean;
  completionCommitted: boolean;
  completionAccounted: boolean[];
  remainingChildren: number;
};
