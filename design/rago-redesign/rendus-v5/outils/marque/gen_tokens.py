# Section F : tokens v5 (tokens.css + tokens.json) au format de brand/tokens/ du dépôt.
# Les noms --rg-* de la v1.2 sont gardés quand le rôle est le même (l'app et le serveur les utilisent des centaines de fois) :
# seules les valeurs changent. Les nouveautés de la v5 arrivent sous de nouveaux noms.
import json
from pathlib import Path

OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/marque/tokens')

# (nom, valeur, commentaire, nom dans les maquettes v5)
G = {
 'Fonds (du plus profond au plus élevé). Le relief vient de ces paliers, pas des ombres': [
  ('ink-0', '#070708', 'fond du cerveau (admin), fond derrière la fenêtre', 'bg-0'),
  ('ink-1', '#0A0A0B', 'fond de tout : fenêtre, pages, e-mails', 'bg'),
  ('ink-2', '#111113', 'panneaux, cartes, barre latérale, champ de recherche', 'bg-2'),
  ('ink-3', '#17171A', 'surface levée : bouton par défaut, options, tuile allumée', 'bg-3'),
  ('ink-4', '#1F1F23', 'piste d’interrupteur, segments vides, survol', 'bg-4'),
  ('ink-5', '#2A2A30', 'rare : séparateur fort, état actif sur bg-4', ''),
 ],
 'Texte': [
  ('text-1', '#F5F5F6', 'titres, chiffres, valeurs, libellés actifs (18:1)', 'ink'),
  ('text-2', '#A1A1AA', 'texte secondaire, icônes au trait (7,7:1)', 'ink-2'),
  ('text-3', '#6E6E78', 'petits libellés à côté d’une valeur (3,9:1, jamais pour une phrase)', 'ink-3'),
  ('text-inverse', '#0A0A0B', 'texte sur le rouge et sur le papier', 'red-ink'),
 ],
 'Bordures': [
  ('line-1', 'rgba(255,255,255,.07)', 'bordure 1 px par défaut', 'line'),
  ('line-2', 'rgba(255,255,255,.13)', 'boutons, option en cours, barre Apply, tuile survolée', 'line-2'),
  ('line-3', 'rgba(255,255,255,.16)', 'contour d’écho du titre de page', ''),
 ],
 'Rouge Rago, le seul accent': [
  ('red-300', '#FF8A82', 'rare : rouge clair sur fond rouge sombre', ''),
  ('red-400', '#FF5E55', 'survol, liens dans les e-mails', ''),
  ('red-500', '#FF3B30', 'ACCENT. Texte posé dessus = text-inverse (5,6:1), jamais blanc (3,3:1)', 'red'),
  ('red-600', '#F2352B', 'pressé (petits éléments)', ''),
  ('red-700', '#C9221A', 'bouton rouge pressé, barre Apply qui travaille ; blanc possible dessus (5,2:1)', 'red-deep'),
  ('red-a12', 'rgba(255,59,48,.12)', 'fond teinté', ''),
  ('red-a24', 'rgba(255,59,48,.24)', 'lueur des boutons rouges', ''),
  ('red-gradient', '#FF3B30', 'v5 : plus de dégradé, rouge plein (gardé pour ne rien casser)', ''),
 ],
 'Papier (nouveau en v5)': [
  ('paper', '#ECE9E2', 'face du R imprimé et des icônes, ruban des titres de section ; texte encre dessus (16:1)', 'paper'),
 ],
 'États': [
  ('success', '#3DDC97', 'direct et gains mesurés, toujours à côté d’un mot ou d’un chiffre', 'ok'),
  ('warning', '#FFC53D', 'admin seulement : à surveiller (l’ancien jaune #FFD60A disparaît)', 'warn'),
  ('warning-a06', 'rgba(255,197,61,.06)', 'fond d’encart à surveiller (admin)', ''),
  ('warning-a10', 'rgba(255,197,61,.10)', 'fond de badge à surveiller (admin)', ''),
  ('warning-a18', 'rgba(255,197,61,.18)', 'bordure d’encart à surveiller (admin)', ''),
  ('info', '#A1A1AA', 'v5 : plus de bleu d’info, gris secondaire', ''),
  ('danger', '#FF3B30', '= accent ; toujours avec une icône et un texte', ''),
  ('pop-muted', '#4A4A52', 'texte discret dans une bulle claire', 'pop-muted'),
 ],
 'Effets d’affiche': [
  ('fx-glass', 'rgba(23,23,26,.94)', 'panneau flottant (bulle, menu), sans flou', 'fx-glass'),
  ('fx-carbon', 'rgba(255,255,255,.05)', 'rayures carbone, 8 px, à --rg-angle-carbon', 'fx-carbon'),
  ('fx-halftone', 'rgba(255,255,255,.09)', 'trame de points, pas de 9 px', 'fx-halftone'),
  ('fx-halftone-on-red', 'rgba(10,10,11,.2)', 'trame sur les blocs rouges, pas de 8 px', 'fx-halftone-on-red'),
  ('fx-red-wash', 'rgba(255,59,48,.13)', 'voile rouge de l’élément de menu actif', 'fx-red-wash'),
  ('fx-hatch', 'rgba(255,59,48,.34)', 'hachures « en attente », 4 px', 'fx-hatch'),
  ('fx-hatch-faint', 'rgba(255,59,48,.06)', 'hachures « en attente » sur grande surface', 'fx-hatch-faint'),
  ('fx-cover-shade', 'rgba(10,10,11,.78)', 'voile sur les images de jeux', 'fx-cover-shade'),
  ('opacity-grain', '.06', 'grain sur toute la fenêtre', 'opacity-grain'),
  ('opacity-dim', '.45', 'indisponible sur ce PC', 'opacity-dim'),
 ],
 'Polices (Google Fonts, OFL) : Barlow Condensed pour titres, chiffres et libellés ; Barlow pour les phrases': [
  ('font-display', '"Barlow Condensed", "Arial Narrow", sans-serif', 'titres 900 italique, boutons et libellés 800 droits', 'cond'),
  ('font-sans', 'Barlow, "Helvetica Neue", Arial, sans-serif', 'phrases, 400 à 700, jamais en italique', 'body'),
  ('font-mono', '"Barlow Condensed", "Arial Narrow", sans-serif', 'v5 : plus de mono, les chiffres et libellés passent en condensé', ''),
  ('font-email', '"Barlow Condensed", "Arial Narrow", Arial, sans-serif', 'titres des e-mails, avec repli', ''),
 ],
 'Angles': [
  ('skew', '-12deg', 'LA coupe : fonds des boutons, onglets, options, interrupteurs, segments, bloc signature', 'skew'),
  ('angle-carbon', '-60deg', 'rayures carbone et hachures', ''),
  ('angle-tape', '-1.4deg', 'ruban papier des titres de section', ''),
  ('angle-brush', '-2.5deg', 'coup de pinceau sous le titre de page', ''),
 ],
 'Rayons v5 : ils grandissent avec l’élément': [
  ('radius-seg', '2.5px', 'segments', ''), ('radius-chip', '8px', 'puces', ''), ('radius-btn-sm', '9px', 'petits boutons', ''),
  ('radius-tab', '10px', 'onglets, éléments de menu', ''), ('radius-option', '11px', 'options de choix', ''), ('radius-btn', '12px', 'boutons, champs', ''),
  ('radius-tile', '14px', 'tuiles de réglage', ''), ('radius-btn-lg', '16px', 'grands boutons', ''), ('radius-card', '18px', 'cartes de jeu, presets', ''),
  ('radius-bar', '20px', 'barre Apply', ''), ('radius-panel', '22px', 'panneaux, modales', ''),
 ],
 'Rayons v1.2 (mêmes noms, valeurs v5)': [
  ('radius-xs', '5px', '', ''), ('radius-sm', '10px', '', ''), ('radius-md', '14px', '', ''),
  ('radius-lg', '18px', '', ''), ('radius-xl', '22px', '', ''), ('radius-2xl', '22px', 'plus de 40 px en v5', ''),
  ('radius-full', '999px', 'points et avatars seulement : plus de boutons en pilule', ''),
 ],
 'Hauteurs': [
  ('size-btn', '40px', '', ''), ('size-btn-lg', '54px', '', ''), ('size-btn-sm', '32px', '', ''), ('size-tab', '34px', '', ''),
  ('size-option', '46px', '', ''), ('size-tile', '56px', '', ''), ('size-chip', '24px', '', ''), ('size-field', '38px', '', ''),
  ('size-bar', '72px', 'barre Apply', ''), ('size-sidebar', '236px', 'barre latérale (rail : 100 px)', ''),
 ],
 'Espacement (relevé sur les maquettes 1440 × 900)': [
  ('space-1', '4px', '', ''), ('space-2', '8px', '', ''), ('space-3', '12px', '', ''), ('space-4', '16px', '', ''),
  ('space-5', '20px', '', ''), ('space-6', '24px', '', ''), ('space-8', '32px', '', ''), ('space-10', '40px', 'marges de la colonne, entre sections', ''),
  ('space-12', '48px', '', ''), ('space-16', '64px', '', ''), ('space-24', '96px', '', ''),
 ],
 'Ombres : seulement pour ce qui flotte, et la lueur rouge': [
  ('shadow-glow', '0 0 28px rgba(255,59,48,.25)', 'bouton rouge', ''),
  ('shadow-float', '0 26px 50px -16px rgba(0,0,0,.9)', 'barre Apply', ''),
  ('shadow-pop', '0 24px 50px -12px rgba(0,0,0,.9)', 'bulles, menus', ''),
  ('shadow-selected', '0 0 0 1px #FF3B30, 0 0 34px rgba(255,59,48,.16)', 'carte choisie', ''),
  ('shadow-live', '0 0 10px #3DDC97', 'point « live »', ''),
  ('focus', '0 0 0 2px #0A0A0B, 0 0 0 4px #F5F5F6', 'focus clavier : anneau blanc, suit le biais', ''),
 ],
 'Mouvement (inchangé)': [
  ('ease-out', 'cubic-bezier(.16,1,.3,1)', 'entrées, la plupart des transitions', ''),
  ('ease-in-out', 'cubic-bezier(.65,0,.35,1)', 'déplacements de layout', ''),
  ('ease-spring', 'cubic-bezier(.34,1.56,.64,1)', 'interrupteurs, tampon', ''),
  ('dur-instant', '90ms', 'survol, appui', ''), ('dur-fast', '160ms', 'interrupteurs, bulles', ''),
  ('dur-base', '240ms', 'panneaux, onglets', ''), ('dur-slow', '420ms', 'écrans, héros', ''),
  ('dur-menu-in', '320ms', 'élément de menu qui s’ouvre', ''), ('dur-menu-out', '220ms', 'élément de menu qui se ferme', ''),
 ],
}

# styles de texte : nom -> (famille, taille, interligne, graisse, italique, interlettrage, capitales, usage)
TYPE = [
 ('title', 'display', '150px', '.8', 900, True, '-.01em', True, 'titre de page, un par page, pinceau dessous'),
 ('num-hero', 'display', '118px', '.74', 900, True, '-.03em', True, 'le chiffre en direct du bloc signature'),
 ('grade', 'display', '88px', '.78', 900, True, '-.01em', True, 'verdict en un mot (GREAT, ON)'),
 ('metric', 'display', '64px', '.78', 900, True, '-.01em', True, 'mesures principales ; unité à 22 px en text-2'),
 ('bar-name', 'display', '54px', '.74', 900, True, '-.02em', True, 'nombre ou profil à gauche de la barre Apply'),
 ('stat', 'display', '52px', '.78', 900, True, '-.01em', True, 'chiffre d’une tuile de stat'),
 ('card-title', 'display', '32px', '.85', 900, True, '.005em', True, 'titre de carte ou de panneau'),
 ('h2', 'display', '30px', '1', 900, True, '.005em', True, 'titre de section, sur le ruban papier'),
 ('nav', 'display', '18px', '1', 900, True, '.01em', True, 'éléments de la barre latérale'),
 ('btn-lg', 'display', '19px', '1', 800, False, '.06em', True, 'grand bouton'),
 ('btn', 'display', '15px', '1', 800, False, '.06em', True, 'bouton (18 px dans la barre Apply)'),
 ('btn-sm', 'display', '13.5px', '1', 800, False, '.06em', True, 'petit bouton'),
 ('tile-name', 'display', '17px', '1', 800, False, '.03em', True, 'nom d’une tuile de réglage'),
 ('tab', 'display', '14px', '1', 800, False, '.06em', True, 'onglet'),
 ('kick', 'display', '13px', '1', 700, False, '.2em', True, 'ligne au-dessus du titre, le // en rouge'),
 ('chip', 'display', '12px', '1', 800, False, '.1em', True, 'puce'),
 ('label', 'display', '11.5px', '1', 700, False, '.16em', True, 'petit libellé au-dessus d’une valeur'),
 ('body', 'sans', '14px', '1.35', 400, False, '0', False, 'phrases'),
 ('pop', 'sans', '13.5px', '1.4', 500, False, '0', False, 'texte des bulles'),
 ('sub', 'sans', '12.5px', '1.35', 400, False, '0', False, 'aide d’une ligne sous un titre ou un bouton'),
]

LEGACY = [  # v1.2, gardés tels quels le temps de la migration
 ('fs-display', '56px'), ('lh-display', '1.02'), ('ls-display', '-0.035em'), ('fs-h1', '36px'), ('lh-h1', '1.1'), ('ls-h1', '-0.025em'),
 ('fs-h2', '24px'), ('lh-h2', '1.2'), ('ls-h2', '-0.02em'), ('fs-h3', '18px'), ('lh-h3', '1.3'), ('ls-h3', '-0.01em'),
 ('fs-body', '14px'), ('lh-body', '1.35'), ('fs-small', '13px'), ('fs-caption', '12px'), ('ls-caption', '0.02em'),
 ('fs-overline', '11.5px'), ('ls-overline', '0.16em'), ('fs-metric', '40px'),
 ('shadow-1', '0 1px 2px rgba(0,0,0,.4)'), ('shadow-2', '0 8px 24px -8px rgba(0,0,0,.6)'), ('shadow-3', '0 24px 50px -12px rgba(0,0,0,.9)'),
 ('glow', '0 0 28px rgba(255,59,48,.25)'),
 ('glass-1', 'rgba(255,255,255,.025)'), ('glass-2', 'rgba(255,255,255,.045)'), ('glass-3', 'rgba(255,255,255,.08)'),
 ('glass-float', 'rgba(23,23,26,.94)'), ('glass-blur', 'none'), ('glass-edge', 'none'),
 ('glass-fill', '#111113'), ('glass-rim', 'none'), ('dur-pulse', '1600ms'),
]


def css():
    o = ['/* Rago, tokens v2.0 « Match day » (22/11/2026). Source de vérité : tokens.json, même dossier.',
         '   Les noms --rg-* de la v1.2 sont gardés quand le rôle est le même : l’app et le serveur passent en v5 sans renommer.',
         '   Correspondance avec les maquettes v5 : bg = ink-1, bg-2..4 = ink-2..4, ink = text-1, ink-2 = text-2, ink-3 = text-3,',
         '   red = red-500, red-deep = red-700, red-ink = text-inverse, line = line-1, ok = success, warn = warning.',
         '   Polices : https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap',
         '   Thème sombre seulement : le thème clair de la v1.2 est retiré. */', ':root {']
    for g, toks in G.items():
        o.append(f'\n  /* {g} */')
        for n, v, c, m in toks:
            o.append(f'  --rg-{n}: {v};' + (f'  /* {c} */' if c else ''))
    o.append('\n  /* Styles de texte v5 (taille / interligne / interlettrage) */')
    for n, fam, fs, lh, w, it, ls, up, use in TYPE:
        o.append(f'  --rg-t-{n}: {"italic " if it else ""}{w} {fs}/{lh} var(--rg-font-{fam});  --rg-ls-{n}: {ls};  /* {use}{", capitales" if up else ""} */')
    o.append('\n  /* v1.2, gardés le temps de la migration (verre et tailles Geist) : à retirer composant par composant */')
    for n, v in LEGACY:
        o.append(f'  --rg-{n}: {v};')
    o.append('}\n')
    o.append('@media (prefers-reduced-motion: reduce) {\n  :root { --rg-dur-instant: 0ms; --rg-dur-fast: 0ms; --rg-dur-base: 0ms; --rg-dur-slow: 0ms; --rg-dur-menu-in: 0ms; --rg-dur-menu-out: 0ms; }\n}\n')
    o.append('''/* Signatures réutilisables */
.rg-title { font: var(--rg-t-title); letter-spacing: var(--rg-ls-title); text-transform: uppercase; }
.rg-kick { font: var(--rg-t-kick); letter-spacing: var(--rg-ls-kick); text-transform: uppercase; color: var(--rg-text-2); }
.rg-kick b { color: var(--rg-red-500); }
.rg-label { font: var(--rg-t-label); letter-spacing: var(--rg-ls-label); text-transform: uppercase; color: var(--rg-text-3); }
.rg-metric { font: var(--rg-t-metric); letter-spacing: var(--rg-ls-metric); font-variant-numeric: tabular-nums; }
.rg-overline { font: var(--rg-t-label); letter-spacing: var(--rg-ls-label); text-transform: uppercase; color: var(--rg-text-3); }
/* fond penché : le libellé reste droit, seul le ::before penche */
.rg-skew { position: relative; isolation: isolate; }
.rg-skew::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(var(--rg-skew)); border-radius: inherit; background: inherit; }
.rg-halftone { background-image: radial-gradient(circle, var(--rg-fx-halftone) 1.1px, transparent 1.5px); background-size: 9px 9px; }
.rg-carbon { background-image: repeating-linear-gradient(var(--rg-angle-carbon), var(--rg-fx-carbon) 0 8px, transparent 8px 16px); }
.rg-hatch { background-image: repeating-linear-gradient(var(--rg-angle-carbon), var(--rg-fx-hatch) 0 4px, transparent 4px 8px); box-shadow: inset 0 0 0 1.5px var(--rg-red-500); }
''')
    return '\n'.join(o)


def js():
    d = {'name': 'Rago', 'version': '2.0.0', 'date': '2026-11-22', 'direction': 'Match day',
         'fonts': {'display': 'Barlow Condensed', 'sans': 'Barlow', 'license': 'SIL OFL 1.1', 'source': 'Google Fonts'},
         'mockup_names': {}, 'dark': {}, 'type': {}, 'legacy_v1_2': dict(LEGACY)}
    for g, toks in G.items():
        key = g.split(' ')[0].split(',')[0].lower().replace('’', '').replace('é', 'e').replace('à', 'a')
        grp = d['dark'].setdefault(key, {})
        for n, v, c, m in toks:
            grp[n] = v
            if m: d['mockup_names'][m] = n
    for n, fam, fs, lh, w, it, ls, up, use in TYPE:
        d['type'][n] = {'family': fam, 'size': fs, 'lineHeight': lh, 'weight': w, 'italic': it, 'letterSpacing': ls, 'uppercase': up, 'usage': use}
    return json.dumps(d, indent=1, ensure_ascii=False) + '\n'


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'tokens.css').write_text(css())
    (OUT / 'tokens.json').write_text(js())
    print((OUT / 'tokens.css').read_text()[:600]); print(list(json.loads(js())['dark'].keys()))
