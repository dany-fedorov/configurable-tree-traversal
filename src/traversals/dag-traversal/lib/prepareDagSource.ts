import { preparationIssue } from './preparationIssue';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { DagTraversal } from '../DagTraversal';
import type { PrepareDagInput } from '../prepareDag';
import { capturePreparedSource } from './capturePreparedSource';
import type { DagDefinition, PrepareDagResult } from './DagDefinition';
import { dagRunnerCapabilities } from './dagRunnerCapabilities';
import { assertPreparedOptions, makePreparedDag } from './makePreparedDag';

/** Shared source preparation keeps caller-error and W/C validation semantics. */
export function prepareDagSource<T extends VertexTypes, ID>(
  input: PrepareDagInput<T, ID>,
  authoredDefinition?: DagDefinition<T['VertexData'], ID>,
): PrepareDagResult<T['VertexData'], ID> {
  assertPreparedOptions(input, [
    'traversableGraph',
    'syntheticRoot',
    'rootWorkDependencies',
    'dependsOnWorkDefault',
  ]);
  const captured = capturePreparedSource<T, ID>(input.traversableGraph, false);
  const runner = new DagTraversal<T, T, ID>({
    ...input,
    // This capture path invokes only the synchronous source callbacks above.
    traversableGraph: captured.adapter as DagDiscoverySource<T, T, ID>,
  }).createRunner();
  try {
    runner.prepare();
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
      authoredDefinition,
    ),
  };
}
