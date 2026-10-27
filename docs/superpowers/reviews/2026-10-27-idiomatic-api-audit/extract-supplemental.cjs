const fs = require('node:fs');
const path = require('node:path');
const root = '/home/df/.codex/worktrees/04b4/configurable-tree-traversal';
const out = '/tmp/ctt-idiomatic-review-2026-10-27';
const ts = require(root + '/node_modules/typescript');
const census = JSON.parse(fs.readFileSync(out + '/public-api-census.json', 'utf8'));
const files = new Map();
const result = [];
const locate = n => path.relative(root, n.getSourceFile().fileName) + ':' + (n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1);
for (const d of census.declarations) {
 const split = d.location.lastIndexOf(':');
 const file = d.location.slice(0, split);
 if (!files.has(file)) files.set(file, ts.createSourceFile(root + '/' + file, fs.readFileSync(root + '/' + file, 'utf8'), ts.ScriptTarget.Latest, true));
 const source = files.get(file);
 let declaration;
 const find = n => { if (n.name?.getText() === d.name && locate(n) === d.location) declaration = n; else ts.forEachChild(n, find); };
 find(source);
 if (!declaration) throw new Error('Missing ' + d.location + ' ' + d.name);
 const record = {owner:d.name, declaration:d.location, literals:[],parameters:[],typeParameters:[],deprecated:[]};
 const visit = n => {
  if (n.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) || n.name && ts.isPrivateIdentifier(n.name)) return;
  if (ts.isLiteralTypeNode(n) || ts.isEnumMember(n)) record.literals.push({location:locate(n), text:n.getText()});
  if (ts.isParameter(n)) record.parameters.push({location:locate(n),name:n.name.getText(),type:n.type?.getText(),optional:!!n.questionToken});
  if (ts.isTypeParameterDeclaration(n)) record.typeParameters.push({location:locate(n),signature:n.getText()});
  const tags = ts.getJSDocTags(n).filter(t => t.tagName.text === 'deprecated');
  for (const tag of tags) record.deprecated.push({location:locate(n),name:n.name?.getText() || d.name,comment:tag.comment});
  ts.forEachChild(n,visit);
 };
 visit(declaration);
 result.push(record);
}
const summary = {declarations:result.length,literals:result.reduce((s,r)=>s+r.literals.length,0),parameters:result.reduce((s,r)=>s+r.parameters.length,0),typeParameters:result.reduce((s,r)=>s+r.typeParameters.length,0),deprecated:result.reduce((s,r)=>s+r.deprecated.length,0)};
fs.writeFileSync(out + '/supplemental-vocabulary.json', JSON.stringify({summary,declarations:result},null,2)+'\n');
console.log(JSON.stringify(summary));
