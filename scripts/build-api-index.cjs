// Generate consumer navigation from the existing supported-declaration census.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const packageName = 'configurable-tree-traversal';
const anchor = (name) => `symbol-${name}`;
const specifier = (entry) =>
  packageName + (entry === '.' ? '' : entry.slice(1));
const declarationPath = (location) =>
  location.replace(/:\d+$/, '').replace(/^\.\//, '');
// Inline declaration imports are relative to declaration modules, not supported
// consumer import suggestions. Show their type names; routes are listed separately.
const displayType = (text) =>
  text.replace(/import\(["'][^"']+["']\)\.([\w$]+)/g, '$1');
const cell = (text) =>
  displayType(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\r?\n/g, ' ');
// Semantic exceptions precede filename grouping: callbacks, observations and
// source protocols can share declaration files while owning different contracts.
const graphSourceResults = new Set([
  'DagVertexFound',
  'DagVertexOmitted',
  'DagVertexResolution',
  'DagPrerequisiteResolution',
  'PrerequisiteMissing',
]);
// Example targets are preferences: `exampleFor` keeps a target that names the
// symbol, otherwise promotes an example program or reference snippet that does,
// and otherwise labels the preferred family target as merely related.
const symbolContracts = {
  TreeVertexFound: ['abstract-trees', 'reference.md#abstract-trees'],
  TreeVertexResolution: ['abstract-trees', 'reference.md#abstract-trees'],
  TreeVertexOmitted: [
    'abstract-trees',
    'migration-uniform-api.md#source-resolution',
  ],
  MaybePromise: ['async-traversal', 'examples/async-adapter-example.ts'],
  HintVertexId: ['dag-traversal', 'reference.md#dag-traversal'],
  prepareDagDefinition: [
    'materialized-dag-definitions',
    'examples/dag-revision-example.ts',
  ],
  materializeDagInputFromRoots: [
    'collection-and-forest-sources',
    'reference.md#roots-materialization-example',
  ],
  materializeDagInputFromRootsAsync: [
    'collection-and-forest-sources',
    'reference.md#roots-materialization-example',
  ],
  DagRootSelectors: [
    'collection-and-forest-sources',
    'reference.md#roots-materialization-example',
  ],
  AsyncDagRootSelectors: [
    'collection-and-forest-sources',
    'reference.md#roots-materialization-example',
  ],
  bindDagWorkSession: [
    'ticket-coordination',
    'reference.md#bind-an-existing-runner-example',
  ],
  bindAsyncDagWorkSession: [
    'ticket-coordination',
    'reference.md#bind-an-existing-runner-example',
  ],
  materializeWalkSourceFromDagDefinition: [
    'walking-adapters-and-inspection',
    'reference.md#definition-walk-example',
  ],
  ResolvedTreeStore: [
    'views-handles-identity-and-paths',
    'reference.md#edit-a-resolved-tree-store',
  ],
  TraversalStopReason: ['pause-and-resume', 'reference.md#pause-and-resume'],
  DagMilestone: [
    'dag-dependency-queries-and-explanations',
    'examples/dag-inspection-example.ts',
  ],
  DagWaitEdge: [
    'dag-dependency-queries-and-explanations',
    'examples/dag-inspection-example.ts',
  ],
  ObjectCompositeClassification: [
    'rewrite-objects',
    'reference.md#rewrite-objects',
  ],
  ObjectCurrentVertexTypes: ['rewrite-objects', 'reference.md#rewrite-objects'],
  core: ['api-compatibility', 'reference.md#api-compatibility'],
  TreeTraversalEvent: [
    'traversal-orders',
    'examples/traversable-object-iterable-example.ts',
  ],
  InspectionFilters: [
    'inspection-and-execution',
    'reference.md#inspection-and-execution',
  ],
  filterDagDataVisitor: [
    'filtered-dag-visitors',
    'reference.md#filtered-visitor-example',
  ],
  filterAsyncDagDataVisitor: [
    'filtered-dag-visitors',
    'reference.md#filtered-visitor-example',
  ],
  ChildHintTransformer: [
    'options-and-defaults',
    'reference.md#hint-transformation-example',
  ],
  AsyncChildHintTransformer: [
    'options-and-defaults',
    'reference.md#hint-transformation-example',
  ],
  DagEvent: [
    'deferred-dag-progress-and-reconciliation',
    'examples/event-delivery-selection-example.ts',
  ],
  DagVisitorPhase: ['dag-traversal', 'examples/dag-workflow-example.ts'],
  DagDiscoverySource: [
    'source-callback-contexts',
    'reference.md#dag-traversal',
  ],
  AsyncDagDiscoverySource: [
    'source-callback-contexts',
    'examples/dag-prerequisite-resolution-example.ts',
  ],
  TreeSource: ['source-callback-contexts', 'reference.md#abstract-trees'],
  AsyncTreeSource: [
    'source-callback-contexts',
    'examples/async-adapter-example.ts',
  ],
  TreeChildResolutionContext: [
    'source-callback-contexts',
    'reference.md#source-callback-contexts',
  ],
  DagChildResolutionContext: [
    'source-callback-contexts',
    'reference.md#source-callback-contexts',
  ],
  VertexResolutionContext: [
    'source-callback-contexts',
    'reference.md#source-callback-contexts',
  ],
  TraversalExecutionOptions: [
    'options-and-defaults',
    'examples/event-delivery-selection-example.ts',
  ],
  VisitorPhaseSelection: [
    'options-and-defaults',
    'examples/event-delivery-selection-example.ts',
  ],
  EffectiveTraversalExecutionOptions: [
    'inspection-and-execution',
    'examples/event-delivery-selection-example.ts',
  ],
};

// Async-family symbols without their own program prefer the family's async
// example program over the sync one the filename grouping would select.
const asyncCounterparts = {
  'examples/dag-workflow-example.ts':
    'examples/dag-prerequisite-resolution-example.ts',
  'examples/traversable-object-example.ts': 'examples/async-adapter-example.ts',
  'examples/graph-walk-context-example.ts':
    'examples/graph-walk-references-example.ts',
};
function contractFor(name, locations) {
  const [contract, example] = familyContractFor(name, locations);
  return [
    contract,
    /Async/.test(name) && Object.hasOwn(asyncCounterparts, example)
      ? asyncCounterparts[example]
      : example,
  ];
}
function familyContractFor(name, locations) {
  if (graphSourceResults.has(name))
    return [
      'discovery-and-completed-work',
      'reference.md#graph-source-result-example',
    ];
  if (Object.hasOwn(symbolContracts, name)) return symbolContracts[name];
  const source = locations.join(' ');
  // Namespace re-exports are declared by entry modules, not by a family file.
  if (locations.every((location) => /\/index\.d\.ts:\d+$/.test(location)))
    return ['api-compatibility', 'reference.md#api-compatibility'];
  if (/materializeWalkSource/.test(name))
    return [
      'walking-adapters-and-inspection',
      'examples/graph-walk-references-example.ts',
    ];
  if (/DagProgress/.test(source))
    return ['dag-summary-schema', 'examples/agent-orchestration-example.ts'];
  if (/coordinateDag/.test(source))
    return ['ticket-coordination', 'examples/agent-api-foundations-example.ts'];
  if (/DagInspection|inspectDag/.test(source))
    return [
      'dag-dependency-queries-and-explanations',
      'examples/dag-inspection-example.ts',
    ];
  if (/DagRevision|reviseDag|diffDagDefinition/.test(source))
    return ['validated-dag-revisions', 'examples/dag-revision-example.ts'];
  if (/DagFragment|dagFragments/.test(source))
    return [
      'dag-fragments-and-composition',
      'examples/dag-fragments-example.ts',
    ];
  if (/PreparedDag|prepareDag/.test(source))
    return [
      'reusable-prepared-dags',
      'examples/agent-api-foundations-example.ts',
    ];
  if (/DagDefinition|defineDag/.test(source))
    return [
      'materialized-dag-definitions',
      'examples/dag-fragments-example.ts',
    ];
  if (/\/sources\//.test(source))
    return ['collection-and-forest-sources', 'examples/quickstart-example.ts'];
  if (/errors\//.test(source))
    return [
      'validation-results-and-failures',
      'reference.md#narrow-invalid-issues',
    ];
  if (/graph-walk/.test(source))
    return [
      /Options|Limits/.test(name)
        ? 'options-and-defaults'
        : 'general-graph-walking',
      'examples/graph-walk-context-example.ts',
    ];
  if (/rewrite-object|Mutation|MutationBinder/.test(source + name))
    return ['rewrite-objects', 'examples/rewrite-object-example.ts'];
  if (/traversable-object/.test(source))
    return ['traverse-an-object', 'examples/traversable-object-example.ts'];
  if (
    /ResolvedGraphView|ResolvedTree|Vertex\.d|CTTRef|graph\/types/.test(source)
  )
    return [
      'views-handles-identity-and-paths',
      'reference.md#views-handles-identity-and-paths',
    ];
  if (/TraversableTree|TraversableGraph|TreeTypeParameters/.test(source))
    return ['source-callback-contexts', 'examples/async-adapter-example.ts'];
  // DAG callback contracts are exercised by DAG programs, not the tree snippet.
  if (/^(Async)?DagVisitor(Context)?$/.test(name))
    return ['visitors-and-commands', 'examples/dag-workflow-example.ts'];
  if (/Visitor|ChildHintTransformer/.test(source + name))
    return ['visitors-and-commands', 'reference.md#visitors-and-commands'];
  if (/Options|Config|IndexRange/.test(source + name))
    return [
      'options-and-defaults',
      'examples/configuration-patches-example.ts',
    ];
  if (/depth-first/.test(source))
    return ['traversal-orders', 'examples/traversable-object-example.ts'];
  if (/breadth-first/.test(source))
    return ['breadth-first-traversal', 'examples/breadth-first-example.ts'];
  if (/dag-traversal/.test(source))
    return ['dag-traversal', 'examples/dag-workflow-example.ts'];
  return ['inspection-and-execution', 'reference.md#inspection-and-execution'];
}
// Heading slugs follow the package verifier so snippet anchors are linkable.
const headingAnchor = (heading, seen) => {
  const base = heading
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
    .replace(/ /g, '-');
  const count = seen.get(base) || 0;
  seen.set(base, count + 1);
  return base + (count ? '-' + count : '');
};
// Example programs and `<!-- standalone -->` guide snippets are the evidence
// behind example links; sections are tracked so a snippet counts for every
// heading enclosing it.
function loadExampleSources(root = path.resolve(__dirname, '..')) {
  const examples = new Map();
  for (const file of fs.readdirSync(path.join(root, 'examples')).sort())
    if (file.endsWith('.ts'))
      examples.set(
        `examples/${file}`,
        fs.readFileSync(path.join(root, 'examples', file), 'utf8'),
      );
  const anchors = new Map();
  const snippets = [];
  for (const document of fs.readdirSync(path.join(root, 'docs')).sort()) {
    if (!document.endsWith('.md')) continue;
    const lines = fs
      .readFileSync(path.join(root, 'docs', document), 'utf8')
      .split('\n');
    const seen = new Map();
    const known = new Set();
    const open = [];
    for (let index = 0; index < lines.length; index++) {
      const heading = lines[index].match(/^(#{1,6}) (.+)$/);
      if (heading) {
        const anchor = headingAnchor(heading[2], seen);
        known.add(anchor);
        while (open.length && open[open.length - 1].level >= heading[1].length)
          open.pop();
        open.push({ level: heading[1].length, anchor });
        continue;
      }
      if (lines[index].trim() !== '<!-- standalone -->') continue;
      let start = index + 1;
      while (!lines[start].startsWith('```')) start++;
      let end = start + 1;
      while (!lines[end].startsWith('```')) end++;
      snippets.push({
        document,
        anchor: open.length ? open[open.length - 1].anchor : null,
        path: open.map((section) => section.anchor),
        code: lines.slice(start + 1, end).join('\n'),
      });
      index = end;
    }
    anchors.set(document, known);
  }
  return { examples, anchors, snippets };
}
const symbolPattern = (name) =>
  new RegExp(`(^|[^\\w$])${name.replace(/[$]/g, '\\$')}(?![\\w$])`);
// Resolve the link for a symbol: the preferred target when it names the
// symbol, otherwise the first example program or reference snippet that does,
// otherwise the preferred family target labelled as related rather than
// demonstrating. Sections absent from the docs (still being authored) keep
// their preferred snippet label; package verification checks the anchor.
function exampleFor(name, contract, preferred, sources) {
  const uses = (text) => symbolPattern(name).test(text);
  const demonstrates = (target) => {
    if (target.startsWith('examples/')) {
      const text = sources.examples.get(target);
      assert(text !== undefined, `Unknown example ${target} for ${name}`);
      return uses(text);
    }
    const [document, anchor] = target.split('#');
    if (!sources.anchors.get(document)?.has(anchor)) return null;
    return sources.snippets.some(
      (snippet) =>
        snippet.document === document &&
        snippet.path.includes(anchor) &&
        uses(snippet.code),
    );
  };
  const preferredUse = demonstrates(preferred);
  if (preferredUse !== false)
    return {
      target: preferred,
      label: preferred.startsWith('examples/')
        ? 'Runnable example'
        : 'Executable snippet',
    };
  const program = [...sources.examples].find(([, text]) => uses(text));
  if (program) return { target: program[0], label: 'Runnable example' };
  const snippets = sources.snippets.filter(
    (snippet) =>
      snippet.document === 'reference.md' &&
      snippet.anchor &&
      uses(snippet.code),
  );
  const snippet =
    snippets.find((candidate) => candidate.path.includes(contract)) ||
    snippets[0];
  if (snippet)
    return {
      target: `reference.md#${snippet.anchor}`,
      label: 'Executable snippet',
    };
  return { target: preferred, label: 'Related example' };
}
function renderApiIndex(census, sources = loadExampleSources()) {
  const byName = new Map();
  const declarations = new Map(census.declarations.map((d) => [d.location, d]));
  for (const binding of census.bindings) {
    if (!byName.has(binding.name)) byName.set(binding.name, []);
    byName.get(binding.name).push(binding);
  }
  const names = [...byName.keys()].sort();
  const routes = Object.entries(census.exports).filter(
    ([, value]) => value && typeof value === 'object',
  );
  let text = '# Public API symbol index\n\n';
  text +=
    '[Documentation map](index.md) · [Behavior reference](reference.md) · [Upgrade checklist](migration-api-distinctions.md)\n\n';
  text +=
    'These declarations describe `configurable-tree-traversal` 0.12.0; see [install](../README.md#install). Look up a current exported name below, then follow its owning contract and, where one exists, a runnable or related example. Public import routes are exhaustive for each symbol; declaration-module paths are not consumer imports.\n\n';
  text += `Generated from the supported declaration census: **${names.length} public symbols**, **${census.bindings.length} export bindings**, **${routes.length} runtime entry points**. Run \`npm run docs:api\` to regenerate; package verification rejects stale output.\n\n`;
  text +=
    'Declaration excerpts preserve overloads and public members; referenced support types can be declaration-local and are not additional importable exports. Inline declaration-relative type imports are displayed by type name. These are declaration excerpts, not standalone programs; the linked guide examples are compiled and executed against the packed package. A runnable example or executable snippet names the symbol; a related example exercises the feature that produces or consumes it without naming it. Runtime failures/defaults belong to the linked behavior contract.\n\n';
  text +=
    '## Lookup\n\n| Symbol | Availability | Contract |\n| --- | --- | --- |\n';
  for (const name of names) {
    const bindings = byName.get(name);
    const [contract] = contractFor(
      name,
      bindings.flatMap((b) => b.declarations),
    );
    text += `| [${name}](#${anchor(name)}) | ${
      bindings.some((b) => b.runtime)
        ? 'Runtime value and type surface'
        : 'Type-only'
    } | [Behavior](reference.md#${contract}) |\n`;
  }
  text += '\n## Declarations\n\n';
  for (const name of names) {
    const bindings = byName.get(name);
    const locations = [...new Set(bindings.flatMap((b) => b.declarations))];
    const found = locations
      .map((location) => declarations.get(location))
      .filter(Boolean);
    const namespace = routes.find(([, value]) =>
      locations.some(
        (location) =>
          declarationPath(location) === declarationPath(value.require.types),
      ),
    );
    assert(found.length || namespace, `Public declaration missing for ${name}`);
    const [contract, preferred] = contractFor(name, locations);
    const example = exampleFor(name, contract, preferred, sources);
    const exampleLink = example.target.startsWith('examples/')
      ? `https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/${example.target}`
      : example.target;
    text += `<a id="${anchor(name)}"></a>\n\n### ${name}\n\n`;
    text += `${
      bindings.some((b) => b.runtime)
        ? 'Runtime value and public type surface.'
        : 'Type-only; no runtime constructor/value.'
    } [Owning contract](reference.md#${contract}) · [${
      example.label
    }](${exampleLink})\n\n`;
    text +=
      'Supported imports: ' +
      [...new Set(bindings.map((b) => specifier(b.entry)))]
        .sort()
        .map((s) => `\`${s}\``)
        .join(', ') +
      '.\n\n';
    if (namespace && !found.length) {
      const members = [
        ...new Set(
          census.bindings
            .filter((b) => b.entry === namespace[0])
            .map((b) => b.name),
        ),
      ].sort();
      text +=
        `Namespace for \`${specifier(namespace[0])}\`: ` +
        members.map((member) => `[${member}](#${anchor(member)})`).join(', ') +
        '.\n\n';
      continue;
    }
    text +=
      '```ts\n' +
      [...new Set(found.map((d) => displayType(d.signature)))].join('\n') +
      '\n```\n\n';
    const members = new Map();
    for (const declaration of found) {
      for (const member of declaration.members || [])
        members.set(member.name, member.type);
    }
    if (members.size) {
      text +=
        '<details>\n<summary>Resolved public members (including inherited/mapped fields)</summary>\n\n| Member | Type |\n| --- | --- |\n';
      for (const [member, type] of [...members].sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0,
      ))
        text += `| \`${member}\` | <code>${cell(type)}</code> |\n`;
      text += '\n</details>\n\n';
    }
  }
  return text;
}
function saveIndex(filename, markdown, check) {
  if (check) {
    assert(
      fs.existsSync(filename) && fs.readFileSync(filename, 'utf8') === markdown,
      'Public API index is stale; run npm run docs:api',
    );
  } else fs.writeFileSync(filename, markdown);
}
if (require.main === module) {
  assert(
    process.argv.slice(2).every((arg) => arg === '--check'),
    'Usage: node scripts/build-api-index.cjs [--check]',
  );
  const root = path.resolve(__dirname, '..');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ctt-api-index-'));
  try {
    execFileSync(
      process.execPath,
      [path.join(__dirname, 'api-clarity-census.cjs'), temporary],
      { cwd: root, stdio: 'pipe' },
    );
    const census = JSON.parse(
      fs.readFileSync(path.join(temporary, 'public-api-census.json'), 'utf8'),
    );
    saveIndex(
      path.join(root, 'docs/api-index.md'),
      renderApiIndex(census),
      process.argv.includes('--check'),
    );
    console.log(
      `Public API index ${
        process.argv.includes('--check') ? 'verified' : 'generated'
      }: ${new Set(census.bindings.map((b) => b.name)).size} symbols, ${
        census.bindings.length
      } bindings.`,
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
module.exports = { renderApiIndex, saveIndex, loadExampleSources, exampleFor };
