import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Ref, VertexId } from '@core/graph/types';

export type EligibleVisit<T extends TreeTypeParameters> = {
  ref: Ref<T>;
  order: 'ON_READY' | 'ON_COMPLETE';
};

export type VertexWork<T extends TreeTypeParameters> = {
  ref: Ref<T>;
  unmet: Set<VertexId>;
  expansion: 'unprepared' | 'open' | 'closed';
  initialAdmitted: boolean;
  initialCommitted: boolean;
  completionAdmitted: boolean;
  completionCommitted: boolean;
  completionAccounted: boolean[];
  remainingChildren: number;
};
