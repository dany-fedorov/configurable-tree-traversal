import assert from 'node:assert/strict';
import type { TreeTypeParameters } from '../src/core';
import {
  AsyncDepthFirstTraversal,
  DepthFirstTraversalOrder,
} from '../src/traversals/depth-first-traversal';

type ExampleTree = TreeTypeParameters<string, string>;

let releaseSlow!: () => void;
const slowGate = new Promise<void>((resolve) => {
  releaseSlow = resolve;
});
let reportSlowStarted!: () => void;
const slowStarted = new Promise<void>((resolve) => {
  reportSlowStarted = resolve;
});

const traversal = new AsyncDepthFirstTraversal<ExampleTree>({
  concurrency: 2,
  traversableTree: {
    // Async adapters may return either a value or a promise from every callback.
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: ['fast', 'slow'] },
    }),
    makeVertex: (hint) => {
      if (hint === 'fast') {
        return { vertexContent: { $d: hint, $c: [] } };
      }
      reportSlowStarted();
      return slowGate.then(() => ({
        vertexContent: { $d: hint, $c: [] },
      }));
    },
  },
});

async function main() {
  const runner = traversal.makeRunner();
  const iterator = runner.getIterable({
    iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
  });
  const rootEvent = await iterator.next();
  if (rootEvent.done) throw new Error('Expected the root event');

  const nextEvent = iterator.next();
  await slowStarted;
  const pendingInspection = runner.inspect();
  assert.equal(pendingInspection.execution, 'async');
  assert.equal(pendingInspection.concurrency, 2);
  assert(pendingInspection.inFlightCallbackCount >= 1);
  assert(pendingInspection.inFlightCallbackCount <= 2);
  assert(
    pendingInspection.pendingRequests.some(
      ({ kind }) => kind === 'MAKE_VERTEX',
    ),
  );

  releaseSlow();
  const values = [rootEvent.value.vertex.getData()];
  const childEvent = await nextEvent;
  if (!childEvent.done) values.push(childEvent.value.vertex.getData());
  for await (const event of iterator) values.push(event.vertex.getData());

  assert.deepEqual(values, ['root', 'fast', 'slow']);
  assert.equal(runner.inspect().inFlightCallbackCount, 0);
}

void main();
