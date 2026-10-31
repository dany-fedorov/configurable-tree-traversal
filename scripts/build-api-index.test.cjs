const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const generator = path.join(__dirname, 'build-api-index.cjs');
const api = fs.existsSync(generator) ? require(generator) : {};
function render(census) {
  assert.equal(
    typeof api.renderApiIndex,
    'function',
    'public symbol index generator is not implemented',
  );
  return api.renderApiIndex(census);
}
const declaration = (name, location, signature) => ({
  name,
  location,
  signature,
  members: [],
  staticMembers: [],
});
const binding = (name, entry, declarations, runtime = true) => ({
  name,
  entry,
  declarations,
  runtime,
});
const entries = {
  '.': { require: { types: './dist/index.d.ts' } },
  './core': { require: { types: './dist/core/index.d.ts' } },
};
test('one public symbol has every supported import route without duplicate sections', () => {
  const text = render({
    exports: entries,
    bindings: [
      binding('Vertex', '.', ['dist/core/Vertex.d.ts:1']),
      binding('Vertex', './core', ['dist/core/Vertex.d.ts:1']),
    ],
    declarations: [
      declaration(
        'Vertex',
        'dist/core/Vertex.d.ts:1',
        'export declare class Vertex {}',
      ),
    ],
  });
  assert.equal((text.match(/<a id="symbol-Vertex"><\/a>/g) || []).length, 1);
  assert.match(text, /`configurable-tree-traversal`/);
  assert.match(text, /`configurable-tree-traversal\/core`/);
  assert.match(text, /export declare class Vertex/);
});
test('unexported reachable support declarations never become importable index entries', () => {
  const text = render({
    exports: entries,
    bindings: [binding('PublicType', '.', ['dist/core/Public.d.ts:1'], false)],
    declarations: [
      declaration(
        'PublicType',
        'dist/core/Public.d.ts:1',
        'export type PublicType = string;',
      ),
      declaration(
        'SecretEngine',
        'dist/core/private/Engine.d.ts:1',
        'interface SecretEngine { privateState: string; }',
      ),
    ],
  });
  assert.match(text, /PublicType/);
  assert.doesNotMatch(text, /SecretEngine|privateState|core\/private/);
  assert.match(text, /Type-only/);
});
test('overloads survive and case-distinct exported names keep distinct stable anchors', () => {
  const text = render({
    exports: entries,
    bindings: [
      binding('Walk', '.', ['dist/walk.d.ts:1', 'dist/walk.d.ts:2']),
      binding('walk', '.', ['dist/walk.d.ts:3']),
    ],
    declarations: [
      declaration(
        'Walk',
        'dist/walk.d.ts:1',
        'export declare function Walk(id: string): string;',
      ),
      declaration(
        'Walk',
        'dist/walk.d.ts:2',
        'export declare function Walk(id: number): number;',
      ),
      declaration(
        'walk',
        'dist/walk.d.ts:3',
        'export declare const walk: boolean;',
      ),
    ],
  });
  assert.match(text, /Walk\(id: string\)/);
  assert.match(text, /Walk\(id: number\)/);
  assert.match(text, /id="symbol-Walk"/);
  assert.match(text, /id="symbol-walk"/);
});
test('namespace entries link only members exported by their supported package route', () => {
  const text = render({
    exports: entries,
    bindings: [
      binding('core', '.', ['dist/core/index.d.ts:1']),
      binding('Vertex', '.', ['dist/core/Vertex.d.ts:1']),
      binding('Vertex', './core', ['dist/core/Vertex.d.ts:1']),
      binding('Other', '.', ['dist/Other.d.ts:1']),
    ],
    declarations: [
      declaration(
        'Vertex',
        'dist/core/Vertex.d.ts:1',
        'export declare class Vertex {}',
      ),
      declaration('Other', 'dist/Other.d.ts:1', 'export type Other = string;'),
    ],
  });
  const section = text.split('<a id="symbol-core"></a>')[1].split('<a id=')[0];
  assert.match(section, /\[Vertex\]\(#symbol-Vertex\)/);
  assert.doesNotMatch(section, /\[Other\]/);
  assert.doesNotMatch(text, /dist\/core\/index/);
});
test('a missing public declaration fails generation instead of silently producing an incomplete reference', () => {
  assert.equal(
    typeof api.renderApiIndex,
    'function',
    'public symbol index generator is not implemented',
  );
  assert.throws(
    () =>
      render({
        exports: entries,
        bindings: [binding('Lost', '.', ['dist/Lost.d.ts:1'])],
        declarations: [],
      }),
    /declaration/i,
  );
});
test('check mode detects stale output without overwriting it', () => {
  assert.equal(
    typeof api.saveIndex,
    'function',
    'public symbol index writer is not implemented',
  );
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ctt-index-test-'));
  try {
    const target = path.join(directory, 'index.md');
    fs.writeFileSync(target, 'old');
    assert.throws(() => api.saveIndex(target, 'new', true), /stale/i);
    assert.equal(fs.readFileSync(target, 'utf8'), 'old');
    api.saveIndex(target, 'new', false);
    assert.equal(fs.readFileSync(target, 'utf8'), 'new');
    api.saveIndex(target, 'new', true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const semanticCases = [
  [
    'filterDagDataVisitor',
    'dist/traversals/dag-traversal/filterDagVisitor.d.ts:7',
    'filtered-dag-visitors',
    'reference.md#filtered-visitor-example',
  ],
  [
    'filterAsyncDagDataVisitor',
    'dist/traversals/dag-traversal/filterDagVisitor.d.ts:10',
    'filtered-dag-visitors',
    'reference.md#filtered-visitor-example',
  ],
  [
    'ChildHintTransformer',
    'dist/core/ChildHintTransformer.d.ts:1',
    'options-and-defaults',
    'reference.md#hint-transformation-example',
  ],
  [
    'AsyncChildHintTransformer',
    'dist/core/ChildHintTransformer.d.ts:2',
    'options-and-defaults',
    'reference.md#hint-transformation-example',
  ],
  [
    'DagEvent',
    'dist/traversals/dag-traversal/lib/DagTraversalVisitor.d.ts:27',
    'deferred-dag-progress-and-reconciliation',
    'https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts',
  ],
  [
    'DagDiscoverySource',
    'dist/core/TraversableGraph.d.ts:16',
    'source-callback-contexts',
    'reference.md#dag-traversal',
  ],
  [
    'TreeSource',
    'dist/core/TraversableTree.d.ts:65',
    'source-callback-contexts',
    'reference.md#abstract-trees',
  ],
  [
    'TreeTraversalEvent',
    'dist/core/TraversalRunner.d.ts:4',
    'traversal-orders',
    'https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-iterable-example.ts',
  ],
  [
    'InspectionFilters',
    'dist/core/CoreInspection.d.ts:4',
    'inspection-and-execution',
    'reference.md#inspection-and-execution',
  ],
  [
    'core',
    'dist/core/index.d.ts:1',
    'api-compatibility',
    'reference.md#api-compatibility',
  ],
];

for (const [name, location, contract, example] of semanticCases) {
  test(`${name} routes to its specific contract and executable family example`, () => {
    const text = render({
      exports: entries,
      bindings: [binding(name, '.', [location], name === 'core')],
      declarations:
        name === 'core'
          ? []
          : [declaration(name, location, `export type ${name} = unknown;`)],
    });
    assert.ok(
      text.includes(`[Owning contract](reference.md#${contract})`),
      `${name} linked to the wrong contract`,
    );
    const label = example.startsWith('https:')
      ? 'Runnable example'
      : 'Executable snippet';
    assert.ok(
      text.includes(`[${label}](${example})`),
      `${name} linked to the wrong example`,
    );
  });
}

// These graph results share a declaration file with tree results; filename-only
// routing must not send graph identities/omissions/lookup to a tree adapter.
for (const name of [
  'DagVertexFound',
  'DagVertexOmitted',
  'DagVertexResolution',
  'DagPrerequisiteResolution',
  'PrerequisiteMissing',
]) {
  test(`${name} links to graph result contracts and a graph resolution recipe`, () => {
    const location = 'dist/core/TraversableTree.d.ts:1';
    const text = render({
      exports: entries,
      bindings: [binding(name, '.', [location], false)],
      declarations: [
        declaration(name, location, `export type ${name} = unknown;`),
      ],
    });
    assert.ok(
      text.includes(
        '[Owning contract](reference.md#discovery-and-completed-work)',
      ),
      `${name} linked to a tree contract`,
    );
    assert.ok(
      text.includes(
        '[Executable snippet](reference.md#graph-source-result-example)',
      ),
      `${name} linked to a tree-only example`,
    );
    assert.ok(!text.includes('examples/async-adapter-example.ts'));
  });
}
