import {
  graphWalk,
  GraphWalkPhase as Phase,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  walkGraph,
  walkGraphAsync,
} from '../src';
import {
  walkGraph as familyWalk,
  walkGraphAsync as familyWalkAsync,
} from '../src/traversals/graph-walk';
import { InternalAsyncGraphWalkRunner as AsyncGraphWalkRunner } from '../src/traversals/graph-walk/AsyncGraphWalkRunner';
import { InternalGraphWalkRunner as GraphWalkRunner } from '../src/traversals/graph-walk/GraphWalkRunner';
import { idGraph } from './helpers/graph-walk-fixtures';

it('runs canonical phase-keyed visitors and returns independent sync runners', () => {
  const source = idGraph(
    ['A'],
    [
      ['A', ['B']],
      ['B', []],
    ],
  );
  const seen: string[] = [];
  const runner = walkGraph({
    source,
    emitEvents: [],
    visitors: {
      [Phase.VERTEX]: (event) => {
        seen.push(`v:${event.vertex.data}`);
      },
      [Phase.EDGE]: (event) => {
        seen.push(`e:${event.edge.to}`);
      },
    },
  });
  expect(runner).toBeInstanceOf(GraphWalkRunner);
  expect(runner.getStatus()).toBe(Status.FINISHED);
  expect(seen).toEqual(['v:A', 'e:B', 'v:B']);
  expect(runner.summary().counts.uniqueFoundVertices).toBe(2);
  expect(walkGraph({ source })).not.toBe(runner);
  expect(familyWalk).toBe(walkGraph);
  expect(graphWalk.walkGraph).toBe(walkGraph);
});

it('awaits async visitors and returns the completed async runner', async () => {
  const seen: string[] = [];
  const runner = await walkGraphAsync({
    source: idGraph(
      ['A'],
      [
        ['A', ['B']],
        ['B', []],
      ],
    ),
    revisit: 'walks',
    limits: { maxDepth: 1 },
    emitEvents: [],
    visitors: {
      [Phase.VERTEX]: async (event) => {
        seen.push(`v:${event.vertex.data}`);
      },
      [Phase.EDGE]: async (event) => {
        seen.push(`e:${event.edge.to}`);
      },
      [Phase.PATH]: async (event) => {
        seen.push(`p:${event.depth}`);
      },
    },
  });
  expect(runner).toBeInstanceOf(AsyncGraphWalkRunner);
  expect(runner.getStatus()).toBe(Status.FINISHED);
  expect(seen).toEqual(['v:A', 'p:0', 'e:B', 'v:B', 'p:1']);
  expect(familyWalkAsync).toBe(walkGraphAsync);
  expect(graphWalk.walkGraphAsync).toBe(walkGraphAsync);
});

it('returns a halted sync runner that resumes after the admitted callback', () => {
  const seen: string[] = [];
  const runner = walkGraph({
    source: idGraph(['A'], [['A', []]]),
    visitors: {
      [Phase.VERTEX]: [
        () => {
          seen.push('halt');
          return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
        },
        () => {
          seen.push('tail');
        },
      ],
    },
  });
  expect(runner.getStopReason()).toBe('paused');
  expect(seen).toEqual(['halt']);
  expect(runner.run()).toBe(runner);
  expect(seen).toEqual(['halt', 'tail']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

it('returns a halted async runner that resumes after the admitted callback', async () => {
  const seen: string[] = [];
  const runner = await walkGraphAsync({
    source: idGraph(['A'], [['A', []]]),
    visitors: {
      [Phase.VERTEX]: [
        async () => {
          seen.push('halt');
          return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
        },
        async () => {
          seen.push('tail');
        },
      ],
    },
  });
  expect(runner.getStopReason()).toBe('paused');
  expect(seen).toEqual(['halt']);
  expect(await runner.run()).toBe(runner);
  expect(seen).toEqual(['halt', 'tail']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

it.each([null, undefined, { error: 'opaque' }])(
  'retains exact thrown and rejected values: %p',
  async (error) => {
    const source = idGraph(['A'], [['A', []]]);
    const throws = () => {
      throw error;
    };
    const unreadable = {
      get roots(): typeof source.roots {
        throw error;
      },
      outgoing: source.outgoing,
    };
    try {
      walkGraph({ source: unreadable });
      throw new Error('Expected constructor failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    await expect(walkGraphAsync({ source: unreadable })).rejects.toBe(error);
    try {
      walkGraph({ source: { ...source, roots: throws } });
      throw new Error('Expected sync source failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    try {
      walkGraph({ source, visitors: { [Phase.VERTEX]: throws } });
      throw new Error('Expected sync visitor failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    await expect(
      walkGraphAsync({
        source: {
          ...source,
          roots: async () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
    await expect(
      walkGraphAsync({
        source,
        visitors: {
          [Phase.VERTEX]: async () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  },
);
