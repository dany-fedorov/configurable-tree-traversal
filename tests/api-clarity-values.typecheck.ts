import type {
  TreeVisitorContext,
  TreeChildResolverContext,
  VertexDataAndChildHintTypes,
  VertexHandle,
} from '../src';
type T = VertexDataAndChildHintTypes<number, string>;
declare const visitor: TreeVisitorContext<string, T, T>;
declare const child: TreeChildResolverContext<T, T>;
// @ts-expect-error Original structure has no mutable record storage API.
visitor.preCommandDiscoveredTreeView!.set;
// @ts-expect-error Source callbacks receive the same read-only facade.
child.preCommandDiscoveredTreeView!.set;
declare const ref: VertexHandle<T>;
const generic: VertexHandle<T> = ref;
void generic;
