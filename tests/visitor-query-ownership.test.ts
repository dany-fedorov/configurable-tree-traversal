import type { VertexView } from '../src';
import {
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  DagTraversal,
  AsyncDagTraversal,
  DepthFirstPhase as F,
  BreadthFirstPhase as B,
  DagVisitorPhase as D,
  TraversalVisitorCommandName as C,
} from '../src';

type T = { VertexData: string; VertexHint: string };
type Shape = 'empty' | 'single' | 'flat' | 'grouped';
const traversableTree = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: 'root', $childHints: [] as string[] },
    },
  }),
  resolveChild: () => ({ kind: 'omitted' as const }),
};
const traversableGraph = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexId: 'root', ...traversableTree.resolveRoot().vertex },
  }),
  resolveChild: () => ({
    satisfiesDependencies: true as const,
    kind: 'omitted' as const,
  }),
};

function definitions(calls: string[], shape: Shape) {
  const rewrite = (label: string) => (vertex: VertexView<T>) => {
    calls.push(`${label}:${vertex.getData()}`);
    return {
      commands: [
        {
          commandName: C.REWRITE_VERTEX_DATA as const,
          commandArguments: { newData: label },
        },
      ],
    };
  };
  const high = { visitor: rewrite('high'), priority: 30 };
  const middle = { visitor: rewrite('middle'), priority: 20 };
  const low = { visitor: rewrite('low'), priority: 10 };
  if (shape === 'empty') return [];
  if (shape === 'single') return [high];
  if (shape === 'grouped') {
    return {
      groups: [
        { visitors: [high] },
        {
          commandCommitMode: 'afterGroup' as const,
          visitors: [low, middle],
        },
      ],
    };
  }
  return [
    { ...low, commandCommitMode: 'afterGroup' as const },
    high,
    { ...middle, commandCommitMode: 'afterGroup' as const },
  ];
}

// Each closure retains its concrete builder, visitor signature and phase.
const families = [
  {
    name: 'DepthFirstTreeTraversal',
    create(calls: string[], shape: Shape) {
      const traversal = new DepthFirstTreeTraversal<T>({
        traversableTree,
        visitors: { [F.PRE_ORDER]: definitions(calls, shape) },
      });
      return {
        list: () => traversal.listVisitorsFor(F.PRE_ORDER),
        run: () => traversal.createRunner().run(),
        roundTrip: () =>
          traversal.setVisitorsFor(
            F.PRE_ORDER,
            traversal.listVisitorsFor(F.PRE_ORDER),
          ),
        replace: () =>
          traversal.configure({
            visitors: {
              [F.PRE_ORDER]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.addVisitorFor(F.PRE_ORDER, () => {
            calls.push('added');
          }),
      };
    },
  },
  {
    name: 'AsyncDepthFirstTreeTraversal',
    create(calls: string[], shape: Shape) {
      const traversal = new AsyncDepthFirstTreeTraversal<T>({
        traversableTree,
        visitors: { [F.PRE_ORDER]: definitions(calls, shape) },
      });
      return {
        list: () => traversal.listVisitorsFor(F.PRE_ORDER),
        run: () => traversal.createRunner().run(),
        roundTrip: () =>
          traversal.setVisitorsFor(
            F.PRE_ORDER,
            traversal.listVisitorsFor(F.PRE_ORDER),
          ),
        replace: () =>
          traversal.configure({
            visitors: {
              [F.PRE_ORDER]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.addVisitorFor(F.PRE_ORDER, () => {
            calls.push('added');
          }),
      };
    },
  },
  {
    name: 'BreadthFirstTreeTraversal',
    create(calls: string[], shape: Shape) {
      const traversal = new BreadthFirstTreeTraversal<T>({
        traversableTree,
        visitors: { [B.LEVEL_ORDER]: definitions(calls, shape) },
      });
      return {
        list: () => traversal.listVisitorsFor(B.LEVEL_ORDER),
        run: () => traversal.createRunner().run(),
        roundTrip: () =>
          traversal.setVisitorsFor(
            B.LEVEL_ORDER,
            traversal.listVisitorsFor(B.LEVEL_ORDER),
          ),
        replace: () =>
          traversal.configure({
            visitors: {
              [B.LEVEL_ORDER]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.addVisitorFor(B.LEVEL_ORDER, () => {
            calls.push('added');
          }),
      };
    },
  },
  {
    name: 'AsyncBreadthFirstTreeTraversal',
    create(calls: string[], shape: Shape) {
      const traversal = new AsyncBreadthFirstTreeTraversal<T>({
        traversableTree,
        visitors: { [B.LEVEL_ORDER]: definitions(calls, shape) },
      });
      return {
        list: () => traversal.listVisitorsFor(B.LEVEL_ORDER),
        run: () => traversal.createRunner().run(),
        roundTrip: () =>
          traversal.setVisitorsFor(
            B.LEVEL_ORDER,
            traversal.listVisitorsFor(B.LEVEL_ORDER),
          ),
        replace: () =>
          traversal.configure({
            visitors: {
              [B.LEVEL_ORDER]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.addVisitorFor(B.LEVEL_ORDER, () => {
            calls.push('added');
          }),
      };
    },
  },
  {
    name: 'DagTraversal',
    create(calls: string[], shape: Shape) {
      const traversal = new DagTraversal<T, T, string>({
        traversableGraph,
        visitors: { [D.ON_WORK_READY]: definitions(calls, shape) },
      });
      return {
        list: () => traversal.listVisitorsFor(D.ON_WORK_READY),
        run: () => traversal.createRunner().run(),
        roundTrip: () =>
          traversal.setVisitorsFor(
            D.ON_WORK_READY,
            traversal.listVisitorsFor(D.ON_WORK_READY),
          ),
        replace: () =>
          traversal.configure({
            visitors: {
              [D.ON_WORK_READY]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.addVisitorFor(D.ON_WORK_READY, () => {
            calls.push('added');
          }),
      };
    },
  },
  {
    name: 'AsyncDagTraversal',
    create(calls: string[], shape: Shape) {
      const traversal = new AsyncDagTraversal<T, T, string>({
        traversableGraph,
        visitors: { [D.ON_WORK_READY]: definitions(calls, shape) },
      });
      return {
        list: () => traversal.listVisitorsFor(D.ON_WORK_READY),
        run: () => traversal.createRunner().run(),
        roundTrip: () =>
          traversal.setVisitorsFor(
            D.ON_WORK_READY,
            traversal.listVisitorsFor(D.ON_WORK_READY),
          ),
        replace: () =>
          traversal.configure({
            visitors: {
              [D.ON_WORK_READY]: () => {
                calls.push('configured');
              },
            },
          }),
        add: () =>
          traversal.addVisitorFor(D.ON_WORK_READY, () => {
            calls.push('added');
          }),
      };
    },
  },
] as const;

for (const { name, create } of families) {
  describe(`${name} visitor query ownership`, () => {
    test('editing a listed array preserves future callback order and batching', async () => {
      const calls: string[] = [];
      const traversal = create(calls, 'flat');
      const records = traversal.list();
      records.reverse();
      records.splice(0, 1);
      await traversal.run();
      expect(calls).toEqual(['high:root', 'middle:high', 'low:high']);
      expect(records).toHaveLength(2);
      expect(traversal.list()).toHaveLength(3);
    });

    test.each(['callback', 'priority', 'mode'] as const)(
      'editing a listed %s preserves execution and earlier snapshots',
      async (field) => {
        const calls: string[] = [];
        const traversal = create(calls, 'flat');
        const earlier = traversal.list();
        const records = traversal.list();
        if (field === 'callback')
          records[1]!.visitor = () => {
            calls.push('replacement');
          };
        if (field === 'priority') records[1]!.priority = -100;
        if (field === 'mode') {
          records[1]!.commandCommitMode = 'afterEachVisitor';
          records[1]!.commandCommitMode = 'afterEachVisitor';
        }
        await traversal.run();
        expect(calls).toEqual(['high:root', 'middle:high', 'low:high']);
        const fresh = traversal.list();
        expect(fresh).not.toBe(earlier);
        for (let index = 0; index < fresh.length; index++) {
          expect(fresh[index]).not.toBe(earlier[index]);
          expect(fresh[index]!.visitor).toBe(earlier[index]!.visitor);
        }
        expect(earlier[1]!.priority).toBe(20);
        expect(earlier[1]!.commandCommitMode).toBe('afterGroup');
        expect(earlier[1]!.commandCommitMode).toBe('afterGroup');
        if (field === 'callback')
          expect(fresh[1]!.visitor).not.toBe(records[1]!.visitor);
        expect(fresh[1]!.priority).toBe(20);
        expect(fresh[1]!.commandCommitMode).toBe('afterGroup');
      },
    );

    test('explicit group metadata survives detached list/set round trips and still controls batching', async () => {
      const calls: string[] = [];
      const traversal = create(calls, 'grouped');
      const before = traversal.list();
      traversal.roundTrip();
      const after = traversal.list();
      expect(after).not.toBe(before);
      for (let index = 0; index < after.length; index++) {
        expect(after[index]).not.toBe(before[index]);
        expect(after[index]!.visitor).toBe(before[index]!.visitor);
        expect(after[index]!.visitorGroup).toBe(before[index]!.visitorGroup);
        expect(after[index]!.visitorGroup!.identity).toBe(
          before[index]!.visitorGroup!.identity,
        );
        expect(Object.isFrozen(after[index]!.visitorGroup)).toBe(true);
      }
      expect(after[0]!.visitorGroup).not.toBe(after[1]!.visitorGroup);
      expect(after[1]!.visitorGroup).toBe(after[2]!.visitorGroup);
      expect(after[1]!.visitorGroup!.explicit).toBe(true);
      after[1]!.commandCommitMode = 'afterEachVisitor';
      after[1]!.visitor = () => {
        calls.push('replacement');
      };
      await traversal.run();
      expect(calls).toEqual(['high:root', 'middle:high', 'low:high']);
    });

    test('empty and single-record snapshots stay independent through validated updates', async () => {
      const calls: string[] = [];
      const empty = create(calls, 'empty');
      const emptySnapshot = empty.list();
      expect(emptySnapshot).not.toBe(empty.list());
      empty.add();
      expect(emptySnapshot).toEqual([]);
      await empty.run();
      expect(calls).toEqual(['added']);
      calls.length = 0;
      const single = create(calls, 'single');
      const earlier = single.list();
      single.list().splice(0, 1);
      await single.run();
      expect(calls).toEqual(['high:root']);
      calls.length = 0;
      single.replace();
      await single.run();
      expect(calls).toEqual(['configured']);
      expect(earlier).toHaveLength(1);
      expect(single.list()[0]!.visitor).not.toBe(earlier[0]!.visitor);
    });
  });
}
