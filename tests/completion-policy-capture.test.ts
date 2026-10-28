import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase,
} from '../src/traversals/dag-traversal';
import { InternalAsyncDagTraversalRunner as AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import { InternalDagTraversalRunner as DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import {
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

type G = VertexTypes<string, string>;
const graph = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'A',
      vertexContent: { $data: 'A', $childHints: ['B'] },
    },
  }),
  resolveChild: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'B',
      dependsOnWork: ['A'],
      vertexContent: { $data: 'B', $childHints: [] },
    },
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
        expect(runner.summary().deferredWorkIds).toEqual(['A']);
        expect(runner.summary().vertices.get('B')!.work).toBe('pending');
        expect(traversalInternals(traversal).icfg.workCompletion).toBe(
          'externalSettlement',
        );
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
      const before = traversalInternals(traversal).icfg;
      const visitors = traversalInternals(traversal).visitors;
      expect(() =>
        entry === 'constructor'
          ? new Constructor<G>(input)
          : traversal.configure(input),
      ).toThrow(TypeError);
      expect(reads).toBe(1);
      expect(traversalInternals(traversal).icfg).toBe(before);
      expect(traversalInternals(traversal).visitors).toBe(visitors);
    });

    test.each([undefined, null, { reason: 'getter failure' }])(
      `${Constructor.name} ${entry} preserves exact getter error %p`,
      (error) => {
        const traversal = new Constructor<G>({
          traversableGraph: graph,
          workCompletion: 'externalSettlement',
        });
        traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => undefined);
        const before = traversalInternals(traversal).icfg;
        const visitors = traversalInternals(traversal).visitors;
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
        expect(traversalInternals(traversal).icfg).toBe(before);
        expect(traversalInternals(traversal).visitors).toBe(visitors);
      },
    );
  }

  test(`${Constructor.name} omission and present undefined retain external ownership`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: graph,
      workCompletion: 'externalSettlement',
    });
    traversal.configure({});
    const external = traversal.createRunner();
    await external.run();
    expect(external.summary().completedWorkIds).toEqual([]);
    expect(external.summary().deferredWorkIds).toEqual(['A']);
    traversal.configure({ workCompletion: undefined });
    const retained = traversal.createRunner();
    await retained.run();
    expect(retained.summary().completedWorkIds).toEqual([]);
    expect(retained.summary().deferredWorkIds).toEqual(['A']);
    traversal.configure({ workCompletion: 'visitorReturn' });
    const automatic = traversal.createRunner();
    await automatic.run();
    expect(automatic.summary().completedWorkIds).toEqual(['A', 'B']);
  });
}

for (const Runner of [DagTraversalRunner, AsyncDagTraversalRunner]) {
  test(`${Runner.name} captures external ownership once for its config and execution`, async () => {
    let reads = 0;
    const input = {
      ...traversalInternals(new DagTraversal<G>({ traversableGraph: graph }))
        .icfg,
      concurrency: 1,
      get workCompletion(): Policy {
        return ++reads === 1 ? 'externalSettlement' : 'visitorReturn';
      },
    };
    const runner = new Runner<G>(input);
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(runner.summary().deferredWorkIds).toEqual(['A']);
    expect(runnerInternals(runner).icfg.workCompletion).toBe(
      'externalSettlement',
    );
    expect(reads).toBe(1);
  });

  test(`${Runner.name} rejects the first invalid policy`, () => {
    let reads = 0;
    const input = {
      ...traversalInternals(new DagTraversal<G>({ traversableGraph: graph }))
        .icfg,
      concurrency: 1,
      get workCompletion(): Policy {
        return (++reads === 1 ? 'invalid' : 'visitorReturn') as Policy;
      },
    };
    expect(() => new Runner<G>(input)).toThrow(TypeError);
    expect(reads).toBe(1);
  });
}
