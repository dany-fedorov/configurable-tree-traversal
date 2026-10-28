import {
  AsyncDepthFirstTreeTraversal,
  AsyncGraphWalk,
  DagTraversal,
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  GraphWalk,
  ObjectTreeSource,
  defineDagFragment,
  instantiateDagFragment,
  materializeDagInputFromRecords,
  materializeDagInputFromRecordsAsync,
  materializeDagInputFromRoots,
  materializeDagInputFromRootsAsync,
  materializeWalkSourceFromRecords,
  materializeWalkSourceFromRecordsAsync,
  type DagRecordSelectors,
} from '../src';

function fields<T extends object>(input: T, inherited: boolean): T {
  return inherited ? Object.create(input) : input;
}

const dagFactories = [
  (selectors: DagRecordSelectors<number, number>) =>
    materializeDagInputFromRecords([1, 2], selectors),
  (selectors: DagRecordSelectors<number, number>) =>
    materializeDagInputFromRecordsAsync([1, 2], selectors),
  (selectors: DagRecordSelectors<number, number>) =>
    materializeDagInputFromRoots([1], selectors),
  (selectors: DagRecordSelectors<number, number>) =>
    materializeDagInputFromRootsAsync([1], selectors),
];
for (const materialize of dagFactories)
  test.each([false, true])(
    'DAG materializers capture selector fields once and preserve receiver (inherited=%s)',
    async (inherited) => {
      const reads = { id: 0, children: 0, work: 0, completion: 0 };
      const selectors: DagRecordSelectors<number, number> = fields(
        {
          get id() {
            if (++reads.id > 1) throw new Error('id reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(selectors);
              return item;
            };
          },
          get children() {
            if (++reads.children > 1) throw new Error('children reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(selectors);
              return item === 1 ? [2] : [];
            };
          },
          get dependsOnWork() {
            if (++reads.work > 1) throw new Error('work reread');
            return function (this: unknown) {
              expect(this).toBe(selectors);
              return [];
            };
          },
          get dependsOnSubgraphCompletion() {
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
      const runner = new DagTraversal(input).createRunner().run();
      expect(
        runner.getResolvedGraph().getVertexRefById(2)!.getValue().getData(),
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
          get id() {
            if (++reads.id > 1) throw new Error('id reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(options);
              return item;
            };
          },
          get outgoing() {
            if (++reads.outgoing > 1) throw new Error('outgoing reread');
            return function (this: unknown, item: number) {
              expect(this).toBe(options);
              return item === 1 ? [{ to: 2, data: 'edge' }] : [];
            };
          },
          get roots() {
            if (++reads.roots > 1) throw new Error('roots reread');
            return [1];
          },
        },
        inherited,
      );
      const source = await (asyncMode
        ? materializeWalkSourceFromRecordsAsync([1, 2], options)
        : materializeWalkSourceFromRecords([1, 2], options));
      const events = [
        ...new GraphWalk({ source }).createRunner().iterateEvents(),
      ];
      expect(
        events.map((event) =>
          event.kind === 'vertex' ? event.vertex.data : null,
        ),
      ).toEqual([1, 2]);
      expect(reads).toEqual({ id: 1, outgoing: 1, roots: 1 });
    },
  );

test.each([false, true])(
  'fragment mapId capture preserves its original receiver (inherited=%s)',
  (inherited) => {
    const fragment = defineDagFragment(
      {
        vertices: [1, 2].map((vertexId) => ({
          vertexId,
          data: vertexId,
          slots: [],
          dependsOnWork: [],
          dependsOnSubgraphCompletion: [],
        })),
        omittedIds: [],
        entry: {
          kind: 'roots',
          slots: [1, 2].map((vertexId) => ({
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
    const instance = instantiateDagFragment(fragment, options);
    expect(instance.ports).toEqual({ first: 'mapped:1', second: 'mapped:2' });
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
            get priority() {
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
            get commandCommitMode() {
              if (++reads.mode > 1) throw new Error('mode reread');
              return 'afterGroup' as const;
            },
          },
          inherited,
        );
        const traversal = asyncMode
          ? new AsyncDepthFirstTreeTraversal({
              traversableTree: new ObjectTreeSource(1),
            })
          : new DepthFirstTreeTraversal({
              traversableTree: new ObjectTreeSource(1),
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
          traversal.setVisitorsFor(DepthFirstPhase.PRE_ORDER, wrapper);
        } else traversal.addVisitorGroupFor(DepthFirstPhase.PRE_ORDER, group);
        const records = traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER);
        const metadata = records[0]!.visitorGroup;
        if (traversal instanceof AsyncDepthFirstTreeTraversal)
          traversal.setVisitorsFor(
            DepthFirstPhase.PRE_ORDER,
            traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER),
          );
        else
          traversal.setVisitorsFor(
            DepthFirstPhase.PRE_ORDER,
            traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER),
          );
        expect(
          traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER)[0]!.visitorGroup,
        ).toBe(metadata);
        expect(
          traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER)[0]!.addedIndex,
        ).toBe(0);
        await traversal.createRunner().run();
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
      state = { data: 42 };
      roots() {
        expect(this).toBe(source);
        calls.push('roots');
        return [{ vertexId: 'root' }];
      }
      resolveVertex() {
        expect(this).toBe(source);
        calls.push('resolve');
        return { kind: 'found' as const, data: this.state.data };
      }
      outgoing() {
        expect(this).toBe(source);
        calls.push('outgoing');
        return [];
      }
    }
    const source = new Source();
    const runner = asyncMode
      ? new AsyncGraphWalk({ source }).createRunner()
      : new GraphWalk({ source }).createRunner();
    expect(typeof source).toBe('function');
    await runner.run();
    expect(calls).toEqual(['roots', 'resolve', 'outgoing']);
    expect(source.state.data).toBe(42);
  },
);
