import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import {
  DagTraversalStallError,
  type DagTraversalStallDiagnostics,
} from '@core/errors/DagTraversalStallError';
import { DagTraversal } from '../DagTraversal';
import type { PrepareDagInput } from '../prepareDag';
import type { PrepareDagResult } from './DagDefinition';
import type { DagDefinition } from './DagDefinition';
import { capturePreparedSource } from './capturePreparedSource';
import { makePreparedDag, assertPreparedOptions } from './makePreparedDag';

/** Shared source preparation keeps caller-error and W/C validation semantics. */
export function prepareDagSource<T extends VertexTypes, ID>(
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
    traversableGraph: captured.adapter as DagDiscoverySource<T, T, ID>,
  }).createRunner();
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
      authoredDefinition,
    ),
  };
}
