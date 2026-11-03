import type { DagInspectionState } from '@core/graph/types';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';

export const dagRunnerCapabilities = new WeakMap<
  object,
  {
    inspectState: () => DagInspectionState;
    workCompletionPolicy:
      | 'afterWorkReadyVisitorChain'
      | 'requireExternalWorkSettlement'
      | undefined;
    container: ResolvedGraphsContainer<VertexDataAndChildHintTypes>;
  }
>();
