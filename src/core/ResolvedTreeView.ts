import type { VertexHandle } from '@core/CTTRef';
import type {
  GetPathToOptions,
  VertexResolutionContext,
} from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';

/** Live tree queries with detached collections and contexts; refs and caller data remain shallow. */
export interface ResolvedTreeView<T extends VertexTypes> {
  getRoot(): VertexHandle<T> | null;
  has(ref: VertexHandle<T>): boolean;
  getChildrenOf(ref: VertexHandle<T>): readonly VertexHandle<T>[] | null;
  getParentOf(ref: VertexHandle<T>): VertexHandle<T> | null;
  getPathTo(
    ref: VertexHandle<T>,
    options?: GetPathToOptions,
  ): readonly VertexHandle<T>[];
  getResolutionContextOf(
    ref: VertexHandle<T>,
  ): Readonly<VertexResolutionContext<T>> | null;
}
