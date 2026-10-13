"""Développement des variables par cmd : `!` écrits tels quels (finitions du 2026-10-13, défauts de la 1.1.9).

Le moteur lance chaque script, relevé et annulation après `setlocal EnableExtensions EnableDelayedExpansion`
(src-tauri/src/runner.rs, PREAMBLE). Juste avant d'exécuter une commande qui contient un `!`, cmd remplace chaque
`!NOM!` par la variable (vide si elle n'existe pas) et retire un `!` resté seul, quels que soient les guillemets.

1. protect : une commande qui contient un `!` écrit tel quel (pas une variable posée par le script, par Windows ou par
   le moteur) tourne avec `setlocal DisableDelayedExpansion & … & endlocal` sur sa ligne, comme les suppressions de
   tools/paths.py. C'est le cas de la clé des notifications de l'appli Paramètres,
   `…\\Notifications\\Settings\\windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel` (un
   identifiant d'appli du Store, « famille!appli ») : in_advanced, sys_registry et win_notifications écrivaient une clé
   sans le `!`, que Windows ne lit pas, et leurs relevés et annulations visaient la même clé fausse. Une ligne qui
   utilise aussi un vrai `!NOM!` est refusée (il ne serait plus remplacé). Dans `full` (annulation sans relevé, PC passés
   par un ancien script), la commande telle que cmd la lisait suit la vraie : la clé sans le `!`, que ces anciens
   scripts ont créée, est nettoyée comme avant.
2. check : plus aucun `!` écrit tel quel dans une commande lancée avec le développement retardé (le test Rust
   `no_literal_bang_with_delayed_expansion` relit la même règle dans catalog.rs). Le texte affiché par un `echo` n'est
   pas une commande (un `!` y disparaît de l'écran, sans autre effet), sauf les lignes `echo @@RAGO` des relevés, lues
   par le moteur.
"""
import re

import paths as PATHS

# variables posées par Windows ou par le moteur (runner.rs : RAGO_RES, adapter_name, RAGO_STATE_*, RAGO_HELD_*)
ENV_VARS = frozenset(PATHS.PATH_VARS | {'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'COMPUTERNAME', 'RAGO_RES',
                                        'ADAPTER_NAME'})
SET_NAME = re.compile(r'(?i)(?:^|[\s&|(@"])set\s+(?:/[ap]\s+)?"?([A-Za-z_][\w#$.()-]*?)\s*[-+*/]?=')
VAR_NAME = re.compile(r'[A-Za-z_][\w#$.()-]*')
DDE_OFF = PATHS.DDE_OFF


def set_names(text):
    """Noms des variables que le texte pose (`set NOM=`, `set "NOM=`, `set /a NOM+=`…), en majuscules."""
    return {m.group(1).upper() for m in SET_NAME.finditer(text)}


def start(line):
    """Position à partir de laquelle la ligne est une commande : None pour un commentaire ; pour un echo, le premier `&`
    ou `|` hors guillemets (texte affiché avant), sauf `echo @@RAGO` (relevé lu par le moteur), lu en entier."""
    k = PATHS.kind(line)
    if k in ('label', 'rem'):
        return None
    if k == 'echo' and not re.match(r'(?i)\s*@?echo @@RAGO\b', line):
        m = re.search(r'[&|]', PATHS.masked(line))
        return m.start() if m else None
    return 0


def bangs(line, known, at=0):
    """(position, raison) de chaque `!` écrit tel quel à partir de `at`, lu comme cmd : un `!` cherche le suivant ;
    `!NOM!` ou `!NOM:…!` est une variable si NOM est connu ; un `!` sans partenaire est retiré."""
    out, i = [], line.find('!', at)
    while i >= 0:
        j = line.find('!', i + 1)
        if j < 0:
            out.append((i, '! seul'))
            break
        name = line[i + 1:j].split(':', 1)[0]
        if not (VAR_NAME.fullmatch(name) and name.upper() in known):
            out.append((i, f'!{line[i + 1:j]}!'))
        i = line.find('!', j + 1)
    return out


def wanted(line, known, at=0):
    """Vrais `!NOM!` de la ligne à partir de `at`."""
    return [m.group(0) for m in re.finditer(r'!([^!]*)!', line[at:])
            if VAR_NAME.fullmatch(m.group(1).split(':', 1)[0]) and m.group(1).split(':', 1)[0].upper() in known]


def as_cmd_read(body):
    """La commande telle que cmd la lisait avec le développement retardé : chaque `!` seul retiré (seul cas accepté)."""
    assert body.count('!') == 1, body
    return body.replace('!', '')


def lines_state(text):
    """(ligne, développement retardé actif) : PREAMBLE, puis lignes setlocal / endlocal entières (comme paths.check)."""
    dde = [True]
    for l in text.replace('\r\n', '\n').split('\n'):
        low = l.strip().lstrip('@').strip().lower()
        if re.match(r'setlocal\b', low) and '&' not in low:
            dde.append(False if 'disabledelayedexpansion' in low else True if 'enabledelayedexpansion' in low else dde[-1])
        elif re.match(r'endlocal\b', low) and '&' not in low and len(dde) > 1:
            dde.pop()
        yield l, dde[-1]


def errors(text, known=None):
    """`!` écrits tels quels dans les commandes lancées avec le développement retardé (mêmes règles que le test Rust)."""
    known = ENV_VARS | set_names(text) if known is None else known
    out = []
    for n, (l, on) in enumerate(lines_state(text), 1):
        at = start(l)
        if at is None or not on:
            continue
        off = l.lower().find(DDE_OFF.lower())
        for pos, why in bangs(l, known, at):
            if not 0 <= off < pos:
                out.append(f'{n}: {why} : {l.strip()}')
    return out


def protect_text(text, where, full=False):
    sep = '\r\n' if '\r\n' in text else '\n'
    known = ENV_VARS | set_names(text)
    out, n = [], 0
    for l, on in lines_state(text):
        at = start(l)
        if at is None or not on or DDE_OFF.lower() in l.lower() or not bangs(l, known, at):
            out.append(l)
            continue
        assert not wanted(l, known), (where, 'un !NOM! ne serait plus remplacé', l)
        assert sum(PATHS.parens(l)) == 0 and not l.strip().startswith(')'), (where, 'ligne qui ouvre ou ferme un bloc', l)
        ind = re.match(r'\s*', l).group(0)
        body = l.strip()
        # « if … cmd » ou « for … do cmd » : le « & endlocal » ferait partie de la condition ou de la boucle
        if re.match(r'(?i)(if|for)\s', body):
            body = f'({body})'
        out.append(f'{ind}{DDE_OFF} & {body} & endlocal')
        if full:
            out.append(ind + as_cmd_read(l.strip()))
        n += 1
    return sep.join(out), n


def apply(tree, where=''):
    """Chaque texte d'un dictionnaire de scripts ({réglage: {variante: texte}}, ou annulations {…: {full, rest}})."""
    n = 0
    for k, v in tree.items():
        if isinstance(v, str):
            tree[k], m = protect_text(v, f'{where}{k}', full=k == 'full')
            n += m
            assert not errors(tree[k]), (f'{where}{k}', errors(tree[k]))
        elif isinstance(v, dict):
            n += apply(v, f'{where}{k}:')
    return n
