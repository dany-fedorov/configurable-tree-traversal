import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = require('configurable-tree-traversal');
for (const path of [
  'core/graph/treeStoreCapabilities',
  'core/graph/treeStoreCapabilities.js',
  'core/TraversalKernel',
  'core/TraversalKernel.js',
  'core/drivers/runAsync',
  'core/drivers/runAsync.js',
  'core/graph/GraphStore',
  'core/graph/GraphStore.js',
  'core/Vertex',
  'core/Vertex.js',
  'traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerState',
  'traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerState.js',
  'traversals/dag-traversal/lib/DagTraversalRunner',
  'traversals/dag-traversal/lib/DagTraversalRunner.js',
  'traversals/graph-walk/lib/WalkEffects',
  'traversals/graph-walk/lib/WalkEffects.js',
  'traversals/graph-walk/GraphWalkRunner',
  'traversals/graph-walk/GraphWalkRunner.js',
  'utils/deepFreeze',
  'utils/deepFreeze.js',
  'dist/core/TraversalKernel',
  'dist/core/TraversalKernel.js',
  'dist/index',
  'dist/index.js',
  'dist/traversals/graph-walk/lib/WalkEffects',
  'dist/traversals/graph-walk/lib/WalkEffects.js',
]) {
  const specifier = 'configurable-tree-traversal/' + path;
  assert.throws(
    () => require(specifier),
    { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
    specifier,
  );
  await assert.rejects(
    import(specifier),
    { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
    specifier,
  );
}
assert.equal(
  require('configurable-tree-traversal/package.json').name,
  'configurable-tree-traversal',
);
assert.equal(typeof root.rewriteObject, 'function');
for (const module of [
  root,
  root.core,
  root.depthFirstTraversal,
  root.breadthFirstTraversal,
  root.dagTraversal,
  root.graphWalk,
  root.traversableObjectTree,
  root.objectRewrite,
]) {
  for (const name of Object.keys(module)) {
    assert(
      !/^(?:Internal|DEFAULT_|__)|(?:RunnerState|VisitorsState|RunnerInternalObjects|ResolvedTreesContainer)$|(?:DEFAULT_INSTANCE_CONFIG|ITERABLE_CONFIG_DEFAULT)|^(?:OBJECT_MUTATION_DEFAULTS|TraversalVisitorFunctionResolutionStyle)$|^(?:merge.*Configs|makeEffective.*Config|normalizeVertexContent)$/.test(
        name,
      ),
      name,
    );
  }
}


assert.equal('getGraphStore' in new root.ResolvedTreeStore(), false);
console.log('Verified packed CJS/ESM denial for 26 internal paths and curated public runtime namespaces.');
