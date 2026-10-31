from pathlib import Path
import json,re,hashlib,datetime,subprocess
base=Path('/tmp/ctt-doc-review-20261031');root=Path('/home/df/.codex/worktrees/d56c/configurable-tree-traversal')
findings=json.loads((base/'reconciled-findings.json').read_text())
reviewA=(base/'astra-review.md').read_text();reviewF=(base/'fable-review.md').read_text()
a=re.findall(r'^## (\d+)\. (.+)$',reviewA,re.M);f=re.findall(r'^\*\*(\d+)\. (.+?)\*\*',reviewF,re.M)
assert len(a)==len(f)==20,(len(a),len(f))
byorigin={}
for finding in findings:
 for origin in finding['origins']:byorigin.setdefault(origin,[]).append(finding['id'])
extra={
 'A20':('valid, lower priority; not selected','A small awaited AsyncDagTraversal recipe would improve the alternative execution model. It is narrower (Astra rated 2/5) than the twenty selected blockers, contradictions and reference gaps. Do not claim no async documentation exists.'),
 'F12':('valid consolidation opportunity; subsumed, not a separate finding','The completed-work rules exist across relevant contexts. D13 addresses the human W/C explanation and D19 improves authoritative contract placement. A separate twenty-first duplication finding would add little.'),
 'F13':('remedy not adopted','A reference need not be an objects-first tutorial; that proposed order also conflicts with the repository’s agent-first priority. D04 improves the human guide sequence and D08 improves direct reference retrieval.'),
 'F14':('valid, lower priority; not selected','Labeling the initial raw DAG example as custom-adapter use would help. The detailed reference legitimately covers that path; prioritize the human guide and working README session flow first.'),
 'F15':('valid, lower priority; quantitative claim corrected','AGENTS.md is dense, but this contributor entry point is secondary to public onboarding/reference goals. Its line15 is 4315 characters, not approximately1900; that numeric claim is not retained.'),
 'F18':('valid, lower priority; not selected','The index links15 of22 examples. Linking the remaining7 is useful, but relevant examples are already present and auto-discovered by verification. It ranks below the selected first-use and contract gaps.'),
 'F20':('editorial preference, lower priority; not selected','Collapsing redirect rows could reduce clutter. Moving legacy README anchors to a different file would not preserve existing README links, so retain those anchors if acting on this preference.')
}
rows=[]
for prefix,candidates in [('A',a),('F',f)]:
 for n,title in candidates:
  key=f'{prefix}{int(n):02}'
  if key in byorigin:
   note='Retained or merged after controller verification.'
   if key=='F01':note='Registry/install claim originally exceeded the reviewer’s evidence; independently verified published metadata/tarball exports before retaining at5/5.'
   if key=='F04':note='Opening and overloaded quickstart explanation separated; rejected the proposed hook’s never-stores-anything/never-runs-a-task/exactly-each-advance claims.'
   if key=='F09':note='Do not overload the beginner quickstart with every failure. Merge practical result/error branching into D15’s reference recipe; full boundary union already exists in prose/source.'
   if key=='F11':note='Retain operation/result/error-category guidance, not an unsupported promise that error-message strings are stable codes. Throw-site counts not needed to establish the gap.'
   if key=='F08':note='Placement verified; absolute only-place wording not retained because related contracts exist in migrations and other passages.'
   rows.append({'candidate':key,'title':title,'disposition':'retained/merged','finalFindings':byorigin[key],'reason':note})
  else:
   assert key in extra,key
   status,note=extra[key];rows.append({'candidate':key,'title':title,'disposition':status,'finalFindings':[],'reason':note})
assert len(rows)==40
(base/'reconciliation.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
manifest=json.loads((base/'review-input-hashes.json').read_text())
for p,h in manifest.items():assert hashlib.sha256((root/p).read_bytes()).hexdigest()==h,p
report=(base/'2026-10-31-documentation-review.md').read_text()
assert len(re.findall(r'^### D\d\d\.',report,re.M))==20
refs=[]
for name,lo in re.findall(r'(?<![\w/])((?:src|tests|examples|scripts|docs)/[A-Za-z0-9_./-]+\.(?:md|ts|cjs|json)|README\.md|AGENTS\.md|CHANGELOG\.md|package\.json):(\d+)',report):
 p=root/name;assert p.is_file(),name
 lines=p.read_text().splitlines();n=int(lo);assert 1<=n<=len(lines),(name,n,len(lines))
 refs.append({'file':name,'line':n,'text':lines[n-1],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(base/'citation-verification.json').write_text(json.dumps({'status':'passed','reportCitationOccurrences':len(refs),'citations':refs},indent=2,ensure_ascii=False)+'\n')
for name,expected in [('contract-tests.log',44),('migration-contract-tests.log',51)]:
 text=(base/name).read_text();assert re.search(r'Test Suites:\s+2 passed, 2 total',text);assert re.search(r'Tests:\s+'+str(expected)+r' passed, '+str(expected)+r' total',text)
fable=json.loads((base/'fable-result.json').read_text());assert fable['subtype']=='success' and not fable.get('is_error');assert 'claude-fable-5-1' in fable['modelUsage']
public=json.loads((base/'published-package-runtime.json').read_text());assert public=={'version':'0.11.0','materializeDagInputFromRecords':'undefined','prepareDag':'undefined'}
requirements={
 'status':'complete', 'timestampUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'goal':'Review documentation for truthful human hook, gradual human exposition and detailed agent API/examples; produce20 impact-ranked findings; run Codex Astra high and Claude Fable high independently in parallel and reconcile.',
 'worktree':str(root),'branch':'fix/public-api-findings-20261031',
 'requirements':[
 {'requirement':'Strong but truthful hook','evidence':['D02','Possible truthful opening section; source/example anchors and host boundary preserved'],'status':'proved'},
 {'requirement':'Gradual human exposition at likely entry points','evidence':['D01','D03','D04','D09','D13','D14','README/workflow/index walkthrough'],'status':'proved'},
 {'requirement':'Detailed API contracts with agent/AI examples','evidence':['D05','D06','D07','D08','D10','D11','D12','D15','D16','D17','D18','D19','D20'],'status':'proved'},
 {'requirement':'Exactly20 findings scored1/5..5/5 by impact','evidence':'reconciled-findings.json;20 unique IDs, scores in range, descending order','status':'proved'},
 {'requirement':'Codex Astra high review','evidence':'astra-review.md; explicitly spawned gpt-6-astra/high, independent clean context; terminal final answer received','status':'proved'},
 {'requirement':'Claude Fable high review','evidence':'fable-result.json; successful terminal result, actual claude-fable-5-1, requested high effort','status':'proved'},
 {'requirement':'Reviews run in parallel','evidence':'Astra spawned before Fable exec session67133 launch; both confirmed running during overlapping controller walkthrough; neither read the other review','status':'proved'},
 {'requirement':'Reconcile results','evidence':'reconciliation.json accounts for all40 candidates; merges, exclusions, corrected quantitative/semantic claims and external confirmation recorded','status':'proved'}
 ],
 'findingCounts':{'total':20,'score5':1,'score4':7,'score3':12},
 'freshVerification':{'sourceSuites':4,'sourceTests':95,'commands':['npm test -- --runTestsByPath tests/prepared-dag.test.ts tests/api-distinction-behavior.test.ts','npm test -- --runTestsByPath tests/omission-identity-validation.test.ts tests/vertex-content-api.test.ts'],'fullCheckRerun':False,'allReviewInputsUnchanged':len(manifest),'reportCitationsVerified':len(refs),'publicRegistryLatest':'0.11.0','publishedExports':'quickstart APIs absent'},
 'sourceOrConsumerGuideChanges':False,
 'limitations':['Editorial scores are not usability-study results.','Independent reviewers did not run tests; controller executed focused checks.','Published runtime probe reused existing uuid dependency; not a complete clean-install compatibility matrix.','Review is recommendations only; no implementation or release.']
}
(base/'completion-audit.json').write_text(json.dumps(requirements,indent=2)+'\n')
print(json.dumps({'findings':len(findings),'reviewerCandidates':len(rows),'citationsVerified':len(refs),'reviewInputsUnchanged':len(manifest),'focusedTestsPassed':95,'status':'passed'}))
