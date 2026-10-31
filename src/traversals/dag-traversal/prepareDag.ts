import { preparationIssue } from './lib/preparationIssue';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
} from '@core/TraversableGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncDagTraversal } from './AsyncDagTraversal';
import { capturePreparedSource } from './lib/capturePreparedSource';
import type { PrepareDagResult } from './lib/DagDefinition';
import { dagRunnerCapabilities } from './lib/dagRunnerCapabilities';
import { assertPreparedOptions, makePreparedDag } from './lib/makePreparedDag';
import { prepareDagSource } from './lib/prepareDagSource';

export type PrepareDagOptions = {
  syntheticRoot?: boolean;
  rootWorkDependencies?: 'honor' | 'ignore';
  dependsOnWorkDefault?: 'none' | 'discoveryParentWork';
  traversableTree?: never;
  visitors?: never;
  completedWork?: never;
  traversalRunnerInternalObjects?: never;
  workCompletion?: never;
  discovery?: never;
  transformChildHints?: never;
  retainOriginalGraphStructure?: never;
};
export type PrepareDagInput<
  T extends VertexTypes,
  ID = unknown,
> = PrepareDagOptions & {
  traversableGraph: DagDiscoverySource<T, T, ID>;
};
export type PrepareAsyncDagInput<
  T extends VertexTypes,
  ID = unknown,
> = PrepareDagOptions & {
  traversableGraph: AsyncDagDiscoverySource<T, T, ID>;
  concurrency?: number;
};

const preparationFields = [
  'traversableGraph',
  'syntheticRoot',
  'rootWorkDependencies',
  'dependsOnWorkDefault',
];

/** Discover and validate without visitors; caller source errors retain exact identity. */
export function prepareDag<T extends VertexTypes, ID = unknown>(
  input: PrepareDagInput<T, ID>,
): PrepareDagResult<T['VertexData'], ID> {
  return prepareDagSource(input);
}

/** Async discovery produces the same reusable in-memory definition. */
export function prepareDagAsync<T extends VertexTypes, ID = unknown>(
  input: PrepareDagInput<T, ID> & { concurrency?: number },
): Promise<PrepareDagResult<T['VertexData'], ID>>;
export function prepareDagAsync<T extends VertexTypes, ID = unknown>(
  input: PrepareAsyncDagInput<T, ID>,
): Promise<PrepareDagResult<T['VertexData'], ID>>;
export async function prepareDagAsync<T extends VertexTypes, ID = unknown>(
  input: PrepareAsyncDagInput<T, ID>,
): Promise<PrepareDagResult<T['VertexData'], ID>> {
  assertPreparedOptions(input, [...preparationFields, 'concurrency']);
  const captured = capturePreparedSource<T, ID>(input.traversableGraph, true);
  const runner = new AsyncDagTraversal<T, T, ID>({
    ...input,
    traversableGraph: captured.adapter,
  }).createRunner();
  try {
    await runner.prepare();
  } catch (error) {
    const issue = preparationIssue<ID>(
      dagRunnerCapabilities.get(runner)!.container.store,
      error,
    );
    if (issue === undefined) throw error;
    return { kind: 'invalid', issues: [issue] };
  }
  return {
    kind: 'valid',
    dag: makePreparedDag(
      dagRunnerCapabilities.get(runner)!
        .container as unknown as ResolvedGraphsContainer<T, T, ID>,
      captured.candidates,
      input.rootWorkDependencies ?? 'honor',
    ),
  };
}
