import type { VertexTypes } from './TreeTypeParameters';
import type { MaybePromise } from './graph/types';

export type ChildHintSorter<T extends VertexTypes> = (
  hints: T['VertexHint'][],
) => T['VertexHint'][];
export type AsyncChildHintSorter<T extends VertexTypes> = (
  hints: T['VertexHint'][],
) => MaybePromise<T['VertexHint'][]>;
