import {
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  DagTraversal,
  AsyncDagTraversal,
  DepthFirstTraversalOrder as F,
  BreadthFirstTraversalOrder as B,
  DagTraversalOrder as D,
  traverseDepthFirst,
  traverseDepthFirstAsync,
  traverseBreadthFirst,
  traverseBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';

const traversableTree = {
  makeRoot: () => ({
    vertexContent: { $data: 'root', $childHints: [] as string[] },
  }),
  makeVertex: () => ({ vertexContent: null }),
};
const traversableGraph = {
  makeRoot: () => ({
    vertexId: 'root',
    vertexContent: { $data: 'root', $childHints: [] as string[] },
  }),
  makeVertex: () => ({ vertexContent: null }),
};
const families = [
  [DepthFirstTraversal, F.PRE_ORDER, { traversableTree }, traverseDepthFirst],
  [
    AsyncDepthFirstTraversal,
    F.PRE_ORDER,
    { traversableTree },
    traverseDepthFirstAsync,
  ],
  [
    BreadthFirstTraversal,
    B.LEVEL_ORDER,
    { traversableTree },
    traverseBreadthFirst,
  ],
  [
    AsyncBreadthFirstTraversal,
    B.LEVEL_ORDER,
    { traversableTree },
    traverseBreadthFirstAsync,
  ],
  [DagTraversal, D.ON_READY, { traversableGraph }, traverseDag],
  [AsyncDagTraversal, D.ON_READY, { traversableGraph }, traverseDagAsync],
] as const;

// Each public family must normalize the same caller-owned input shapes.
for (const [Ctor, order, source, helper] of families) {
  describe(Ctor.name, () => {
    for (const shape of [
      'callback',
      'definition',
      'array',
      'groups',
    ] as const) {
      test(`accepts ${shape} at constructor, configure, replacement and helper boundaries`, async () => {
        const seen: string[] = [];
        const callback = () => {
          seen.push('called');
        };
        const input =
          shape === 'callback'
            ? callback
            : shape === 'definition'
            ? { visitor: callback }
            : shape === 'array'
            ? [callback, { visitor: callback }]
            : { groups: [{ visitors: [callback, { visitor: callback }] }] };
        // Runtime matrix intentionally erases family-specific overloads; the compiler fixture covers them.
        const Constructor = Ctor as unknown as new (input: unknown) => {
          configure(input: unknown): unknown;
          setVisitorsFor(order: string, input: unknown): unknown;
          makeRunner(): { run(): unknown };
        };
        const config = { ...source, visitors: { [order]: input } };
        await new Constructor(config).makeRunner().run();
        const configured = new Constructor(source);
        configured.configure(config);
        await configured.makeRunner().run();
        const replaced = new Constructor(source);
        replaced.setVisitorsFor(order, input);
        await replaced.makeRunner().run();
        await (helper as unknown as (input: unknown) => unknown)(config);
        expect(seen).toEqual(
          Array(shape === 'array' || shape === 'groups' ? 8 : 4).fill('called'),
        );
      });
    }
  });
}

for (const [Ctor, order, source] of families) {
  test(`${Ctor.name}: grouped append and list/set preserve snapshots and empty groups are inert`, async () => {
    const calls: string[] = [];
    const Constructor = Ctor as unknown as new (input: unknown) => {
      addVisitorFor(
        order: string,
        callback: () => void,
        options?: { priority: number },
      ): unknown;
      addVisitorGroupFor(order: string, input: unknown): unknown;
      setVisitorsFor(order: string, input: unknown): unknown;
      listVisitorsFor(order: string): unknown;
      makeRunner(): { run(): unknown };
    };
    const t = new Constructor(source);
    t.addVisitorFor(
      order,
      () => {
        calls.push('low');
      },
      { priority: 1 },
    );
    t.addVisitorGroupFor(order, {
      visitors: [],
      commandCommitMode: 'afterGroup',
    });
    t.setVisitorsFor(order, t.listVisitorsFor(order));
    t.addVisitorFor(
      order,
      () => {
        calls.push('high');
      },
      { priority: 1000 },
    );
    t.addVisitorGroupFor(order, {
      visitors: [
        () => {
          calls.push('group');
        },
      ],
    });
    t.addVisitorFor(
      order,
      () => {
        calls.push('tail');
      },
      { priority: 9999 },
    );
    t.setVisitorsFor(order, t.listVisitorsFor(order));
    const snapshot = t.makeRunner();
    t.setVisitorsFor(order, () => {
      calls.push('replacement');
    });
    await snapshot.run();
    expect(calls).toEqual(['high', 'low', 'group', 'tail']);
    await t.makeRunner().run();
    expect(calls.slice(-1)).toEqual(['replacement']);
    expect(() =>
      t.addVisitorGroupFor(order, {
        visitors: [],
        commandCommitMode: 'invalid',
      }),
    ).toThrow(TypeError);
  });
}
