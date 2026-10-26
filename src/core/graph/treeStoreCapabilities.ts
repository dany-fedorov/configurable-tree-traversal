import type { ResolvedTreeStore } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { GraphStore } from './GraphStore';

// Correlated generic stores stay behind the package boundary. Only tree-store
// construction registers a capability; the container bridge preserves identity.
const stores = new WeakMap<object, unknown>();

export function registerTreeGraphStore<T extends VertexTypes>(
  tree: ResolvedTreeStore<T>,
  store: GraphStore<T>,
): void {
  stores.set(tree, store);
}

export function getTreeGraphStore<T extends VertexTypes>(
  tree: ResolvedTreeStore<T>,
): GraphStore<T> {
  return stores.get(tree) as GraphStore<T>;
}
