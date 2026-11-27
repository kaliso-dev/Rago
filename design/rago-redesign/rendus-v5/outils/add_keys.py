# python3 add_keys.py keys.json : ajoute (ou remplace) des clés dans les dictionnaires fr et en de app/src/lib/i18n.ts
import json, re, sys
from pathlib import Path
P = Path('/home/claude/rago/app/src/lib/i18n.ts')
s = P.read_text()
keys = json.load(open(sys.argv[1]))
fr_start = s.index('const fr = {'); en_start = s.index('const en')
fr_end = s.index('\n};', fr_start); en_end = s.index('\n};', en_start)
def put(block, k, v):
    line = f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},'
    pat = re.compile(r'^  ' + re.escape(json.dumps(k)) + r': .*,$', re.M)
    if pat.search(block): return pat.sub(lambda m: line, block, count=1)
    return block + '\n' + line
fr = s[fr_start:fr_end]; en = s[en_start:en_end]
for k, (vf, ve) in keys.items():
    fr = put(fr, k, vf); en = put(en, k, ve)
s = s[:fr_start] + fr + s[fr_end:en_start] + en + s[en_end:]
P.write_text(s)
print(len(keys), 'clés')
