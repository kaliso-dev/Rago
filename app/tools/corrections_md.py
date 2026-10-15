"""docs/CORRECTIONS.md : les sections générées, puis les sections écrites à la main, gardées telles quelles.

Le fichier est réécrit à chaque génération : tools/build_catalog.py écrit la section v5.2, tools/build_catalog_v6.py ajoute
les siennes. Tout ce qui suit la ligne MARKER est écrit à la main (plans, comptes rendus des correctifs) : il est relu
avant d'écrire et remis à l'identique après les sections générées. Pour ajouter une section à la main, l'écrire à la fin
du fichier, sous cette ligne.

Forme du fichier : <sections générées>, une ligne vide, MARKER, puis les sections écrites à la main.
"""
import os

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'CORRECTIONS.md')
MARKER = ('<!-- Sections écrites à la main : le générateur (tools/corrections_md.py) garde tel quel tout ce qui suit '
          'cette ligne. Ajouter les nouvelles sections en bas du fichier. -->')
SEP = '\n' + MARKER + '\n'


def _read(path):
    # CRLF lu comme LF (fichier extrait en CRLF sous Windows) : la ligne marqueur est toujours retrouvée
    try:
        with open(path, encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ''


def parts(path=PATH):
    """(sections générées, sections écrites à la main) du fichier actuel. Sans la ligne MARKER : tout est généré."""
    text = _read(path)
    head, sep, manual = text.partition(SEP)
    return (head, manual) if sep else (text, '')


def write(generated, manual, path=PATH):
    """Écrit les sections générées puis, sous la ligne MARKER, celles écrites à la main (fins de ligne LF)."""
    assert generated.endswith('\n') and MARKER not in generated, 'sections générées'
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(generated + SEP + manual)
