import { CTTRef } from '../src/core/CTTRef';
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
import { Vertex } from '../src/core/Vertex';
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

function haltedSeed() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const root = new CTTRef(
    new Vertex<TestGraph>({ $d: 'root', $c: ['A', 'B'] }),
  );
  const a = new CTTRef(new Vertex<TestGraph>({ $d: 'A', $c: ['C'] }));
  const b = new CTTRef(new Vertex<TestGraph>({ $d: 'B', $c: [] }));
  container.acceptRoot(root, 'root');
  container.store.prepareSlots(root, ['A', 'B']);
  container.acceptVertex(a, 'A', ['root'], {
    depth: 1,
    parentVertex: root.unref(),
    parentVertexRef: root,
    hintIndex: 0,
    vertexHint: 'A',
  });
  container.acceptEdge(root, 0, a);
  container.acceptVertex(b, 'B', ['root'], {
    depth: 1,
    parentVertex: root.unref(),
    parentVertexRef: root,
    hintIndex: 1,
    vertexHint: 'B',
  });
  container.acceptEdge(root, 1, b);
  container.store.setStatus(root, 'PRE_VISITED');
  container.store.setStatus(a, 'PRE_VISITED');
  container.store.setStatus(b, 'READY');
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.HALTED,
    traversalRootVertexRef: root,
    readyVisits: [{ vertexRef: b, order: Order.ON_READY }],
    expansionQueue: [a],
    visitorsState: {
      [Order.ON_READY]: {
        vertexVisitIndex: 2,
        curVertexVisitorVisitIndex: 1,
        previousVisitedVertexRef: a,
      },
      [Order.ON_COMPLETE]: {
        vertexVisitIndex: 0,
        curVertexVisitorVisitIndex: 0,
        previousVisitedVertexRef: null,
      },
    },
  });
  return { a, b, container, root, state };
}

function acceptDetached(
  seed: ReturnType<typeof haltedSeed>,
  id: string,
  dependsOn: string[],
) {
  const vertexRef = new CTTRef(
    new Vertex<TestGraph>({ $d: id, $c: [] }),
  );
  seed.container.acceptVertex(vertexRef, id, dependsOn, {
    depth: 1,
    parentVertex: seed.root.unref(),
    parentVertexRef: seed.root,
    hintIndex: 0,
    vertexHint: id,
  });
  return vertexRef;
}

test('resumes ready and expansion work from a non-empty quiescent DAG seed', () => {
  const { container, state } = haltedSeed();
  const resolutions: string[] = [];
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => {
        throw new Error('must not resolve root');
      },
      makeVertex: (hint) => {
        resolutions.push(hint);
        return {
          vertexContent: { $d: hint, $c: [] },
          vertexId: hint,
        };
      },
    },
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  }).makeRunner();

  expect(runner.inspect().readyVisits).toEqual([
    { vertexRefId: state.readyVisits[0]!.vertexRef.getId(), order: Order.ON_READY },
  ]);

  const events = [...runner.getIterable()].map(
    ({ order, vertex }) => `${order}:${vertex.getData()}`,
  );
  expect(events).toEqual([
    'ON_READY:B',
    'ON_READY:C',
    'ON_COMPLETE:B',
    'ON_COMPLETE:C',
    'ON_COMPLETE:A',
    'ON_COMPLETE:root',
  ]);
  expect(resolutions).toEqual(['C']);
  const graph = runner.getResolvedGraph();
  expect(
    graph.getChildrenOf(graph.getVertexById('root')!)!.map((ref) =>
      ref.unref().getData(),
    ),
  ).toEqual(['A', 'B']);
  expect(
    graph.getChildrenOf(graph.getVertexById('A')!)!.map((ref) =>
      ref.unref().getData(),
    ),
  ).toEqual(['C']);
});

test.each([
  ['missing ready ref', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.readyVisits[0]!.vertexRef = new CTTRef(
      new Vertex<TestGraph>({ $d: 'missing', $c: [] }),
    );
  }],
  ['wrong ready status', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'PRE_VISITED');
  }],
  ['prepared expansion', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.prepareSlots(seed.a, ['C']);
  }],
  ['duplicate ready visit', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.readyVisits.push(seed.state.readyVisits[0]!);
  }],
  ['invalid ready order', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.readyVisits[0]!.order = 'INVALID' as Order;
  }],
  ['active visit', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.root, 'PRE_VISITING');
  }],
  ['partial expansion', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.prepareSlots(seed.b, ['pending']);
  }],
  ['discovered work without dependencies', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'DISCOVERED');
    seed.state.readyVisits = [];
  }],
  ['discovered work with prepared slots', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'DISCOVERED');
    seed.container.store.prepareSlots(seed.b, []);
    seed.state.readyVisits = [];
  }],
  ['discovered work in the ready queue', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'DISCOVERED');
  }],
  ['ready work with prepared slots', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.prepareSlots(seed.b, []);
  }],
  ['ready work with an unmet dependency', (seed: ReturnType<typeof haltedSeed>) => {
    const vertexRef = acceptDetached(seed, 'D', ['missing']);
    seed.container.store.setStatus(vertexRef, 'READY');
    seed.state.readyVisits.push({ vertexRef, order: Order.ON_READY });
  }],
  ['ready visit omitted', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.readyVisits = [];
  }],
  ['ready visit attached to committed work', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'PRE_VISITED');
    seed.state.expansionQueue.push(seed.b);
  }],
  ['pre-visited work with an unmet dependency', (seed: ReturnType<typeof haltedSeed>) => {
    const vertexRef = acceptDetached(seed, 'D', ['missing']);
    seed.container.store.setStatus(vertexRef, 'PRE_VISITED');
    seed.state.expansionQueue.push(vertexRef);
  }],
  ['completing work without prepared slots', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'COMPLETING');
    seed.state.readyVisits[0]!.order = Order.ON_COMPLETE;
  }],
  ['completing work with remaining children', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.root, 'COMPLETING');
    seed.state.readyVisits = [{ vertexRef: seed.root, order: Order.ON_COMPLETE }];
  }],
  ['completing work with an unmet dependency', (seed: ReturnType<typeof haltedSeed>) => {
    const vertexRef = acceptDetached(seed, 'D', ['missing']);
    seed.container.store.prepareSlots(vertexRef, []);
    seed.container.store.setStatus(vertexRef, 'COMPLETING');
    seed.state.readyVisits.push({ vertexRef, order: Order.ON_COMPLETE });
  }],
  ['completed work without prepared slots', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.b, 'COMPLETE');
    seed.state.readyVisits = [];
  }],
  ['completed work with remaining children', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.setStatus(seed.root, 'COMPLETE');
    seed.state.readyVisits = [];
  }],
  ['completed work in the ready queue', (seed: ReturnType<typeof haltedSeed>) => {
    seed.container.store.prepareSlots(seed.b, []);
    seed.container.store.setStatus(seed.b, 'COMPLETE');
  }],
  ['completed work with an unmet dependency', (seed: ReturnType<typeof haltedSeed>) => {
    const vertexRef = acceptDetached(seed, 'D', ['missing']);
    seed.container.store.prepareSlots(vertexRef, []);
    seed.container.store.setStatus(vertexRef, 'COMPLETE');
  }],
  ['duplicate expansion', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.expansionQueue.push(seed.a);
  }],
  ['unknown expansion', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.expansionQueue = [
      new CTTRef(new Vertex<TestGraph>({ $d: 'missing', $c: [] })),
    ];
  }],
  ['missing expansion', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.expansionQueue = [];
  }],
  ['wrong expansion status', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.expansionQueue.push(seed.b);
  }],
  ['traversal root mismatch', (seed: ReturnType<typeof haltedSeed>) => {
    seed.state.traversalRootVertexRef = seed.a;
  }],
] as const)('rejects an inconsistent halted seed with %s', (_name, corrupt) => {
  const seed = haltedSeed();
  corrupt(seed);
  const beforeRefs = seed.container.resolvedGraph.getVertexRefs();
  const beforeRootStatus = seed.container.resolvedGraph.getStatusOf(seed.root);
  const beforeSlots = seed.container.resolvedGraph.get(seed.root)!.slots;

  expect(
    () =>
      new DagTraversal<TestGraph>({
        traversableGraph: source(),
        traversalRunnerInternalObjects: {
          state: seed.state,
          resolvedGraphsContainer: seed.container,
        },
      }).makeRunner(),
  ).toThrow(/injected DAG|seed/i);
  expect(seed.container.resolvedGraph.getVertexRefs()).toEqual(beforeRefs);
  expect(seed.container.resolvedGraph.getStatusOf(seed.root)).toBe(
    beforeRootStatus,
  );
  expect(seed.container.resolvedGraph.get(seed.root)!.slots).toEqual(
    beforeSlots,
  );
  expect(seed.state.status).toBe(Status.HALTED);
});

test('rejects injected work for an empty graph', () => {
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.HALTED,
    readyVisits: [
      {
        vertexRef: new CTTRef(new Vertex<TestGraph>({ $d: 'x', $c: [] })),
        order: Order.ON_READY,
      },
    ],
  });
  expect(
    () =>
      new DagTraversal<TestGraph>({
        traversableGraph: source(),
        traversalRunnerInternalObjects: { state },
      }).makeRunner(),
  ).toThrow(/empty graph/i);
});

test.each([
  ['COMPLETING', Order.ON_COMPLETE],
  ['COMPLETE', null],
] as const)('restores terminal-ready lifecycle status %s', (status, order) => {
  const seed = haltedSeed();
  seed.container.store.prepareSlots(seed.b, []);
  seed.container.store.setStatus(seed.b, status);
  seed.state.readyVisits =
    order === null ? [] : [{ vertexRef: seed.b, order }];
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => {
        throw new Error('must not resolve root');
      },
      makeVertex: (hint) => ({
        vertexId: hint,
        vertexContent: { $d: hint, $c: [] },
      }),
    },
    traversalRunnerInternalObjects: {
      state: seed.state,
      resolvedGraphsContainer: seed.container,
    },
  }).makeRunner();
  const events = [...runner.getIterable()].map(
    (event) => `${event.order}:${event.vertex.getData()}`,
  );
  expect(events.filter((event) => event.endsWith(':B'))).toEqual(
    status === 'COMPLETING' ? ['ON_COMPLETE:B'] : [],
  );
  expect(runner.getResolvedGraph().getStatusOf(seed.root)).toBe('COMPLETE');
});

test('restores discovered work blocked by a missing dependency', () => {
  const seed = haltedSeed();
  const blocked = acceptDetached(seed, 'blocked', ['missing']);
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => {
        throw new Error('must not resolve root');
      },
      makeVertex: (hint) => ({
        vertexId: hint,
        vertexContent: { $d: hint, $c: [] },
      }),
    },
    traversalRunnerInternalObjects: {
      state: seed.state,
      resolvedGraphsContainer: seed.container,
    },
  }).makeRunner();
  expect(() => runner.run()).toThrow(/stalled.*blocked.*missing/i);
  expect(runner.getResolvedGraph().getStatusOf(blocked)).toBe('DISCOVERED');
});

test.each(['omitted', 'completing', 'complete'] as const)(
  'restores a ready vertex whose dependency is %s',
  (dependencyStatus) => {
    const seed = haltedSeed();
    let dependencyId: string;
    if (dependencyStatus === 'omitted') {
      dependencyId = 'omitted-dependency';
      seed.container.store.markOmitted(dependencyId);
    } else {
      dependencyId = 'B';
      seed.container.store.prepareSlots(seed.b, []);
      seed.container.store.setStatus(
        seed.b,
        dependencyStatus === 'completing' ? 'COMPLETING' : 'COMPLETE',
      );
      seed.state.readyVisits =
        dependencyStatus === 'completing'
          ? [{ vertexRef: seed.b, order: Order.ON_COMPLETE }]
          : [];
    }
    const dependent = acceptDetached(seed, 'dependent', [dependencyId]);
    seed.container.store.setStatus(dependent, 'READY');
    seed.state.readyVisits.push({ vertexRef: dependent, order: Order.ON_READY });
    expect(
      () =>
        new DagTraversal<TestGraph>({
          traversableGraph: source(),
          traversalRunnerInternalObjects: {
            state: seed.state,
            resolvedGraphsContainer: seed.container,
          },
        }).makeRunner(),
    ).not.toThrow();
  },
);

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
