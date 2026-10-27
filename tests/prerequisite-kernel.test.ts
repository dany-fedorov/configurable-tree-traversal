import { TraversalKernel } from '../src/core/TraversalKernel';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { createCallbackBindings } from '../src/core/drivers/callbackBindings';
import type { CallSpec } from '../src/core/effects/types';
import type { TestGraph as G } from './helpers/graph-fixtures';

function makeKernel() {
  const container = new ResolvedGraphsContainer<G>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const kernel = new TraversalKernel<G>({
    kind: 'dag',
    execution: 'async',
    discovery: 'eager',
    sourceMode: 'graph',
    container,
    stateBridge: {
      status: TraversalRunnerStatus.INITIAL,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {},
    iterableConfig: {
      iterateOver: [],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasSorter: false,
    hasHintIds: false,
    hasPrerequisiteResolver: true,
    concurrency: 2,
  });
  return { kernel, container };
}
function call(kernel: TraversalKernel<G>): CallSpec<G> {
  const action = kernel.poll('drive');
  if (action.kind !== 'CALL')
    throw new Error(`Expected call, got ${action.kind}`);
  return action.call;
}

test('ordinary discovery invalidates a lookup queued behind transport capacity before invocation', () => {
  const { kernel, container } = makeKernel();
  const root = call(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: {
      ok: true,
      value: {
        vertexId: 'root',
        dependsOnWork: ['loader', 'shared'],
        vertexContent: { $data: 'root', $childHints: [] },
      },
    },
  });
  const loader = call(kernel);
  const shared = call(kernel);
  expect(loader.kind).toBe('RESOLVE_PREREQUISITE');
  expect(shared.kind).toBe('RESOLVE_PREREQUISITE');
  expect(kernel.isRequestEligible(loader.requestId, 'drive')).toBe(true);
  kernel.submit({
    requestId: loader.requestId,
    kind: 'RESOLVE_PREREQUISITE',
    outcome: {
      ok: true,
      value: { vertexContent: { $data: 'loader', $childHints: ['shared'] } },
    },
  });
  const natural = call(kernel);
  expect(natural.kind).toBe('MAKE_VERTEX');
  kernel.submit({
    requestId: natural.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: {
        vertexId: 'shared',
        dependsOnWork: [],
        vertexContent: { $data: 'natural', $childHints: [] },
      },
    },
  });
  const action = kernel.poll('drive');
  expect(kernel.isRequestValid(shared.requestId)).toBe(false);
  expect(kernel.isRequestEligible(shared.requestId, 'drive')).toBe(false);
  kernel.discardRequest(shared.requestId);
  expect(action.kind).toBe('FINISHED');
  expect(
    container.resolvedGraph.getVertexRefById('shared')!.getValue().getData(),
  ).toBe('natural');
});

test('lookup reply validation rejects malformed and duplicate transport replies', () => {
  const { kernel } = makeKernel();
  const root = call(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: {
      ok: true,
      value: {
        vertexId: 'root',
        dependsOnWork: ['external'],
        vertexContent: { $data: 'root', $childHints: [] },
      },
    },
  });
  const lookup = call(kernel);
  expect(kernel.isRequestEligible(lookup.requestId, 'drain')).toBe(false);
  expect(() =>
    kernel.submit({
      requestId: lookup.requestId,
      kind: 'MAKE_ROOT',
      outcome: { ok: true, value: { vertexContent: null } },
    }),
  ).toThrow('does not match RESOLVE_PREREQUISITE');
  const reply = {
    requestId: lookup.requestId,
    kind: 'RESOLVE_PREREQUISITE' as const,
    outcome: { ok: true as const, value: undefined },
  };
  kernel.submit(reply);
  expect(() => kernel.submit(reply)).toThrow();
  expect(kernel.poll('drive').kind).toBe('FAILED');
});

test('a missing optional lookup binding returns not-found through transport', () => {
  const bindings = createCallbackBindings<G>({
    source: {
      resolveRoot: () => ({ vertexContent: null }),
      resolveChild: () => ({ vertexContent: null }),
    },
    visit: {},
  });
  expect(
    bindings.invoke({
      requestId: 1,
      kind: 'RESOLVE_PREREQUISITE',
      owner: { kind: 'prerequisite', id: 1, epoch: 0 },
      vertexId: undefined,
    }),
  ).toEqual({ kind: 'RESOLVE_PREREQUISITE', value: undefined });
});
