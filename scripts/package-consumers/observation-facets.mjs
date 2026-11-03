import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const cjs = createRequire(import.meta.url)('configurable-tree-traversal');
for (const api of [esm, cjs]) {
  const data = { value: 'root' };
  const hint = { value: 'child' };
  for (const Builder of [
    api.DepthFirstTreeTraversalBuilder,
    api.AsyncDepthFirstTreeTraversalBuilder,
    api.BreadthFirstTreeTraversalBuilder,
    api.AsyncBreadthFirstTreeTraversalBuilder,
    api.DagTraversalBuilder,
    api.AsyncDagTraversalBuilder,
  ]) {
    const runner = new Builder({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: data,
              $childDiscoveryHints: [hint],
            },
          },
        }),
        resolveChildVertexFromHint: (_hint, context) => {
          assert.equal('resolvedTree' in context, false);
          assert.equal('set' in context.liveResolvedTreeView, false);
          assert.equal(
            'setValue' in context.childDiscoveryContext.parentVertexHandle,
            false,
          );
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event);
    const view = runner.getLiveResolvedTreeView();
    const root = view.getRootVertexHandleOrNull();
    assert.equal('getResolvedTreeStore' in runner, false);
    assert.equal('getResolvedGraph' in runner, false);
    assert.equal('isTraversalRootVertex' in runner, false);
    assert.equal('isTraversalRoot' in events[0], false);
    assert.equal('setValue' in root, false);
    assert.equal(events[0].vertexHandle, root);
    assert.equal(
      runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
      root,
    );
    assert(Object.isFrozen(root));
    assert(Object.isFrozen(root.getCurrentVertexView()));
    assert(
      Object.isFrozen(
        root.getCurrentVertexView().getDetachedChildDiscoveryHints(),
      ),
    );
    assert.equal(root.getCurrentVertexView().getVertexData(), data);
    assert.equal(
      root.getCurrentVertexView().getDetachedChildDiscoveryHints()[0],
      hint,
    );
    assert.equal(Object.isFrozen(data), false);
    assert.equal(Object.isFrozen(hint), false);
  }
}
console.log('Packed observation facets passed (CJS + ESM).');
