const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { buildFixture, kahnFrontier } = require('./benchmark-dag.cjs');

const SHAPES = ['chain', 'independent', 'diamond', 'sparse', 'bounded-dense'];

function parseArguments(args) {
  const options = {
    vertices: 100,
    samples: 3,
    summaryIterations: 10,
    ticks: 5,
    batch: 64,
    concurrency: 4,
    libraryPath: path.resolve(__dirname, '../dist'),
  };
  const flags = {
    '--vertices': ['vertices', 10000],
    '--samples': ['samples', 100],
    '--summary-iterations': ['summaryIterations', 10000],
    '--ticks': ['ticks', 100],
    '--batch': ['batch', 10000],
    '--concurrency': ['concurrency', 1000],
    '--library-path': ['libraryPath'],
  };
  for (let i = 0; i < args.length; i += 2) {
    const spec = flags[args[i]];
    if (!spec) throw new TypeError(`Unknown option: ${args[i]}`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--'))
      throw new TypeError(`${args[i]} requires a value`);
    if (spec[0] === 'libraryPath') options.libraryPath = path.resolve(value);
    else {
      const number = Number(value);
      if (
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(number) ||
        number < 1 ||
        number > spec[1]
      )
        throw new TypeError(
          `${args[i]} must be a positive integer <= ${spec[1]}`,
        );
      options[spec[0]] = number;
    }
  }
  return options;
}

function createLifecycleInspection(library, fixture, completed, options) {
  const counters = { root: 0, vertex: 0, ready: 0 };
  const indexes = new Map(fixture.ids.map((id, i) => [id, i]));
  const TreeTraversal =
    options.mode === 'async' ? library.AsyncDagTraversal : library.DagTraversal;
  const traversal = new TreeTraversal({
    discovery: options.discovery,
    syntheticRoot: true,
    completedWork: new Set(completed),
    ...(options.mode === 'async' ? { concurrency: options.concurrency } : {}),
    traversableGraph: {
      resolveRoot: () => {
        counters.root++;
        return { vertexContent: { $d: 'catalog', $c: fixture.ids } };
      },
      resolveChild: (id) => {
        counters.vertex++;
        return {
          vertexId: id,
          dependsOnWork: fixture.prerequisites[indexes.get(id)],
          vertexContent: { $d: id, $c: [] },
        };
      },
    },
  });
  const visit = () => {
    counters.ready++;
    return library.DEFER_READY;
  };
  traversal.addVisitorFor(
    library.DagVisitorPhase.ON_WORK_READY,
    options.mode === 'async'
      ? async () => {
          await Promise.resolve();
          return visit();
        }
      : visit,
  );
  return { runner: traversal.createRunner(), counters };
}

async function timeRun(inspection, mode) {
  const start = performance.now();
  if (mode === 'async') await inspection.runner.run();
  else inspection.runner.run();
  return performance.now() - start;
}

// A bounded copy preserves generation identities but detaches mutable containers.
function copySnapshot(snapshot) {
  return {
    ...snapshot,
    discovery: { ...snapshot.discovery },
    counts: { ...snapshot.counts },
    vertices: new Map(
      [...snapshot.vertices].map(([id, vertex]) => [
        id,
        { ...vertex, unmetPrerequisiteIds: [...vertex.unmetPrerequisiteIds] },
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(snapshot)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, [...value]]),
    ),
  };
}

function measureSummaries(inspection, iterations) {
  const { runner, counters } = inspection;
  const before = runner.summary();
  const calls = { ...counters };
  const status = runner.getStatus();
  let last;
  let consumed = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    last = runner.summary();
    consumed += last.vertices.size;
  }
  const summaryBatchMs = performance.now() - start;
  assert.equal(consumed, before.vertices.size * iterations);
  assert.deepEqual(last, before);
  assert.deepEqual(runner.summary(), before);
  assert.deepEqual(counters, calls);
  assert.equal(runner.getStatus(), status);
  return {
    snapshot: last,
    timings: { summaryBatchMs, summaryPerCallMs: summaryBatchMs / iterations },
  };
}

function assertBoundary(inspection, snapshot, fixture, completed) {
  // Keep every prerequisite in the full oracle; project only its ready IDs onto visibility.
  // The flat catalog resolves all declarations even while lazy expansion remains open.
  assert.equal(snapshot.counts.discovered, fixture.ids.length);
  assert.equal(snapshot.diagnostics, null);
  assert.equal(snapshot.counts.activeVisitorVertices, 0);
  assert.equal(snapshot.counts.workCompleted, completed.size);
  assert.deepEqual(new Set(snapshot.completedWorkIds), completed);
  assert.deepEqual(snapshot.unusedCompletedWorkIds, []);
  const ready = kahnFrontier(fixture, completed).readyIds.filter((id) =>
    snapshot.vertices.has(id),
  );
  assert.deepEqual(new Set(snapshot.readyOrDeferredIds), new Set(ready));
  assert.deepEqual(new Set(snapshot.deferredWorkIds), new Set(ready));
  assert.equal(snapshot.counts.deferredWork, ready.length);
  assert.equal(inspection.counters.root, 1);
  assert.equal(inspection.counters.vertex, fixture.ids.length);
  return ready; // Fixture order supplies a deterministic rank outside timing.
}

function assertReconstructed(retained, reconstructed) {
  assert.deepEqual(reconstructed.counts, retained.counts);
  for (const key of [
    'readyOrDeferredIds',
    'deferredWorkIds',
    'completedWorkIds',
    'completedSubgraphIds',
  ])
    assert.deepEqual(new Set(reconstructed[key]), new Set(retained[key]));
  for (const [id, progress] of retained.vertices) {
    const rebuilt = reconstructed.vertices.get(id);
    assert.equal(rebuilt.work, progress.work);
    assert.equal(rebuilt.subgraphComplete, progress.subgraphComplete);
    assert.deepEqual(
      rebuilt.unmetPrerequisiteIds,
      progress.unmetPrerequisiteIds,
    );
    if (progress.generation !== undefined)
      assert.notEqual(rebuilt.generation, progress.generation);
  }
}

async function runLifecycleSample(library, fixture, seeds, options) {
  const completed = new Set(seeds);
  let start = performance.now();
  const retained = createLifecycleInspection(
    library,
    fixture,
    completed,
    options,
  );
  const runnerConstructionMs = performance.now() - start;
  const beforeDiscovery = retained.runner.summary();
  assert.equal(beforeDiscovery.discovery.complete, false);
  assert.deepEqual(retained.counters, { root: 0, vertex: 0, ready: 0 });
  const initialRunMs = await timeRun(retained, options.mode);
  const initial = measureSummaries(retained, options.summaryIterations);
  let snapshot = initial.snapshot;
  let frontier = assertBoundary(retained, snapshot, fixture, completed);
  const result = {
    seedIds: [...seeds],
    preRunFrontierScope: 'partial-discovery',
    initial: {
      frontierIds: frontier,
      completedCount: completed.size,
      discoveryComplete: snapshot.discovery.complete,
      frontierScope: snapshot.discovery.complete
        ? 'complete-catalog'
        : 'partial-discovery',
    },
    summaryIterations: options.summaryIterations,
    timings: { runnerConstructionMs, initialRunMs, ...initial.timings },
    ticks: [],
  };
  let actualSettledCount = 0;
  for (
    let tick = 0;
    tick < options.ticks && completed.size < fixture.ids.length;
    tick++
  ) {
    const saved = copySnapshot(snapshot);
    const acceptedIds = frontier.slice(0, options.batch);
    assert.ok(
      acceptedIds.length > 0,
      'incomplete acyclic catalog must have a frontier',
    );
    // Ranking, token lookup, fact updates and assertions are excluded from settlement timing.
    const settlements = acceptedIds.map((id) => [
      id,
      snapshot.vertices.get(id).generation,
    ]);
    const accepted = [];
    start = performance.now();
    for (const [id, generation] of settlements)
      accepted.push(retained.runner.settle(id, { ok: true }, generation));
    const settlementBatchMs = performance.now() - start;
    assert.ok(accepted.every((value) => value === true));
    acceptedIds.forEach((id) => completed.add(id));
    actualSettledCount += acceptedIds.length;
    const resumedRunMs = await timeRun(retained, options.mode);
    assert.deepEqual(
      snapshot,
      saved,
      'previous public snapshot must remain unchanged',
    );
    const summaries = measureSummaries(retained, options.summaryIterations);
    snapshot = summaries.snapshot;
    frontier = assertBoundary(retained, snapshot, fixture, completed);
    start = performance.now();
    const rebuilt = createLifecycleInspection(
      library,
      fixture,
      completed,
      options,
    );
    const reconstructionSetupMs = performance.now() - start;
    const reconstructionRunMs = await timeRun(rebuilt, options.mode);
    const reconstructionSummaries = measureSummaries(
      rebuilt,
      options.summaryIterations,
    );
    assertBoundary(
      rebuilt,
      reconstructionSummaries.snapshot,
      fixture,
      completed,
    );
    assertReconstructed(snapshot, reconstructionSummaries.snapshot);
    result.ticks.push({
      tick: tick + 1,
      acceptedIds,
      settledCount: acceptedIds.length,
      cumulativeSettledCount: actualSettledCount,
      completedCount: completed.size,
      frontierIds: frontier,
      frontierScope: snapshot.discovery.complete
        ? 'complete-catalog'
        : 'partial-discovery',
      discoveryComplete: snapshot.discovery.complete,
      reconstructionDiscoveryComplete:
        reconstructionSummaries.snapshot.discovery.complete,
      callbacks: { ...retained.counters },
      reconstructionCallbacks: { ...rebuilt.counters },
      timings: {
        settlementBatchMs,
        settlementPerAcceptedMs: settlementBatchMs / acceptedIds.length,
        resumedRunMs,
        ...summaries.timings,
        reconstructionSetupMs,
        reconstructionRunMs,
        reconstructionTotalMs: reconstructionSetupMs + reconstructionRunMs,
        reconstructionSummaryBatchMs:
          reconstructionSummaries.timings.summaryBatchMs,
        reconstructionSummaryPerCallMs:
          reconstructionSummaries.timings.summaryPerCallMs,
      },
    });
  }
  result.actualSettledCount = actualSettledCount;
  result.completed = completed.size === fixture.ids.length;
  result.stoppedEarly = result.completed && result.ticks.length < options.ticks;
  result.callbacks = { retained: { ...retained.counters } };
  return result;
}

function statistics(records) {
  const result = {};
  for (const key of Object.keys(records[0].timings)) {
    const sorted = records
      .map((record) => record.timings[key])
      .sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    result[key] = {
      median:
        sorted.length % 2
          ? sorted[middle]
          : (sorted[middle - 1] + sorted[middle]) / 2,
      min: sorted[0],
      max: sorted.at(-1),
    };
  }
  return result;
}

function artifactMetadata(entryPath) {
  let directory = path.dirname(entryPath);
  while (!fs.existsSync(path.join(directory, 'package.json'))) {
    const parent = path.dirname(directory);
    if (parent === directory)
      throw new Error('Cannot find loaded artifact package.json');
    directory = parent;
  }
  const manifestPath = path.join(directory, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sha = (data) => createHash('sha256').update(data).digest('hex');
  const artifactRoot = fs.existsSync(path.join(directory, 'dist'))
    ? path.join(directory, 'dist')
    : path.dirname(entryPath);
  const files = [];
  function visit(current) {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const filename = path.join(current, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile())
        files.push({
          path: path.relative(artifactRoot, filename).split(path.sep).join('/'),
          sha256: sha(fs.readFileSync(filename)),
        });
    }
  }
  visit(artifactRoot);
  let checkoutCommit = null;
  try {
    checkoutCommit = execFileSync(
      'git',
      ['-C', directory, 'rev-parse', 'HEAD'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
  } catch {
    /* Extracted packages need not have Git metadata. */
  }
  return {
    entryPath,
    realEntryPath: fs.realpathSync(entryPath),
    manifestPath,
    name: manifest.name,
    version: manifest.version,
    entrySha256: sha(fs.readFileSync(entryPath)),
    artifactRoot,
    treeSha256: sha(
      files.map((file) => `${file.sha256}  ${file.path}\n`).join(''),
    ),
    files,
    checkoutCommit,
    identityNote:
      'Tree hash covers artifactRoot files in listed order; checkoutCommit describes the enclosing checkout, not proof that dist was built from it. Local version may equal a published version.',
  };
}

async function main(args) {
  const options = parseArguments(args);
  const entryPath = require.resolve(options.libraryPath);
  const library = require(entryPath);
  const result = {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    command: [process.execPath, ...process.argv.slice(1)],
    cwd: process.cwd(),
    artifact: artifactMetadata(entryPath),
    environment: {
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.cpus().length,
    },
    options,
    policy: {
      warmupsPerCase: 1,
      reportedSamplesPerCase: options.samples,
      warmupsIncludedInStatistics: false,
      topologyRandomSeed: null,
      denseFanIn: 32,
      caseOrder:
        'shape, empty/prefix seed, sync/async, eager/lazy; one warmup then samples; sequential',
      completedWorkSeeds: 'empty or first floor(V/2) IDs; prerequisite-closed',
      batchRanking: 'fixture ID order, outside measured regions',
      asyncVisitor:
        'await Promise.resolve() then DEFER_READY; callback scheduling overhead, no external I/O',
      frontierScope:
        'pre-run summaries and open lazy boundaries are partial-discovery; full-fixture Kahn retains all prerequisite edges and projects ready IDs onto discovered IDs. Global readiness claims only at discovery.complete boundaries; the flat synthetic catalog resolves all V declarations before its first quiescent frontier',
      memory:
        'A bounded number of snapshots per sample, replaced each tick; no accumulated graph history, heap deltas or forced GC. Raw ID facts bounded by CLI counts.',
      tickStatistics:
        'Each tick aggregates only samples reaching that tick; sampleCount is explicit.',
    },
    timingNotes: {
      fixtureConstructionMs:
        'IDs/prerequisite arrays only, one shared fixture per shape outside samples; seed construction excluded',
      runnerConstructionMs:
        'adapter index, copied completed seeds, constructor, visitor registration and createRunner',
      initialRunMs:
        'run entry to quiescence, includes discovery, validation and deferred callback scheduling; async awaits run completion',
      settlementBatchMs:
        'settle calls plus boolean result collection; excludes rank, generation lookup, accepted-fact updates and assertions; no run included',
      settlementPerAcceptedMs:
        'settlementBatchMs / actual accepted count; overlaps settlementBatchMs',
      resumedRunMs:
        'run entry to quiescence after settlements; excludes settlement calls and summaries',
      reconstructionSetupMs:
        'fresh adapter/runner construction from exactly the retained accepted completion facts; includes seed copy',
      reconstructionRunMs:
        'fresh run to quiescence including full rediscovery, validation and remaining callbacks',
      reconstructionTotalMs:
        'sum of reconstructionSetupMs and reconstructionRunMs; overlaps both, excludes summaries/assertions and the timer gap',
      summaryBatchMs:
        'repeated retained summary() plus consuming vertices.size, including allocation/possible GC; assertions excluded; sampled initially and after each tick',
      summaryPerCallMs:
        'summaryBatchMs / summaryIterations; overlaps summaryBatchMs',
      reconstructionSummaryBatchMs:
        'same summary loop for reconstructed runner; separate from reconstructionTotalMs',
      reconstructionSummaryPerCallMs:
        'reconstructionSummaryBatchMs / summaryIterations; overlaps that batch',
    },
    cases: [],
  };
  for (const shape of SHAPES) {
    const start = performance.now();
    const fixture = buildFixture(shape, options.vertices);
    const fixtureConstructionMs = performance.now() - start;
    for (const [kind, count] of [
      ['empty', 0],
      ['prefix', Math.floor(options.vertices / 2)],
    ]) {
      const seeds = new Set(fixture.ids.slice(0, count));
      for (const mode of ['sync', 'async'])
        for (const discovery of ['eager', 'lazy']) {
          const configuration = { ...options, mode, discovery };
          await runLifecycleSample(library, fixture, seeds, configuration);
          const samples = [];
          for (let i = 0; i < options.samples; i++)
            samples.push(
              await runLifecycleSample(library, fixture, seeds, configuration),
            );
          const tickCount = Math.max(
            ...samples.map((sample) => sample.ticks.length),
          );
          result.cases.push({
            shape,
            seed: { kind, count },
            mode,
            discovery,
            vertices: fixture.ids.length,
            edges: fixture.edgeCount,
            fixtureConstructionMs,
            samples,
            statisticsMs: statistics(samples),
            tickStatisticsMs: Array.from({ length: tickCount }, (_, index) => {
              const records = samples
                .filter((sample) => sample.ticks[index])
                .map((sample) => sample.ticks[index]);
              return {
                tick: index + 1,
                sampleCount: records.length,
                statisticsMs: statistics(records),
              };
            }),
          });
        }
    }
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  createLifecycleInspection,
  runLifecycleSample,
  parseArguments,
};
if (require.main === module)
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  });
