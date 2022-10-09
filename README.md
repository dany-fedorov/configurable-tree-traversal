# Project Status

I think it is 90% ready for 1.0.0 in terms of features, now it's time to go another 90%.
I'll make 1.0.0 when code is covered by unit tests.

Can do depth-first traversals like on this picture.

https://en.wikipedia.org/wiki/Tree_traversal#/media/File:Sorted_binary_tree_ALL_RGB.svg

Check out [src/tools/rewriteObject.ts](src/tools/rewriteObject.ts) and [tests/_main.ts](tests/_main.ts) to see what
already works.

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
