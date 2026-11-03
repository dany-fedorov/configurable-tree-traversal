import {
  AsyncDepthFirstTreeTraversalBuilder,
  AsyncGraphWalkBuilder,
  DagTraversalBuilder,
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  GraphWalkBuilder,
  ObjectPropertyTreeSource,
  validateAndCreateDagFragment,
  mapDagFragmentIds,
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecords,
  materializeDagInputFromRootRecordsAsync,
  materializeGraphWalkSourceFromVertexRecords,
  materializeSynchronousGraphWalkSourceFromAsyncRecords,
  type DagRecordSelectors,
} from '../src';

function fields<T extends object>(input: T, inherited: boolean): T {
  return inherited ? Object.create(input) : input;
}

type DagMaterializerSelectors = DagRecordSelectors<number, number> &
  import('../src').DagRootRecordSelectors<number, number>;
const dagFactories = [
  [
    (selectors: DagMaterializerSelectors) =>
      materializeMultiEntryDagInputFromRecordCatalog([1, 2], selectors),
    'selectStructuralChildVertexIds',
  ],
  [
    (selectors: DagMaterializerSelectors) =>
      materializeMultiEntryDagInputFromRecordCatalogAsync([1, 2], selectors),
    'selectStructuralChildVertexIds',
  ],
  [
    (selectors: DagMaterializerSelectors) =>
      materializeDagInputFromRootRecords([1], selectors),
    'selectStructuralChildRecords',
  ],
  [
    (selectors: DagMaterializerSelectors) =>
      materializeDagInputFromRootRecordsAsync([1], selectors),
    'selectStructuralChildRecords',
  ],
] as const;
for (const [materialize, childSelector] of dagFactories)
  test.each([false, true])(
    'DAG materializers capture selector fields once and preserve receiver (inherited=%s)',
    async (inherited) => {
      const reads = { id: 0, children: 0, work: 0, completion: 0 };
      const selectors: DagMaterializerSelectors = fields(
        {
          get selectVertexId() {
            if (++reads.id > 1) throw new Error('id reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(selectors);
              return item;
            };
          },
          get [childSelector]() {
            if (++reads.children > 1) throw new Error('children reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(selectors);
              return item === 1 ? [2] : [];
            };
          },
          get selectWorkPrerequisiteVertexIds() {
            if (++reads.work > 1) throw new Error('work reread');
            return function (this: unknown) {
              expect(this).toBe(selectors);
              return [];
            };
          },
          get selectSubgraphCompletionPrerequisiteVertexIds() {
            if (++reads.completion > 1) throw new Error('completion reread');
            return function (this: unknown) {
              expect(this).toBe(selectors);
              return [];
            };
          },
        },
        inherited,
      );
      const input = await materialize(selectors);
      const runner = new DagTraversalBuilder(input)
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      expect(
        runner
          .getLiveResolvedGraphView()
          .getVertexHandleByIdOrNull(2)!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe(2);
      expect(reads).toEqual({ id: 1, children: 1, work: 1, completion: 1 });
    },
  );

for (const asyncMode of [false, true])
  test.each([false, true])(
    'walking materializers capture callbacks and roots once (inherited=%s)',
    async (inherited) => {
      const reads = { id: 0, outgoing: 0, roots: 0 };
      const options = fields(
        {
          get getVertexId() {
            if (++reads.id > 1) throw new Error('id reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(options);
              return item;
            };
          },
          get enumerateOutgoingLinks() {
            if (++reads.outgoing > 1) throw new Error('outgoing reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(options);
              return item === 1 ? [{ toVertexId: 2, edgeData: 'edge' }] : [];
            };
          },
          get rootVertexIds() {
            if (++reads.roots > 1) throw new Error('roots reread');
            return [1];
          },
        },
        inherited,
      );
      const source = await (asyncMode
        ? materializeSynchronousGraphWalkSourceFromAsyncRecords([1, 2], options)
        : materializeGraphWalkSourceFromVertexRecords([1, 2], options));
      const events = [
        ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
          .createIndependentRunnerFromCurrentOptions()
          .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      ];
      expect(
        events.map((event) =>
          event.eventKind === 'vertexOccurrence'
            ? event.vertex.vertexData
            : null,
        ),
      ).toEqual([1, 2]);
      expect(reads).toEqual({ id: 1, outgoing: 1, roots: 1 });
    },
  );

test.each([false, true])(
  'fragment mapId capture preserves its original receiver (inherited=%s)',
  (inherited) => {
    const fragment = validateAndCreateDagFragment(
      {
        vertexDeclarations: [1, 2].map((vertexId) => ({
          vertexId,
          data: vertexId,
          childDiscoverySlots: [],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        })),
        omittedVertexIds: [],
        entry: {
          kind: 'roots',
          entryDiscoverySlots: [1, 2].map((vertexId) => ({
            kind: 'vertex' as const,
            vertexId,
          })),
        },
      },
      { first: 1, second: 2 },
    );
    let reads = 0;
    const options = fields(
      {
        get mapId() {
          if (++reads > 1) throw new Error('mapId reread');
          return function (this: unknown, id: number) {
            expect(this).toBe(options);
            return `mapped:${id}`;
          };
        },
      },
      inherited,
    );
    const instance = mapDagFragmentIds(fragment, options);
    expect(instance.vertexIdsByPortName).toEqual({
      first: 'mapped:1',
      second: 'mapped:2',
    });
    expect(reads).toBe(1);
  },
);

for (const asyncMode of [false, true])
  for (const grouped of [false, true])
    test.each([false, true])(
      'group wrappers and member fields capture once, preserving list/set metadata (inherited=%s)',
      async (inherited) => {
        const reads = {
          groups: 0,
          visitors: 0,
          mode: 0,
          callback: 0,
          priority: 0,
        };
        let calls = 0;
        const member = fields(
          {
            get visitor() {
              if (++reads.callback > 1) throw new Error('visitor reread');
              return () => {
                calls++;
              };
            },
            get descendingExecutionPriorityWithinGroup() {
              if (++reads.priority > 1) throw new Error('priority reread');
              return 200;
            },
          },
          inherited,
        );
        const group = fields(
          {
            get visitors() {
              if (++reads.visitors > 1) throw new Error('visitors reread');
              return [member];
            },
            get visitorCommandCommitTiming() {
              if (++reads.mode > 1) throw new Error('mode reread');
              return 'afterContiguousVisitorBatch' as const;
            },
          },
          inherited,
        );
        const traversal = asyncMode
          ? new AsyncDepthFirstTreeTraversalBuilder({
              treeDiscoverySource: new ObjectPropertyTreeSource(1),
            })
          : new DepthFirstTreeTraversalBuilder({
              treeDiscoverySource: new ObjectPropertyTreeSource(1),
            });
        if (grouped) {
          const wrapper = fields(
            {
              get groups() {
                if (++reads.groups > 1) throw new Error('groups reread');
                return [group];
              },
            },
            inherited,
          );
          traversal.replaceVisitorDefinitionsForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            wrapper,
          );
        } else
          traversal.appendVisitorGroupForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            group,
          );
        const records = traversal.getDetachedVisitorRegistrationRecordsForPhase(
          DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        );
        const metadata = records[0]!.visitorGroup;
        if (traversal instanceof AsyncDepthFirstTreeTraversalBuilder)
          traversal.replaceVisitorDefinitionsForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            ),
          );
        else
          traversal.replaceVisitorDefinitionsForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            traversal.getDetachedVisitorRegistrationRecordsForPhase(
              DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            ),
          );
        expect(
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
          )[0]!.visitorGroup,
        ).toBe(metadata);
        expect(
          traversal.getDetachedVisitorRegistrationRecordsForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
          )[0]!.phaseRegistrationInsertionIndex,
        ).toBe(0);
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
        expect(calls).toBe(1);
        expect(reads).toEqual({
          groups: grouped ? 1 : 0,
          visitors: 1,
          mode: 1,
          callback: 1,
          priority: 1,
        });
      },
    );

test.each([false, true])(
  'walking accepts callable source receivers with inherited methods and caller state (async=%s)',
  async (asyncMode) => {
    const calls: string[] = [];
    class Source extends Function {
      readonly vertexResolutionMode = 'resolverWithOptionalInlineResolution';
      state = { data: 42 };
      enumerateRootTargets() {
        expect(this).toBe(source);
        calls.push('roots');
        return [{ vertexId: 'root' }];
      }
      resolveVertexDataById() {
        expect(this).toBe(source);
        calls.push('resolve');
        return { kind: 'found' as const, vertexData: this.state.data };
      }
      enumerateOutgoingLinks() {
        expect(this).toBe(source);
        calls.push('outgoing');
        return [];
      }
    }
    const source = new Source();
    const runner = asyncMode
      ? new AsyncGraphWalkBuilder({
          graphWalkDiscoverySource: source,
        }).createIndependentRunnerFromCurrentOptions()
      : new GraphWalkBuilder({
          graphWalkDiscoverySource: source,
        }).createIndependentRunnerFromCurrentOptions();
    expect(typeof source).toBe('function');
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toEqual(['roots', 'resolve', 'outgoing']);
    expect(source.state.data).toBe(42);
  },
);
