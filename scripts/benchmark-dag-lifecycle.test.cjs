const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const script = path.join(__dirname, 'benchmark-dag-lifecycle.cjs');
const benchmark = existsSync(script) ? require(script) : {};
const library = require('../dist');
const { buildFixture } = require('./benchmark-dag.cjs');

// Catch wrong settlement generations, frontier advancement, summary effects and reconstruction facts.
for (const mode of ['sync', 'async']) {
  for (const discovery of ['eager', 'lazy']) {
    for (const [shape, prerequisites, frontiers] of [
      ['chain', [[], ['a'], ['b']], [['a'], ['b'], ['c'], []]],
      [
        'diamond',
        [[], ['a'], ['a'], ['b', 'c']],
        [['a'], ['b', 'c'], ['c'], ['d'], []],
      ],
      ['independent', [[], [], []], [['a', 'b', 'c'], ['b', 'c'], ['c'], []]],
    ]) {
      test(`${mode}/${discovery}/${shape}: each accepted fact advances the hand-derived frontier`, async () => {
        assert.equal(typeof benchmark.createLifecycleInspection, 'function');
        const fixture = {
          ids: ['a', 'b', 'c', 'd'].slice(0, prerequisites.length),
          prerequisites,
        };
        const completed = new Set();
        const inspection = benchmark.createLifecycleInspection(
          library,
          fixture,
          completed,
          { mode, discovery, concurrency: 2 },
        );
        await inspection.runner.run();
        for (let step = 0; step < frontiers.length; step++) {
          const snapshot = inspection.runner.summary();
          assert.equal(
            snapshot.discovery.complete,
            discovery === 'eager' ||
              shape === 'independent' ||
              step >= frontiers.length - 2,
          );
          assert.deepEqual(snapshot.readyOrDeferredIds, frontiers[step]);
          assert.deepEqual(
            [...snapshot.completedWorkIds].sort(),
            [...completed].sort(),
          );
          const old = structuredClone({
            readyOrDeferredIds: snapshot.readyOrDeferredIds,
            counts: snapshot.counts,
          });
          const calls = { ...inspection.counters };
          const status = inspection.runner.getStatus();
          assert.deepEqual(inspection.runner.summary(), snapshot);
          assert.deepEqual(inspection.counters, calls);
          assert.equal(inspection.runner.getStatus(), status);
          const rebuilt = benchmark.createLifecycleInspection(
            library,
            fixture,
            completed,
            { mode, discovery, concurrency: 2 },
          );
          await rebuilt.runner.run();
          const reconstructed = rebuilt.runner.summary();
          assert.deepEqual(reconstructed.readyOrDeferredIds, snapshot.readyOrDeferredIds);
          assert.deepEqual(reconstructed.counts, snapshot.counts);
          assert.deepEqual(
            [...reconstructed.completedWorkIds].sort(),
            [...completed].sort(),
          );
          if (frontiers[step].length) {
            const id = frontiers[step][0];
            assert.equal(
              inspection.runner.settle(
                id,
                { ok: true },
                snapshot.vertices.get(id).generation,
              ),
              true,
            );
            completed.add(id);
            await inspection.runner.run();
            assert.deepEqual(
              { readyOrDeferredIds: snapshot.readyOrDeferredIds, counts: snapshot.counts },
              old,
            );
          }
        }
      });
    }
  }
}

// Catch unbounded workloads before any runner is constructed.
test('CLI validates every workload count, missing values and unknown flags', () => {
  assert.equal(typeof benchmark.parseArguments, 'function');
  for (const [flag, maximum] of [
    ['--vertices', 10000],
    ['--samples', 100],
    ['--summary-iterations', 10000],
    ['--ticks', 100],
    ['--batch', 10000],
    ['--concurrency', 1000],
  ]) {
    for (const value of [
      '0',
      '-1',
      '1.5',
      '9007199254740992',
      String(maximum + 1),
      'NaN',
    ])
      assert.throws(
        () => benchmark.parseArguments([flag, value]),
        /positive integer/,
      );
    assert.throws(() => benchmark.parseArguments([flag]), /requires a value/);
    benchmark.parseArguments([flag, String(maximum)]);
  }
  assert.throws(
    () => benchmark.parseArguments(['--unknown', '1']),
    /Unknown option/,
  );
  assert.throws(
    () => benchmark.parseArguments(['--ticks', '--batch']),
    /requires a value/,
  );
});

// Catch capped tick loops that misreport completion or settle IDs outside the chosen frontier.
test('bounded samples report actual settlements, completion, seeds and per-tick reconstruction', async () => {
  assert.equal(typeof benchmark.runLifecycleSample, 'function');
  for (const mode of ['sync', 'async']) {
    for (const discovery of ['eager', 'lazy']) {
      const options = {
        mode,
        discovery,
        ticks: 5,
        batch: 2,
        concurrency: 2,
        summaryIterations: 2,
      };
      const sample = await benchmark.runLifecycleSample(
        library,
        buildFixture('independent', 3),
        new Set(),
        options,
      );
      assert.equal(sample.ticks.length, 2);
      assert.equal(sample.actualSettledCount, 3);
      assert.equal(sample.completed, true);
      assert.equal(sample.stoppedEarly, true);
      assert.deepEqual(
        sample.ticks.map((t) => t.acceptedIds),
        [['v0', 'v1'], ['v2']],
      );
      assert.deepEqual(
        sample.ticks.map((t) => t.completedCount),
        [2, 3],
      );
      assert.deepEqual(
        sample.ticks.map((t) => t.frontierIds),
        [['v2'], []],
      );
      assert.equal(sample.callbacks.retained.vertex, 3);
      assert.equal(sample.callbacks.retained.ready, 3);
      assert.ok(
        sample.ticks.every((t) => t.reconstructionCallbacks.vertex === 3),
      );
      assert.ok(
        sample.ticks.every((t) => t.frontierScope === 'complete-catalog'),
      );
      assert.ok(Object.values(sample.timings).every(Number.isFinite));
      const bounded = await benchmark.runLifecycleSample(
        library,
        buildFixture('chain', 7),
        new Set(['v0']),
        options,
      );
      assert.equal(
        bounded.initial.frontierScope,
        discovery === 'eager' ? 'complete-catalog' : 'partial-discovery',
      );
      assert.equal(bounded.actualSettledCount, 5);
      assert.equal(bounded.completed, false);
      assert.equal(bounded.stoppedEarly, false);
      assert.deepEqual(bounded.ticks.at(-1).frontierIds, ['v6']);
    }
  }
});

// Catch summaries incorrectly labeling not-yet-discovered lazy catalog data as globally complete.
test('initial lazy inspection is explicitly partial and summaries do not discover work', () => {
  assert.equal(typeof benchmark.createLifecycleInspection, 'function');
  const inspection = benchmark.createLifecycleInspection(
    library,
    buildFixture('chain', 3),
    new Set(),
    { mode: 'sync', discovery: 'lazy', concurrency: 2 },
  );
  const before = { ...inspection.counters };
  assert.equal(inspection.runner.summary().discovery.complete, false);
  assert.deepEqual(inspection.counters, before);
});

test('CLI loads directory or entry and emits bounded artifact-linked JSON for every case', () => {
  for (const libraryPath of [
    path.resolve(__dirname, '..'),
    require.resolve('../dist'),
  ]) {
    const child = spawnSync(
      process.execPath,
      [
        script,
        '--vertices',
        '3',
        '--samples',
        '1',
        '--summary-iterations',
        '1',
        '--ticks',
        '5',
        '--batch',
        '2',
        '--concurrency',
        '2',
        '--library-path',
        libraryPath,
      ],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout);
    assert.equal(result.artifact.version, require('../package.json').version);
    assert.equal(result.artifact.realEntryPath, require.resolve('../dist'));
    assert.match(result.artifact.treeSha256, /^[0-9a-f]{64}$/);
    assert.ok(result.artifact.files.length > 1);
    assert.equal(result.policy.warmupsPerCase, 1);
    assert.equal(result.policy.warmupsIncludedInStatistics, false);
    assert.equal(result.cases.length, 40);
    assert.equal(result.command[0], process.execPath);
    for (const entry of result.cases) {
      assert.equal(entry.vertices, 3);
      assert.equal(entry.samples.length, 1);
      assert.ok(entry.samples[0].ticks.length <= 5);
      assert.equal(
        entry.statisticsMs.initialRunMs.min,
        entry.samples[0].timings.initialRunMs,
      );
      assert.ok(entry.tickStatisticsMs.length <= 5);
    }
  }
  const child = spawnSync(process.execPath, [script, '--vertices', '0'], {
    encoding: 'utf8',
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /positive integer/);
});
