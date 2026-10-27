// Reproduce after npm run build. Evidence only: this does not change package exports.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
assert(
  process.argv[2],
  'Pass an explicit census output directory; historical audits are immutable',
);
const output = path.resolve(process.argv[2]);
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const entries = Object.entries(pkg.exports).filter(
  ([, value]) => typeof value === 'object',
);
const filenames = entries.map(([, value]) =>
  path.resolve(root, value.require.types),
);
const program = ts.createProgram(filenames, {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  strict: true,
});
const checker = program.getTypeChecker();
const dist = path.join(root, 'dist') + path.sep;
const format =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const bindings = [];
const declarations = new Map();
const pending = [];
const reachable = new Set();
const vocabulary = [];
const deprecations = [];
const resolve = (symbol) =>
  symbol && symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
const local = (node) => node.getSourceFile().fileName.startsWith(dist);
const privateNode = (node) =>
  node.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword) ||
  (node.name && ts.isPrivateIdentifier(node.name));
const eligible = (node) =>
  ts.isClassDeclaration(node) ||
  ts.isInterfaceDeclaration(node) ||
  ts.isTypeAliasDeclaration(node) ||
  ts.isFunctionDeclaration(node) ||
  ts.isEnumDeclaration(node) ||
  ts.isVariableDeclaration(node);
function enqueue(symbol) {
  symbol = resolve(symbol);
  if (!symbol || reachable.has(symbol)) return;
  reachable.add(symbol);
  for (const node of symbol.declarations || []) {
    if (ts.isSourceFile(node) && local(node)) {
      checker.getExportsOfModule(symbol).forEach(enqueue);
    } else if (local(node) && eligible(node)) pending.push(node);
  }
}
function location(node) {
  return (
    path
      .relative(root, node.getSourceFile().fileName)
      .replaceAll(path.sep, '/') +
    ':' +
    (node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line +
      1)
  );
}
function textPublic(node) {
  if (!node.members) return node.getText();
  // Emit original header + only public/protected members; private implementation
  // declarations are not signature reachability, even when present in the file.
  const header = node.getText().slice(0, node.members.pos - node.getStart());
  return (
    header +
    '\n' +
    node.members
      .filter((m) => !privateNode(m))
      .map((m) => m.getText())
      .join('\n') +
    '\n}'
  );
}
function membersOf(symbol, staticSide = false) {
  const type =
    !staticSide &&
    symbol.flags &
      (ts.SymbolFlags.Class |
        ts.SymbolFlags.Interface |
        ts.SymbolFlags.TypeAlias)
      ? checker.getDeclaredTypeOfSymbol(symbol)
      : checker.getTypeOfSymbolAtLocation(
          symbol,
          symbol.valueDeclaration || symbol.declarations[0],
        );
  return checker
    .getPropertiesOfType(type)
    .filter((member) =>
      member.declarations?.some((d) => local(d) && !privateNode(d)),
    )
    .map((member) => ({
      name: member.getName(),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(
          member,
          member.valueDeclaration || member.declarations[0],
        ),
        undefined,
        format,
      ),
      declarations: member.declarations.filter(local).map(location),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
for (let i = 0; i < entries.length; i++) {
  const [specifier, value] = entries[i];
  const module = checker.getSymbolAtLocation(
    program.getSourceFile(filenames[i]),
  );
  const exports = checker.getExportsOfModule(module);
  const runtime = require(path.resolve(root, value.require.default));
  for (const symbol of exports) {
    enqueue(symbol);
    const target = resolve(symbol);
    bindings.push({
      entry: specifier,
      name: symbol.getName(),
      runtime: Object.hasOwn(runtime, symbol.getName()),
      declarations: (target.declarations || []).filter(local).map(location),
    });
  }
}
while (pending.length) {
  const node = pending.pop();
  const key = location(node);
  if (declarations.has(key)) continue;
  const name = node.name?.getText() || '<anonymous>';
  const symbol = node.name && checker.getSymbolAtLocation(node.name);
  declarations.set(key, {
    name,
    location: key,
    kind: ts.SyntaxKind[node.kind],
    signature: textPublic(node),
    members: symbol ? membersOf(symbol) : [],
    staticMembers:
      symbol && ts.isClassDeclaration(node) ? membersOf(symbol, true) : [],
    declaredMembers: [],
  });
  const visit = (child) => {
    if (privateNode(child)) return;
    if (
      ts.isPropertySignature(child) ||
      ts.isMethodSignature(child) ||
      ts.isPropertyDeclaration(child) ||
      ts.isMethodDeclaration(child) ||
      ts.isConstructorDeclaration(child) ||
      ts.isGetAccessor(child) ||
      ts.isSetAccessor(child) ||
      ts.isEnumMember(child) ||
      ts.isCallSignatureDeclaration(child) ||
      ts.isConstructSignatureDeclaration(child) ||
      ts.isIndexSignatureDeclaration(child)
    ) {
      declarations.get(key).declaredMembers.push({
        location: location(child),
        signature: child.getText(),
        kind: ts.SyntaxKind[child.kind],
      });
    }
    for (const tag of ts.getJSDocTags(child)) {
      if (tag.tagName.text === 'deprecated') deprecations.push(location(child));
    }
    if (
      ts.isStringLiteral(child) ||
      ts.isTypeParameterDeclaration(child) ||
      ts.isParameter(child)
    ) {
      vocabulary.push({
        owner: name,
        location: location(child),
        kind: ts.SyntaxKind[child.kind],
        text: child.getText(),
      });
    }
    if (ts.isPropertySignature(child) && child.name) {
      const retired = new Set([
        '$d',
        '$c',
        'resolutionStyle',
        'rootDependencies',
        'implicitParentDependency',
        'iterateOver',
        'enableVisitorFunctionsFor',
        'disableVisitorFunctionsFor',
        'makeVertexHook',
        'returnMe',
        'vertexVisitorsChainState',
      ]);
      if (retired.has(child.name.getText())) {
        assert.equal(
          child.type?.kind,
          ts.SyntaxKind.NeverKeyword,
          location(child) +
            ': retired fields may only be rejection-only never constraints',
        );
      }
    }
    if (ts.isIdentifier(child)) enqueue(checker.getSymbolAtLocation(child));
    ts.forEachChild(child, visit);
  };
  visit(node);
}
const allDeclarations = [...declarations.values()].sort((a, b) =>
  a.location.localeCompare(b.location),
);
const rootBindings = bindings.filter((b) => b.entry === '.');
const runnerNames = [
  'DepthFirstTreeRunner',
  'AsyncDepthFirstTreeRunner',
  'BreadthFirstTreeRunner',
  'AsyncBreadthFirstTreeRunner',
  'DagTraversalRunner',
  'AsyncDagTraversalRunner',
  'GraphWalkRunner',
  'AsyncGraphWalkRunner',
];
const runners = runnerNames.map((name) => {
  const declaration = allDeclarations.find((d) => d.name === name);
  assert(declaration, name);
  assert.equal(declaration.kind, 'InterfaceDeclaration', name);
  const source = program
    .getSourceFiles()
    .find(
      (file) =>
        path.relative(root, file.fileName).replaceAll(path.sep, '/') ===
        declaration.location.split(':')[0],
    );
  const runnerDeclaration = source.statements.find(
    (node) => node.name?.getText() === name,
  );
  const runnerType = checker.getDeclaredTypeOfSymbol(
    checker.getSymbolAtLocation(runnerDeclaration.name),
  );
  assert.equal(
    runnerType.getConstructSignatures().length,
    0,
    name + ' must not be constructable',
  );
  assert.equal(rootBindings.find((b) => b.name === name).runtime, false, name);
  for (const member of declaration.members)
    assert(
      !/^(?:icfg|state|curGenerator|visitors|resolvedTreesContainer|resolvedGraphsContainer|inspectDagState)$/.test(
        member.name,
      ),
      name + '.' + member.name,
    );
  return declaration;
});
const forbidden =
  /^(?:Internal.*Runner|TraversalKernel|GraphStore|GraphStoreContract|DagInspectionSnapshot|DagInspectionState|DagIdentityState|DagSchedulingState|KernelPort|KernelOptions|WalkOperation|WalkLink|WalkAction|WalkKernel|NormalizedWalkOptions)$|ResolvedOptions$|RunnerInternalObjects$/;
assert.deepEqual(
  allDeclarations.filter((d) => forbidden.test(d.name)).map((d) => d.name),
  [],
  'No engine or normalized construction declarations may be transitively public',
);
assert.equal(entries.length, 9);
assert.equal(Object.keys(pkg.exports).length, 10);
assert(!Object.keys(pkg.exports).some((key) => key.includes('*')));
// Guard the complete transitively reachable declaration surface, not only barrels.
const retiredNames = new Set([
  'MaterializedDagSource',
  'materializeDagSourceFromRecords',
  'materializeDagSourceFromRoots',
  'materializeDagSourceFromRecordsAsync',
  'materializeDagSourceFromRootsAsync',
  'ObjectMutationPatch',
  'RewriteFn',
  'RewriteFnOptions',
  'RewriteFnPropInput',
  'TraversableObjectTTP',
  'ResolvedTreeTypeParameters',
  'ResolvedVertexStatus',
  'AsyncCoreExecution',
  'CoreInspection',
  'TreeTraversal',
  'TreeTraversalRunner',
  'TreeTraversalIterable',
  'AbstractTreeSource',
  'TraversalVisitor',
  'AsyncTraversalVisitor',
  'TraversalVisitorRecord',
  'MutationCommandBinder',
  'MutationCommandBinderFactory',
  'DEFER_READY',
  'TraversalVisitorFunctionResolutionStyle',
]);
for (const declaration of allDeclarations) {
  assert(
    !retiredNames.has(declaration.name) &&
      !/^(?:Legacy)|VisitorsSimple$/.test(declaration.name),
    declaration.name,
  );
  for (const member of [...declaration.members, ...declaration.staticMembers]) {
    assert(
      !/^(?:getId|getIdOf|getVertexById|getStatusOf|getRootPropertyFromInputObjectDefault|DELETE_VERTEX|DISABLE_SUBTREE_TRAVERSAL|SET_VERTEX_VISITORS_CHAIN_STATE|REWRITE_VERTEX_HINTS_ON_PRE_ORDER)$/.test(
        member.name,
      ),
      declaration.name + '.' + member.name,
    );
  }
  if (declaration.name === 'ResolvedTreeStore')
    assert(!declaration.members.some((m) => m.name === 'delete'));
  if (declaration.name === 'ResolvedGraphVertex')
    assert(!declaration.members.some((m) => m.name === 'status'));
}
for (const binding of bindings)
  assert(!retiredNames.has(binding.name), binding.entry + ':' + binding.name);
assert.deepEqual(
  deprecations,
  [],
  'No deprecated reachable declarations or members',
);
const canonicalNames = [
  'MaterializedDagInput',
  'materializeDagInputFromRecords',
  'materializeDagInputFromRoots',
  'materializeDagInputFromRecordsAsync',
  'materializeDagInputFromRootsAsync',
  'ObjectCurrentVertexTypes',
  'ObjectPropertyPatch',
  'ObjectRewriteCallback',
  'ObjectRewriteContext',
  'ObjectRewriteInput',
  'ObjectTreeVertexTypes',
  'ResolvedTreeVertexTypes',
  'ResolvedVisitStage',
  'ExecutionInspection',
  'TreeDagExecutionInspection',
  'TreeVisitor',
  'AsyncTreeVisitor',
  'TreeVisitorRecord',
  'TreeMutationCommandBinder',
  'TreeMutationCommandBinderFactory',
  'DagDiscoverySource',
  'AsyncDagDiscoverySource',
  'GraphWalkSource',
  'materializeWalkSourceFromRecords',
  'materializeWalkSourceFromRecordsAsync',
  'materializeWalkSourceFromDagDefinition',
];
for (const name of canonicalNames)
  assert(
    rootBindings.some((b) => b.name === name),
    name,
  );
const commands = allDeclarations.find(
  (d) => d.name === 'TraversalVisitorCommandName',
);
for (const name of [
  'DELETE_TREE_SUBTREE',
  'DELETE_DAG_VERTEX_CASCADE',
  'SKIP_REMAINING_CHILDREN',
  'SET_VISITOR_CHAIN_STATE',
])
  assert(
    commands.members.some((m) => m.name === name) ||
      commands.declaredMembers.some((m) => m.signature.includes(name)),
    name,
  );
const members = allDeclarations.reduce(
  (count, d) => count + d.members.length,
  0,
);
const summary = {
  canonicalNames,
  retiredSurfaceGuards: [...retiredNames],
  deprecatedOccurrences: deprecations.length,
  vocabularyOccurrences: vocabulary.length,
  compiler: ts.version,
  runtime: process.version,
  runtimeEntries: entries.length,
  packageEntriesIncludingMetadata: Object.keys(pkg.exports).length,
  exportedBindings: bindings.length,
  rootBindings: rootBindings.length,
  rootRuntimeValues: rootBindings.filter((b) => b.runtime).length,
  reachableDeclarations: allDeclarations.length,
  publicInheritedOrMappedMembers: members,
  staticMembers: allDeclarations.reduce(
    (n, d) => n + d.staticMembers.length,
    0,
  ),
  declaredMemberOccurrences: allDeclarations.reduce(
    (n, d) => n + d.declaredMembers.length,
    0,
  ),
  runners: runners.map((d) => ({
    name: d.name,
    members: d.members.map((m) => m.name),
  })),
  signatureSupport: allDeclarations
    .filter((d) => !bindings.some((b) => b.declarations.includes(d.location)))
    .map((d) => ({ name: d.name, location: d.location })),
};
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(output, 'public-api-census.json'),
  JSON.stringify(
    {
      summary,
      exports: pkg.exports,
      bindings,
      declarations: allDeclarations,
      vocabulary,
    },
    null,
    2,
  ) + '\n',
);
fs.writeFileSync(
  path.join(output, 'public-api-census-summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
