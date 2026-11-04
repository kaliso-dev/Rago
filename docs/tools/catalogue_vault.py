#!/usr/bin/env python3
"""Régénère les notes « Tweaks » du vault Obsidian à partir du catalogue de l'app.

Usage (depuis la racine du dépôt, sur la branche qui porte la DERNIÈRE version de l'app, aujourd'hui `staging`) :
    python3 docs/tools/catalogue_vault.py [dossier_app]   # dossier_app = app par défaut

Écrit docs/vault/Tweaks/*.md : une note par module, une note Presets, une note Tweaks retirés.
Ne jamais éditer ces notes à la main : modifier le catalogue (app/tools/build_catalog_v6.py) puis relancer ce script.
"""
import json, os, sys, datetime

app = sys.argv[1] if len(sys.argv) > 1 else "app"
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
cat = json.load(open(os.path.join(app, "src/data/catalog.json"), encoding="utf-8"))
free = json.load(open(os.path.join(app, "src/data/free.json"), encoding="utf-8"))
version = json.load(open(os.path.join(app, "package.json"), encoding="utf-8"))["version"]
out = os.path.join(root, "docs/vault/Tweaks")
os.makedirs(out, exist_ok=True)
today = datetime.date.today().isoformat()
FREE, REVERTS = set(free.get("tweaks", [])), set(free.get("reverts", []))

def fr(x):
    if isinstance(x, dict):
        return (x.get("fr") or x.get("en") or "").replace("|", "/").replace("\n", " ")
    return str(x or "")

by_id, module_of, in_presets = {}, {}, {}
for m in cat["modules"]:
    for s in m["sections"]:
        for t in s["tweaks"]:
            if "id" in t:
                by_id[t["id"]] = t
                module_of[t["id"]] = m
for p in cat["presets"]:
    for ref in p["tweaks"]:
        in_presets.setdefault(ref.split(":")[0], []).append(p)

distinct = {t.get("twin", i) for i, t in by_id.items()}
note_of = lambda m: f"Tweaks {fr(m['name'])}"
header = lambda kind, tags: f"---\ntype: {kind}\ntags: [{tags}]\ngénéré: docs/tools/catalogue_vault.py\nversion_app: {version}\nmaj: {today}\n---\n"
written = []

for m in cat["modules"]:
    L = [header("catalogue", "tweaks, catalogue, généré"),
         f"# {note_of(m)}\n",
         f"Module **{fr(m['name'])}** (`{m['id']}`) de l'app {version} : {fr(m.get('tagline'))}",
         f"Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].\n",
         "Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].\n"]
    for s in m["sections"]:
        L.append(f"## {fr(s['name'])}\n")
        for t in s["tweaks"]:
            if "ref" in t:
                r = by_id.get(t["ref"])
                if r:
                    L.append(f"- Aussi affiché ici : **{fr(r['name'])}** (`{r['id']}`), voir [[{note_of(module_of[r['id']])}]].")
                continue
            i = t["id"]
            flags = ["🆓" if i in FREE else ("↩️" if i in REVERTS else "🔒")]
            if t.get("risk") == "advanced": flags.append("⚠️")
            if t.get("reboot"): flags.append("🔁")
            if t.get("kind") == "action": flags.append("⚙️")
            L.append(f"### {fr(t['name'])} `{i}` {' '.join(flags)}")
            L.append(fr(t.get("desc")))
            if t.get("variants"):
                vs = ", ".join(f"{fr(v['label'])} (`{v['id']}`{', retour' if v.get('revert') else ''})" for v in t["variants"])
                L.append(f"- Variantes : {vs} ; par défaut `{t.get('defaultVariant', t['variants'][0]['id'])}`.")
            if fr(t.get("gain")): L.append(f"- Gain : {fr(t.get("gain"))}")
            if fr(t.get("cons")): L.append(f"- Inconvénient : {fr(t.get('cons'))}")
            if t.get("confirm"): L.append(f"- Demande confirmation : {fr(t.get('confirm'))}")
            if t.get("requires"): L.append(f"- Nécessite : {', '.join('`'+r+'`' for r in t['requires'])}")
            if t.get("twin") and t["twin"] != i: L.append(f"- Jumeau de `{t['twin']}` (même script, compté une fois).")
            if t.get("native"): L.append(f"- Exécuté par du code Rust natif (`{t['native']}`), pas par un script.")
            ps = in_presets.get(i, [])
            if ps: L.append(f"- Dans les presets : {', '.join(fr(p['name']) for p in ps)} (voir [[Tweaks Presets]]).")
            L.append("")
    path = os.path.join(out, note_of(m) + ".md")
    open(path, "w", encoding="utf-8").write("\n".join(L))
    written.append(note_of(m))

P = [header("catalogue", "tweaks, presets, généré"), "# Tweaks Presets\n",
     f"Les {len(cat['presets'])} presets de l'app {version} et leur contenu exact (`ids:variante`). Note générée, voir [[Presets]] pour le fonctionnement.\n"]
for p in cat["presets"]:
    tag = f" · étiquette {p['tag']}" if p.get("tag") else ""
    match = f" · reconnu pour : {', '.join(p['match'])}" if p.get("match") else ""
    P.append(f"## {fr(p['name'])} (`{p['id']}`, {len(p['tweaks'])} tweaks{tag}{match})")
    P.append(fr(p.get("desc")) + "\n")
    for ref in p["tweaks"]:
        i, _, var = ref.partition(":")
        t = by_id.get(i)
        name = fr(t["name"]) if t else "?"
        where = f" · [[{note_of(module_of[i])}]]" if t else ""
        P.append(f"- {name} `{i}`{(' → ' + var) if var else ''}{where}")
    P.append("")
open(os.path.join(out, "Tweaks Presets.md"), "w", encoding="utf-8").write("\n".join(P))

R = [header("catalogue", "tweaks, retirés, généré"), "# Tweaks retirés\n",
     f"Tweaks retirés du catalogue pour risque ou inutilité ({len(cat['retired'])}), avec la raison. Ils ne sont plus proposés ; leur retour arrière reste possible chez les joueurs qui les avaient (encart du [[Tableau de bord]]). Voir [[Catalogue des tweaks]].\n"]
for r in cat["retired"]:
    R.append(f"- **{fr(r.get('name'))}** `{r.get('id')}` : {fr(r.get('reason'))}")
open(os.path.join(out, "Tweaks retirés.md"), "w", encoding="utf-8").write("\n".join(R) + "\n")

total = len(by_id)
print(f"app {version} : {total} entrées, {len(distinct)} tweaks distincts, {len(FREE)} gratuits, {len(cat['presets'])} presets, {len(cat['retired'])} retirés")
print("notes :", ", ".join(written))
