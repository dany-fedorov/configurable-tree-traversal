import sys
from pathlib import Path
import re,json
root=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else Path.cwd()
p=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
report=(p/'review.md').read_text()
pattern=r'(?<![\w/-])((?:src|tests|docs|scripts)/[\w./-]+\.(?:ts|md|cjs|json)|package\.json):(\d+)'
refs=sorted(set(re.findall(pattern,report)))
assert refs,'No source citations extracted'
for file,line in refs:
 f=root/file
 assert f.is_file(),f
 assert 1<=int(line)<=len(f.read_text().splitlines()),(file,line)
result={'sourceReferencesChecked':len(refs),'allFilesExistAndLinesInRange':True,'references':[{'path':f,'line':int(l)} for f,l in refs],'scope':'Citation targets, not automatic semantic verification. Controller evaluates substantive findings separately.'}
(p/'citation-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='references'},indent=2))
