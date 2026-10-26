const fs=require('node:fs');const path=require('node:path');const cp=require('node:child_process');
const dir=process.argv[2]||__dirname;const repo=process.argv[3]?path.resolve(process.argv[3]):null;
const inv=JSON.parse(fs.readFileSync(path.join(dir,'inventory.json'),'utf8'));
const rows=new Map(inv.rows.map(r=>[r.id,r]));if(rows.size!==inv.rows.length)throw Error('Duplicate inventory IDs');
const seen=new Set();const decisions=new Map();const perFamily={};
for(const family of ['dag','walking','tree-core','engine']){
 const assessments=JSON.parse(fs.readFileSync(path.join(dir,family+'-assessment.json'),'utf8'));
 const expected=inv.rows.filter(r=>r.family===family);
 const local=new Set();
 for(const a of assessments){
  if(!rows.has(a.id)||rows.get(a.id).family!==family)throw Error('Unexpected ID '+a.id);
  if(local.has(a.id)||seen.has(a.id))throw Error('Duplicate assessment '+a.id);
  if(!['keep','rename','configure','consolidate','internalize','compatibility-only'].includes(a.decision))throw Error('Bad decision '+a.id);
  if(typeof a.rationale!=='string'||a.rationale.length<20)throw Error('Missing rationale '+a.id);
  if(!Array.isArray(a.relatedSymbols)||!Array.isArray(a.issueIds))throw Error('Bad crosslinks '+a.id);
  if(['keep','internalize','compatibility-only'].includes(a.decision)&&a.proposedName!==null)throw Error('Unexpected proposed name '+a.id);
  local.add(a.id);seen.add(a.id);decisions.set(a.id,a);
 }
 for(const r of expected)if(!local.has(r.id))throw Error('Unreviewed '+r.id);
 perFamily[family]={expected:expected.length,reviewed:assessments.length};
}
let consolidated=null;
if(fs.existsSync(path.join(dir,'assessment.json'))){
 const finalRows=JSON.parse(fs.readFileSync(path.join(dir,'assessment.json'),'utf8'));const ids=new Set();
 const improvements=JSON.parse(fs.readFileSync(path.join(dir,'improvements.json'),'utf8'));
 if(improvements.length!==20||new Set(improvements.map(x=>x.id)).size!==20||improvements.some(x=>x.impact<1||x.impact>5))throw Error('Expected20 scored improvements');
 for(const a of finalRows){if(!rows.has(a.id)||ids.has(a.id))throw Error('Invalid consolidated ID '+a.id);ids.add(a.id);
 if(!a.rationale||!Array.isArray(a.improvementIds)||a.improvementIds.some(id=>!improvements.some(x=>x.id===id)))throw Error('Invalid consolidated assessment '+a.id);
 if(['keep','internalize','compatibility-only'].includes(a.decision)&&a.proposedName!==null)throw Error('Invalid name '+a.id);
 decisions.set(a.id,a);
 }
 if(ids.size!==rows.size)throw Error('Incomplete consolidated review');
 const collisions=JSON.parse(fs.readFileSync(path.join(dir,'consolidation.json'),'utf8')).proposedNameCollisions;
 if(collisions.some(c=>!c.resolution.startsWith('Intentional consolidation')))throw Error('Unresolved proposed-name collision');
 consolidated={assessedRows:ids.size,rankedImprovements:improvements.length,unresolvedProposedNameCollisions:0,intentionalConsolidations:collisions.map(x=>x.name)};
}
const moduleRows=[];
for(const m of inv.modules){
 for(const e of m.exports)if(!decisions.has(e.id))throw Error('Unassessed export '+m.modulePath+'#'+e.name);
 moduleRows.push({module:m.modulePath,extensionAlias:m.extensionPath,defaultFacade:m.defaultFacade,exports:m.exports.map(e=>({name:e.name,id:e.id,decision:decisions.get(e.id).decision})),assessment:'Every binding resolves to an assessed canonical declaration; identical barrel/deep/extension aliases share the declaration decision. Generated ESM default facades expose the same module namespace unless this module declares an explicit default. Wildcard-only implementation modules are covered by the export-boundary proposal.'});
}
const inherited=inv.rows.filter(r=>r.level==='symbol').flatMap(r=>r.resolvedMembers.map(m=>({owner:r.id,name:m.name,declarations:m.declarations})));
const declLocations=new Map();for(const r of inv.rows){const k=r.declaration.file+':'+r.declaration.line;const arr=declLocations.get(k)||[];arr.push(r.id);declLocations.set(k,arr);}
const unmapped=inherited.filter(m=>!m.declarations.some(l=>declLocations.has(l.file+':'+l.line)));
// Declarations in union alternatives may share a member ID while each alternative has its own location.
// Verify unmapped positions occur inside a reviewed owning declaration signature using the compiler AST.
let structuralCheck=null;
if(repo){
 const ts=require(path.join(repo,'node_modules/typescript'));
 const walkFiles=d=>fs.readdirSync(path.join(repo,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walkFiles(d+'/'+e.name):[d+'/'+e.name]);
 const files=walkFiles('dist').filter(f=>f.endsWith('.d.ts')).sort();
 if(JSON.stringify(files)!==JSON.stringify(inv.modules.map(m=>m.file).sort()))throw Error('Declaration module census drift');
 let tops=0,members=0;const unexpected=[];const declarationRanges=[];
 const memberKinds=new Set([ts.SyntaxKind.PropertySignature,ts.SyntaxKind.PropertyDeclaration,ts.SyntaxKind.MethodSignature,ts.SyntaxKind.MethodDeclaration,ts.SyntaxKind.GetAccessor,ts.SyntaxKind.SetAccessor,ts.SyntaxKind.EnumMember,ts.SyntaxKind.Constructor,ts.SyntaxKind.CallSignature,ts.SyntaxKind.ConstructSignature,ts.SyntaxKind.IndexSignature]);
 for(const file of files){
  const sf=ts.createSourceFile(file,fs.readFileSync(path.join(repo,file),'utf8'),ts.ScriptTarget.Latest,true);
  const named=sf.statements.flatMap(st=>ts.isVariableStatement(st)?[...st.declarationList.declarations]:[st]).filter(st=>ts.isVariableDeclaration(st)||ts.isClassDeclaration(st)||ts.isInterfaceDeclaration(st)||ts.isTypeAliasDeclaration(st)||ts.isFunctionDeclaration(st)||ts.isEnumDeclaration(st)||ts.isModuleDeclaration(st));
  for(const st of named){
   tops++;const name=st.name?st.name.getText(sf):'(anonymous)';const id=file.replace(/^dist\//,'').replace(/\.d\.ts$/,'')+'::'+name;
   if(!decisions.has(id))unexpected.push(id);
   declarationRanges.push({file,start:sf.getLineAndCharacterOfPosition(st.getStart(sf)).line+1,end:sf.getLineAndCharacterOfPosition(st.end).line+1,id});
   function walk(n,trail){
    if(n!==st&&memberKinds.has(n.kind)){
     if(n.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword)||(n.name&&ts.isPrivateIdentifier(n.name)))return;
     members++;const name=n.name?n.name.getText(sf):ts.isConstructorDeclaration(n)?'constructor':ts.isCallSignatureDeclaration(n)?'(call)':ts.isConstructSignatureDeclaration(n)?'(new)':ts.isIndexSignatureDeclaration(n)?'[index]':'(anonymous)';const sub=trail?trail+'.'+name:name;
     if(!decisions.has(id+'#'+sub))unexpected.push(id+'#'+sub);
     ts.forEachChild(n,c=>{if(c===n.name)return;if(ts.isParameter(c)){if(c.type)walk(c.type,sub+'('+c.name.getText(sf)+')');}else walk(c,sub);});return;
    }
    if(ts.isParameter(n)){if(n.type)walk(n.type,trail+'('+n.name.getText(sf)+')');return;}
    ts.forEachChild(n,c=>walk(c,trail));
   }walk(st,'');
  }
  for(const suffix of ['.js','.mjs','.d.mts'])if(!fs.existsSync(path.join(repo,file.replace(/\.d\.ts$/,suffix))))throw Error('Missing facade '+file+suffix);
 }
 if(unexpected.length)throw Error('Missing AST entries '+unexpected.join(','));
 for(const m of unmapped)for(const d of m.declarations)if(!declarationRanges.some(r=>r.file===d.file&&r.start<=d.line&&r.end>=d.line))throw Error('Uncovered inherited member '+JSON.stringify(m));
 structuralCheck={declarationModules:files.length,topLevelSyntaxDeclarations:tops,publicOrProtectedMemberSyntaxOccurrences:members,uncoveredSyntaxEntries:unexpected.length};
}
const report={baseline:inv.head,consolidated,modules:inv.modules.length,exportBindings:moduleRows.reduce((n,m)=>n+m.exports.length,0),symbols:inv.rows.filter(r=>r.level==='symbol').length,directlyExportedSymbols:inv.rows.filter(r=>r.level==='symbol'&&r.exposure==='exported').length,signatureSupportDeclarations:inv.rows.filter(r=>r.level==='symbol'&&r.exposure==='signature-support').length,declaredMembers:inv.rows.filter(r=>r.level==='member').length,assessedRows:seen.size,missingRows:inv.rows.length-seen.size,perFamily,inheritedOrMappedRelationships:inherited.length,relationshipsAtAlternativeSignatureLocations:unmapped.length,structuralCheck,limits:['Canonical declaration/member counts merge overloads and same-named fields of tagged union alternatives.','Signature-support declarations are included conservatively; they are not all standalone imports.','ESM default namespace facades and extension aliases are reviewed as module bindings, not new domain APIs.','Standard-library inherited members and private implementation members are excluded.','Parameters, generics, literals and inherited/mapped members are assessed with their owning contracts; only declared members have standalone rows.','No claim of formally proven human unambiguity; scores estimate likely agent comprehension impact.']};
fs.writeFileSync(path.join(dir,'module-assessment.json'),JSON.stringify(moduleRows,null,2)+'\n');fs.writeFileSync(path.join(dir,'coverage.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
