"""full et rest = ceux de l'ancien script (PC déjà passés par lui) + ce que le nouveau script ajoute.
Les autres champs (rest_avant, sans_retour, sauvegarde_seulement…) viennent du nouveau fichier.
usage : python3 merge_full.py <annulation_ancienne.json> <annulation_nouvelle.json> <sortie.json>
"""
import json, re, sys
old_p, new_p, out_p = sys.argv[1:4]
old, new = json.load(open(old_p, encoding='utf-8')), json.load(open(new_p, encoding='utf-8'))
R = '\r\n'

def depth(line):
    if re.match(r'\s*(rem\b|::|echo\b)', line, re.I):
        return 0
    s = re.sub(r'"[^"]*"', '', line.replace('^(', '').replace('^)', ''))
    return s.count('(') - s.count(')')

def units(body):
    """Découpe en instructions complètes (un bloc ( … ) reste entier)."""
    out, cur, d = [], [], 0
    for l in (body or '').split(R):
        if not cur and l.strip().lower() == '@echo off':
            continue
        cur.append(l); d += depth(l)
        if d <= 0:
            out.append(cur); cur, d = [], 0
    if cur:
        out.append(cur)
    return [u for u in out if any(x.strip() for x in u)]

merged, stats = {}, {'full_fusionnées': 0, 'rest_fusionnées': 0, 'blocs_ajoutés': 0, 'déséquilibre': []}
NOTE = {'full': "full couvre aussi l'ancien script (lignes retirées depuis) : un PC passé par l'ancien script sans "
                "sauvegarde retrouve aussi ces valeurs.",
        'rest': "rest couvre aussi l'ancien script : si l'app installe les sauvegardes avant les scripts corrigés, "
                "les réglages hors sauvegarde de l'ancien script sont quand même remis."}


def merge(ob, nb):
    ou, nu = units(ob), units(nb)
    seen = {tuple(u) for u in ou}
    extra = [u for u in nu if tuple(u) not in seen]
    return R.join(['@echo off'] + [l for u in ou + extra for l in u]), len(extra)


for tid, vs in new.items():
    if tid == '_meta':
        merged[tid] = vs; continue
    merged[tid] = {}
    for v, e in vs.items():
        e = dict(e)
        e['notes'] = list(e.get('notes') or [])
        o = old.get(tid, {}).get(v) or {}
        for k in ('full', 'rest'):
            if o.get(k) and e.get(k) != o[k]:
                body, n = merge(o[k], e.get(k))
                if body != e.get(k):
                    e[k] = body
                    stats[k + '_fusionnées'] += 1; stats['blocs_ajoutés'] += n
                    e['notes'].append(NOTE[k])
            if e.get(k) and sum(depth(l) for l in e[k].split(R)) != 0:
                stats['déséquilibre'].append(f'{tid}:{v}:{k}')
        merged[tid][v] = e
# variantes disparues du nouveau fichier : on garde l'ancienne annulation
for tid, vs in old.items():
    for v, e in vs.items():
        if tid != '_meta' and v not in merged.get(tid, {}):
            merged.setdefault(tid, {})[v] = e; stats.setdefault('gardées', []).append(f'{tid}:{v}')
meta = merged.get('_meta', {}).get('_')
if meta and 'lisez_moi' in meta:
    meta['lisez_moi'] = list(meta['lisez_moi']) + [
        "Version « corrigé » : générée depuis scripts.json APRÈS audit/outils-annulation/propositions.py, puis fusionnée avec "
        "annulation-2026-10-07.json (merge_full.py) : full et rest = ceux de l'ancien script + ce que le nouveau ajoute. Un PC "
        "passé par l'ancien script retrouve aussi les valeurs des lignes retirées par l'audit, quel que soit l'ordre de sortie "
        "des scripts corrigés et des sauvegardes.",
        "Après avoir porté propositions.py dans build_catalog_v6.py : relancer undo_gen.py sur le nouveau scripts.json, puis "
        "merge_full.py avec annulation-2026-10-07.json comme ancien fichier : le résultat doit être identique à ce fichier."]
json.dump(merged, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(stats, ensure_ascii=False))
