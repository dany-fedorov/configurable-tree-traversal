import { outputValue } from './helpers/rewriteOutput';
import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  GraphWalk,
  ObjectTreeSource,
  TraversalRunnerStatus,
  rewriteObject,
} from '../src';

const constructors = [
  () =>
    new DepthFirstTreeTraversal({ traversableTree: new ObjectTreeSource(1) }),
  () =>
    new BreadthFirstTreeTraversal({ traversableTree: new ObjectTreeSource(1) }),
  () => new DagTraversal({ traversableTree: new ObjectTreeSource(1) }),
];
const asyncConstructors = [
  () =>
    new AsyncDepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource(1),
    }),
  () =>
    new AsyncBreadthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource(1),
    }),
  () => new AsyncDagTraversal({ traversableTree: new ObjectTreeSource(1) }),
];

test.each(constructors)(
  '%p retains undefined patches and rejects malformed patches atomically',
  (Builder) => {
    const traversal = Builder();
    traversal.configure({
      traversableTree: undefined,
      transformChildHints: undefined,
      visitors: undefined,
    } as never);
    expect(() =>
      traversal.configure({ retainOriginalTreeStructure: 'yes' } as never),
    ).toThrow(TypeError);
    expect(() => traversal.configure({ unknownPolicy: true } as never)).toThrow(
      TypeError,
    );
    expect(() =>
      traversal.configure({ [Symbol('unknown')]: true } as never),
    ).toThrow(TypeError);
    expect(traversal.createRunner().run().getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
  },
);

test.each(asyncConstructors)(
  '%p retains async undefined patches and rejects malformed patches atomically',
  async (Builder) => {
    const traversal = Builder();
    traversal.configure({
      traversableTree: undefined,
      concurrency: undefined,
    } as never);
    expect(() => traversal.configure({ concurrency: 0 } as never)).toThrow(
      TypeError,
    );
    expect(() =>
      traversal.configure({ [Symbol('unknown')]: true } as never),
    ).toThrow(TypeError);
    expect((await traversal.createRunner().run()).getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
  },
);

test('nested undefined positions and visitors retain the current settings', () => {
  let calls = 0;
  const traversal = new DepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource(1),
    visitors: {
      POST_ORDER: () => {
        calls++;
      },
    },
  });
  traversal.configure({
    inOrder: { afterChildIndices: undefined },
    visitors: { POST_ORDER: undefined },
  } as never);
  expect(() =>
    traversal.configure({ inOrder: { visitSingleChildParent: null } } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.configure({ visitors: { invalid: () => undefined } } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.configure({ inOrder: { unexpected: true } } as never),
  ).toThrow(TypeError);
  traversal.createRunner().run();
  expect(calls).toBe(1);
});

test('own unknown helper, source, binder and execution fields reject before callbacks', () => {
  let calls = 0;
  expect(() =>
    rewriteObject(1, {
      rewrite: () => {
        calls++;
        return undefined;
      },
      typo: true,
    } as never),
  ).toThrow(TypeError);
  expect(() => new ObjectTreeSource(1, { typo: true } as never)).toThrow(
    TypeError,
  );
  expect(() =>
    ObjectTreeSource.createObjectMutationBinder({ typo: true } as never),
  ).toThrow(TypeError);
  const runner = new DepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource(1),
  }).createRunner();
  expect(() => runner.run({ [Symbol('bad')]: true } as never)).toThrow(
    TypeError,
  );
  expect(() =>
    runner.run({
      visitorPhases: {
        include: [DepthFirstPhase.POST_ORDER],
        [Symbol('bad')]: true,
      },
    } as never),
  ).toThrow(TypeError);
  expect(calls).toBe(0);
});

test('walking rejects unknown nested phase symbols while retaining protocol receivers', () => {
  class Source {
    readonly hydration = 'inlineOrCached';
    count = 0;
    *roots() {
      this.count++;
    }
    *outgoing() {
      /* no links */
    }
  }
  const source = new Source();
  const traversal = new GraphWalk({ source });
  expect(() =>
    traversal.configure({
      visitors: { [Symbol('bad')]: () => undefined },
    } as never),
  ).toThrow(TypeError);
  traversal.configure({ source: undefined, visitors: undefined } as never);
  traversal.createRunner().run();
  expect(source.count).toBe(1);
});

test('visitor registration options and groups reject unknown own fields atomically', () => {
  const traversal = new DepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource(1),
  });
  expect(() =>
    traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => undefined, {
      typo: true,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.setVisitorsFor(DepthFirstPhase.PRE_ORDER, {
      visitor: () => undefined,
      typo: true,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.addVisitorGroupFor(DepthFirstPhase.PRE_ORDER, {
      visitors: [],
      [Symbol('bad')]: true,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => undefined, {
      priority: NaN,
    }),
  ).toThrow(TypeError);
  expect(traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER)).toEqual([]);
});

test('malformed combined rewrite options reject before root mapping', () => {
  let calls = 0;
  expect(() =>
    rewriteObject(1, {
      getRootPropertyFromInputObject: () => {
        calls++;
        return { key: 'root', value: 1 };
      },
      isArray: null,
    } as never),
  ).toThrow(TypeError);
  expect(calls).toBe(0);
});

test('defined malformed tree and DAG fields reject without committing a replacement', () => {
  const tree = new ObjectTreeSource(1);
  const traversal = new DepthFirstTreeTraversal({ traversableTree: tree });
  for (const patch of [
    { transformChildHints: false },
    { retainOriginalTreeStructure: null },
    { traversableTree: null },
    { traversableTree: 1 },
    {
      traversableTree: {
        resolveRoot() {
          return undefined;
        },
      },
    },
    { inOrder: null },
    { visitors: null },
  ])
    expect(() => traversal.configure(patch as never)).toThrow(TypeError);
  const dag = new DagTraversal({ traversableTree: tree });
  for (const patch of [
    { discovery: 'later' },
    { syntheticRoot: null },
    { completedWork: null },
    { completedWork: 1 },
    { completedWork: {} },
    { completedWork: [] },
    { traversableGraph: null },
  ])
    expect(() => dag.configure(patch as never)).toThrow(TypeError);
  expect(traversal.createRunner().run().getStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect(dag.createRunner().run().getStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

test.each(['include', 'exclude'] as const)(
  'execution selectors retain nested undefined %s while resuming',
  (field) => {
    const runner = new DepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource(1),
    }).createRunner();
    const iterator = runner.iterateEvents({
      emitEvents: [DepthFirstPhase.PRE_ORDER],
      visitorPhases: { include: [] },
    });
    expect(iterator.next().done).toBe(false);
    iterator.return();
    runner.run({
      visitorPhases:
        field === 'include' ? { include: undefined } : { exclude: undefined },
    });
    expect(runner.inspect().executionOptions).toEqual({
      emitEvents: [DepthFirstPhase.PRE_ORDER],
      visitorPhases: { include: [] },
    });
  },
);

test('object callbacks, cache protocols, booleans and selector bags validate eagerly', () => {
  for (const options of [
    { rewrite: false },
    { convertRootValue: null },
    { assembleCompositesBeforeRewrite: 1 },
    { assembledMap: null },
    { assembledMap: 0 },
    { getChildrenOfProperty: null },
    { getRootPropertyFromInputObject: 1 },
  ])
    expect(() => rewriteObject(1, options as never)).toThrow(TypeError);
  for (const assembledMap of [
    null,
    {},
    {
      has() {
        return false;
      },
      get() {
        return undefined;
      },
      set: false,
    },
  ]) {
    expect(() =>
      ObjectTreeSource.createObjectMutationBinder({ assembledMap } as never),
    ).toThrow(TypeError);
  }
  for (const options of [
    { ranges: null },
    { ranges: [{}] },
    { ranges: [{ from: 1, through: 2, typo: true }] },
    { indices: [NaN] },
  ]) {
    expect(
      () =>
        new DepthFirstTreeTraversal({
          traversableTree: new ObjectTreeSource(1),
          inOrder: { afterChildIndices: options },
        } as never),
    ).toThrow(TypeError);
  }
});

test('materializer and fragment option bags reject before selector callbacks', async () => {
  const {
    materializeDagInputFromRecords,
    materializeWalkSourceFromRecords,
    materializeWalkSourceFromRecordsAsync,
    mapDagFragmentIds,
    composeDag,
  } = await import('../src');
  let calls = 0;
  const id = () => {
    calls++;
    return 1;
  };
  expect(() =>
    materializeDagInputFromRecords([1], { id, typo: true } as never),
  ).toThrow(TypeError);
  expect(() => materializeDagInputFromRecords([], {} as never)).toThrow(
    TypeError,
  );
  expect(() =>
    materializeWalkSourceFromRecords([1], {
      id,
      outgoing: () => [],
      roots: [],
      [Symbol('bad')]: true,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    materializeWalkSourceFromRecords([], { roots: [] } as never),
  ).toThrow(TypeError);
  await expect(
    materializeWalkSourceFromRecordsAsync([], { roots: [] } as never),
  ).rejects.toThrow(TypeError);
  expect(() =>
    mapDagFragmentIds({} as never, { mapId: null } as never),
  ).toThrow(TypeError);
  expect(() => composeDag([], { typo: true } as never)).toThrow(TypeError);
  expect(calls).toBe(0);
});

test('combined helper preserves an explicitly supplied assembly cache', () => {
  const assembledMap = new Map<object, unknown>();
  expect(
    outputValue(
      rewriteObject(
        { a: 1 },
        { assembledMap, assembleCompositesBeforeRewrite: true },
      ),
    ),
  ).toEqual({
    a: 1,
  });
  expect([...assembledMap.values()]).toContainEqual({ a: 1 });
});

test('supported nonenumerable object-source and registration options apply', () => {
  let reads = 0;
  const sourceOptions = Object.defineProperty(
    {},
    'getRootPropertyFromInputObject',
    {
      get() {
        reads++;
        return () => ({ key: 'custom', value: 2 });
      },
    },
  );
  const traversal = new DepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource(1, sourceOptions),
  });
  const order: string[] = [];
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => {
    order.push('normal');
  });
  traversal.addVisitorFor(
    DepthFirstPhase.PRE_ORDER,
    (vertex) => {
      order.push('high');
      expect(vertex.getData().value).toBe(2);
    },
    Object.defineProperty({}, 'priority', { value: 200 }),
  );
  traversal.createRunner().run();
  expect(reads).toBe(1);
  expect(order).toEqual(['high', 'normal']);
});

test('child selection getters and index elements are captured once before validation', () => {
  let selectionReads = 0;
  let indexReads = 0;
  const indices = Object.defineProperty([0], 0, {
    get() {
      if (++indexReads > 1) throw new Error('index reread');
      return 0;
    },
  });
  const selection = {
    get indices() {
      if (++selectionReads > 1) throw new Error('selection reread');
      return indices;
    },
  };
  const traversal = new DepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource([1, 2]),
    inOrder: { afterChildIndices: selection },
  });
  expect(traversal.createRunner().run().getStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect([selectionReads, indexReads]).toEqual([1, 1]);
});

test('visitor priority validation uses the same captured getter value', () => {
  let reads = 0;
  const traversal = new DepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource(1),
    visitors: {
      PRE_ORDER: {
        visitor: () => undefined,
        get priority() {
          if (++reads > 1) throw new Error('priority reread');
          return 200;
        },
      },
    },
  });
  expect(
    traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER)[0]!.priority,
  ).toBe(200);
  expect(reads).toBe(1);
});

test('structural source receivers can be callable objects with caller state', () => {
  const state = { opaque: true };
  const source = Object.assign(() => undefined, {
    state,
    resolveRoot() {
      expect(this.state).toBe(state);
      return { kind: 'omitted' as const };
    },
    resolveChild() {
      return { kind: 'omitted' as const };
    },
  });
  expect(
    new DepthFirstTreeTraversal({ traversableTree: source })
      .createRunner()
      .run()
      .getStatus(),
  ).toBe(TraversalRunnerStatus.FINISHED);
});
