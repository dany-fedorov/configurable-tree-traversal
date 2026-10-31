import type { ObjectRewriteOutputResult } from '../../src';

/** Existing value-oriented assertions explicitly choose the lossy projection. */
export function outputValue<Out>(result: {
  getOutputResult(): ObjectRewriteOutputResult<Out>;
}): Out | null {
  const output = result.getOutputResult();
  return output.kind === 'present' ? output.value : null;
}
export function capturedOutputValue<Out>(result: {
  outputResultAtReturn: ObjectRewriteOutputResult<Out>;
}): Out | null {
  const output = result.outputResultAtReturn;
  return output.kind === 'present' ? output.value : null;
}
