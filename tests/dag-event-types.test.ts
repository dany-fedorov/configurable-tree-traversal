import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase,
} from '../src/traversals/dag-traversal';

const identities = [undefined, null, NaN, { name: 'task' }, Symbol('task')];

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each(identities)(
    `${Constructor.name} keeps exact event identity %p and committed phase timing`,
    async (id) => {
      type G = VertexTypes<string, never>;
      const runner = new Constructor<G, G, typeof id>({
        workCompletion: 'externalSettlement',
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found',
            vertex: {
              vertexId: id,
              vertexContent: { $data: 'task', $childHints: [] },
            },
          }),
          resolveChild: () => ({
            kind: 'omitted',
            satisfiesDependencies: true,
          }),
        },
      }).createRunner();
      const before = [];
      for await (const event of runner.iterateEvents()) before.push(event);
      expect(before).toEqual([]);
      const record = runner.summary().awaitingSettlement[0]!;
      runner.settle(id, { kind: 'workCompleted' }, record.generation);
      const events = [];
      for await (const event of runner.iterateEvents()) {
        expect(event).toHaveProperty('vertexId');
        expect(event.vertexId).toBe(id);
        expect(event.vertexRef.getValue()).toBe(event.vertex);
        expect(runner.getResolvedGraph().getVertexId(event.vertexRef)).toBe(id);
        expect(event).not.toHaveProperty('order');
        expect(event).not.toHaveProperty('phase');
        events.push(event.kind);
      }
      expect(events).toEqual(['workCompleted', 'subgraphCompleted']);
    },
  );

  test(`${Constructor.name} seeded work emits only the selected completion event`, async () => {
    type G = VertexTypes<string, never>;
    const runner = new Constructor<G, G, string>({
      completedWork: new Set(['task']),
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: 'task',
            vertexContent: { $data: 'task', $childHints: [] },
          },
        }),
        resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents({
      emitEvents: ['subgraphCompleted'],
    })) {
      events.push([event.vertexId, event.kind]);
    }
    expect(events).toEqual([['task', 'subgraphCompleted']]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} tree-source events retain generated identity`, async () => {
    type G = VertexTypes<string, never>;
    const runner = new Constructor<G>({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: 'task', $childHints: [] } },
        }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner();
    const ids = [];
    for await (const event of runner.iterateEvents()) {
      expect(event.vertexId).toBe(
        runner.getResolvedGraph().getVertexId(event.vertexRef),
      );
      ids.push(event.vertexId);
    }
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} separates readiness callbacks from committed work observations`, async () => {
    type G = VertexTypes<string, never>;
    const calls: string[] = [];
    const runner = new Constructor<G, G, string>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: 'task',
            vertexContent: { $data: 'task', $childHints: [] },
          },
        }),
        resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
      visitors: {
        [DagVisitorPhase.ON_WORK_READY]: (_vertex, context) => {
          expect(context.phase).toBe(DagVisitorPhase.ON_WORK_READY);
          expect(context.visitorIndex).toBe(0);
          expect(context.phaseVisitIndex).toBe(0);
          expect(context.previousPhaseVertexRef).toBeNull();
          expect(context.registration).toHaveProperty('priority');
          expect(context).not.toHaveProperty('order');
          expect(runner.summary().completedWorkIds).toEqual([]);
          calls.push('ready');
        },
      },
    }).createRunner();
    for await (const event of runner.iterateEvents({
      emitEvents: ['workCompleted'],
    })) {
      expect(calls).toEqual(['ready']);
      expect(event.kind).toBe('workCompleted');
      expect(runner.summary().completedWorkIds).toEqual(['task']);
      calls.push(event.kind);
    }
    expect(calls).toEqual(['ready', 'workCompleted']);
    expect(runner.inspect().executionOptions.emitEvents).toEqual([
      'workCompleted',
    ]);
  });
}
