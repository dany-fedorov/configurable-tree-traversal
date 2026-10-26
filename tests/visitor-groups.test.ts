import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as D,
  TraversalVisitorCommandName as C,
} from '../src';
import { traversalInternals } from './internal-runner-fixtures';
type T = { VertexData: string; VertexHint: string };
const traversableGraph = {
  resolveRoot: () => ({
    vertexId: 'root',
    vertexContent: { $data: 'root', $childHints: [] as string[] },
  }),
  resolveChild: () => ({ vertexContent: null }),
};
for (const Ctor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Ctor.name}: flat priority order precedes batching mode`, async () => {
    const seen: string[] = [];
    const t = new (Ctor as typeof DagTraversal)<T>({ traversableGraph });
    t.addVisitorFor(
      D.ON_WORK_READY,
      () => {
        seen.push('high');
      },
      { priority: 1000, commandCommitMode: 'afterEachVisitor' },
    );
    t.addVisitorFor(
      D.ON_WORK_READY,
      () => {
        seen.push('low');
      },
      { priority: 1, commandCommitMode: 'afterGroup' },
    );
    await t.createRunner().run();
    expect(seen).toEqual(['high', 'low']);
  });
  test(`${Ctor.name}: groups preserve boundaries, committed state and list/set append order`, async () => {
    const seen: unknown[] = [];
    const t = new (Ctor as typeof DagTraversal)<T>({
      traversableGraph,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitors: [
                () => ({
                  commands: [
                    {
                      commandName: C.SET_VERTEX_VISITORS_CHAIN_STATE,
                      commandArguments: {
                        vertexVisitorsChainState: 'committed',
                      },
                    },
                  ],
                }),
              ],
            },
            {
              commandCommitMode: 'afterGroup',
              visitors: [
                {
                  priority: 1,
                  visitor: (_v, o) => {
                    seen.push(['low', o.visitorChainState]);
                  },
                },
                {
                  priority: 2,
                  visitor: (_v, o) => {
                    seen.push(['high', o.visitorChainState]);
                    return {
                      commands: [
                        {
                          commandName: C.SET_VERTEX_VISITORS_CHAIN_STATE,
                          commandArguments: {
                            vertexVisitorsChainState: 'buffered',
                          },
                        },
                      ],
                    };
                  },
                },
              ],
            },
          ],
        },
      },
    });
    t.setVisitorsFor(D.ON_WORK_READY, t.listVisitorsFor(D.ON_WORK_READY));
    t.addVisitorFor(
      D.ON_WORK_READY,
      (_v, o) => {
        seen.push(['implicit', o.visitorChainState]);
      },
      { priority: 1000 },
    );
    t.addVisitorGroupFor(D.ON_WORK_READY, {
      visitors: [
        () => {
          seen.push('explicit');
        },
      ],
    });
    t.addVisitorFor(
      D.ON_WORK_READY,
      () => {
        seen.push('tail');
      },
      { priority: 9999 },
    );
    t.configure({
      visitors: { [D.ON_WORK_READY]: t.listVisitorsFor(D.ON_WORK_READY) },
    });
    await t.createRunner().run();
    expect(seen).toEqual([
      ['high', 'committed'],
      ['low', 'committed'],
      ['implicit', 'buffered'],
      'explicit',
      'tail',
    ]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  // Sync callbacks work on both runtimes. Separate compile fixtures cover async callback signatures.
  const Ctor = Constructor as typeof DagTraversal;
  test(`${Constructor.name}: flat afterGroup entries commit in contiguous sorted batches`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({ traversableGraph });
    const add = (
      priority: number,
      mode: 'afterEachVisitor' | 'afterGroup',
      next: string,
    ) =>
      t.addVisitorFor(
        D.ON_WORK_READY,
        (v) => {
          seen.push(v.getData());
          return {
            commands: [
              {
                commandName: C.REWRITE_VERTEX_DATA,
                commandArguments: { newData: next },
              },
            ],
          };
        },
        { priority, commandCommitMode: mode },
      );
    add(1, 'afterGroup', 'last');
    add(4, 'afterGroup', 'first');
    add(3, 'afterGroup', 'second');
    add(2, 'afterEachVisitor', 'third');
    await t.createRunner().run();
    expect(seen).toEqual(['root', 'root', 'second', 'third']);
  });
  test(`${Constructor.name}: stable equal priorities ignore deprecated caller indexes`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      traversableGraph,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitors: [
                {
                  visitor: () => {
                    seen.push('first');
                  },
                  priority: 1,
                },
                {
                  visitor: () => {
                    seen.push('second');
                  },
                  priority: 1,
                },
              ],
            },
            {
              visitors: [
                {
                  visitor: () => {
                    seen.push('third');
                  },
                  priority: 9999,
                },
              ],
            },
          ],
        },
      },
    });
    t.addVisitorFor(D.ON_WORK_READY, () => {
      seen.push('fourth');
    });
    t.addVisitorFor(D.ON_WORK_READY, () => {
      seen.push('fifth');
    });
    await t.createRunner().run();
    expect(seen).toEqual(['first', 'second', 'third', 'fourth', 'fifth']);
    t.setVisitorsFor(D.ON_WORK_READY, [
      {
        visitor: () => {
          seen.push('legacy-first');
        },
        priority: 1,
        addedIndex: 999,
      },
      {
        visitor: () => {
          seen.push('legacy-second');
        },
        priority: 1,
        addedIndex: 0,
      },
    ]);
    await t.createRunner().run();
    expect(seen.slice(-2)).toEqual(['legacy-first', 'legacy-second']);
  });
  test(`${Constructor.name}: explicit deferral rolls back only its current batch`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      traversableGraph,
      workCompletion: 'externalSettlement',
    });
    t.addVisitorGroupFor(D.ON_WORK_READY, {
      commandCommitMode: 'afterGroup',
      visitors: [
        () => ({
          commands: [
            {
              commandName: C.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'committed' },
            },
          ],
        }),
      ],
    });
    t.addVisitorGroupFor(D.ON_WORK_READY, {
      commandCommitMode: 'afterGroup',
      visitors: [
        (v) => {
          seen.push(v.getData());
          return {
            commands: [
              {
                commandName: C.REWRITE_VERTEX_DATA,
                commandArguments: { newData: 'discarded' },
              },
            ],
          };
        },
        () => ({ commands: [{ commandName: C.DEFER_WORK_COMPLETION }] }),
      ],
    });
    t.addVisitorGroupFor(D.ON_WORK_READY, {
      visitors: [
        () => {
          seen.push('must skip');
        },
      ],
    });
    const runner = t.createRunner();
    await runner.run();
    expect(seen).toEqual(['committed']);
    expect(runner.getResolvedGraph().getRoot()!.getValue().getData()).toBe(
      'committed',
    );
    const generation = runner.summary().vertices.get('root')!.generation!;
    await runner.run();
    expect(runner.summary().vertices.get('root')!.generation).toBe(generation);
    runner.settle('root', { kind: 'workCompleted' }, generation);
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(['root']);
    expect(seen).toEqual(['committed']);
  });
  test(`${Constructor.name}: normally completed groups commit before external settlement`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      traversableGraph,
      workCompletion: 'externalSettlement',
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              commandCommitMode: 'afterGroup',
              visitors: [
                () => ({
                  commands: [
                    {
                      commandName: C.REWRITE_VERTEX_DATA,
                      commandArguments: { newData: 'committed' },
                    },
                  ],
                }),
              ],
            },
            {
              visitors: [
                (v) => {
                  seen.push(v.getData());
                },
              ],
            },
          ],
        },
      },
    });
    const runner = t.createRunner();
    await runner.run();
    expect(seen).toEqual(['committed']);
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(runner.getStopReason()).toBe('awaitingSettlement');
    runner.settle(
      'root',
      { kind: 'workCompleted' },
      runner.summary().vertices.get('root')!.generation!,
    );
    await runner.run();
    expect(runner.getStopReason()).toBe('finished');
  });
  test(`${Constructor.name}: halt resumes the remaining groups after committing its batch`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      traversableGraph,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              commandCommitMode: 'afterGroup',
              visitors: [
                () => ({ commands: [{ commandName: C.PAUSE_TRAVERSAL }] }),
                () => ({
                  commands: [
                    {
                      commandName: C.REWRITE_VERTEX_DATA,
                      commandArguments: { newData: 'after-halt' },
                    },
                  ],
                }),
              ],
            },
            {
              visitors: [
                (v) => {
                  seen.push(v.getData());
                },
              ],
            },
          ],
        },
      },
    });
    const runner = t.createRunner();
    await runner.run();
    expect(seen).toEqual([]);
    expect(runner.getStopReason()).toBe('paused');
    await runner.run();
    expect(seen).toEqual(['after-halt']);
    expect(runner.getStopReason()).toBe('finished');
  });
  test(`${Constructor.name}: deletion ends the chain before later groups`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      traversableGraph,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              commandCommitMode: 'afterGroup',
              visitors: [
                () => ({ commands: [{ commandName: C.DELETE_VERTEX }] }),
                () => {
                  seen.push('same batch');
                },
              ],
            },
            {
              visitors: [
                () => {
                  seen.push('must skip');
                },
              ],
            },
          ],
        },
      },
    });
    const runner = t.createRunner();
    await runner.run();
    expect(seen).toEqual(['same batch']);
    expect(runner.getResolvedGraph().getRoot()).toBeNull();
  });
  test(`${Constructor.name}: invalid group replacements are atomic and normalized policy remains owned by the group`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      traversableGraph,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              commandCommitMode: 'afterGroup',
              visitors: [
                () => {
                  seen.push('original');
                },
              ],
            },
          ],
        },
      },
    });
    const original = t.listVisitorsFor(D.ON_WORK_READY);
    const malformed: unknown[] = [
      null,
      7,
      {},
      { visitor: 7 },
      { groups: null },
      { groups: [null] },
      { groups: [7] },
      { groups: [{}] },
      { groups: [{ visitors: [null] }] },
      {
        groups: [
          {
            visitors: [
              { visitor: () => undefined, commandCommitMode: 'afterGroup' },
            ],
          },
        ],
      },
      {
        groups: [
          {
            visitors: [
              { visitor: () => undefined, resolutionStyle: undefined },
            ],
          },
        ],
      },
    ];
    for (const input of malformed) {
      expect(() =>
        t.configure({
          workCompletion: 'externalSettlement',
          visitors: { [D.ON_WORK_READY]: input as never },
        }),
      ).toThrow(TypeError);
      expect(t.listVisitorsFor(D.ON_WORK_READY)).toEqual(original);
      expect(traversalInternals(t).icfg.workCompletion).toBeUndefined();
    }
    expect(() =>
      t.addVisitorGroupFor(D.ON_WORK_READY, {
        visitors: [original[0]!],
      } as never),
    ).toThrow(/own/);
    const changed = original.map((record) => ({
      ...record,
      commandCommitMode: 'afterEachVisitor' as const,
      resolutionStyle: undefined,
    }));
    expect(() => t.setVisitorsFor(D.ON_WORK_READY, changed)).toThrow(
      /conflicting/,
    );
    expect(Object.isFrozen(original[0]!.visitorGroup)).toBe(true);
    await t.createRunner().run();
    expect(seen).toEqual(['original']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each(['definition', 'group'] as const)(
    `${Constructor.name}: captures a %s callback getter once before registration`,
    async (shape) => {
      let reads = 0;
      const calls: string[] = [];
      const member = {
        get visitor() {
          reads++;
          return reads === 1
            ? () => {
                calls.push('captured');
              }
            : null;
        },
      };
      const input =
        shape === 'definition'
          ? member
          : {
              groups: [{ commandCommitMode: 'afterGroup', visitors: [member] }],
            };
      const t = new Constructor<T>({ traversableGraph });
      t.configure({ visitors: { [D.ON_WORK_READY]: input as never } });
      expect(reads).toBe(1);
      await t.createRunner().run();
      expect(calls).toEqual(['captured']);
      expect(reads).toBe(1);
    },
  );
}
