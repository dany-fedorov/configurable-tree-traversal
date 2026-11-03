import type { VertexDataAndChildHintTypes } from './TreeTypeParameters';
import type { MaybePromise } from './graph/types';

export type ChildHintsListTransformer<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = (hints: InputVertexTypes['ChildHint'][]) => InputVertexTypes['ChildHint'][];
export type AsyncChildHintsListTransformer<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = (
  hints: InputVertexTypes['ChildHint'][],
) => MaybePromise<InputVertexTypes['ChildHint'][]>;
