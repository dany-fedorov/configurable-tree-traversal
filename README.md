# Project Status

Can do depth-first traversals like on this picture for abstract trees like on this picture

https://en.wikipedia.org/wiki/Tree_traversal#/media/File:Sorted_binary_tree_ALL_RGB.svg

Has traversable tree implementation for js object and depth first traversal implementation.
Also a separate tool to rewrite a js object on post order.
Check out [src/tools/rewrite-object/rewriteObject.ts](src/tools/rewrite-object/rewriteObject.ts) and [tests](tests) to
see what already works.

If for some reason you want to use this as a dependency, please use fixed version (remove ^ from version
of `configurable-tree-traversal` in package.json)

# TODO

1. Add self-reference test
2. --
3. Async traversal
4. Implementation for FS (with a way to keep fs and tree in sync)
5. Unit tests
6. Freeze data at some point? make trees/vertices immutable?
7. Benchmarks
8. Breadth-first traversal
