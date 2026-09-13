import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import {
  TraversalRunnerStatus as Status,
} from '../src/core/TraversalRunner';
import {
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TraversableGraph } from '../src/core/TraversableGraph';
import type { TraversableTree } from '../src/core/TraversableTree';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import { DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';

type TestGraph = TreeTypeParameters<string, string>;

function source(): TraversableGraph<TestGraph> {
  return {
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: [] },
      vertexId: 'root',
    }),
    makeVertex: () => ({ vertexContent: null }),
  };
}

function treeSource(): TraversableTree<TestGraph> {
  return {
    makeRoot: () => ({ vertexContent: { $d: 'root', $c: [] } }),
    makeVertex: () => ({ vertexContent: null }),
  };
}

test('requires exactly one source at runtime', () => {
  expect(
    () => new DagTraversal({} as ConstructorParameters<typeof DagTraversal>[0]),
  ).toThrow(/exactly one/i);
  expect(
    () =>
      new DagTraversal({
        traversableGraph: source(),
        traversableTree: source(),
      } as unknown as ConstructorParameters<typeof DagTraversal>[0]),
  ).toThrow(/exactly one/i);
});

function assertSourceUnionTypes(): void {
  // @ts-expect-error A DAG traversal requires a source.
  new DagTraversal<TestGraph>({});
  // @ts-expect-error A DAG traversal source is exclusive.
  new DagTraversal<TestGraph>({
    traversableGraph: source(),
    traversableTree: treeSource(),
  });
}
void assertSourceUnionTypes;

test('fixes source mode while allowing adapter replacement', () => {
  const traversal = new DagTraversal<TestGraph>({ traversableGraph: source() });
  traversal.configure({ traversableGraph: source() });
  expect(
    () =>
      traversal.configure({
        traversableTree: source(),
      } as unknown as Parameters<typeof traversal.configure>[0]),
  ).toThrow(/source mode/i);

  const treeTraversal = new DagTraversal<TestGraph>({
    traversableTree: treeSource(),
  });
  expect(
    () =>
      treeTraversal.configure({
        traversableGraph: source(),
      } as unknown as Parameters<typeof treeTraversal.configure>[0]),
  ).toThrow(/source mode/i);
});

test('rejects concurrency at sync construction and configuration', () => {
  expect(
    () =>
      new DagTraversal({
        traversableGraph: source(),
        concurrency: 2,
      } as unknown as ConstructorParameters<typeof DagTraversal>[0]),
  ).toThrow(/concurrency/i);
  const traversal = new DagTraversal<TestGraph>({ traversableGraph: source() });
  expect(() =>
    traversal.configure({ concurrency: 2 } as unknown as Parameters<
      typeof traversal.configure
    >[0]),
  ).toThrow(/concurrency/i);
});

test('sorts duplicate priorities stably and isolates builders and runners', () => {
  const calls: string[] = [];
  const traversal = new DagTraversal<TestGraph>({ traversableGraph: source() });
  traversal.addVisitorFor(Order.ON_READY, () => void calls.push('low'), {
    priority: 1,
  });
  traversal.addVisitorFor(Order.ON_READY, () => void calls.push('first'), {
    priority: 2,
  });
  traversal.addVisitorFor(Order.ON_READY, () => void calls.push('second'), {
    priority: 2,
  });
  const listed = traversal.listVisitorsFor(Order.ON_READY);
  expect(listed.map(({ priority }) => priority)).toEqual([2, 2, 1]);

  const runner = traversal.makeRunner();
  traversal.setVisitorsFor(Order.ON_READY, []);
  listed.length = 0;
  runner.run();
  expect(calls).toEqual(['first', 'second', 'low']);
});

test('configure copies visitor arrays and preserves existing registrations', () => {
  const calls: string[] = [];
  const traversal = new DagTraversal<TestGraph>({ traversableGraph: source() });
  traversal.addVisitorFor(Order.ON_READY, () => void calls.push('existing'));
  const visitors = [
    {
      addedIndex: 0,
      priority: 1,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: () => void calls.push('complete'),
    },
  ];
  traversal.configure({ visitors: { [Order.ON_COMPLETE]: visitors } });
  visitors.length = 0;
  traversal.makeRunner().run();
  expect(calls).toEqual(['existing', 'complete']);
});

test('filters visitor execution independently from event iteration', () => {
  const calls: string[] = [];
  const traversal = new DagTraversal<TestGraph>({ traversableGraph: source() });
  traversal.addVisitorFor(Order.ON_READY, () => void calls.push('ready'));
  traversal.addVisitorFor(Order.ON_COMPLETE, () => void calls.push('complete'));
  const events = [
    ...traversal.makeRunner().getIterable({
      iterateOver: [Order.ON_COMPLETE],
      enableVisitorFunctionsFor: [Order.ON_READY],
    }),
  ];

  expect(calls).toEqual(['ready']);
  expect(events.map(({ order }) => order)).toEqual([Order.ON_COMPLETE]);
});

test('exports recursively frozen defaults without sharing effective arrays', () => {
  expect(Object.isFrozen(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG)).toBe(true);
  expect(Object.isFrozen(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors)).toBe(
    true,
  );
  expect(Object.isFrozen(DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT)).toBe(
    true,
  );
  expect(
    Object.isFrozen(DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver),
  ).toBe(true);

  const first = new DagTraversal<TestGraph>({ traversableGraph: source() });
  first.icfg.visitors[Order.ON_READY].push({
    addedIndex: 0,
    priority: 1,
    resolutionStyle: Style.SEQUENTIAL,
    visitor: () => undefined,
  });
  expect(
    new DagTraversal<TestGraph>({ traversableGraph: source() }).listVisitorsFor(
      Order.ON_READY,
    ),
  ).toEqual([]);
});

test('accepts an initial or empty quiescent halted injected state', () => {
  for (const status of [Status.INITIAL, Status.HALTED]) {
    const state = new DagTraversalRunnerState<TestGraph>({ status });
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const runner = new DagTraversal<TestGraph>({
      traversableGraph: source(),
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    }).makeRunner();

    expect(runner.state).toBe(state);
    expect(runner.resolvedGraphsContainer).toBe(container);
    runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
  }
});

test('rejects incompatible and active injected objects', () => {
  const treeContainer = new ResolvedGraphsContainer<TestGraph, TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  expect(
    () =>
      new DagTraversal<TestGraph>({
        traversableTree: {
          makeRoot: () => ({ vertexContent: null }),
          makeVertex: () => ({ vertexContent: null }),
        },
        traversalRunnerInternalObjects: {
          resolvedGraphsContainer: treeContainer,
        },
      }).makeRunner(),
  ).toThrow(/source mode/i);

  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.RUNNING,
  });
  expect(
    () =>
      new DagTraversal<TestGraph>({
        traversableGraph: source(),
        traversalRunnerInternalObjects: { state },
      }).makeRunner(),
  ).toThrow(/quiescent|active|RUNNING/i);

  const failedWithoutError = new DagTraversalRunnerState<TestGraph>({
    status: Status.FAILED,
  });
  expect(
    () =>
      new DagTraversal<TestGraph>({
        traversableGraph: source(),
        traversalRunnerInternalObjects: { state: failedWithoutError },
      }).makeRunner(),
  ).toThrow(/tagged failure/i);
});

test('retains terminal injected state and validates snapshot compatibility', () => {
  const finished = new DagTraversalRunnerState<TestGraph>({
    status: Status.FINISHED,
  });
  const finishedRunner = new DagTraversal<TestGraph>({
    traversableGraph: source(),
    traversalRunnerInternalObjects: { state: finished },
  }).makeRunner();
  expect([...finishedRunner.getIterable()]).toEqual([]);

  const error = new Error('stored');
  const failed = new DagTraversalRunnerState<TestGraph>({
    status: Status.FAILED,
    failure: { error },
  });
  const failedRunner = new DagTraversal<TestGraph>({
    traversableGraph: source(),
    traversalRunnerInternalObjects: { state: failed },
  }).makeRunner();
  expect(() => failedRunner.run()).toThrow(error);

  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  expect(
    () =>
      new DagTraversal<TestGraph>({
        traversableGraph: source(),
        traversalRunnerInternalObjects: {
          resolvedGraphsContainer: container,
        },
      }).makeRunner(),
  ).toThrow(/snapshot mode/i);
});

test('prevents another runner from claiming live DAG objects', () => {
  const state = new DagTraversalRunnerState<TestGraph>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const input = {
    traversableGraph: source(),
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  };
  const runner = new DagTraversal<TestGraph>(input).makeRunner();
  const iterator = runner.getIterable();
  iterator.next();

  expect(() =>
    new DagTraversal<TestGraph>({
      ...input,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState<TestGraph>(),
        resolvedGraphsContainer: container,
      },
    }).makeRunner(),
  ).toThrow(/active runner/i);
  iterator.return?.(undefined);
});

test('rejects a deferred competing claim for shared DAG objects', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const make = () =>
    new DagTraversal<TestGraph>({
      traversableGraph: source(),
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState<TestGraph>(),
        resolvedGraphsContainer: container,
      },
    }).makeRunner();
  const first = make();
  const second = make();
  const iterator = first.getIterable();
  iterator.next();

  expect(() => second.getIterable().next()).toThrow(/another active runner/i);
  iterator.return?.(undefined);
});

test('inspection reports fixed synchronous DAG configuration', () => {
  const runner = new DagTraversal<TestGraph>({ traversableGraph: source() })
    .makeRunner();
  expect(runner.inspect()).toMatchObject({
    status: Status.INITIAL,
    kind: 'dag',
    execution: 'sync',
    sourceMode: 'graph',
    concurrency: 1,
    bufferedEventCount: 0,
  });
});
