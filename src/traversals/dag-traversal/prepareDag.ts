import type {
  TraversableGraph,
  AsyncTraversableGraph,
} from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DagTraversalStallError,
  type DagTraversalStallDiagnostics,
} from '@core/errors/DagTraversalStallError';
import { AsyncDagTraversal } from './AsyncDagTraversal';
import { prepareDagSource } from './lib/prepareDagSource';
import type { PrepareDagResult } from './lib/PreparedDag';
import { capturePreparedSource } from './lib/capturePreparedSource';
import { makePreparedDag, assertPreparedOptions } from './lib/makePreparedDag';

export type PrepareDagOptions = {
  syntheticRoot?: boolean;
  rootDependencies?: 'honor' | 'ignore';
  implicitParentDependency?: boolean;
  traversableTree?: never;
  visitors?: never;
  completedWork?: never;
  traversalRunnerInternalObjects?: never;
  workCompletion?: never;
  discovery?: never;
  sortChildrenHints?: never;
  saveNotMutatedResolvedGraph?: never;
};
export type PrepareDagInput<
  T extends TreeTypeParameters,
  ID = unknown,
> = PrepareDagOptions & {
  traversableGraph: TraversableGraph<T, T, ID>;
};
export type PrepareAsyncDagInput<
  T extends TreeTypeParameters,
  ID = unknown,
> = PrepareDagOptions & {
  traversableGraph: AsyncTraversableGraph<T, T, ID>;
  concurrency?: number;
};

const preparationFields = [
  'traversableGraph',
  'syntheticRoot',
  'rootDependencies',
  'implicitParentDependency',
];

/** Discover and validate without visitors; caller source errors retain exact identity. */
export function prepareDag<T extends TreeTypeParameters, ID = unknown>(
  input: PrepareDagInput<T, ID>,
): PrepareDagResult<T['VertexData'], ID> {
  return prepareDagSource(input);
}

/** Async discovery produces the same reusable in-memory definition. */
export function prepareDagAsync<T extends TreeTypeParameters, ID = unknown>(
  input: PrepareDagInput<T, ID> & { concurrency?: number },
): Promise<PrepareDagResult<T['VertexData'], ID>>;
export function prepareDagAsync<T extends TreeTypeParameters, ID = unknown>(
  input: PrepareAsyncDagInput<T, ID>,
): Promise<PrepareDagResult<T['VertexData'], ID>>;
export async function prepareDagAsync<
  T extends TreeTypeParameters,
  ID = unknown,
>(
  input: PrepareAsyncDagInput<T, ID>,
): Promise<PrepareDagResult<T['VertexData'], ID>> {
  assertPreparedOptions(input, [...preparationFields, 'concurrency']);
  const captured = capturePreparedSource<T, ID>(input.traversableGraph, true);
  const runner = new AsyncDagTraversal<T, T, ID>({
    ...input,
    traversableGraph: captured.adapter,
  }).makeRunner();
  try {
    await runner.prepare();
  } catch (error) {
    if (
      !(error instanceof DagTraversalStallError) ||
      captured.errors.has(error)
    )
      throw error;
    return {
      kind: 'invalid',
      issues: [
        {
          kind: 'milestone',
          diagnostics: error.diagnostics as DagTraversalStallDiagnostics<ID>,
        },
      ],
    };
  }
  return {
    kind: 'valid',
    dag: makePreparedDag(
      runner.resolvedGraphsContainer,
      captured.candidates,
      input.rootDependencies ?? 'honor',
    ),
  };
}
