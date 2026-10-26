import {
  GraphWalk,
  AsyncGraphWalk,
  GraphWalkPhase as Phase,
  TraversalVisitorCommandName as C,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkVisitor, GraphWalkVisitorContext } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it('runs mixed callbacks with emissions suppressed and unchanged source discovery', () => {
  const fixture = contextFixture();
  const seen: string[] = [];
  const traversal = new GraphWalk({ source: fixture.source });
  traversal.addVisitorFor(Phase.VERTEX, (event) => {
    seen.push(`v:${event.vertex.vertexId}`);
  });
  traversal.addVisitorFor(Phase.EDGE, (event) => {
    seen.push(
      `e:${event.source.vertexId}:${event.edge.index}:${event.target.kind}`,
    );
  });
  expect([...traversal.makeRunner().getIterable({ emitPhases: [] })]).toEqual(
    [],
  );
  expect(seen).toEqual([
    'v:A',
    'v:E',
    'e:A:0:found',
    'v:B',
    'e:A:1:found',
    'e:A:2:found',
    'v:C',
    'e:B:0:found',
    'v:D',
    'e:C:0:found',
    'e:D:0:found',
  ]);
  expect(fixture.calls).toEqual([
    'roots',
    'resolve:A',
    'resolve:E',
    'outgoing:A',
    'link:A:0',
    'resolve:B',
    'link:A:1',
    'link:A:2',
    'resolve:C',
    'outgoing:E',
    'outgoing:B',
    'link:B:0',
    'resolve:D',
    'outgoing:C',
    'link:C:0',
    'outgoing:D',
    'link:D:0',
  ]);
});

it('halts after its group and resumes only the remaining callbacks', () => {
  const seen: string[] = [];
  const traversal = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  traversal.addVisitorGroupFor(Phase.VERTEX, {
    commandCommitMode: 'afterGroup',
    visitors: [
      () => {
        seen.push('first');
        return { commands: [{ commandName: C.HALT_TRAVERSAL }] };
      },
      () => {
        seen.push('second');
      },
    ],
  });
  traversal.addVisitorFor(Phase.VERTEX, () => {
    seen.push('third');
  });
  const runner = traversal.makeRunner().run();
  expect(seen).toEqual(['first', 'second']);
  expect(runner.getStopReason()).toBe('paused');
  expect(runner.inspect().activeVisitor).toEqual({
    phase: Phase.VERTEX,
    position: 2,
  });
  runner.run();
  expect(seen).toEqual(['first', 'second', 'third']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

it('commits flat afterGroup batches at sorted mode boundaries and halts once per batch', () => {
  const seen: string[] = [];
  const traversal = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  for (const [priority, mode, label] of [
    [1, 'afterGroup', 'tail'],
    [4, 'afterGroup', 'high'],
    [3, 'afterGroup', 'middle'],
    [2, 'afterEachVisitor', 'each'],
  ] as const)
    traversal.addVisitorFor(
      Phase.VERTEX,
      () => {
        seen.push(label);
        return { commands: [{ commandName: C.HALT_TRAVERSAL }] };
      },
      { priority, commandCommitMode: mode },
    );
  const runner = traversal.makeRunner().run();
  expect(seen).toEqual(['high', 'middle']);
  runner.run();
  expect(seen).toEqual(['high', 'middle', 'each']);
  runner.run();
  expect(seen).toEqual(['high', 'middle', 'each', 'tail']);
  expect(runner.isHalted()).toBe(true);
  expect([...runner.getIterable()]).toMatchObject([
    { kind: 'vertex', vertex: { vertexId: 'A' } },
  ]);
});

it('detaches list and context wrappers while preserving callback and group metadata identity', () => {
  const contexts: GraphWalkVisitorContext<Phase.VERTEX>[] = [];
  const seen: string[] = [];
  const first: GraphWalkVisitor<string, undefined, Phase.VERTEX, string> = (
    _event,
    context,
  ) => {
    contexts.push(context);
    expect('visitor' in context.visitorRecord).toBe(false);
    (context.visitorRecord as { priority: number }).priority = -1;
    seen.push('first');
  };
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  t.addVisitorGroupFor(Phase.VERTEX, { visitors: [first] });
  const listed = t.listVisitorsFor(Phase.VERTEX);
  const group = listed[0]!.visitorGroup;
  expect(listed[0]!.visitor).toBe(first);
  t.setVisitorsFor(Phase.VERTEX, listed);
  listed[0]!.priority = 999;
  listed.push({
    ...listed[0]!,
    visitor: () => {
      seen.push('wrong');
    },
  });
  t.makeRunner().run();
  t.makeRunner().run();
  expect(seen).toEqual(['first', 'first']);
  expect(t.listVisitorsFor(Phase.VERTEX)[0]!.priority).toBe(100);
  expect(contexts[0]!.visitorRecord.visitorGroup).toBe(group);
  expect(contexts[0]!.visitorRecord).not.toBe(contexts[1]!.visitorRecord);
  expect(contexts[0]).toMatchObject({
    order: Phase.VERTEX,
    occurrenceIndex: 0,
    observationIndex: 0,
    visitorIndex: 0,
  });
});

it('supplies logical phase and occurrence indices independently of emission and visitor filters', () => {
  const seen: unknown[] = [];
  const t = new GraphWalk({
    source: idGraph(
      ['A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    ),
    emitPhases: [],
  });
  t.addVisitorFor(Phase.EDGE, (event, context) => {
    seen.push([
      event.kind,
      context.occurrenceIndex,
      context.observationIndex,
      context.visitorIndex,
    ]);
  });
  t.addVisitorFor(Phase.PATH, (event, context) => {
    seen.push([
      event.kind,
      event.vertices.map((v) => v.vertexId),
      context.occurrenceIndex,
      context.observationIndex,
    ]);
  });
  t.makeRunner().run({ visitorPhases: { exclude: [Phase.VERTEX] } });
  expect(seen).toEqual([
    ['path', ['A'], 0, 0],
    ['edge', 1, 0, 0],
    ['path', ['A', 'B'], 1, 1],
    ['edge', 2, 1, 0],
  ]);
});

it('keeps previous configuration after invalid phase/group/merged-bound patches', () => {
  const seen: string[] = [];
  const t = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
    visitors: {
      vertex: () => {
        seen.push('original');
      },
    },
  });
  for (const patch of [
    { visitors: { ON_READY: [] } },
    {
      visitors: {
        vertex: {
          groups: [
            {
              visitors: [
                { visitor: () => undefined, commandCommitMode: 'afterGroup' },
              ],
            },
          ],
        },
      },
    },
    { revisit: 'walks' },
    { strategy: 'depthFirst', visitors: { edge: { groups: null } } },
  ])
    expect(() => t.configure(patch as never)).toThrow(TypeError);
  expect(() => t.addVisitorFor('ON_READY' as Phase, () => undefined)).toThrow(
    TypeError,
  );
  expect(() =>
    t.addVisitorGroupFor(Phase.VERTEX, { visitors: null } as never),
  ).toThrow(TypeError);
  expect(() => t.setVisitorsFor(Phase.VERTEX, null as never)).toThrow(
    TypeError,
  );
  t.makeRunner().run();
  expect(seen).toEqual(['original']);
});

it('snapshots registrations, source identities and factory configuration per runner', () => {
  const seen: string[] = [];
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  t.addVisitorFor(Phase.VERTEX, () => {
    seen.push('first');
  });
  const old = t.makeRunner();
  t.configure({
    source: idGraph(['B'], [['B', []]]),
    emitPhases: [Phase.PATH],
  });
  t.addVisitorFor(Phase.VERTEX, () => {
    seen.push('second');
  });
  expect([...old.getIterable()]).toMatchObject([
    { kind: 'vertex', vertex: { vertexId: 'A' } },
  ]);
  expect([...t.makeRunner().getIterable()]).toMatchObject([
    { kind: 'path', vertices: [{ vertexId: 'B' }] },
  ]);
  expect(seen).toEqual(['first', 'first', 'second']);
});

it('validates the whole command batch before applying HALT', () => {
  const seen: string[] = [];
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  t.addVisitorGroupFor(Phase.VERTEX, {
    commandCommitMode: 'afterGroup',
    visitors: [
      () => ({ commands: [{ commandName: C.HALT_TRAVERSAL }] }),
      () => {
        seen.push('invalid');
        return { commands: [{ commandName: C.DELETE_VERTEX }] } as never;
      },
    ],
  });
  const runner = t.makeRunner();
  expect(() => runner.run()).toThrow(TypeError);
  expect(seen).toEqual(['invalid']);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

it.each([
  null,
  false,
  0,
  'bad',
  [],
  { commands: null },
  { commands: {} },
  { commands: [null] },
  { commands: [false] },
  { commands: new Array<unknown>(1) },
  { commands: [{}] },
  { commands: [{ commandName: C.NOOP, commandArguments: {} }] },
  { commands: [{ commandName: C.HALT_TRAVERSAL, commandArguments: {} }] },
  { commands: [{ commandName: C.DEFER_READY }] },
])('rejects malformed visitor results and unsupported commands %#', (value) => {
  const t = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
    visitors: { vertex: () => value as never },
  });
  const runner = t.makeRunner();
  expect(() => runner.run()).toThrow(TypeError);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

it('accepts void, empty results, empty commands and NOOP without control changes', () => {
  const t = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
    visitors: {
      vertex: [
        () => undefined,
        () => ({}),
        () => ({ commands: [] }),
        () => ({ commands: [{ commandName: C.NOOP }] }),
      ],
    },
  });
  expect(t.makeRunner().run().getStatus()).toBe(Status.FINISHED);
});

it('defensively rejects thenables returned from synchronous visitors', async () => {
  const t = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
    visitors: { vertex: () => Promise.reject('async visitor') as never },
  });
  expect(() => t.makeRunner().run()).toThrow(TypeError);
  await Promise.resolve();
});

it('captures buffered command names before a later group callback mutates caller commands', () => {
  const command = {
    commandName: C.HALT_TRAVERSAL as C.HALT_TRAVERSAL | C.NOOP,
  };
  const seen: string[] = [];
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  t.addVisitorGroupFor(Phase.VERTEX, {
    commandCommitMode: 'afterGroup',
    visitors: [
      () => ({ commands: [command] }),
      () => {
        command.commandName = C.NOOP;
        seen.push('same group');
      },
    ],
  });
  t.addVisitorFor(Phase.VERTEX, () => {
    seen.push('next group');
  });
  const runner = t.makeRunner().run();
  expect(seen).toEqual(['same group']);
  expect(runner.getStatus()).toBe(Status.HALTED);
  runner.run();
  expect(seen).toEqual(['same group', 'next group']);
});

for (const Factory of [GraphWalk, AsyncGraphWalk]) {
  test(`${Factory.name} accepts explicit undefined arguments for shared parameterless commands`, async () => {
    const seen: string[] = [];
    const traversal = new Factory({ source: idGraph(['a'], [['a', []]]) });
    traversal.addVisitorFor(
      Phase.VERTEX,
      () =>
        ({
          commands: [
            { commandName: C.NOOP, commandArguments: undefined },
            { commandName: C.HALT_TRAVERSAL, commandArguments: undefined },
          ],
        } as never),
    );
    traversal.addVisitorFor(Phase.VERTEX, () => {
      seen.push('resumed');
    });
    const runner = traversal.makeRunner();
    await runner.run();
    expect(runner.isHalted()).toBe(true);
    await runner.run();
    expect(seen).toEqual(['resumed']);
    expect(runner.getStatus()).toBe(Status.FINISHED);
  });
}
