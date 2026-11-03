import type { ObjectRewriteOutputResult } from '../../src';

/** Existing value-oriented assertions explicitly choose the lossy projection. */
export function outputValue<Out>(result: {
  getFinalOutputResult(): ObjectRewriteOutputResult<Out>;
}): Out | null {
  const output = result.getFinalOutputResult();
  return output.kind === 'present' ? output.value : null;
}
export function capturedOutputValue<Out>(result: {
  capturedOutputResultAtReturn: ObjectRewriteOutputResult<Out>;
}): Out | null {
  const output = result.capturedOutputResultAtReturn;
  return output.kind === 'present' ? output.value : null;
}
