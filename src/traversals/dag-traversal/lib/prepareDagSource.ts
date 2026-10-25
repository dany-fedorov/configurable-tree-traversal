import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversableGraph } from '@core/TraversableGraph';
import {
  DagTraversalStallError,
  type DagTraversalStallDiagnostics,
} from '@core/errors/DagTraversalStallError';
import { DagTraversal } from '../DagTraversal';
import type { PrepareDagInput } from '../prepareDag';
import type { PrepareDagResult } from './PreparedDag';
import type { DagDefinition } from './DagDefinition';
import { capturePreparedSource } from './capturePreparedSource';
import { makePreparedDag, assertPreparedOptions } from './makePreparedDag';

/** Shared source preparation keeps caller-error and W/C validation semantics. */
export function prepareDagSource<T extends TreeTypeParameters, ID>(
  input: PrepareDagInput<T, ID>,
  authoredDefinition?: DagDefinition<T['VertexData'], ID>,
): PrepareDagResult<T['VertexData'], ID> {
  assertPreparedOptions(input, [
    'traversableGraph',
    'syntheticRoot',
    'rootDependencies',
    'implicitParentDependency',
  ]);
  const captured = capturePreparedSource<T, ID>(input.traversableGraph, false);
  const runner = new DagTraversal<T, T, ID>({
    ...input,
    // This capture path invokes only the synchronous source callbacks above.
    traversableGraph: captured.adapter as TraversableGraph<T, T, ID>,
  }).makeRunner();
  try {
    runner.prepare();
  } catch (error) {
    if (
      !(error instanceof DagTraversalStallError) ||
      captured.errors.has(error)
    )
      throw error;
    return {
      kind: 'invalid',
      diagnostics: error.diagnostics as DagTraversalStallDiagnostics<ID>,
    };
  }
  return {
    kind: 'valid',
    dag: makePreparedDag(
      runner.resolvedGraphsContainer,
      captured.candidates,
      input.rootDependencies ?? 'honor',
      authoredDefinition,
    ),
  };
}
