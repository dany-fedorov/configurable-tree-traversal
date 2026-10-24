import type { CTTRef } from '@core/CTTRef';
import type {
  GetPathToOptions,
  VertexResolutionContext,
} from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';

/** Live tree queries with detached collections and contexts; refs and caller data remain shallow. */
export interface ResolvedTreeView<T extends TreeTypeParameters> {
  getRoot(): CTTRef<Vertex<T>> | null;
  has(ref: CTTRef<Vertex<T>>): boolean;
  getChildrenOf(ref: CTTRef<Vertex<T>>): readonly CTTRef<Vertex<T>>[] | null;
  getParentOf(ref: CTTRef<Vertex<T>>): CTTRef<Vertex<T>> | null;
  getPathTo(
    ref: CTTRef<Vertex<T>>,
    options?: GetPathToOptions,
  ): readonly CTTRef<Vertex<T>>[];
  getResolutionContextOf(
    ref: CTTRef<Vertex<T>>,
  ): Readonly<VertexResolutionContext<T>> | null;
}
