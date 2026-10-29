import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const root = require('configurable-tree-traversal');
const packageRoot = dirname(
  require.resolve('configurable-tree-traversal/package.json'),
);
// Bun's observed missing-module codes differ from Node's export-map error.
const isBun = typeof process.versions.bun === 'string';
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
  // Each denied route targets a physically packaged implementation. This
  // distinguishes export-map denial from an accidentally missing private file.
  assert(
    [
      join(packageRoot, path),
      join(packageRoot, path + '.js'),
      join(packageRoot, 'dist', path),
      join(packageRoot, 'dist', path + '.js'),
    ].some((filename) => existsSync(filename)),
    path + ' must have a physically packaged target',
  );
  const specifier = 'configurable-tree-traversal/' + path;
  assert.throws(
    () => require(specifier),
    { code: isBun ? 'MODULE_NOT_FOUND' : 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
    specifier,
  );
  await assert.rejects(
    import(specifier),
    { code: isBun ? 'ERR_MODULE_NOT_FOUND' : 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
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
console.log(
  'Verified packed CJS/ESM denial for 26 internal paths and curated public runtime namespaces.',
);

for (const Constructor of [root.DagTraversal, root.AsyncDagTraversal]) {
  const runner = new Constructor(
    root.materializeDagInputFromRecords([{ id: 'a' }], {
      id: (item) => item.id,
    }),
  ).createRunner();
  assert.equal('inspectDagState' in runner, false);
  await runner.run();
  assert.equal(
    root
      .inspectDagMilestones(runner)
      .explain({ vertexId: 'a', milestone: 'subgraphCompletion' }).satisfied,
    true,
  );
}

for (const name of [
  'TreeTraversal',
  'TreeTraversalRunner',
  'TreeTraversalIterable',
  'AbstractTreeSource',
]) {
  for (const entry of [
    'configurable-tree-traversal',
    'configurable-tree-traversal/core',
  ]) {
    assert.equal(name in require(entry), false);
    assert.equal(name in (await import(entry)), false);
  }
}
