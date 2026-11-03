import { outputValue } from './helpers/rewriteOutput';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  GraphWalkBuilder,
  ObjectPropertyTreeSource,
  TraversalRunnerStatus,
  rewriteObject,
} from '../src';

const constructors = [
  () =>
    new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }),
  () =>
    new BreadthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }),
  () =>
    new DagTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }),
];
const asyncConstructors = [
  () =>
    new AsyncDepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }),
  () =>
    new AsyncBreadthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }),
  () =>
    new AsyncDagTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }),
];

test.each(constructors)(
  '%p retains undefined patches and rejects malformed patches atomically',
  (Builder) => {
    const traversal = Builder();
    traversal.patchOptionsForFutureRunners({
      treeDiscoverySource: undefined,
      transformChildHintsBeforeResolution: undefined,
      visitors: undefined,
    } as never);
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        retainDiscoveredTreeBeforeVisitorCommands: 'yes',
      } as never),
    ).toThrow(TypeError);
    expect(() =>
      traversal.patchOptionsForFutureRunners({ unknownPolicy: true } as never),
    ).toThrow(TypeError);
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        [Symbol('unknown')]: true,
      } as never),
    ).toThrow(TypeError);
    expect(
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal()
        .getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
  },
);

test.each(asyncConstructors)(
  '%p retains async undefined patches and rejects malformed patches atomically',
  async (Builder) => {
    const traversal = Builder();
    traversal.patchOptionsForFutureRunners({
      treeDiscoverySource: undefined,
      maxConcurrentCallbackInvocations: undefined,
    } as never);
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        maxConcurrentCallbackInvocations: 0,
      } as never),
    ).toThrow(TypeError);
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        [Symbol('unknown')]: true,
      } as never),
    ).toThrow(TypeError);
    expect(
      (
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal()
      ).getTraversalLifecycleStatus(),
    ).toBe(TraversalRunnerStatus.FINISHED);
  },
);

test('nested undefined positions and visitors retain the current settings', () => {
  let calls = 0;
  const traversal = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource(1),
    visitors: {
      AFTER_CHILD_SUBTREES: () => {
        calls++;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    childBoundaryVisits: { visitAfterChildIndices: undefined },
    visitors: { AFTER_CHILD_SUBTREES: undefined },
  } as never);
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      childBoundaryVisits: { alsoVisitAfterOnlyChild: null },
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      visitors: { invalid: () => undefined },
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      childBoundaryVisits: { unexpected: true },
    } as never),
  ).toThrow(TypeError);
  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
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
  expect(
    () => new ObjectPropertyTreeSource(1, { typo: true } as never),
  ).toThrow(TypeError);
  expect(() =>
    ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder({
      typo: true,
    } as never),
  ).toThrow(TypeError);
  const runner = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource(1),
  }).createIndependentRunnerFromCurrentOptions();
  expect(() =>
    runner.runUntilSuspendedOrTerminal({ [Symbol('bad')]: true } as never),
  ).toThrow(TypeError);
  expect(() =>
    runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: {
        include: [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES],
        [Symbol('bad')]: true,
      },
    } as never),
  ).toThrow(TypeError);
  expect(calls).toBe(0);
});

test('walking rejects unknown nested phase symbols while retaining protocol receivers', () => {
  class Source {
    readonly vertexResolutionMode =
      'inlineResolutionOrPreviouslyAdmittedVertex';
    count = 0;
    *enumerateRootTargets() {
      this.count++;
    }
    *enumerateOutgoingLinks() {
      /* no links */
    }
  }
  const source = new Source();
  const traversal = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      visitorsByObservationKind: { [Symbol('bad')]: () => undefined },
    } as never),
  ).toThrow(TypeError);
  traversal.patchOptionsForFutureRunners({
    graphWalkDiscoverySource: undefined,
    visitorsByObservationKind: undefined,
  } as never);
  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(source.count).toBe(1);
});

test('visitor registration options and groups reject unknown own fields atomically', () => {
  const traversal = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource(1),
  });
  expect(() =>
    traversal.registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      () => undefined,
      {
        typo: true,
      } as never,
    ),
  ).toThrow(TypeError);
  expect(() =>
    traversal.replaceVisitorDefinitionsForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      {
        visitor: () => undefined,
        typo: true,
      } as never,
    ),
  ).toThrow(TypeError);
  expect(() =>
    traversal.appendVisitorGroupForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      {
        visitors: [],
        [Symbol('bad')]: true,
      } as never,
    ),
  ).toThrow(TypeError);
  expect(() =>
    traversal.registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      () => undefined,
      {
        descendingExecutionPriorityWithinGroup: NaN,
      },
    ),
  ).toThrow(TypeError);
  expect(
    traversal.getDetachedVisitorRegistrationRecordsForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    ),
  ).toEqual([]);
});

test('malformed combined rewrite options reject before root mapping', () => {
  let calls = 0;
  expect(() =>
    rewriteObject(1, {
      mapInputToRootProperty: () => {
        calls++;
        return { propertyKey: 'root', propertyValue: 1 };
      },
      isArray: null,
    } as never),
  ).toThrow(TypeError);
  expect(calls).toBe(0);
});

test('defined malformed tree and DAG fields reject without committing a replacement', () => {
  const tree = new ObjectPropertyTreeSource(1);
  const traversal = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: tree,
  });
  for (const patch of [
    { transformChildHintsBeforeResolution: false },
    { retainDiscoveredTreeBeforeVisitorCommands: null },
    { treeDiscoverySource: null },
    { treeDiscoverySource: 1 },
    {
      treeDiscoverySource: {
        resolveRootVertex() {
          return undefined;
        },
      },
    },
    { childBoundaryVisits: null },
    { visitors: null },
  ])
    expect(() =>
      traversal.patchOptionsForFutureRunners(patch as never),
    ).toThrow(TypeError);
  const dag = new DagTraversalBuilder({ treeDiscoverySource: tree });
  for (const patch of [
    { discoveryTiming: 'later' },
    { sourceRootIsHiddenEntryHolder: null },
    { acceptedCompletedWorkVertexIds: null },
    { acceptedCompletedWorkVertexIds: 1 },
    { acceptedCompletedWorkVertexIds: {} },
    { acceptedCompletedWorkVertexIds: [] },
    { dagDiscoverySource: null },
  ])
    expect(() => dag.patchOptionsForFutureRunners(patch as never)).toThrow(
      TypeError,
    );
  expect(
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.FINISHED);
  expect(
    dag
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.FINISHED);
});

test.each(['include', 'exclude'] as const)(
  'execution selectors retain nested undefined %s while resuming',
  (field) => {
    const runner = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource(1),
    }).createIndependentRunnerFromCurrentOptions();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
        admittedVisitorCallbackPhases: { include: [] },
      });
    expect(iterator.next().done).toBe(false);
    iterator.return();
    runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases:
        field === 'include' ? { include: undefined } : { exclude: undefined },
    });
    expect(runner.captureExecutionSnapshot().executionOptions).toEqual({
      deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
      admittedVisitorCallbackPhases: { include: [] },
    });
  },
);

test('object callbacks, cache protocols, booleans and selector bags validate eagerly', () => {
  for (const options of [
    { rewrite: false },
    { convertPresentRootOutputValue: null },
    { includeAssembledValueInRewriteInput: 1 },
    { assemblyCache: null },
    { assemblyCache: 0 },
    { enumerateChildPropertyHints: null },
    { mapInputToRootProperty: 1 },
  ])
    expect(() => rewriteObject(1, options as never)).toThrow(TypeError);
  for (const assemblyCache of [
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
      ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder({
        assemblyCache,
      } as never),
    ).toThrow(TypeError);
  }
  for (const options of [
    { ranges: null },
    { ranges: [{}] },
    { ranges: [{ fromInclusive: 1, throughInclusive: 2, typo: true }] },
    { indices: [NaN] },
  ]) {
    expect(
      () =>
        new DepthFirstTreeTraversalBuilder({
          treeDiscoverySource: new ObjectPropertyTreeSource(1),
          childBoundaryVisits: { visitAfterChildIndices: options },
        } as never),
    ).toThrow(TypeError);
  }
});

test('materializer and fragment option bags reject before selector callbacks', async () => {
  const {
    materializeMultiEntryDagInputFromRecordCatalog,
    materializeGraphWalkSourceFromVertexRecords,
    materializeSynchronousGraphWalkSourceFromAsyncRecords,
    mapDagFragmentIds,
    composeAndValidateDagFragments,
  } = await import('../src');
  let calls = 0;
  const id = () => {
    calls++;
    return 1;
  };
  expect(() =>
    materializeMultiEntryDagInputFromRecordCatalog([1], {
      id,
      typo: true,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    materializeMultiEntryDagInputFromRecordCatalog([], {} as never),
  ).toThrow(TypeError);
  expect(() =>
    materializeGraphWalkSourceFromVertexRecords([1], {
      id,
      outgoing: () => [],
      roots: [],
      [Symbol('bad')]: true,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    materializeGraphWalkSourceFromVertexRecords([], { roots: [] } as never),
  ).toThrow(TypeError);
  await expect(
    materializeSynchronousGraphWalkSourceFromAsyncRecords([], {
      roots: [],
    } as never),
  ).rejects.toThrow(TypeError);
  expect(() =>
    mapDagFragmentIds({} as never, { mapId: null } as never),
  ).toThrow(TypeError);
  expect(() =>
    composeAndValidateDagFragments([], { typo: true } as never),
  ).toThrow(TypeError);
  expect(calls).toBe(0);
});

test('combined helper preserves an explicitly supplied assembly cache', () => {
  const values = new Map<object, unknown>();
  const assemblyCache = {
    hasAssembledValueForVertex: (vertex: object) => values.has(vertex),
    getAssembledValueForVertex: (vertex: object) => values.get(vertex),
    setAssembledValueForVertex: (vertex: object, value: unknown) => {
      values.set(vertex, value);
    },
  };
  expect(
    outputValue(
      rewriteObject(
        { a: 1 },
        { assemblyCache, includeAssembledValueInRewriteInput: true },
      ),
    ),
  ).toEqual({
    a: 1,
  });
  expect([...values.values()]).toContainEqual({ a: 1 });
});

test('supported nonenumerable object-source and registration options apply', () => {
  let reads = 0;
  const sourceOptions = Object.defineProperty({}, 'mapInputToRootProperty', {
    get() {
      reads++;
      return () => ({ propertyKey: 'custom', propertyValue: 2 });
    },
  });
  const traversal = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource(1, sourceOptions),
  });
  const order: string[] = [];
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    () => {
      order.push('normal');
    },
  );
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    (vertex) => {
      order.push('high');
      expect(vertex.getVertexData().propertyValue).toBe(2);
    },
    Object.defineProperty({}, 'descendingExecutionPriorityWithinGroup', {
      value: 200,
    }),
  );
  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
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
  const traversal = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource([1, 2]),
    childBoundaryVisits: { visitAfterChildIndices: selection },
  });
  expect(
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.FINISHED);
  expect([selectionReads, indexReads]).toEqual([1, 1]);
});

test('visitor priority validation uses the same captured getter value', () => {
  let reads = 0;
  const traversal = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource(1),
    visitors: {
      BEFORE_CHILD_EXPANSION: {
        visitor: () => undefined,
        get descendingExecutionPriorityWithinGroup() {
          if (++reads > 1) throw new Error('priority reread');
          return 200;
        },
      },
    },
  });
  expect(
    traversal.getDetachedVisitorRegistrationRecordsForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    )[0]!.descendingExecutionPriorityWithinGroup,
  ).toBe(200);
  expect(reads).toBe(1);
});

test('structural source receivers can be callable objects with caller state', () => {
  const state = { opaque: true };
  const source = Object.assign(() => undefined, {
    state,
    resolveRootVertex() {
      expect(this.state).toBe(state);
      return { kind: 'vertexIntentionallyOmitted' as const };
    },
    resolveChildVertexFromHint() {
      return { kind: 'vertexIntentionallyOmitted' as const };
    },
  });
  expect(
    new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getTraversalLifecycleStatus(),
  ).toBe(TraversalRunnerStatus.FINISHED);
});

test.each([
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
])('%p names the child-hint transformer in validation errors', (Builder) => {
  const traversal = new Builder({
    treeDiscoverySource: new ObjectPropertyTreeSource(1),
  });
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      transformChildHintsBeforeResolution: false,
    } as never),
  ).toThrow(
    new TypeError(
      'transformChildHintsBeforeResolution must be a function or null',
    ),
  );
});
