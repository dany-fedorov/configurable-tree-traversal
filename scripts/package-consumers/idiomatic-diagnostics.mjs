import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');

for (const api of [esm, cjs]) {
  let release;
  let enter;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const entered = new Promise((resolve) => {
    enter = resolve;
  });
  const id = { opaque: true };
  let sourceCalls = 0;
  const runner = new api.AsyncDagTraversal({
    traversableGraph: {
      resolveRoot: () => {
        sourceCalls++;
        return {
          kind: 'found',
          vertex: {
            vertexId: id,
            vertexContent: { $data: 'root', $childHints: [] },
          },
        };
      },
      resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
    },
    visitors: {
      ON_WORK_READY: async () => {
        enter();
        await gate;
      },
    },
  }).createRunner();
  const running = runner.run();
  await entered;
  const inspection = runner.inspect();
  const chain = inspection.chains[0];
  assert.equal(chain.phase, 'ON_WORK_READY');
  assert.equal(chain.state, 'running');
  assert.equal(chain.visitorIndex, 0);
  assert.equal(chain.executionOptions.visitorPhases, 'all');
  assert.equal(chain.commandCommitMode, 'afterEachVisitor');
  for (const key of ['order', 'group', 'position', 'config'])
    assert.equal(key in chain, false);
  assert.equal(inspection.inFlightCallbackCount, 1);
  assert.equal(inspection.pendingRequests[0].operation, 'visit');
  assert.equal('kind' in inspection.pendingRequests[0], false);
  assert.deepEqual(inspection.pendingRequests[0].owner, chain.owner);
  assert.deepEqual(runner.inspect(), inspection);
  assert.equal(sourceCalls, 1);
  const graph = runner.getResolvedGraph();
  const ref = graph.getVertexRefById(id);
  assert.equal(graph.get(ref).vertexId, id);
  assert.equal(graph.get(ref).visitStage, 'INITIAL_VISIT_STARTED');
  assert.equal(graph.getVisitStageOf(ref), 'INITIAL_VISIT_STARTED');
  assert.equal('status' in graph.get(ref), false);
  assert.equal('getStatusOf' in graph, false);
  release();
  await running;
  assert.equal(graph.getVisitStageOf(ref), 'COMPLETE');
  assert.equal(runner.getStatus(), api.TraversalRunnerStatus.FINISHED);
}
