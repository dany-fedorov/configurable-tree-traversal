const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');

const SHAPES = ['chain', 'independent', 'diamond', 'sparse', 'bounded-dense'];
const DENSE_FAN_IN = 32;

function buildFixture(shape, count) {
  if (!SHAPES.includes(shape)) throw new TypeError(`Unknown shape: ${shape}`);
  const ids = Array.from({ length: count }, (_, i) => `v${i}`);
  const prerequisites = ids.map((_, i) => {
    let indexes = [];
    if (i > 0) {
      if (shape === 'chain') indexes = [i - 1];
      if (shape === 'diamond')
        indexes = i % 3 === 0 ? [i - 2, i - 1] : [i - (i % 3)];
      if (shape === 'sparse')
        indexes = [
          ...new Set([
            Math.floor((i - 1) / 2),
            ...(i >= 3 && i % 3 === 0 ? [i - 2] : []),
          ]),
        ];
      if (shape === 'bounded-dense')
        indexes = Array.from(
          { length: Math.min(i, DENSE_FAN_IN) },
          (_, offset) => i - Math.min(i, DENSE_FAN_IN) + offset,
        );
    }
    return indexes.map((index) => ids[index]);
  });
  return {
    ids,
    prerequisites,
    edgeCount: prerequisites.reduce((sum, deps) => sum + deps.length, 0),
  };
}

// Independent Kahn indexing: build all indegrees/outgoing edges, then remove supplied seeds.
// No CTT resolvers, identity handling, lifecycle, discovery validation, or settlements.
function kahnFrontier(fixture, completed) {
  const remaining = new Map(
    fixture.ids.map((id, i) => [id, fixture.prerequisites[i].length]),
  );
  const outgoing = new Map(fixture.ids.map((id) => [id, []]));
  fixture.ids.forEach((id, i) => {
    for (const prerequisite of fixture.prerequisites[i])
      outgoing.get(prerequisite).push(id);
  });
  for (const id of completed) {
    for (const dependent of outgoing.get(id))
      remaining.set(dependent, remaining.get(dependent) - 1);
  }
  return {
    readyIds: fixture.ids.filter(
      (id) => !completed.has(id) && remaining.get(id) === 0,
    ),
  };
}

function createInspection(
  library,
  fixture,
  completed,
  onFirstReady = () => {},
) {
  const counters = { root: 0, vertex: 0, ready: 0 };
  const indexes = new Map(fixture.ids.map((id, i) => [id, i]));
  const traversal = new library.DagTraversal({
    discovery: 'eager',
    syntheticRoot: true,
    completedWork: completed,
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
  traversal.addVisitorFor(library.DagVisitorPhase.ON_WORK_READY, () => {
    if (counters.ready++ === 0) onFirstReady();
    return library.DEFER_READY;
  });
  return { runner: traversal.createRunner(), counters };
}

function sample(library, shape, count, seedCount, summaryIterations) {
  let start = performance.now();
  const fixture = buildFixture(shape, count);
  const fixtureConstructionMs = performance.now() - start;
  const completed = new Set(fixture.ids.slice(0, seedCount));
  start = performance.now();
  const baseline = kahnFrontier(fixture, completed);
  const kahnIndexAndFrontierMs = performance.now() - start;
  let firstReadyAt;
  start = performance.now();
  const { runner, counters } = createInspection(
    library,
    fixture,
    completed,
    () => {
      firstReadyAt = performance.now();
    },
  );
  const runnerConstructionMs = performance.now() - start;
  const runStart = performance.now();
  runner.run();
  const runToQuiescenceMs = performance.now() - runStart;
  // All correctness checks are outside measured regions. Summaries allocate detached snapshots.
  const before = runner.summary();
  assert.deepEqual(before.readyOrDeferredIds, baseline.readyIds);
  assert.deepEqual(before.completedWorkIds, [...completed]);
  assert.equal(before.discovery.complete, true);
  assert.equal(before.diagnostics, null);
  assert.equal(before.counts.discovered, count);
  assert.equal(counters.root, 1);
  assert.equal(counters.vertex, count);
  assert.equal(counters.ready, baseline.readyIds.length);
  assert.equal(before.counts.deferredWork, baseline.readyIds.length);
  const calls = { ...counters };
  const status = runner.getStatus();
  let last;
  let consumedVertices = 0;
  start = performance.now();
  for (let i = 0; i < summaryIterations; i++) {
    last = runner.summary();
    consumedVertices += last.vertices.size;
  }
  const summaryBatchMs = performance.now() - start;
  assert.equal(consumedVertices, count * summaryIterations);
  assert.deepEqual(last, before);
  assert.deepEqual(runner.summary(), before);
  assert.deepEqual(counters, calls);
  assert.equal(runner.getStatus(), status);
  return {
    vertices: count,
    edges: fixture.edgeCount,
    frontierCount: baseline.readyIds.length,
    summaryIterations,
    callbacks: { ...counters },
    timings: {
      fixtureConstructionMs,
      runnerConstructionMs,
      eagerToFirstReadyMs:
        firstReadyAt === undefined ? null : firstReadyAt - runStart,
      runToQuiescenceMs,
      kahnIndexAndFrontierMs,
      summaryBatchMs,
      summaryPerCallMs: summaryBatchMs / summaryIterations,
    },
  };
}

function parseArguments(args) {
  const options = {
    vertices: 1000,
    samples: 3,
    summaryIterations: 10,
    libraryPath: path.resolve(__dirname, '../dist'),
  };
  const flags = {
    '--vertices': ['vertices', 10000],
    '--samples': ['samples', 100],
    '--summary-iterations': ['summaryIterations', 10000],
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
  return {
    entryPath,
    realEntryPath: fs.realpathSync(entryPath),
    manifestPath,
    name: manifest.name,
    version: manifest.version,
    entrySha256: createHash('sha256')
      .update(fs.readFileSync(entryPath))
      .digest('hex'),
  };
}

function statistics(samples) {
  const result = {};
  for (const name of Object.keys(samples[0].timings)) {
    const sorted = samples
      .map((item) => item.timings[name])
      .filter((value) => value !== null)
      .sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    result[name] =
      sorted.length === 0
        ? null
        : {
            median:
              sorted.length % 2
                ? sorted[middle]
                : (sorted[middle - 1] + sorted[middle]) / 2,
            min: sorted[0],
            max: sorted[sorted.length - 1],
          };
  }
  return result;
}

function main(args) {
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
      summaryIterations: options.summaryIterations,
      denseFanIn: DENSE_FAN_IN,
      topologyRandomSeed: null,
      caseOrder: 'shape then empty/prefix; warmup then samples; sequential',
      completedWorkSeeds: 'empty or first floor(V/2) IDs (prerequisite-closed)',
      memory:
        'No heap deltas recorded; sequential samples; snapshots replaced rather than accumulated; no forced GC',
    },
    timingNotes: {
      fixtureConstructionMs:
        'IDs and prerequisite arrays only; excludes completedWork seed creation',
      runnerConstructionMs:
        'adapter index, traversal construction, visitor registration and createRunner',
      eagerToFirstReadyMs:
        'run entry to first ON_WORK_READY callback; includes traversal setup, full eager discovery and validation; overlaps runToQuiescenceMs',
      runToQuiescenceMs:
        'run entry to return; includes discovery, validation and deferral admission; stops at HALTED frontier, no business work or settlement',
      kahnIndexAndFrontierMs:
        'dependency indexing and removal of supplied seeds only; excludes CTT resolver/lifecycle/identity/validation features; not a speedup comparison',
      summaryBatchMs:
        'repeated summary() plus consuming vertices.size; includes allocation/GC; all assertions excluded',
      summaryPerCallMs:
        'summaryBatchMs / summaryIterations; no stored history of snapshots',
    },
    cases: [],
  };
  for (const shape of SHAPES) {
    for (const [kind, seedCount] of [
      ['empty', 0],
      ['prefix', Math.floor(options.vertices / 2)],
    ]) {
      sample(
        library,
        shape,
        options.vertices,
        seedCount,
        options.summaryIterations,
      );
      const samples = [];
      for (let i = 0; i < options.samples; i++)
        samples.push(
          sample(
            library,
            shape,
            options.vertices,
            seedCount,
            options.summaryIterations,
          ),
        );
      result.cases.push({
        shape,
        seed: { kind, count: seedCount },
        vertices: options.vertices,
        edges: samples[0].edges,
        frontierCount: samples[0].frontierCount,
        samples,
        statisticsMs: statistics(samples),
      });
    }
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = { buildFixture, kahnFrontier, createInspection };
if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  }
}
