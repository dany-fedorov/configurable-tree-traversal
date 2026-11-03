import {
  DagTraversalBuilder,
  materializeMultiEntryDagInputFromRecordCatalog,
  captureDagMilestoneSnapshot,
  type DagMilestone,
} from '../src';

const id = { name: 'leaf' };
function inspection() {
  const runner = new DagTraversalBuilder(
    materializeMultiEntryDagInputFromRecordCatalog([id], {
      selectVertexId: (value) => value,
    }),
  ).createIndependentRunnerFromCurrentOptions();
  runner.discoverValidateAndFreezeTopology();
  return captureDagMilestoneSnapshot(runner);
}

for (const representation of ['prototype getters', 'non-enumerable fields']) {
  for (const method of [
    'explainMilestone',
    'queryOriginalPrerequisiteMilestonesOf',
    'queryOriginalDependentMilestonesOf',
  ] as const) {
    test(`${method} reads ${representation} once and preserves identity`, () => {
      const captured = inspection();
      let idReads = 0;
      let milestoneReads = 0;
      const milestone =
        method === 'queryOriginalDependentMilestonesOf'
          ? 'workCompletion'
          : 'subgraphCompletion';
      class Target {
        get vertexId() {
          idReads++;
          return id;
        }
        get milestone() {
          milestoneReads++;
          return milestone;
        }
      }
      const targetMilestone: DagMilestone<typeof id> =
        representation === 'prototype getters'
          ? new Target()
          : (Object.defineProperties(
              {},
              {
                vertexId: {
                  get: () => {
                    idReads++;
                    return id;
                  },
                },
                milestone: {
                  get: () => {
                    milestoneReads++;
                    return milestone;
                  },
                },
              },
            ) as DagMilestone<typeof id>);
      if (method === 'explainMilestone') {
        const result = captured.explainMilestone(targetMilestone);
        expect(result).toMatchObject({
          kind: 'live',
          milestoneSatisfied: false,
          targetMilestone: { vertexId: id, milestone: 'subgraphCompletion' },
        });
        expect(result.targetMilestone.vertexId).toBe(id);
        result.targetMilestone.vertexId = { name: 'changed' };
        expect(
          captured.explainMilestone({ vertexId: id, milestone }),
        ).toMatchObject({
          kind: 'live',
          targetMilestone: { vertexId: id },
        });
      } else {
        const result = captured[method](targetMilestone);
        expect(result.reachedMilestones).toEqual([
          {
            vertexId: id,
            milestone:
              method === 'queryOriginalDependentMilestonesOf'
                ? 'subgraphCompletion'
                : 'workCompletion',
          },
        ]);
        expect(result.originalMilestoneConstraints).toEqual([
          {
            waitingMilestone: { vertexId: id, milestone: 'subgraphCompletion' },
            prerequisiteMilestone: {
              vertexId: id,
              milestone: 'workCompletion',
            },
            reason: 'ownWork',
          },
        ]);
        expect(result.reachedMilestones[0]!.vertexId).toBe(id);
        result.reachedMilestones[0]!.vertexId = { name: 'changed' };
        expect(
          captured[method]({ vertexId: id, milestone }).reachedMilestones[0]!
            .vertexId,
        ).toBe(id);
      }
      expect(idReads).toBe(1);
      expect(milestoneReads).toBe(1);
    });
  }
}

for (const field of ['vertexId', 'milestone']) {
  test(`milestone queries preserve an exact ${field} getter failure`, () => {
    const captured = inspection();
    for (const method of [
      'explainMilestone',
      'queryOriginalPrerequisiteMilestonesOf',
      'queryOriginalDependentMilestonesOf',
    ] as const) {
      const targetMilestone = Object.defineProperty(
        { vertexId: id, milestone: 'workCompletion' as const },
        field,
        {
          enumerable: false,
          get: () => {
            throw undefined;
          },
        },
      );
      let thrown = false;
      try {
        captured[method](targetMilestone);
      } catch (error) {
        thrown = true;
        expect(error).toBeUndefined();
      }
      expect(thrown).toBe(true);
    }
  });
}
