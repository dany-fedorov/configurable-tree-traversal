import {
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
} from '../src/traversals/dag-traversal/prepareDag';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';

type G = VertexDataAndChildHintTypes<string, string>;

for (const prepare of [
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
]) {
  test(`${prepare.name} preserves non-enumerable own undefined identity`, async () => {
    const vertex = Object.defineProperty(
      { vertexContentInput: { $vertexData: 'task', $childDiscoveryHints: [] } },
      'vertexId',
      { value: undefined },
    );
    const result = await prepare<G, unknown>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: vertex,
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid DAG');
    expect(
      result.validatedTopology.liveVertexSummaries.map(
        (entry) => entry.vertexId,
      ),
    ).toEqual([undefined]);
    expect(
      result.validatedTopology
        .createIndependentRunnerFromValidatedTopology({
          acceptedCompletedWorkVertexIds: new Set([undefined]),
        })
        .runUntilSuspendedOrTerminal()
        .captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([undefined]);
  });

  test(`${prepare.name} rejects own non-enumerable priority without reading it`, async () => {
    const vertex = Object.defineProperty(
      {
        vertexId: 'task',
        vertexContentInput: { $vertexData: 'task', $childDiscoveryHints: [] },
      },
      'priority',
      {
        get() {
          throw new Error('The engine checks presence, not priority value');
        },
      },
    );
    await expect(async () => {
      await prepare<G, string>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: vertex,
          }),
          resolveChildVertexFromHint: () => ({
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
            kind: 'vertexIntentionallyOmitted',
          }),
        },
      });
    }).rejects.toThrow(/priority metadata is not supported/);
  });

  test.each([
    'vertexId',
    'workWaitsForWorkOf',
    'workWaitsForSubgraphCompletionOf',
  ])(
    `${prepare.name} preserves exact non-enumerable %s getter errors`,
    async (field) => {
      const error = { field };
      const vertex = Object.defineProperty(
        {
          vertexId: 'task',
          vertexContentInput: { $vertexData: 'task', $childDiscoveryHints: [] },
        },
        field,
        {
          enumerable: false,
          get() {
            throw error;
          },
        },
      );
      await expect(async () => {
        await prepare<G, string>({
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved',
              resolvedVertexInput: vertex,
            }),
            resolveChildVertexFromHint: () => ({
              omittedVertexIdentity: null,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              kind: 'vertexIntentionallyOmitted',
            }),
          },
        });
      }).rejects.toBe(error);
    },
  );

  test(`${prepare.name} preserves inherited content and both dependency kinds`, async () => {
    class Entry {
      constructor(readonly vertexId: string) {}
      get vertexContentInput() {
        return {
          $vertexData: this.vertexId,
          $childDiscoveryHints: this.vertexId === 'root' ? ['a', 'b', 'c'] : [],
        };
      }
      get workWaitsForWorkOf() {
        return this.vertexId === 'b' ? ['a'] : [];
      }
      get workWaitsForSubgraphCompletionOf() {
        return this.vertexId === 'c' ? ['b'] : [];
      }
    }
    const source: DagDiscoverySource<G, G, string> = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: new Entry('root'),
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved',
        resolvedVertexInput: new Entry(id),
      }),
    };
    const result = await prepare<G, string>({ dagDiscoverySource: source });
    if (result.kind !== 'valid') throw new Error('Expected valid DAG');
    expect(
      result.validatedTopology.liveVertexSummaries.map(
        ({
          vertexId,
          workWaitsForWorkOf: workWaitsForWorkOf,
          workWaitsForSubgraphCompletionOf: workWaitsForSubgraphCompletionOf,
        }) => [vertexId, workWaitsForWorkOf, workWaitsForSubgraphCompletionOf],
      ),
    ).toEqual([
      ['root', [], []],
      ['a', [], []],
      ['b', ['a'], []],
      ['c', [], ['b']],
    ]);
    expect(
      result.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .runUntilSuspendedOrTerminal()
        .captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root', 'a', 'b', 'c']);
  });
}

for (const prepare of [
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
]) {
  test.each([false, true])(
    `${prepare.name} ignores inherited hint identity without reading its getter (%s)`,
    async (throwingGetter) => {
      const prototype = throwingGetter
        ? {
            get vertexId(): string {
              throw new Error('Inherited hint identity must not be read');
            },
          }
        : { vertexId: 'wrong' };
      const inherited = Object.create(prototype) as { vertexId: string };
      const result = await prepare<G, string>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['b'],
              },
            },
          }),
          tryGetVertexIdentityFromHint: () => inherited,
          resolveChildVertexFromHint: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: 'b',
              vertexContentInput: {
                $vertexData: 'b',
                $childDiscoveryHints: [],
              },
            },
          }),
        },
      });
      if (result.kind !== 'valid') throw new Error('Expected valid DAG');
      expect(
        result.validatedTopology.liveVertexSummaries.map(
          ({ vertexId }) => vertexId,
        ),
      ).toEqual(['root', 'b']);
      expect(
        result.validatedTopology
          .createIndependentRunnerFromValidatedTopology()
          .runUntilSuspendedOrTerminal()
          .captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['root', 'b']);
    },
  );

  test.each([undefined, 'omitted'])(
    `${prepare.name} retains non-enumerable own hint identity %s for omitted work`,
    async (id) => {
      const wrapper = Object.defineProperty({}, 'vertexId', { value: id }) as {
        vertexId: typeof id;
      };
      const result = await prepare<G, unknown>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['skip', 'b'],
              },
            },
          }),
          tryGetVertexIdentityFromHint: (hint) =>
            hint === 'skip' ? wrapper : { vertexId: hint },
          resolveChildVertexFromHint: (hint) =>
            hint === 'skip'
              ? {
                  omittedVertexIdentity: null,
                  kind: 'vertexIntentionallyOmitted',
                  satisfiesWorkAndSubgraphCompletionPrerequisites: true,
                }
              : {
                  kind: 'vertexResolved',
                  resolvedVertexInput: {
                    vertexId: 'b',
                    workWaitsForWorkOf: [id],
                    vertexContentInput: {
                      $vertexData: 'b',
                      $childDiscoveryHints: [],
                    },
                  },
                },
        },
      });
      if (result.kind !== 'valid') throw new Error('Expected valid DAG');
      expect(
        result.validatedTopology.liveVertexSummaries.map(
          ({ vertexId, workWaitsForWorkOf: workWaitsForWorkOf }) => [
            vertexId,
            workWaitsForWorkOf,
          ],
        ),
      ).toEqual([
        ['root', []],
        ['b', [id]],
      ]);
      const runner =
        result.validatedTopology.createIndependentRunnerFromValidatedTopology({
          acceptedCompletedWorkVertexIds: new Set([id]),
        });
      expect(
        runner.runUntilSuspendedOrTerminal().captureProgressSnapshot()
          .workCompletionCommittedVertexIds,
      ).toEqual(['root', 'b']);
    },
  );
}
