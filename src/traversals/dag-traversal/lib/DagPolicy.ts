import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DagTraversalRunnerState } from './DagTraversalRunnerState';

const runtimeOwners = new WeakMap<object, object>();

/** Validates and tracks the public data-only DAG continuation boundary. */
export class DagPolicy<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
> {
  private readonly owner = {};

  static allowsChainAdmission(
    activeChainCount: number,
    maxConcurrentCallbackInvocations: number,
  ): boolean {
    return activeChainCount < maxConcurrentCallbackInvocations;
  }

  constructor(
    private readonly state: DagTraversalRunnerState<
      SourceVertexTypes,
      RewrittenVertexTypes
    >,
    private readonly container: ResolvedGraphsContainer<
      SourceVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    if (state.status === TraversalRunnerStatus.RUNNING) {
      throw new Error('Injected DAG state must be quiescent, not RUNNING');
    }
    if (
      state.status === TraversalRunnerStatus.FAILED &&
      state.failure === null
    ) {
      throw new Error('Injected FAILED DAG state requires its tagged failure');
    }
    if (runtimeOwners.has(container)) {
      throw new Error('Injected DAG objects belong to an active runner');
    }
  }

  claim(): void {
    const current = runtimeOwners.get(this.container);
    if (current !== undefined && current !== this.owner) {
      throw new Error('DAG objects belong to another active runner');
    }
    runtimeOwners.set(this.container, this.owner);
  }

  releaseIfTerminal(): void {
    if (
      this.state.status === TraversalRunnerStatus.FINISHED ||
      this.state.status === TraversalRunnerStatus.FAILED
    ) {
      if (runtimeOwners.get(this.container) === this.owner) {
        runtimeOwners.delete(this.container);
      }
    }
  }
}
