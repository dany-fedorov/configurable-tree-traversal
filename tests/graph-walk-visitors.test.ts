import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalVisitorCommandName as C,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkVisitor, GraphWalkVisitorContext } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it('runs mixed callbacks with emissions suppressed and unchanged source discovery', () => {
  const fixture = contextFixture();
  const seen: string[] = [];
  const traversal = new GraphWalkBuilder({
    graphWalkDiscoverySource: fixture.source,
  });
  traversal.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, (event) => {
    seen.push(`v:${event.vertex.vertexId}`);
  });
  traversal.registerVisitorForObservationKind(
    Phase.ADMITTED_EDGE_OCCURRENCE,
    (event) => {
      seen.push(
        `e:${event.fromVertex.vertexId}:${event.edge.sourceOutgoingLinkIndexBeforeFiltering}:${event.targetResolution.kind}`,
      );
    },
  );
  expect([
    ...traversal
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
      }),
  ]).toEqual([]);
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
  const traversal = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  traversal.appendVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    visitors: [
      () => {
        seen.push('first');
        return {
          commands: [
            { commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      },
      () => {
        seen.push('second');
      },
    ],
  });
  traversal.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    seen.push('third');
  });
  const runner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['first', 'second']);
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(runner.captureExecutionSnapshot().visitorChainPosition).toEqual({
    observationKind: Phase.VERTEX_OCCURRENCE,
    visitorIndexInObservationChain: 2,
  });
  runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['first', 'second', 'third']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

it('commits flat afterGroup batches at sorted mode boundaries and halts once per batch', () => {
  const seen: string[] = [];
  const traversal = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  for (const [descendingExecutionPriorityWithinGroup, mode, label] of [
    [1, 'afterContiguousVisitorBatch', 'tail'],
    [4, 'afterContiguousVisitorBatch', 'high'],
    [3, 'afterContiguousVisitorBatch', 'middle'],
    [2, 'afterEachVisitorCallback', 'each'],
  ] as const)
    traversal.registerVisitorForObservationKind(
      Phase.VERTEX_OCCURRENCE,
      () => {
        seen.push(label);
        return {
          commands: [
            { commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      },
      {
        descendingExecutionPriorityWithinGroup,
        visitorCommandCommitTiming: mode,
      },
    );
  const runner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['high', 'middle']);
  runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['high', 'middle', 'each']);
  runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['high', 'middle', 'each', 'tail']);
  expect(runner.isSuspended()).toBe(true);
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toMatchObject([
    { eventKind: 'vertexOccurrence', vertex: { vertexId: 'A' } },
  ]);
});

it('detaches list and context wrappers while preserving callback and group metadata identity', () => {
  const contexts: GraphWalkVisitorContext<Phase.VERTEX_OCCURRENCE>[] = [];
  const seen: string[] = [];
  const first: GraphWalkVisitor<
    string,
    undefined,
    Phase.VERTEX_OCCURRENCE,
    string
  > = (_event, context) => {
    contexts.push(context);
    expect('visitor' in context.visitorRegistrationMetadata).toBe(false);
    (
      context.visitorRegistrationMetadata as {
        descendingExecutionPriorityWithinGroup: number;
      }
    ).descendingExecutionPriorityWithinGroup = -1;
    seen.push('first');
  };
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  t.appendVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
    visitors: [first],
  });
  const listed = t.listVisitorRegistrationsForObservationKind(
    Phase.VERTEX_OCCURRENCE,
  );
  const group = listed[0]!.visitorGroup;
  expect(listed[0]!.visitor).toBe(first);
  t.replaceVisitorDefinitionsForObservationKind(Phase.VERTEX_OCCURRENCE, listed);
  listed[0]!.descendingExecutionPriorityWithinGroup = 999;
  listed.push({
    ...listed[0]!,
    visitor: () => {
      seen.push('wrong');
    },
  });
  t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
  t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['first', 'first']);
  expect(
    t.listVisitorRegistrationsForObservationKind(Phase.VERTEX_OCCURRENCE)[0]!
      .descendingExecutionPriorityWithinGroup,
  ).toBe(100);
  expect(contexts[0]!.visitorRegistrationMetadata.visitorGroup).toBe(group);
  expect(contexts[0]!.visitorRegistrationMetadata).not.toBe(
    contexts[1]!.visitorRegistrationMetadata,
  );
  expect(contexts[0]).toMatchObject({
    observationKind: Phase.VERTEX_OCCURRENCE,
    admittedTargetOccurrenceIndex: 0,
    observationIndexWithinKind: 0,
    visitorIndexInObservationChain: 0,
  });
});

it('supplies logical phase and occurrence indices independently of emission and visitor filters', () => {
  const seen: unknown[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    ),
    deliveredEventKinds: [],
  });
  t.registerVisitorForObservationKind(
    Phase.ADMITTED_EDGE_OCCURRENCE,
    (event, context) => {
      seen.push([
        event.eventKind,
        context.admittedTargetOccurrenceIndex,
        context.observationIndexWithinKind,
        context.visitorIndexInObservationChain,
      ]);
    },
  );
  t.registerVisitorForObservationKind(Phase.ROUTE_PREFIX, (event, context) => {
    seen.push([
      event.eventKind,
      event.verticesInRootToTargetOrder.map((v) => v.vertexId),
      context.admittedTargetOccurrenceIndex,
      context.observationIndexWithinKind,
    ]);
  });
  t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal({
    admittedVisitorCallbackPhases: { exclude: [Phase.VERTEX_OCCURRENCE] },
  });
  expect(seen).toEqual([
    ['routePrefix', ['A'], 0, 0],
    ['admittedEdgeOccurrence', 1, 0, 0],
    ['routePrefix', ['A', 'B'], 1, 1],
    ['admittedEdgeOccurrence', 2, 1, 0],
  ]);
});

it('keeps previous configuration after invalid phase/group/merged-bound patches', () => {
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    visitorsByObservationKind: {
      vertexOccurrence: () => {
        seen.push('original');
      },
    },
  });
  for (const patch of [
    { visitorsByObservationKind: { ON_WORK_READY: [] } },
    {
      visitorsByObservationKind: {
        vertexOccurrence: {
          groups: [
            {
              visitors: [
                {
                  visitor: () => undefined,
                  visitorCommandCommitTiming:
                    'afterContiguousVisitorBatch' as const,
                },
              ],
            },
          ],
        },
      },
    },
    { routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices' },
    {
      expansionOrder: 'depthFirst',
      visitorsByObservationKind: { admittedEdgeOccurrence: { groups: null } },
    },
  ])
    expect(() => t.patchOptionsForFutureRunners(patch as never)).toThrow(
      TypeError,
    );
  expect(() =>
    t.registerVisitorForObservationKind('ON_WORK_READY' as Phase, () => undefined),
  ).toThrow(TypeError);
  expect(() =>
    t.appendVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
      visitorsByObservationKind: null,
    } as never),
  ).toThrow(TypeError);
  expect(() =>
    t.replaceVisitorDefinitionsForObservationKind(Phase.VERTEX_OCCURRENCE, null as never),
  ).toThrow(TypeError);
  t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['original']);
});

it('snapshots registrations, source identities and factory configuration per runner', () => {
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    seen.push('first');
  });
  const old = t.createIndependentRunnerFromCurrentOptions();
  t.patchOptionsForFutureRunners({
    graphWalkDiscoverySource: idGraph(['B'], [['B', []]]),
    deliveredEventKinds: [Phase.ROUTE_PREFIX],
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    seen.push('second');
  });
  expect([
    ...old.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toMatchObject([
    { eventKind: 'vertexOccurrence', vertex: { vertexId: 'A' } },
  ]);
  expect([
    ...t
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toMatchObject([
    {
      eventKind: 'routePrefix',
      verticesInRootToTargetOrder: [{ vertexId: 'B' }],
    },
  ]);
  expect(seen).toEqual(['first', 'first', 'second']);
});

it('validates the whole command batch before applying HALT', () => {
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  t.appendVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    visitors: [
      () => ({
        commands: [
          { commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      }),
      () => {
        seen.push('invalid');
        return {
          commands: [
            {
              commandName:
                C.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        } as never;
      },
    ],
  });
  const runner = t.createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(TypeError);
  expect(seen).toEqual(['invalid']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
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
  { commands: [{ commandName: C.NO_OPERATION, commandArguments: {} }] },
  {
    commands: [
      {
        commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
        commandArguments: {},
      },
    ],
  },
  {
    commands: [
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
    ],
  },
])('rejects malformed visitor results and unsupported commands %#', (value) => {
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    visitorsByObservationKind: { vertexOccurrence: () => value as never },
  });
  const runner = t.createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(TypeError);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
});

it('accepts void, empty results, empty commands and NOOP without control changes', () => {
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    visitorsByObservationKind: {
      vertexOccurrence: [
        () => undefined,
        () => ({}),
        () => ({ commands: [] }),
        () => ({ commands: [{ commandName: C.NO_OPERATION }] }),
      ],
    },
  });
  expect(
    t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getTraversalLifecycleStatus(),
  ).toBe(Status.FINISHED);
});

it('defensively rejects thenables returned from synchronous visitors', async () => {
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    visitorsByObservationKind: {
      vertexOccurrence: () => Promise.reject('async visitor') as never,
    },
  });
  expect(() =>
    t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal(),
  ).toThrow(TypeError);
  await Promise.resolve();
});

it('captures buffered command names before a later group callback mutates caller commands', () => {
  const command = {
    commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY as
      | C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY
      | C.NO_OPERATION,
  };
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  t.appendVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    visitors: [
      () => ({ commands: [command] }),
      () => {
        command.commandName = C.NO_OPERATION;
        seen.push('same group');
      },
    ],
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    seen.push('next group');
  });
  const runner = t
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['same group']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['same group', 'next group']);
});

for (const Factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
  test(`${Factory.name} accepts explicit undefined arguments for shared parameterless commands`, async () => {
    const seen: string[] = [];
    const traversal = new Factory({
      graphWalkDiscoverySource: idGraph(['a'], [['a', []]]),
    });
    traversal.registerVisitorForObservationKind(
      Phase.VERTEX_OCCURRENCE,
      () =>
        ({
          commands: [
            { commandName: C.NO_OPERATION, commandArguments: undefined },
            {
              commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
              commandArguments: undefined,
            },
          ],
        } as never),
    );
    traversal.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
      seen.push('resumed');
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.isSuspended()).toBe(true);
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['resumed']);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  });
}
