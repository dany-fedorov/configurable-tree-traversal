import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type G = TreeTypeParameters<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const discovery of ['lazy', 'eager'] as const) {
    test(`${Constructor.name} ${discovery} prepares without work and reuses discovery`, async () => {
      const calls: string[] = [];
      const visits: string[] = [];
      const traversal = new Constructor<G>({
        discovery,
        traversableGraph: {
          makeRoot: () => {
            calls.push('a');
            return {
              kind: 'found',
              vertex: {
                vertexId: 'a',
                vertexContent: { $data: 'a', $childHints: ['b'] },
              },
            };
          },
          makeVertex: (id) => {
            calls.push(id);
            return {
              kind: 'found',
              vertex: {
                vertexId: id,
                dependsOn: ['a'],
                vertexContent: { $data: id, $childHints: [] },
              },
            };
          },
        },
      }).addVisitorFor(Order.ON_READY, (vertex) => {
        visits.push(vertex.getData());
      });
      const runner = traversal.makeRunner();
      expect(await runner.prepare()).toBe(runner);
      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(runner.getStopReason()).toBe('prepared');
      expect(runner.summary()).toMatchObject({
        discovery: { mode: 'eager', complete: true },
        completedWorkIds: [],
        completedSubtreeIds: [],
        deferredFrontier: [],
      });
      expect(visits).toEqual([]);
      expect(calls).toEqual(['a', 'b']);
      await runner.prepare();
      const events = [];
      for await (const event of runner.getIterable())
        events.push([event.vertex.getData(), event.kind]);
      expect(events).toEqual([
        ['a', 'workCompleted'],
        ['b', 'workCompleted'],
        ['b', 'subgraphCompleted'],
        ['a', 'subgraphCompleted'],
      ]);
      expect(visits).toEqual(['a', 'b']);
      expect(calls).toEqual(['a', 'b']);
      await expect(async () => runner.prepare()).rejects.toThrow(/execution/i);
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });
  }
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const sourceMode of ['tree', 'graph'] as const) {
    for (const empty of [false, true]) {
      test(`${Constructor.name} prepares ${sourceMode} ${
        empty ? 'omitted' : 'nonempty'
      } roots`, async () => {
        const calls: string[] = [];
        const source = {
          makeRoot: () => {
            calls.push('root');
            return empty
              ? {
                  vertexContent: null,
                }
              : { vertexContent: { $data: 'root', $childHints: ['child'] } };
          },
          makeVertex: () => {
            calls.push('child');
            return { vertexContent: { $data: 'child', $childHints: [] } };
          },
        };
        const runner = new Constructor<G>(
          sourceMode === 'tree'
            ? { traversableTree: source }
            : { traversableGraph: source },
        ).makeRunner();
        await runner.prepare();
        await runner.prepare();
        expect(runner.getStopReason()).toBe('prepared');
        expect(runner.summary().counts).toMatchObject({
          discovered: empty ? 0 : 2,
          workCompleted: 0,
          subtreeCompleted: 0,
        });
        expect(calls).toEqual(empty ? ['root'] : ['root', 'child']);
        await runner.run();
        expect(runner.getStopReason()).toBe('finished');
        expect(calls).toEqual(empty ? ['root'] : ['root', 'child']);
      });
    }
  }

  for (const empty of [false, true]) {
    test(`${Constructor.name} hides synthetic bookkeeping during preparation`, async () => {
      const runner = new Constructor<G>({
        syntheticRoot: true,
        traversableGraph: {
          makeRoot: () =>
            empty
              ? { vertexContent: null }
              : { vertexContent: { $data: 'synthetic', $childHints: ['a'] } },
          makeVertex: () => ({
            vertexId: 'a',
            vertexContent: { $data: 'a', $childHints: [] },
          }),
        },
      }).makeRunner();
      await runner.prepare();
      expect(runner.getStopReason()).toBe('prepared');
      expect(runner.summary()).toMatchObject({
        counts: { discovered: empty ? 0 : 1 },
        completedWorkIds: [],
        completedSubtreeIds: [],
        deferredFrontier: [],
      });
      await runner.run();
      expect(runner.getStopReason()).toBe('finished');
    });
  }

  test(`${Constructor.name} prepares lookup closure and accepted work without committing completion`, async () => {
    const calls: unknown[] = [];
    const visits: string[] = [];
    const runner = new Constructor<G>({
      completedWork: new Set(['lookup']),
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOnComplete: ['lookup'],
          vertexContent: { $data: 'root', $childHints: [] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          vertexContent: { $data: id, $childHints: [] },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return {
            vertexId: id,
            vertexContent: { $data: 'lookup', $childHints: ['child'] },
          };
        },
      },
    })
      .addVisitorFor(Order.ON_READY, (vertex) => {
        visits.push(vertex.getData());
      })
      .makeRunner();
    await runner.prepare();
    expect(calls).toEqual(['lookup']);
    expect(visits).toEqual([]);
    expect(runner.summary()).toMatchObject({
      completedWorkIds: ['lookup'],
      completedSubtreeIds: [],
      deferredFrontier: [],
      counts: { discovered: 3 },
    });
    const events = [];
    for await (const event of runner.getIterable()) {
      events.push([event.vertex.getData(), event.kind]);
      if (event.kind === 'workCompleted')
        expect(runner.summary().completedWorkIds).toContain(
          event.vertex.getData(),
        );
      else
        expect(runner.summary().completedSubtreeIds).toContain(
          event.vertex.getData(),
        );
    }
    expect(events).toEqual([
      ['child', 'workCompleted'],
      ['child', 'subgraphCompleted'],
      ['lookup', 'subgraphCompleted'],
      ['root', 'workCompleted'],
      ['root', 'subgraphCompleted'],
    ]);
    expect(visits).toEqual(['child', 'root']);
    expect(calls).toEqual(['lookup']);
  });

  for (const issue of [
    'missing',
    'workCycle',
    'completionCycle',
    'seedCycle',
    'unknownSeed',
  ] as const) {
    test(`${Constructor.name} preparation rejects ${issue} before visitors`, async () => {
      let visits = 0;
      const runner = new Constructor<G>({
        ...(issue === 'seedCycle'
          ? { completedWork: new Set(['root', 'lookup']) }
          : issue === 'unknownSeed'
          ? { completedWork: new Set(['unknown']) }
          : {}),
        traversableGraph: {
          makeRoot: () => ({
            vertexId: 'root',
            dependsOn: issue === 'unknownSeed' ? [] : ['lookup'],
            vertexContent: { $data: 'root', $childHints: [] },
          }),
          makeVertex: () => ({ vertexContent: null }),
          resolvePrerequisite: () =>
            issue === 'missing'
              ? { kind: 'missing' }
              : {
                  vertexId: 'lookup',
                  ...(issue === 'completionCycle'
                    ? { dependsOnComplete: ['root'] }
                    : { dependsOn: ['root'] }),
                  vertexContent: { $data: 'lookup', $childHints: [] },
                },
        },
      })
        .addVisitorFor(Order.ON_READY, () => {
          visits++;
        })
        .makeRunner();
      await expect(async () => runner.prepare()).rejects.toThrow();
      expect(visits).toBe(0);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.summary().deferredFrontier).toEqual([]);
    });
  }

  for (const error of [undefined, null, { exact: true }]) {
    for (const stage of ['root', 'child', 'lookup'] as const) {
      test(`${
        Constructor.name
      } retains exact ${stage} preparation error ${String(
        error,
      )}`, async () => {
        const runner = new Constructor<G>({
          traversableGraph: {
            makeRoot: () => {
              if (stage === 'root') throw error;
              return {
                vertexId: 'root',
                dependsOn: stage === 'lookup' ? ['lookup'] : [],
                vertexContent: {
                  $data: 'root',
                  $childHints: stage === 'child' ? ['child'] : [],
                },
              };
            },
            makeVertex: () => {
              throw error;
            },
            resolvePrerequisite: () => {
              throw error;
            },
          },
        }).makeRunner();
        await expect(async () => runner.prepare()).rejects.toBe(error);
        await expect(async () => runner.prepare()).rejects.toBe(error);
        await expect(async () => runner.run()).rejects.toBe(error);
        expect(runner.requestPause()).toBe(false);
      });
    }
  }
}

const single = {
  makeRoot: () => ({
    vertexId: 'root',
    vertexContent: { $data: 'root', $childHints: [] },
  }),
  makeVertex: () => ({ vertexContent: null }),
};
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const injection of ['state', 'container', 'both'] as const) {
    test(`${Constructor.name} rejects empty injected ${injection} recoverably`, async () => {
      const state = new DagTraversalRunnerState<G>();
      const container = new ResolvedGraphsContainer<G>({
        sourceMode: 'graph',
        saveOriginal: false,
      });
      const runner = new Constructor<G>({
        traversableGraph: single,
        traversalRunnerInternalObjects: {
          ...(injection !== 'container' ? { state } : {}),
          ...(injection !== 'state'
            ? { resolvedGraphsContainer: container }
            : {}),
        },
      }).makeRunner();
      const before = runner.inspect();
      await expect(async () => runner.prepare()).rejects.toThrow(/injected/i);
      expect(runner.inspect()).toEqual(before);
      expect(runner.summary().discovery.mode).toBe('lazy');
      await runner.run();
      expect(runner.getStopReason()).toBe('finished');
    });
  }

  test(`${Constructor.name} rejects prepare during suspended execution without poisoning`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: single,
    }).makeRunner();
    const iterator = runner.getIterable();
    expect((await iterator.next()).done).toBe(false);
    await expect(async () => runner.prepare()).rejects.toThrow(
      /active iterator/i,
    );
    await iterator.return();
    await expect(async () => runner.prepare()).rejects.toThrow(/execution/i);
    await runner.run();
    expect(runner.getStopReason()).toBe('finished');
  });

  test(`${Constructor.name} invalid execution options do not prevent preparation`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: single,
    }).makeRunner();
    await expect(async () =>
      // @ts-expect-error Invalid phases also reject recoverably for JavaScript callers.
      runner.run({ emitPhases: ['PRE_ORDER'] }),
    ).rejects.toThrow();
    await runner.prepare();
    expect(runner.getStopReason()).toBe('prepared');
    await runner.run();
    expect(runner.getStopReason()).toBe('finished');
  });

  for (const sourceMode of ['graph', 'tree'] as const) {
    test(`${Constructor.name} prepared ${sourceMode} topology stays frozen`, async () => {
      const source = {
        makeRoot: () => ({ vertexContent: { $data: 'root', $childHints: [] } }),
        makeVertex: () => ({ vertexContent: null }),
      };
      const runner = new Constructor<G>(
        sourceMode === 'graph'
          ? { traversableGraph: source }
          : { traversableTree: source },
      )
        .addVisitorFor(Order.ON_READY, () => ({
          commands: [
            {
              commandName: Command.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: ['unexpected'] },
            },
          ],
        }))
        .makeRunner();
      await runner.prepare();
      await expect(async () => runner.run()).rejects.toThrow(/topology|eager/i);
      expect(runner.summary().counts.workCompleted).toBe(0);
    });
  }
}

for (const adopt of [false, true]) {
  test(`async preparation drains pending source and ${
    adopt ? 'run adopts' : 'prepare resumes'
  } eager discovery`, async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const calls: string[] = [];
    const visits: string[] = [];
    const runner = new AsyncDagTraversal<G>({
      concurrency: 1,
      traversableGraph: {
        makeRoot: () => {
          calls.push('root');
          return {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['a', 'b'] },
          };
        },
        makeVertex: async (id) => {
          calls.push(id);
          if (id === 'a') {
            entered();
            await gate;
          }
          return {
            vertexId: id,
            vertexContent: { $data: id, $childHints: [] },
          };
        },
      },
    })
      .addVisitorFor(Order.ON_READY, (vertex) => {
        visits.push(vertex.getData());
      })
      .makeRunner();
    let finished = false;
    const preparing = runner.prepare().then(() => {
      finished = true;
    });
    await started;
    expect(runner.requestPause()).toBe(true);
    expect(runner.requestPause()).toBe(false);
    await expect(runner.prepare()).rejects.toThrow(/active iterator/i);
    await expect(runner.run()).rejects.toThrow(/active iterator/i);
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(calls).toEqual(['root', 'a']);
    release();
    await preparing;
    expect(runner.getStopReason()).toBe('paused');
    expect(calls).toEqual(['root', 'a']);
    expect(visits).toEqual([]);
    expect(runner.summary().discovery).toEqual({
      mode: 'eager',
      complete: false,
    });
    if (adopt) await runner.run();
    else {
      await runner.prepare();
      expect(runner.getStopReason()).toBe('prepared');
      expect(visits).toEqual([]);
      await runner.run();
    }
    expect(calls).toEqual(['root', 'a', 'b']);
    expect(visits).toEqual(['root', 'a', 'b']);
    expect(runner.getStopReason()).toBe('finished');
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const injection of ['state', 'container'] as const) {
    test(`${Constructor.name} rejects injected tree ${injection} without changing continuation`, async () => {
      const tree = {
        makeRoot: () => ({ vertexContent: { $data: 'root', $childHints: [] } }),
        makeVertex: () => ({ vertexContent: null }),
      };
      const fresh = new Constructor<G>({ traversableTree: tree }).makeRunner();
      const runner = new Constructor<G>({
        traversableTree: tree,
        traversalRunnerInternalObjects:
          injection === 'state'
            ? { state: fresh.state }
            : { resolvedGraphsContainer: fresh.resolvedGraphsContainer },
      }).makeRunner();
      const before = runner.inspect();
      await expect(async () => runner.prepare()).rejects.toThrow(/injected/i);
      expect(runner.inspect()).toEqual(before);
      await runner.run();
      expect(runner.getStopReason()).toBe('finished');
    });
  }
  test(`${Constructor.name} injected failure wins over preparation validation`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: single,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState<G>({
          status: Status.FAILED,
          failure: { error: undefined },
        }),
      },
    }).makeRunner();
    await expect(async () => runner.prepare()).rejects.toBeUndefined();
  });

  for (const stage of ['root', 'child', 'sort', 'identity'] as const) {
    test(`${Constructor.name} preparation retains ${stage} source pipeline failure`, async () => {
      const error = Symbol(stage);
      const source = {
        makeRoot: () => {
          if (stage === 'root') throw error;
          return { vertexContent: { $data: 'root', $childHints: ['child'] } };
        },
        makeVertex: () => {
          throw error;
        },
      };
      const runner = new Constructor<G>({
        ...(stage === 'identity'
          ? {
              traversableGraph: {
                ...source,
                getVertexIdFromHint: () => {
                  throw error;
                },
              },
            }
          : { traversableTree: source }),
        ...(stage === 'sort'
          ? {
              sortChildrenHints: () => {
                throw error;
              },
            }
          : {}),
      }).makeRunner();
      await expect(async () => runner.prepare()).rejects.toBe(error);
      await expect(async () => runner.run()).rejects.toBe(error);
    });
  }
}

test('sync preparation is owned during callbacks and can pause at the root', () => {
  let rootCalls = 0;
  const runner: ReturnType<DagTraversal<G>['makeRunner']> = new DagTraversal<G>({
    traversableTree: {
      makeRoot: () => {
        rootCalls++;
        expect(() => runner.prepare()).toThrow(/active iterator/i);
        expect(() => runner.run()).toThrow(/active iterator/i);
        expect(runner.requestPause()).toBe(true);
        return { vertexContent: { $data: 'root', $childHints: [] } };
      },
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner();
  runner.prepare();
  expect(runner.getStopReason()).toBe('paused');
  runner.prepare();
  expect(runner.getStopReason()).toBe('prepared');
  expect(rootCalls).toBe(1);
  runner.run();
  expect(runner.getStopReason()).toBe('finished');
});

for (const omitted of [false, true]) {
  test(`async tree preparation drains a pending ${
    omitted ? 'omitted' : 'found'
  } root before pausing`, async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let calls = 0;
    const runner = new AsyncDagTraversal<G>({
      traversableTree: {
        makeRoot: async () => {
          calls++;
          entered();
          await gate;
          return {
            vertexContent: omitted ? null : { $data: 'root', $childHints: [] },
          };
        },
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner();
    const preparing = runner.prepare();
    await started;
    expect(runner.requestPause()).toBe(true);
    expect(runner.inspect().inFlightCallbackCount).toBe(1);
    release();
    await preparing;
    expect(runner.getStopReason()).toBe('paused');
    expect(runner.inspect().inFlightCallbackCount).toBe(0);
    await runner.prepare();
    expect(runner.getStopReason()).toBe('prepared');
    expect(runner.summary().counts.workCompleted).toBe(0);
    await runner.run();
    expect(calls).toBe(1);
    expect(runner.getStopReason()).toBe('finished');
  });
}
