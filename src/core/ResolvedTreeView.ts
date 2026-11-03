import type { VertexHandle } from '@core/CTTRef';
import type {
  StructuralAncestorPathOptions,
  ChildDiscoveryContext,
} from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';

/** Live tree queries with detached collections and contexts; refs and caller data remain shallow. */
export interface LiveResolvedTreeView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> {
  getRootVertexHandleOrNull(): VertexHandle<InputVertexTypes> | null;
  containsVertexHandle(ref: VertexHandle<InputVertexTypes>): boolean;
  getChildVertexHandlesOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): readonly VertexHandle<InputVertexTypes>[] | null;
  getParentVertexHandleOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): VertexHandle<InputVertexTypes> | null;
  requireStructuralAncestorPathTo(
    ref: VertexHandle<InputVertexTypes>,
    options?: StructuralAncestorPathOptions,
  ): readonly VertexHandle<InputVertexTypes>[];
  getChildDiscoveryContextOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): Readonly<ChildDiscoveryContext<InputVertexTypes>> | null;
}
