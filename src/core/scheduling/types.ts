import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Ref, VertexId } from '@core/graph/types';

export type EligibleVisit<T extends VertexTypes> = {
  ref: Ref<T>;
  order: 'ON_READY' | 'ON_COMPLETE';
};

export type GraphStall<T extends VertexTypes> = {
  dependencies: Array<{ id: VertexId; missing: VertexId[] }>;
  incomplete: Ref<T>[];
};

export type VertexWork<T extends VertexTypes> = {
  ref: Ref<T>;
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
