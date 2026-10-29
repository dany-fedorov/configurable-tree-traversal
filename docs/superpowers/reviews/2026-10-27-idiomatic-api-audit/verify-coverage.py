import sys
from pathlib import Path
import json,re,hashlib
p=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
e=json.loads((p/'expected-coverage.json').read_text())
c=json.loads((p/'coverage.json').read_text())
report=(p/'review.md').read_text()
findings=set(re.findall(r'\bF\d{2,3}\b',report))
allowed={'retain','rename','remove','redesign','signature-support'}
summary={}
for group,expected in e.items():
 rows=c[group]
 assert isinstance(rows,list),group
 ids=[r['id'] for r in rows]
 assert len(ids)==len(set(ids)),('duplicate',group)
 assert set(ids)=={r['id'] for r in expected},('coverage mismatch',group,len(ids),len(expected))
 for r in rows:
  assert r['disposition'] in allowed,(group,r)
  assert isinstance(r['reason'],str) and r['reason'].strip(),(group,r)
  assert isinstance(r['findingIds'],list) and set(r['findingIds'])<=findings,(group,r)
  if r['disposition'] in {'rename','remove','redesign'}: assert r['findingIds'],('missing actionable finding',r)
 summary[group]={'expected':len(expected),'reviewed':len(rows),'dispositions':{d:sum(r['disposition']==d for r in rows) for d in sorted(allowed)}}
assert len(findings)>0,'Require reported findings or adapt verifier for explicitly clean review'
result={'groups':summary,'findingIds':sorted(findings),'reportSha256':hashlib.sha256((p/'review.md').read_bytes()).hexdigest(),'completeInventoryCoverage':True}
(p/'coverage-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
