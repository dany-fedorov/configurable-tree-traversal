import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
} from '../src/traversals/dag-traversal';
import { InternalAsyncDagTraversalRunner as AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import { InternalDagTraversalRunner as DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import {
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const graph = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'A',
      vertexContentInput: { $vertexData: 'A', $childDiscoveryHints: ['B'] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'B',
      workWaitsForWorkOf: ['A'],
      vertexContentInput: { $vertexData: 'B', $childDiscoveryHints: [] },
    },
  }),
};
type Policy = 'requireExternalWorkSettlement' | 'afterWorkReadyVisitorChain';

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const entry of [
    'constructor',
    'patchOptionsForFutureRunners',
  ] as const) {
    test.each(['afterWorkReadyVisitorChain', 'invalid'])(
      `${Constructor.name} ${entry} captures ownership before a later %s value`,
      async (later) => {
        let reads = 0;
        const input = {
          dagDiscoverySource: graph,
          discoveryTiming: 'completeBeforeAnyVisitor' as const,
          get workCompletionPolicy(): Policy {
            return (
              ++reads === 1 ? 'requireExternalWorkSettlement' : later
            ) as Policy;
          },
        };
        const traversal =
          entry === 'constructor'
            ? new Constructor<G>(input)
            : new Constructor<G>({
                dagDiscoverySource: graph,
              }).patchOptionsForFutureRunners(input);
        const runner = traversal.createIndependentRunnerFromCurrentOptions();
        await runner.runUntilSuspendedOrTerminal();
        expect(
          runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toEqual([]);
        expect(
          runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
        ).toEqual(['A']);
        expect(
          runner.captureProgressSnapshot().progressByVertexId.get('B')!
            .workState,
        ).toBe('waitingForPrerequisiteMilestones');
        expect(traversalInternals(traversal).icfg.workCompletionPolicy).toBe(
          'requireExternalWorkSettlement',
        );
        expect(reads).toBe(1);
      },
    );

    test(`${Constructor.name} ${entry} rejects the first invalid policy without consuming a later valid value`, () => {
      let reads = 0;
      const input = {
        dagDiscoverySource: graph,
        get workCompletionPolicy(): Policy {
          return (
            ++reads === 1 ? 'invalid' : 'afterWorkReadyVisitorChain'
          ) as Policy;
        },
      };
      const traversal = new Constructor<G>({
        dagDiscoverySource: graph,
        workCompletionPolicy: 'requireExternalWorkSettlement',
      });
      const before = traversalInternals(traversal).icfg;
      const visitors = traversalInternals(traversal).visitors;
      expect(() =>
        entry === 'constructor'
          ? new Constructor<G>(input)
          : traversal.patchOptionsForFutureRunners(input),
      ).toThrow(TypeError);
      expect(reads).toBe(1);
      expect(traversalInternals(traversal).icfg).toBe(before);
      expect(traversalInternals(traversal).visitors).toBe(visitors);
    });

    test.each([undefined, null, { reason: 'getter failure' }])(
      `${Constructor.name} ${entry} preserves exact getter error %p`,
      (error) => {
        const traversal = new Constructor<G>({
          dagDiscoverySource: graph,
          workCompletionPolicy: 'requireExternalWorkSettlement',
        });
        traversal.registerVisitorForPhase(
          DagVisitorPhase.ON_WORK_READY,
          () => undefined,
        );
        const before = traversalInternals(traversal).icfg;
        const visitors = traversalInternals(traversal).visitors;
        const input = {
          dagDiscoverySource: graph,
          discoveryTiming: 'completeBeforeAnyVisitor' as const,
          get workCompletionPolicy(): Policy {
            throw error;
          },
        };
        let caught = false;
        try {
          if (entry === 'constructor') new Constructor<G>(input);
          else traversal.patchOptionsForFutureRunners(input);
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
      dagDiscoverySource: graph,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    });
    traversal.patchOptionsForFutureRunners({});
    const external = traversal.createIndependentRunnerFromCurrentOptions();
    await external.runUntilSuspendedOrTerminal();
    expect(
      external.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(
      external.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['A']);
    traversal.patchOptionsForFutureRunners({ workCompletionPolicy: undefined });
    const retained = traversal.createIndependentRunnerFromCurrentOptions();
    await retained.runUntilSuspendedOrTerminal();
    expect(
      retained.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(
      retained.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['A']);
    traversal.patchOptionsForFutureRunners({
      workCompletionPolicy: 'afterWorkReadyVisitorChain',
    });
    const automatic = traversal.createIndependentRunnerFromCurrentOptions();
    await automatic.runUntilSuspendedOrTerminal();
    expect(
      automatic.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['A', 'B']);
  });
}

for (const Runner of [DagTraversalRunner, AsyncDagTraversalRunner]) {
  test(`${Runner.name} captures external ownership once for its config and execution`, async () => {
    let reads = 0;
    const input = {
      ...traversalInternals(
        new DagTraversalBuilder<G>({ dagDiscoverySource: graph }),
      ).icfg,
      maxConcurrentCallbackInvocations: 1,
      get workCompletionPolicy(): Policy {
        return ++reads === 1
          ? 'requireExternalWorkSettlement'
          : 'afterWorkReadyVisitorChain';
      },
    };
    const runner = new Runner<G>(input);
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['A']);
    expect(runnerInternals(runner).icfg.workCompletionPolicy).toBe(
      'requireExternalWorkSettlement',
    );
    expect(reads).toBe(1);
  });

  test(`${Runner.name} rejects the first invalid policy`, () => {
    let reads = 0;
    const input = {
      ...traversalInternals(
        new DagTraversalBuilder<G>({ dagDiscoverySource: graph }),
      ).icfg,
      maxConcurrentCallbackInvocations: 1,
      get workCompletionPolicy(): Policy {
        return (
          ++reads === 1 ? 'invalid' : 'afterWorkReadyVisitorChain'
        ) as Policy;
      },
    };
    expect(() => new Runner<G>(input)).toThrow(TypeError);
    expect(reads).toBe(1);
  });
}
