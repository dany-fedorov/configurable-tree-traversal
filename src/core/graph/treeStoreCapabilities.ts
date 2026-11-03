import type { MutableResolvedTreeStore } from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { GraphStore } from './GraphStore';

// Correlated generic stores stay behind the package boundary. Only tree-store
// construction registers a capability; the container bridge preserves identity.
const stores = new WeakMap<object, unknown>();

export function registerTreeGraphStore<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  tree: MutableResolvedTreeStore<InputVertexTypes>,
  store: GraphStore<InputVertexTypes>,
): void {
  stores.set(tree, store);
}

export function getTreeGraphStore<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  tree: MutableResolvedTreeStore<InputVertexTypes>,
): GraphStore<InputVertexTypes> {
  return stores.get(tree) as GraphStore<InputVertexTypes>;
}
