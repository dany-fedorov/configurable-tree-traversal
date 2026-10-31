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
function contractFor(name, locations) {
  const source = locations.join(' ');
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
  return [
    'inspection-and-execution',
    'examples/graph-walk-references-example.ts',
  ];
}
function renderApiIndex(census) {
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
    'These declarations describe the [unreleased source checkout](../README.md#install). Look up a current exported name below, then follow its owning contract and runnable example. Public import routes are exhaustive for each symbol; declaration-module paths are not consumer imports.\n\n';
  text += `Generated from the supported declaration census: **${names.length} public symbols**, **${census.bindings.length} export bindings**, **${routes.length} runtime entry points**. Run \`npm run docs:api\` to regenerate; package verification rejects stale output.\n\n`;
  text +=
    'Declaration excerpts preserve overloads and public members; referenced support types can be declaration-local and are not additional importable exports. Inline declaration-relative type imports are displayed by type name. These are declaration excerpts, not standalone programs; the linked guide examples are compiled and executed against the packed package. Runtime failures/defaults belong to the linked behavior contract.\n\n';
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
    const [contract, example] = contractFor(name, locations);
    const exampleLink = example.startsWith('examples/')
      ? `https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/${example}`
      : example;
    text += `<a id="${anchor(name)}"></a>\n\n### ${name}\n\n`;
    text += `${
      bindings.some((b) => b.runtime)
        ? 'Runtime value and public type surface.'
        : 'Type-only; no runtime constructor/value.'
    } [Owning contract](reference.md#${contract}) · [Runnable example](${exampleLink})\n\n`;
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
module.exports = { renderApiIndex, saveIndex };
