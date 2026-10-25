import {
  DagTraversal,
  graphFrom,
  inspectDag,
  type DagDependencyMilestone,
} from '../src';

const id = { name: 'leaf' };
function inspection() {
  const runner = new DagTraversal(
    graphFrom([id], { id: (value) => value }),
  ).makeRunner();
  runner.prepare();
  return inspectDag(runner);
}

for (const representation of ['prototype getters', 'non-enumerable fields']) {
  for (const method of [
    'explain',
    'prerequisitesOf',
    'dependentsOf',
  ] as const) {
    test(`${method} reads ${representation} once and preserves identity`, () => {
      const captured = inspection();
      let idReads = 0;
      let milestoneReads = 0;
      const milestone = method === 'dependentsOf' ? 'work' : 'completion';
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
      const target: DagDependencyMilestone<typeof id> =
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
            ) as DagDependencyMilestone<typeof id>);
      if (method === 'explain') {
        const result = captured.explain(target);
        expect(result).toMatchObject({
          kind: 'known',
          satisfied: false,
          target: { vertexId: id, milestone: 'completion' },
        });
        expect(result.target.vertexId).toBe(id);
        result.target.vertexId = { name: 'changed' };
        expect(captured.explain({ vertexId: id, milestone })).toMatchObject({
          kind: 'known',
          target: { vertexId: id },
        });
      } else {
        const result = captured[method](target);
        expect(result.milestones).toEqual([
          {
            vertexId: id,
            milestone: method === 'dependentsOf' ? 'completion' : 'work',
          },
        ]);
        expect(result.edges).toEqual([
          {
            from: { vertexId: id, milestone: 'completion' },
            to: { vertexId: id, milestone: 'work' },
            reason: 'ownWork',
          },
        ]);
        expect(result.milestones[0]!.vertexId).toBe(id);
        result.milestones[0]!.vertexId = { name: 'changed' };
        expect(
          captured[method]({ vertexId: id, milestone }).milestones[0]!.vertexId,
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
      'explain',
      'prerequisitesOf',
      'dependentsOf',
    ] as const) {
      const target = Object.defineProperty(
        { vertexId: id, milestone: 'work' as const },
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
        captured[method](target);
      } catch (error) {
        thrown = true;
        expect(error).toBeUndefined();
      }
      expect(thrown).toBe(true);
    }
  });
}
