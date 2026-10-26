import type { VertexTypes } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';

export const dagRunnerCapabilities = new WeakMap<
  object,
  {
    workCompletion: 'visitorReturn' | 'externalSettlement' | undefined;
    container: ResolvedGraphsContainer<VertexTypes>;
  }
>();
