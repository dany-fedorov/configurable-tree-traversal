import type {
  TreeVisitorContext,
  TreeChildResolutionContext,
  VertexTypes,
  VertexHandle,
} from '../src';
type T = VertexTypes<number, string>;
declare const visitor: TreeVisitorContext<string, T, T>;
declare const child: TreeChildResolutionContext<T, T>;
// @ts-expect-error Original structure has no mutable record storage API.
visitor.originalTreeView!.set;
// @ts-expect-error Source callbacks receive the same read-only facade.
child.originalTreeView!.set;
declare const ref: VertexHandle<T>;
const generic: VertexHandle<T> = ref;
void generic;
