import type { VertexHandle } from '../src';
import type {
  TreeVisitorContext,
  TreeChildResolutionContext,
  VertexTypes,
  VertexRef,
} from '../src';
type T = VertexTypes<number, string>;
declare const visitor: TreeVisitorContext<string, T, T>;
declare const child: TreeChildResolutionContext<T, T>;
// @ts-expect-error Original structure has no mutable record storage API.
visitor.originalTreeView!.set;
// @ts-expect-error Source callbacks receive the same read-only facade.
child.originalTreeView!.set;
declare const ref: VertexRef<T>;
const generic: VertexHandle<T> = ref;
void generic;
