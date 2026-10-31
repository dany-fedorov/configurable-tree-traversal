import {
  DagTraversal,
  AsyncDagTraversal,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  type DagVertexResolution,
  type VertexTypes,
} from '../src';

type T = VertexTypes<string, string>;
for (const Builder of [DagTraversal, AsyncDagTraversal]) {
  test.each([
    { kind: 'omitted', satisfiesDependencies: true },
    {
      kind: 'omitted',
      identity: null,
      vertexId: undefined,
      satisfiesDependencies: true,
    },
    { kind: 'omitted', identity: undefined, satisfiesDependencies: true },
    { kind: 'omitted', identity: 1, satisfiesDependencies: true },
    { kind: 'omitted', identity: [], satisfiesDependencies: true },
    { kind: 'omitted', identity: {}, satisfiesDependencies: true },
    {
      kind: 'omitted',
      identity: Object.create({ vertexId: 'inherited' }),
      satisfiesDependencies: true,
    },
  ])(
    `${Builder.name} rejects malformed or retired omission identity %#`,
    async (bad) => {
      const runner = new Builder<T>({
        traversableGraph: {
          resolveRoot: () => bad as unknown as DagVertexResolution<T>,
          resolveChild: () => ({
            kind: 'omitted',
            identity: null,
            satisfiesDependencies: true,
          }),
        },
      }).createRunner();
      await expect(
        Promise.resolve().then(async () => {
          await runner.run();
        }),
      ).rejects.toBeInstanceOf(TypeError);
    },
  );

  test.each([undefined, null, Symbol('identity failure')])(
    `${Builder.name} preserves an omission identity getter failure %#`,
    async (failure) => {
      const runner = new Builder<T>({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'omitted',
            get identity(): never {
              throw failure;
            },
            satisfiesDependencies: true,
          }),
          resolveChild: () => ({
            kind: 'omitted',
            identity: null,
            satisfiesDependencies: true,
          }),
        },
      }).createRunner();
      await expect(
        Promise.resolve().then(async () => {
          await runner.run();
        }),
      ).rejects.toBe(failure);
    },
  );
}
for (const Builder of [DepthFirstTreeTraversal, AsyncDepthFirstTreeTraversal]) {
  test(`${Builder.name} rejects graph identity before reading its value`, async () => {
    let reads = 0;
    const bad = {
      kind: 'omitted' as const,
      get identity() {
        reads++;
        return null;
      },
    };
    const runner = new Builder<T>({
      traversableTree: {
        resolveRoot: () => bad as never,
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner();
    await expect(
      Promise.resolve().then(async () => {
        await runner.run();
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(reads).toBe(0);
  });
}

for (const Builder of [DagTraversal, AsyncDagTraversal]) {
  test.each([false, true])(
    `${Builder.name} reads structural omission identity getters once (identified=%s)`,
    async (identified) => {
      let reads = 0;
      class Omission {
        get kind() {
          return 'omitted' as const;
        }
        get identity() {
          reads++;
          return identified ? { vertexId: undefined } : null;
        }
        get satisfiesDependencies() {
          return true as const;
        }
      }
      const runner = new Builder<T>({
        traversableGraph: {
          resolveRoot: () => new Omission(),
          resolveChild: () => ({
            kind: 'omitted',
            identity: null,
            satisfiesDependencies: true,
          }),
        },
        ...(identified ? { completedWork: new Set([undefined]) } : {}),
      }).createRunner();
      await runner.run();
      expect(reads).toBe(1);
      expect(runner.summary().unusedCompletedWorkIds).toEqual([]);
    },
  );
}
