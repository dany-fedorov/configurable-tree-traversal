import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  DagTraversalOrder,
} from '../src/traversals/dag-traversal';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<string, string>;
const graph = {
  resolveRoot: () => ({
    vertexId: 'A',
    vertexContent: { $data: 'A', $childHints: ['B'] },
  }),
  resolveChild: () => ({
    vertexId: 'B',
    dependsOn: ['A'],
    vertexContent: { $data: 'B', $childHints: [] },
  }),
};
type Policy = 'externalSettlement' | 'visitorReturn';

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const entry of ['constructor', 'configure'] as const) {
    test.each(['visitorReturn', 'invalid'])(
      `${Constructor.name} ${entry} captures ownership before a later %s value`,
      async (later) => {
        let reads = 0;
        const input = {
          traversableGraph: graph,
          discovery: 'eager' as const,
          get workCompletion(): Policy {
            return (++reads === 1 ? 'externalSettlement' : later) as Policy;
          },
        };
        const traversal =
          entry === 'constructor'
            ? new Constructor<G>(input)
            : new Constructor<G>({ traversableGraph: graph }).configure(input);
        const runner = traversal.createRunner();
        await runner.run();
        expect(runner.summary().completedWorkIds).toEqual([]);
        expect(runner.summary().deferredIds).toEqual(['A']);
        expect(runner.summary().vertices.get('B')!.work).toBe('pending');
        expect(traversal.icfg.workCompletion).toBe('externalSettlement');
        expect(reads).toBe(1);
      },
    );

    test(`${Constructor.name} ${entry} rejects the first invalid policy without consuming a later valid value`, () => {
      let reads = 0;
      const input = {
        traversableGraph: graph,
        get workCompletion(): Policy {
          return (++reads === 1 ? 'invalid' : 'visitorReturn') as Policy;
        },
      };
      const traversal = new Constructor<G>({
        traversableGraph: graph,
        workCompletion: 'externalSettlement',
      });
      const before = traversal.icfg;
      const visitors = traversal.visitors;
      expect(() =>
        entry === 'constructor'
          ? new Constructor<G>(input)
          : traversal.configure(input),
      ).toThrow(TypeError);
      expect(reads).toBe(1);
      expect(traversal.icfg).toBe(before);
      expect(traversal.visitors).toBe(visitors);
    });

    test.each([undefined, null, { reason: 'getter failure' }])(
      `${Constructor.name} ${entry} preserves exact getter error %p`,
      (error) => {
        const traversal = new Constructor<G>({
          traversableGraph: graph,
          workCompletion: 'externalSettlement',
        });
        traversal.addVisitorFor(DagTraversalOrder.ON_READY, () => undefined);
        const before = traversal.icfg;
        const visitors = traversal.visitors;
        const input = {
          traversableGraph: graph,
          discovery: 'eager' as const,
          get workCompletion(): Policy {
            throw error;
          },
        };
        let caught = false;
        try {
          if (entry === 'constructor') new Constructor<G>(input);
          else traversal.configure(input);
        } catch (actual) {
          caught = true;
          expect(actual).toBe(error);
        }
        expect(caught).toBe(true);
        expect(traversal.icfg).toBe(before);
        expect(traversal.visitors).toBe(visitors);
      },
    );
  }

  test(`${Constructor.name} omission retains external ownership while present undefined restores visitor completion`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: graph,
      workCompletion: 'externalSettlement',
    });
    traversal.configure({});
    const external = traversal.createRunner();
    await external.run();
    expect(external.summary().completedWorkIds).toEqual([]);
    expect(external.summary().deferredIds).toEqual(['A']);
    // JavaScript can explicitly supply undefined despite exact optional types.
    traversal.configure({ workCompletion: undefined } as unknown as {
      workCompletion: Policy;
    });
    const automatic = traversal.createRunner();
    await automatic.run();
    expect(automatic.summary().completedWorkIds).toEqual(['A', 'B']);
  });
}

for (const Runner of [DagTraversalRunner, AsyncDagTraversalRunner]) {
  test(`${Runner.name} captures external ownership once for its config and execution`, async () => {
    let reads = 0;
    const input = {
      ...new DagTraversal<G>({ traversableGraph: graph }).icfg,
      concurrency: 1,
      get workCompletion(): Policy {
        return ++reads === 1 ? 'externalSettlement' : 'visitorReturn';
      },
    };
    const runner = new Runner<G>(input);
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(runner.summary().deferredIds).toEqual(['A']);
    expect(runner.icfg.workCompletion).toBe('externalSettlement');
    expect(reads).toBe(1);
  });

  test(`${Runner.name} rejects the first invalid policy`, () => {
    let reads = 0;
    const input = {
      ...new DagTraversal<G>({ traversableGraph: graph }).icfg,
      concurrency: 1,
      get workCompletion(): Policy {
        return (++reads === 1 ? 'invalid' : 'visitorReturn') as Policy;
      },
    };
    expect(() => new Runner<G>(input)).toThrow(TypeError);
    expect(reads).toBe(1);
  });
}
