import type { VertexTypes } from '@core/TreeTypeParameters';
import type { AsyncDagWorkSession, DagWorkSession } from '../coordinateDag';
import type { AsyncDagOptionsPatch } from './AsyncDagTraversalInstanceConfig';
import type { AsyncDagTraversalRunner } from './AsyncDagTraversalRunner';
import type { DagDefinition } from './DagDefinition';
import type { DagOptionsPatch } from './DagTraversalInstanceConfig';
import type { DagTraversalRunner } from './DagTraversalRunner';

export type PreparedDagVertex<Data, ID> = Readonly<{
  vertexId: ID;
  data: Data;
  children: readonly ID[];
  dependsOnWork: readonly ID[];
  dependsOnSubgraphCompletion: readonly ID[];
}>;

type OwnedOptions = {
  traversableGraph?: never;
  traversableTree?: never;
  syntheticRoot?: never;
  discovery?: never;
  rootWorkDependencies?: never;
  omittedWorkDependencies?: never;
  sortChildrenHints?: never;
  traversalRunnerInternalObjects?: never;
};

export type PreparedDagRunnerOptions<Data, ID> = Pick<
  DagOptionsPatch<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>,
  | 'visitors'
  | 'completedWork'
  | 'workCompletion'
  | 'retainOriginalGraphStructure'
> &
  OwnedOptions;

export type PreparedAsyncDagRunnerOptions<Data, ID> = Pick<
  AsyncDagOptionsPatch<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>,
  | 'visitors'
  | 'completedWork'
  | 'workCompletion'
  | 'retainOriginalGraphStructure'
  | 'concurrency'
> &
  OwnedOptions;

export type DagWorkSessionOptions<ID> = OwnedOptions & {
  completedWork?: ReadonlySet<ID>;
  visitors?: never;
  workCompletion?: never;
  retainOriginalGraphStructure?: never;
};

export type AsyncDagWorkSessionOptions<ID> = DagWorkSessionOptions<ID> & {
  concurrency?: number;
};

/** An in-memory validated topology; data and identities remain shallow caller values. */
export interface PreparedDag<Data, ID = unknown> {
  /** Live-child convenience projection; omission slots are absent. Do not use for round-trip reconstruction. */
  readonly vertices: readonly PreparedDagVertex<Data, ID>[];
  /** Faithful ordered entry, slots, omissions, and W/C declarations for reconstruction or revision. */
  readonly definition: DagDefinition<Data, ID>;
  createRunner(
    options?: PreparedDagRunnerOptions<Data, ID>,
  ): DagTraversalRunner<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>;
  createAsyncRunner(
    options?: PreparedAsyncDagRunnerOptions<Data, ID>,
  ): Promise<
    AsyncDagTraversalRunner<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>
  >;
  createWorkSession(options?: DagWorkSessionOptions<ID>): DagWorkSession<ID>;
  createAsyncWorkSession(
    options?: AsyncDagWorkSessionOptions<ID>,
  ): Promise<AsyncDagWorkSession<ID>>;
}
