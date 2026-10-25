import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import type { DagTraversalConfigureInput } from './DagTraversalInstanceConfig';
import type { AsyncDagTraversalConfigureInput } from './AsyncDagTraversalInstanceConfig';
import type { DagTraversalRunner } from './DagTraversalRunner';
import type { AsyncDagTraversalRunner } from './AsyncDagTraversalRunner';
import type { DagCoordinator, AsyncDagCoordinator } from '../coordinateDag';

export type PreparedDagVertex<Data, ID> = Readonly<{
  vertexId: ID;
  data: Data;
  children: readonly ID[];
  dependsOn: readonly ID[];
  dependsOnComplete: readonly ID[];
}>;

type OwnedOptions = {
  traversableGraph?: never;
  traversableTree?: never;
  syntheticRoot?: never;
  discovery?: never;
  rootDependencies?: never;
  implicitParentDependency?: never;
  sortChildrenHints?: never;
  traversalRunnerInternalObjects?: never;
};

export type PreparedDagRunnerOptions<Data, ID> = Pick<
  DagTraversalConfigureInput<
    TreeTypeParameters<Data, ID>,
    TreeTypeParameters<Data, ID>,
    ID
  >,
  | 'visitors'
  | 'completedWork'
  | 'workCompletion'
  | 'saveNotMutatedResolvedGraph'
> &
  OwnedOptions;

export type PreparedAsyncDagRunnerOptions<Data, ID> = Pick<
  AsyncDagTraversalConfigureInput<
    TreeTypeParameters<Data, ID>,
    TreeTypeParameters<Data, ID>,
    ID
  >,
  | 'visitors'
  | 'completedWork'
  | 'workCompletion'
  | 'saveNotMutatedResolvedGraph'
  | 'concurrency'
> &
  OwnedOptions;

export type PreparedDagSessionOptions<ID> = OwnedOptions & {
  completedWork?: ReadonlySet<ID>;
  visitors?: never;
  workCompletion?: never;
  saveNotMutatedResolvedGraph?: never;
};

export type PreparedAsyncDagSessionOptions<ID> =
  PreparedDagSessionOptions<ID> & {
    concurrency?: number;
  };

/** An in-memory validated topology; data and identities remain shallow caller values. */
export interface PreparedDag<Data, ID = unknown> {
  readonly vertices: readonly PreparedDagVertex<Data, ID>[];
  createRunner(
    options?: PreparedDagRunnerOptions<Data, ID>,
  ): DagTraversalRunner<
    TreeTypeParameters<Data, ID>,
    TreeTypeParameters<Data, ID>,
    ID
  >;
  createAsyncRunner(
    options?: PreparedAsyncDagRunnerOptions<Data, ID>,
  ): Promise<
    AsyncDagTraversalRunner<
      TreeTypeParameters<Data, ID>,
      TreeTypeParameters<Data, ID>,
      ID
    >
  >;
  createSession(options?: PreparedDagSessionOptions<ID>): DagCoordinator<ID>;
  createAsyncSession(
    options?: PreparedAsyncDagSessionOptions<ID>,
  ): Promise<AsyncDagCoordinator<ID>>;
}

export type PrepareDagResult<Data, ID = unknown> =
  | { kind: 'valid'; dag: PreparedDag<Data, ID> }
  | { kind: 'invalid'; diagnostics: DagTraversalStallDiagnostics<ID> };
