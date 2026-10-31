import type { VertexTypes } from './TreeTypeParameters';
import type { MaybePromise } from './graph/types';

export type ChildHintTransformer<T extends VertexTypes> = (
  hints: T['VertexHint'][],
) => T['VertexHint'][];
export type AsyncChildHintTransformer<T extends VertexTypes> = (
  hints: T['VertexHint'][],
) => MaybePromise<T['VertexHint'][]>;
