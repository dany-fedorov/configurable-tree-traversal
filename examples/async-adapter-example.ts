import {
  type VertexDataAndChildHintTypes,
  AsyncDepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
} from '../src';
import assert from 'node:assert/strict';

type ExampleTree = VertexDataAndChildHintTypes<string, string>;

let releaseSlow!: () => void;
const slowGate = new Promise<void>((resolve) => {
  releaseSlow = resolve;
});
let reportSlowStarted!: () => void;
const slowStarted = new Promise<void>((resolve) => {
  reportSlowStarted = resolve;
});

const traversal = new AsyncDepthFirstTreeTraversalBuilder<ExampleTree>({
  maxConcurrentCallbackInvocations: 2,
  treeDiscoverySource: {
    // Async adapters may return either a value or a promise from every callback.
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['fast', 'slow'],
        },
      },
    }),
    resolveChildVertexFromHint: (hint) => {
      if (hint === 'fast') {
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      }
      reportSlowStarted();
      return slowGate.then(() => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }));
    },
  },
});

async function main() {
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
    });
  const rootEvent = await iterator.next();
  if (rootEvent.done) throw new Error('Expected the root event');

  const nextEvent = iterator.next();
  await slowStarted;
  const pendingInspection = runner.captureExecutionSnapshot();
  assert.equal(pendingInspection.callbackExecutionMode, 'async');
  assert.equal(pendingInspection.maxConcurrentCallbackInvocations, 2);
  assert(pendingInspection.inFlightInvocationCount >= 1);
  assert(pendingInspection.inFlightInvocationCount <= 2);
  assert(
    pendingInspection.pendingCallbackRequests.some(
      ({ operation }) => operation === 'resolveChildVertexFromHint',
    ),
  );

  releaseSlow();
  const values = [rootEvent.value.vertex.getVertexData()];
  const childEvent = await nextEvent;
  if (!childEvent.done) values.push(childEvent.value.vertex.getVertexData());
  for await (const event of iterator) values.push(event.vertex.getVertexData());

  assert.deepEqual(values, ['root', 'fast', 'slow']);
  assert.equal(runner.captureExecutionSnapshot().inFlightInvocationCount, 0);
}

void main();
