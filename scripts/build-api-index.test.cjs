const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const generator = path.join(__dirname, 'build-api-index.cjs');
const api = fs.existsSync(generator) ? require(generator) : {};
function render(census, sources) {
  assert.equal(
    typeof api.renderApiIndex,
    'function',
    'public symbol index generator is not implemented',
  );
  return sources
    ? api.renderApiIndex(census, sources)
    : api.renderApiIndex(census);
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

// Hermetic example evidence: programs and guide snippets that name a symbol
// decide its label, so these cases never depend on the checked-out examples.
function stubSources({ examples = {}, snippets = [], anchors = [] } = {}) {
  const known = new Map();
  for (const [target] of snippets.concat(anchors.map((anchor) => [anchor]))) {
    const [document, anchor] = target.split('#');
    if (!known.has(document)) known.set(document, new Set());
    known.get(document).add(anchor);
  }
  return {
    examples: new Map(Object.entries(examples)),
    anchors: known,
    snippets: snippets.map(([target, code, enclosing = []]) => {
      const [document, anchor] = target.split('#');
      return { document, anchor, path: [...enclosing, anchor], code };
    }),
  };
}
const evidence = stubSources({
  examples: {
    'examples/event-delivery-selection-example.ts':
      'runner.run({ emitEvents });',
    'examples/traversable-object-iterable-example.ts':
      'for (const event of it)',
    'examples/graph-walk-references-example.ts':
      'const tree: TreeSource<VertexTypes<string, string>> = {};',
    'examples/async-adapter-example.ts': 'new AsyncDepthFirstTreeTraversal()',
    'examples/dag-workflow-example.ts': 'new DagTraversal()',
    'examples/dag-prerequisite-resolution-example.ts':
      'new AsyncDagTraversal()',
  },
  snippets: [
    [
      'reference.md#filtered-visitor-example',
      'filterDagDataVisitor(visitor)',
      ['dag-traversal', 'filtered-dag-visitors'],
    ],
    [
      'reference.md#hint-transformation-example',
      'childHintTransformer: (hints) => hints',
      ['configuration-patches', 'options-and-defaults'],
    ],
    ['reference.md#dag-traversal', 'const source: DagDiscoverySource = {};'],
    ['reference.md#abstract-trees', 'new DepthFirstTreeTraversal()'],
    [
      'reference.md#inspection-and-execution',
      'const filters: InspectionFilters = x;',
    ],
    ['reference.md#api-compatibility', 'core.Vertex !== Vertex'],
    ['reference.md#visitors-and-commands', 'TraversalVisitorCommandName.X'],
  ],
  anchors: ['reference.md#source-callback-contexts'],
});
const programLink = (file) =>
  `https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/${file}`;
const semanticCases = [
  [
    'filterDagDataVisitor',
    'dist/traversals/dag-traversal/filterDagVisitor.d.ts:7',
    'filtered-dag-visitors',
    'Executable snippet',
    'reference.md#filtered-visitor-example',
  ],
  [
    'filterAsyncDagDataVisitor',
    'dist/traversals/dag-traversal/filterDagVisitor.d.ts:10',
    'filtered-dag-visitors',
    'Related example',
    'reference.md#filtered-visitor-example',
  ],
  [
    'ChildHintTransformer',
    'dist/core/ChildHintTransformer.d.ts:1',
    'options-and-defaults',
    'Related example',
    'reference.md#hint-transformation-example',
  ],
  [
    'AsyncChildHintTransformer',
    'dist/core/ChildHintTransformer.d.ts:2',
    'options-and-defaults',
    'Related example',
    'reference.md#hint-transformation-example',
  ],
  [
    'DagEvent',
    'dist/traversals/dag-traversal/lib/DagTraversalVisitor.d.ts:27',
    'deferred-dag-progress-and-reconciliation',
    'Related example',
    programLink('event-delivery-selection-example.ts'),
  ],
  [
    'DagDiscoverySource',
    'dist/core/TraversableGraph.d.ts:16',
    'source-callback-contexts',
    'Executable snippet',
    'reference.md#dag-traversal',
  ],
  // The abstract-tree snippet never names TreeSource; the program that does wins.
  [
    'TreeSource',
    'dist/core/TraversableTree.d.ts:65',
    'source-callback-contexts',
    'Runnable example',
    programLink('graph-walk-references-example.ts'),
  ],
  [
    'TreeTraversalEvent',
    'dist/core/TraversalRunner.d.ts:4',
    'traversal-orders',
    'Related example',
    programLink('traversable-object-iterable-example.ts'),
  ],
  [
    'InspectionFilters',
    'dist/core/CoreInspection.d.ts:4',
    'inspection-and-execution',
    'Executable snippet',
    'reference.md#inspection-and-execution',
  ],
  [
    'core',
    'dist/core/index.d.ts:1',
    'api-compatibility',
    'Executable snippet',
    'reference.md#api-compatibility',
  ],
  // Namespace re-exports are documented with the compatibility surface.
  [
    'dagTraversal',
    'dist/traversals/dag-traversal/index.d.ts:1',
    'api-compatibility',
    'Related example',
    'reference.md#api-compatibility',
  ],
  // DAG callbacks relate to DAG programs; async names prefer the async program.
  [
    'DagVisitor',
    'dist/traversals/dag-traversal/lib/DagTraversalVisitor.d.ts:5',
    'visitors-and-commands',
    'Related example',
    programLink('dag-workflow-example.ts'),
  ],
  [
    'AsyncDagVisitor',
    'dist/traversals/dag-traversal/lib/DagTraversalVisitor.d.ts:6',
    'visitors-and-commands',
    'Related example',
    programLink('dag-prerequisite-resolution-example.ts'),
  ],
  [
    'AsyncDepthFirstTreeTraversal',
    'dist/traversals/depth-first-traversal/AsyncDepthFirstTreeTraversal.d.ts:1',
    'traversal-orders',
    'Runnable example',
    programLink('async-adapter-example.ts'),
  ],
  [
    'materializeDagInputFromRoots',
    'dist/traversals/dag-traversal/sources/materializeDagInput.d.ts:3',
    'collection-and-forest-sources',
    'Executable snippet',
    'reference.md#roots-materialization-example',
  ],
  [
    'bindDagWorkSession',
    'dist/traversals/dag-traversal/prepareDag.d.ts:9',
    'ticket-coordination',
    'Executable snippet',
    'reference.md#bind-an-existing-runner-example',
  ],
  [
    'materializeWalkSourceFromDagDefinition',
    'dist/traversals/graph-walk/materializeWalkSource.d.ts:2',
    'walking-adapters-and-inspection',
    'Executable snippet',
    'reference.md#definition-walk-example',
  ],
  [
    'ResolvedTreeStore',
    'dist/core/ResolvedTree.d.ts:4',
    'views-handles-identity-and-paths',
    'Executable snippet',
    'reference.md#edit-a-resolved-tree-store',
  ],
];

for (const [name, location, contract, label, example] of semanticCases) {
  test(`${name} routes to its specific contract and a truthfully labelled example`, () => {
    const namespace = /\/index\.d\.ts:\d+$/.test(location);
    const text = render(
      {
        exports: {
          ...entries,
          './dag-traversal': {
            require: { types: './dist/traversals/dag-traversal/index.d.ts' },
          },
        },
        bindings: [binding(name, '.', [location], namespace)],
        declarations: namespace
          ? []
          : [declaration(name, location, `export type ${name} = unknown;`)],
      },
      evidence,
    );
    assert.ok(
      text.includes(`[Owning contract](reference.md#${contract})`),
      `${name} linked to the wrong contract`,
    );
    assert.ok(
      text.includes(`[${label}](${example})`),
      `${name} linked to the wrong example: ${
        text.match(
          /\[(?:Runnable example|Executable snippet|Related example)\]\([^)]*\)/,
        )?.[0]
      }`,
    );
  });
}

test('the header promises an example only where one exists and names the current checkout', () => {
  const text = render(
    { exports: entries, bindings: [], declarations: [] },
    stubSources(),
  );
  assert.match(
    text,
    /follow its owning contract and, where one exists, a runnable or related example\./,
  );
  assert.match(
    text,
    /describe the current source checkout; see \[install\]\(\.\.\/README\.md#install\) for how to run it\./,
  );
  assert.doesNotMatch(text, /unreleased source checkout/);
});

test('a preferred program that never names the symbol is related, and a program naming it is promoted', () => {
  const location = 'dist/traversals/dag-traversal/inspectDag.d.ts:3';
  const census = {
    exports: entries,
    bindings: [binding('DagMilestone', '.', [location], false)],
    declarations: [
      declaration(
        'DagMilestone',
        location,
        'export type DagMilestone = unknown;',
      ),
    ],
  };
  const related = render(
    census,
    stubSources({
      examples: { 'examples/dag-inspection-example.ts': 'inspectDag(runner)' },
    }),
  );
  assert.ok(
    related.includes(
      `[Related example](${programLink('dag-inspection-example.ts')})`,
    ),
  );
  assert.doesNotMatch(related, /Runnable example/);
  const promoted = render(
    census,
    stubSources({
      examples: {
        'examples/dag-inspection-example.ts': 'inspectDag(runner)',
        'examples/quickstart-example.ts': 'const m: DagMilestone = x;',
        'examples/zz-example.ts': 'const m: DagMilestoneQueryResult = x;',
      },
    }),
  );
  assert.ok(
    promoted.includes(
      `[Runnable example](${programLink('quickstart-example.ts')})`,
    ),
    'word-boundary match should promote the program naming the symbol',
  );
});

test('a reference snippet naming the symbol is promoted, preferring the owning contract section', () => {
  const location = 'dist/traversals/dag-traversal/lib/DagProgress.d.ts:3';
  const text = render(
    {
      exports: entries,
      bindings: [binding('DagSummary', '.', [location], false)],
      declarations: [
        declaration(
          'DagSummary',
          location,
          'export type DagSummary = unknown;',
        ),
      ],
    },
    stubSources({
      examples: {
        'examples/agent-orchestration-example.ts': 'session.summary()',
      },
      snippets: [
        ['reference.md#api-compatibility', 'const first: DagSummary = x;'],
        [
          'reference.md#dag-summary-schema',
          'const owned: DagSummary = y;',
          ['dag-traversal', 'deferred-dag-progress-and-reconciliation'],
        ],
      ],
    }),
  );
  assert.ok(
    text.includes('[Owning contract](reference.md#dag-summary-schema)'),
  );
  assert.ok(
    text.includes('[Executable snippet](reference.md#dag-summary-schema)'),
    text.match(
      /\[(?:Runnable example|Executable snippet|Related example)\]\([^)]*\)/,
    )?.[0],
  );
});

test('a pending guide section keeps the snippet label while an unknown program fails generation', () => {
  const location = 'dist/core/ResolvedTree.d.ts:4';
  const census = {
    exports: entries,
    bindings: [binding('ResolvedTreeStore', '.', [location])],
    declarations: [
      declaration(
        'ResolvedTreeStore',
        location,
        'export declare class ResolvedTreeStore {}',
      ),
    ],
  };
  const text = render(census, stubSources());
  assert.ok(
    text.includes(
      '[Executable snippet](reference.md#edit-a-resolved-tree-store)',
    ),
  );
  assert.throws(
    () =>
      render(
        {
          exports: entries,
          bindings: [binding('MaybePromise', '.', ['dist/core/async.d.ts:1'])],
          declarations: [
            declaration(
              'MaybePromise',
              'dist/core/async.d.ts:1',
              'export type MaybePromise<T> = T;',
            ),
          ],
        },
        stubSources(),
      ),
    /Unknown example examples\/async-adapter-example\.ts/,
  );
});

// Regression guard over the committed index: runnable links name programs that
// use the symbol, related program links never do (they would be runnable), and
// executable snippets live under sections whose standalone code names the symbol.
test('committed example links are truthful against the checked-out programs and guides', () => {
  assert.equal(typeof api.loadExampleSources, 'function');
  const root = path.join(__dirname, '..');
  const index = fs.readFileSync(path.join(root, 'docs/api-index.md'), 'utf8');
  const sources = api.loadExampleSources(root);
  const sections = index.split(/\n(?=<a id="symbol-)/).slice(1);
  assert.ok(sections.length > 0);
  for (const section of sections) {
    const name = section.match(/^<a id="symbol-([^"]+)"/)[1];
    const link = section.match(
      /\[(Runnable example|Executable snippet|Related example)\]\(([^)]+)\)/,
    );
    assert.ok(link, `${name} has no example link`);
    const [, label, target] = link;
    const uses = (text) => new RegExp(`\\b${name}\\b`).test(text);
    const program = target.match(/\/(examples\/[\w.-]+\.ts)$/)?.[1];
    if (program) {
      assert.ok(
        sources.examples.has(program),
        `${name} links the missing program ${program}`,
      );
      assert.equal(
        uses(sources.examples.get(program)),
        label === 'Runnable example',
        `${name}: ${label} must ${
          label === 'Runnable example' ? '' : 'not '
        }name the symbol in ${program}`,
      );
      continue;
    }
    assert.notEqual(
      label,
      'Runnable example',
      `${name} runnable link is not a program`,
    );
    const [document, anchor] = target.split('#');
    assert.ok(document.endsWith('.md') && anchor, `${name} links ${target}`);
    if (!sources.anchors.get(document)?.has(anchor)) continue; // pending section
    assert.equal(
      sources.snippets.some(
        (snippet) =>
          snippet.document === document &&
          snippet.path.includes(anchor) &&
          uses(snippet.code),
      ),
      label === 'Executable snippet',
      `${name}: ${label} does not match the standalone code under ${target}`,
    );
  }
});
