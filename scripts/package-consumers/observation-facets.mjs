import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const cjs = createRequire(import.meta.url)('configurable-tree-traversal');
for (const api of [esm, cjs]) {
  const data = { value: 'root' };
  const hint = { value: 'child' };
  for (const Builder of [
    api.DepthFirstTreeTraversal,
    api.AsyncDepthFirstTreeTraversal,
    api.BreadthFirstTreeTraversal,
    api.AsyncBreadthFirstTreeTraversal,
    api.DagTraversal,
    api.AsyncDagTraversal,
  ]) {
    const runner = new Builder({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: data, $childHints: [hint] } },
        }),
        resolveChild: (_hint, context) => {
          assert.equal('resolvedTree' in context, false);
          assert.equal('set' in context.resolvedTreeView, false);
          assert.equal(
            'setValue' in context.resolutionContext.parentVertexRef,
            false,
          );
          return {
            kind: 'found',
            vertex: { vertexContent: { $data: hint, $childHints: [] } },
          };
        },
      },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) events.push(event);
    const view = runner.getResolvedTreeView();
    const root = view.getRoot();
    assert.equal('getResolvedTreeStore' in runner, false);
    assert.equal('getResolvedGraph' in runner, false);
    assert.equal('isTraversalRootVertex' in runner, false);
    assert.equal('isTraversalRoot' in events[0], false);
    assert.equal('setValue' in root, false);
    assert.equal(events[0].vertexRef, root);
    assert.equal(runner.getResolvedGraphView().getRoot(), root);
    assert(Object.isFrozen(root));
    assert(Object.isFrozen(root.getValue()));
    assert(Object.isFrozen(root.getValue().getChildrenHints()));
    assert.equal(root.getValue().getData(), data);
    assert.equal(root.getValue().getChildrenHints()[0], hint);
    assert.equal(Object.isFrozen(data), false);
    assert.equal(Object.isFrozen(hint), false);
  }
}
console.log('Packed observation facets passed (CJS + ESM).');
