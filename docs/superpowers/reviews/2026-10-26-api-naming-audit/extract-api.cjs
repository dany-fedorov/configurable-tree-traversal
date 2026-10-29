const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const repo = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const ts = require(path.join(repo, 'node_modules/typescript'));
const files = cp.execFileSync('rg', ['--files', 'dist', '-g', '*.d.ts'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').sort();
const program = ts.createProgram(files.map(f => path.join(repo, f)), { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, strict: true, skipLibCheck: true });
const checker = program.getTypeChecker();
const rows = new Map();
const declKeys = new Map();
const modules = [];
function loc(node) { const sf=node.getSourceFile(); return { file:path.relative(repo,sf.fileName), line:sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1 }; }
function nameOf(node) { return node.name ? node.name.getText() : ts.isConstructorDeclaration(node) ? 'constructor' : ts.isCallSignatureDeclaration(node) ? '(call)' : ts.isConstructSignatureDeclaration(node) ? '(new)' : ts.isIndexSignatureDeclaration(node) ? '[index]' : '(anonymous)'; }
function kindOf(node) { return ts.SyntaxKind[node.kind]; }
function family(file) { if(file.includes('/graph-walk/'))return 'walking'; if(file.includes('/dag-traversal/') || file.includes('/sources/'))return 'dag'; if(file.includes('/core/graph/') || file.includes('/core/scheduling/') || file.includes('/core/drivers/') || file.includes('/core/effects/') || /TraversalKernel|AsyncCoreExecution/.test(file) || file.includes('/utils/'))return 'engine'; return 'tree-core'; }
function createTop(node, name, exported=false) {
 const l=loc(node); const id=l.file.replace(/^dist\//,'').replace(/\.d\.ts$/,'')+'::'+name;
 if(!rows.has(id)) rows.set(id,{id,name,kind:kindOf(node),level:'symbol',family:family(l.file),declaration:l,sourceFile:l.file.replace(/^dist\//,'src/').replace(/\.d\.ts$/,'.ts'),exposure:exported?'exported':'signature-support',exports:[],signatures:[],members:[],resolvedMembers:[]});
 const row=rows.get(id); const text=node.getText(); if(!row.signatures.includes(text))row.signatures.push(text); declKeys.set(node,id); return row;
}
for(const file of files) {
 const sf=program.getSourceFile(path.join(repo,file));
 for(const st of sf.statements) {
  if(ts.isVariableStatement(st)) for(const d of st.declarationList.declarations) createTop(d,nameOf(d));
  else if(ts.isClassDeclaration(st)||ts.isInterfaceDeclaration(st)||ts.isTypeAliasDeclaration(st)||ts.isFunctionDeclaration(st)||ts.isEnumDeclaration(st)||ts.isModuleDeclaration(st)) createTop(st,nameOf(st));
 }
}
function resolve(sym) { const seen=new Set(); while(sym && sym.flags&ts.SymbolFlags.Alias && !seen.has(sym)) {seen.add(sym);sym=checker.getAliasedSymbol(sym);} return sym; }
function keyFor(sym) {
 const s=resolve(sym); for(const d of s?.declarations||[]) if(declKeys.has(d)) return declKeys.get(d);
 return null;
}
for(const file of files) {
 const sf=program.getSourceFile(path.join(repo,file)); const symbol=checker.getSymbolAtLocation(sf);
 const exported=symbol?checker.getExportsOfModule(symbol):[];
 const modulePath='./'+file.replace(/^dist\//,'').replace(/\.d\.ts$/,'');
 const m={file,modulePath,extensionPath:modulePath+'.js',esmFacade:file.replace(/\.d\.ts$/,'.mjs'),esmTypes:file.replace(/\.d\.ts$/,'.d.mts'),exports:[]};
 for(const exp of exported) {
  let id=keyFor(exp); const target=resolve(exp);
  if(!id && target?.declarations?.some(ts.isSourceFile)) {
   const targetFile=target.declarations.find(ts.isSourceFile); const n=exp.name;
   id=file.replace(/^dist\//,'').replace(/\.d\.ts$/,'')+'::namespace:'+n;
   if(!rows.has(id)) rows.set(id,{id,name:n,kind:'NamespaceExport',level:'symbol',family:family(file),declaration:{file,line:1},sourceFile:file.replace(/^dist\//,'src/').replace(/\.d\.ts$/,'.ts'),exposure:'exported',exports:[],signatures:['namespace '+n+' -> '+path.relative(repo,targetFile.fileName)],members:[],resolvedMembers:[]});
  }
  if(!id)throw Error('Unresolved export '+file+' '+exp.name);
  const row=rows.get(id); row.exposure='exported'; row.exports.push({module:modulePath,name:exp.name}); m.exports.push({name:exp.name,id});
 }
 m.defaultFacade= m.exports.some(e=>e.name==='default')?'explicit-default':'module-namespace';
 modules.push(m);
}
const memberKinds=new Set([ts.SyntaxKind.PropertySignature,ts.SyntaxKind.PropertyDeclaration,ts.SyntaxKind.MethodSignature,ts.SyntaxKind.MethodDeclaration,ts.SyntaxKind.GetAccessor,ts.SyntaxKind.SetAccessor,ts.SyntaxKind.EnumMember,ts.SyntaxKind.Constructor,ts.SyntaxKind.CallSignature,ts.SyntaxKind.ConstructSignature,ts.SyntaxKind.IndexSignature]);
for(const [decl,parentId] of declKeys) {
 const parent=rows.get(parentId);
 function walk(node,trail) {
  if(node!==decl && memberKinds.has(node.kind)) {
   if(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword) || (node.name && ts.isPrivateIdentifier(node.name)))return;
   const name=nameOf(node); const sub=trail?trail+'.'+name:name; const id=parentId+'#'+sub;
   const l=loc(node);
   if(!rows.has(id))rows.set(id,{id,name:sub,kind:kindOf(node),level:'member',parent:parentId,family:parent.family,declaration:l,sourceFile:parent.sourceFile,exposure:node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ProtectedKeyword)?'subclass':'public-member',exports:[],signatures:[],members:[],resolvedMembers:[]});
   const row=rows.get(id);const text=node.getText();if(!row.signatures.includes(text))row.signatures.push(text);
   if(!parent.members.includes(id))parent.members.push(id);
   ts.forEachChild(node,c=>{ if(c===node.name)return; if(ts.isParameter(c)){if(c.type)walk(c.type,sub+'('+nameOf(c)+')');}else walk(c,sub);});
   return;
  }
  if(ts.isParameter(node)){ if(node.type)walk(node.type,trail+'('+nameOf(node)+')');return; }
  ts.forEachChild(node,c=>walk(c,trail));
 }
 walk(decl,'');
 // Record inherited, mapped and aliased member names as relationships, with original declarations.
 try {
  const sym=decl.name?checker.getSymbolAtLocation(decl.name):null;
  const type=ts.isClassDeclaration(decl)||ts.isInterfaceDeclaration(decl)||ts.isTypeAliasDeclaration(decl)?checker.getDeclaredTypeOfSymbol(sym):checker.getTypeAtLocation(decl);
  const types=type?.isUnion()?type.types:[type];
  for(const t of types.filter(Boolean))for(const prop of checker.getPropertiesOfType(t)) {
   const ds=(prop.declarations||[]).filter(d=>path.resolve(d.getSourceFile().fileName).startsWith(path.join(repo,'dist')+path.sep));
   if(!ds.length || ds.some(d=>d.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword)))continue;
   const item={name:prop.name,declarations:ds.map(loc)};
   if(!parent.resolvedMembers.some(p=>p.name===item.name&&JSON.stringify(p.declarations)===JSON.stringify(item.declarations)))parent.resolvedMembers.push(item);
  }
 }catch(e){parent.typeInspectionNote=String(e);}
}
const packageJson=JSON.parse(fs.readFileSync(path.join(repo,'package.json'),'utf8'));
const inventory={head:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),typescript:ts.version,exportMap:packageJson.exports,modules,rows:[...rows.values()].sort((a,b)=>a.id.localeCompare(b.id))};
for(const m of modules)for(const f of [m.esmFacade,m.esmTypes,m.file.replace(/\.d\.ts$/,'.js')])if(!fs.existsSync(path.join(repo,f)))throw Error('Missing packaged companion '+f);
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(inventory,null,2)+'\n');
for(const familyName of ['dag','walking','tree-core','engine']) {
 const rs=inventory.rows.filter(r=>r.family===familyName);
 fs.writeFileSync(path.join(output,familyName+'.json'),JSON.stringify(rs,null,2)+'\n');
 fs.writeFileSync(path.join(output,familyName+'.md'),rs.map(r=>`## ${r.id}\n\n${r.exposure}; ${r.declaration.file}:${r.declaration.line}\nExports: ${r.exports.map(x=>x.module+'#'+x.name).join(', ')||'(through owning signature)'}\n\n\`\`\`ts\n${r.signatures.join('\n')}\n\`\`\`\n`).join('\n'));
}
const counts={modules:modules.length,exportBindings:modules.reduce((n,m)=>n+m.exports.length,0),symbols:inventory.rows.filter(r=>r.level==='symbol').length,members:inventory.rows.filter(r=>r.level==='member').length,byFamily:Object.fromEntries(['dag','walking','tree-core','engine'].map(f=>[f,inventory.rows.filter(r=>r.family===f).length]))};
fs.writeFileSync(path.join(output,'counts.json'),JSON.stringify(counts,null,2)+'\n');console.log(JSON.stringify(counts,null,2));
