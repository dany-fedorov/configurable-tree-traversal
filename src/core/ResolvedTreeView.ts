import type { MutableRef } from '@core/CTTRef';
import type {
  GetPathToOptions,
  VertexResolutionContext,
} from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';

/** Live tree queries with detached collections and contexts; refs and caller data remain shallow. */
export interface ResolvedTreeView<T extends VertexTypes> {
  getRoot(): MutableRef<Vertex<T>> | null;
  has(ref: MutableRef<Vertex<T>>): boolean;
  getChildrenOf(
    ref: MutableRef<Vertex<T>>,
  ): readonly MutableRef<Vertex<T>>[] | null;
  getParentOf(ref: MutableRef<Vertex<T>>): MutableRef<Vertex<T>> | null;
  getPathTo(
    ref: MutableRef<Vertex<T>>,
    options?: GetPathToOptions,
  ): readonly MutableRef<Vertex<T>>[];
  getResolutionContextOf(
    ref: MutableRef<Vertex<T>>,
  ): Readonly<VertexResolutionContext<T>> | null;
}
