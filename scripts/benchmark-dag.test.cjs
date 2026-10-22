const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const script = path.join(__dirname, 'benchmark-dag.cjs');
const benchmark = existsSync(script) ? require(script) : {};
const library = require('../dist');

// Catch omitted/duplicated edges and edges pointing to later IDs with hand-derived facts.
const cases = [
  ['chain', 6, ['v0'], ['v3']],
  [
    'independent',
    0,
    ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
    ['v3', 'v4', 'v5', 'v6'],
  ],
  ['diamond', 8, ['v0'], ['v3']],
  ['sparse', 7, ['v0'], ['v3', 'v4', 'v5']],
  ['bounded-dense', 21, ['v0'], ['v3']],
];
for (const [shape, edges, empty, prefix] of cases) {
  test(`${shape}: deterministic seven-vertex facts and empty/prefix frontiers`, () => {
    assert.equal(typeof benchmark.buildFixture, 'function');
    const fixture = benchmark.buildFixture(shape, 7);
    assert.deepEqual(benchmark.buildFixture(shape, 7), fixture);
    assert.equal(fixture.ids.length, 7);
    assert.equal(fixture.edgeCount, edges);
    fixture.prerequisites.forEach((dependencies, to) => {
      assert.equal(new Set(dependencies).size, dependencies.length);
      dependencies.forEach((from) => assert.ok(fixture.ids.indexOf(from) < to));
    });
    for (const [completed, expected] of [
      [[], empty],
      [['v0', 'v1', 'v2'], prefix],
    ]) {
      assert.deepEqual(
        benchmark.kahnFrontier(fixture, new Set(completed)).readyIds,
        expected,
      );
      const inspection = benchmark.createInspection(
        library,
        fixture,
        new Set(completed),
      );
      inspection.runner.run();
      const before = inspection.runner.summary();
      assert.deepEqual(before.readyIds, expected);
      assert.deepEqual(before.completedWorkIds, completed);
      assert.equal(before.discovery.complete, true);
      assert.equal(before.counts.discovered, 7);
      assert.equal(before.counts.deferred, expected.length);
      assert.equal(inspection.counters.root, 1);
      assert.equal(inspection.counters.vertex, 7);
      assert.equal(inspection.counters.ready, expected.length);
      const calls = { ...inspection.counters };
      const status = inspection.runner.getStatus();
      for (let i = 0; i < 4; i++)
        assert.deepEqual(inspection.runner.summary(), before);
      assert.deepEqual(inspection.counters, calls);
      assert.equal(inspection.runner.getStatus(), status);
    }
  });
}

test('Kahn baseline handles hand-written disconnected prerequisites and supplied seeds', () => {
  assert.equal(typeof benchmark.kahnFrontier, 'function');
  const fixture = {
    ids: ['a', 'b', 'c', 'd', 'e'],
    prerequisites: [[], [], ['a', 'b'], ['c'], []],
  };
  assert.deepEqual(benchmark.kahnFrontier(fixture, new Set()).readyIds, [
    'a',
    'b',
    'e',
  ]);
  assert.deepEqual(
    benchmark.kahnFrontier(fixture, new Set(['a', 'b'])).readyIds,
    ['c', 'e'],
  );
  assert.deepEqual(
    benchmark.kahnFrontier(fixture, new Set(fixture.ids)).readyIds,
    [],
  );
});

test('dense fixture bounds fan-in and CLI rejects unsafe or unbounded workloads', () => {
  assert.equal(typeof benchmark.buildFixture, 'function');
  const fixture = benchmark.buildFixture('bounded-dense', 100);
  assert.equal(fixture.edgeCount, 2672); // 1+...+31 + 68*32
  assert.ok(
    fixture.prerequisites.every((dependencies) => dependencies.length <= 32),
  );
  for (const args of [
    ['--vertices', '0'],
    ['--vertices', '1.5'],
    ['--vertices', '10001'],
    ['--vertices', '9007199254740992'],
    ['--samples', '-1'],
    ['--samples', '101'],
    ['--summary-iterations', '0'],
    ['--summary-iterations', '10001'],
    ['--vertices'],
    ['--unknown', '1'],
  ]) {
    const child = spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
    });
    assert.equal(child.status, 1, `${args}: ${child.stderr}`);
    assert.match(
      child.stderr,
      /positive integer|Unknown option|requires a value/,
    );
  }
});

test('CLI emits artifact-linked JSON and checks every shape with both seeds', () => {
  const child = spawnSync(
    process.execPath,
    [script, '--vertices', '7', '--samples', '1', '--summary-iterations', '2'],
    { encoding: 'utf8' },
  );
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.artifact.version, '0.9.0');
  assert.equal(result.policy.warmupsPerCase, 1);
  assert.equal(result.cases.length, 10);
  for (const entry of result.cases) {
    assert.equal(entry.samples.length, 1);
    assert.equal(entry.vertices, 7);
    assert.equal(entry.samples[0].callbacks.vertex, 7);
    assert.equal(entry.samples[0].callbacks.ready, entry.frontierCount);
    assert.ok(Number.isFinite(entry.samples[0].timings.summaryBatchMs));
    assert.equal(entry.samples[0].summaryIterations, 2);
  }
});

test('explicit artifact selection and one-vertex empty/prefix cases remain distinguishable', () => {
  const child = spawnSync(
    process.execPath,
    [
      script,
      '--vertices',
      '1',
      '--samples',
      '1',
      '--summary-iterations',
      '1',
      '--library-path',
      path.resolve(__dirname, '../dist'),
    ],
    { encoding: 'utf8' },
  );
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.artifact.realEntryPath, require.resolve('../dist'));
  assert.deepEqual(
    result.cases.slice(0, 2).map((entry) => entry.seed),
    [
      { kind: 'empty', count: 0 },
      { kind: 'prefix', count: 0 },
    ],
  );
});
