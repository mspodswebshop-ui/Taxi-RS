#!/usr/bin/env python3
"""Maakt van de losse bestanden twee bestanden die op zichzelf werken.

    python3 bouw.py

Uit index.html + inhoud.js + script.js + styles.css komt
rania-works-compleet.html, en uit beheer.html + inhoud.js komt
beheer-compleet.html. Handig om door te sturen of op een usb-stick te zetten.
"""

import json
import pathlib

hier = pathlib.Path(__file__).parent


def lees(naam):
    return (hier / naam).read_text(encoding='utf-8')


def inbakken(html, vervangingen):
    for zoek, bestand, tag in vervangingen:
        stuk = lees(bestand).rstrip()
        if tag == 'style':
            nieuw = '<style>\n' + stuk + '\n</style>'
        else:
            assert '</script' not in stuk.lower(), bestand + ' bevat </script>'
            nieuw = '<script>\n' + stuk + '\n</script>'
        assert zoek in html, 'niet gevonden: ' + zoek
        html = html.replace(zoek, nieuw)
    return html


KOP = """<!--
  {titel}

  Dit bestand werkt op zichzelf: de stijl en het script zitten erin.
  Dubbelklik het om het te openen.

  Wijzig je iets? Doe dat in de losse bestanden en draai daarna
  "python3 bouw.py" om dit bestand opnieuw te maken.
-->
"""


def schrijf(naam, html, titel):
    html = html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + KOP.format(titel=titel), 1)
    (hier / naam).write_text(html, encoding='utf-8')
    print('geschreven:', naam, len(html), 'tekens')


# --- De sitebestanden als tekst, zodat het beheer er een zip van kan maken ---
def als_js_tekst(tekst):
    """Een stuk tekst als JavaScript-string, veilig binnen een <script>."""
    return json.dumps(tekst).replace('</', '<\\/')


MARKERING = '/* Waar het beheer zijn gegevens bewaart in de browser. */'
staart = MARKERING + lees('inhoud.js').split(MARKERING, 1)[1]

pakket = {
    'index.html': lees('index.html'),
    'styles.css': lees('styles.css'),
    'script.js': lees('script.js'),
    'inhoud-staart.js': staart,
}
(hier / 'sitebestanden.js').write_text(
    '/* Automatisch gemaakt door bouw.py — niet met de hand aanpassen.\n'
    '   Hierin zitten de sitebestanden als tekst, zodat het beheer er een\n'
    '   zip van kan maken met jouw wijzigingen erin. */\n\n'
    'var SITEBESTANDEN = {\n'
    + ',\n'.join('  ' + json.dumps(naam) + ': ' + als_js_tekst(inhoud)
                 for naam, inhoud in pakket.items())
    + '\n};\n', encoding='utf-8')
print('geschreven: sitebestanden.js')

site = inbakken(lees('index.html'), [
    ('<link rel="stylesheet" href="styles.css">', 'styles.css', 'style'),
    ('<script src="inhoud.js"></script>', 'inhoud.js', 'script'),
    ('<script src="script.js"></script>', 'script.js', 'script'),
])
schrijf('rania-works-compleet.html', site, 'Rania Works - de website in een bestand.')

beheer = inbakken(lees('beheer.html'), [
    ('<script src="inhoud.js"></script>', 'inhoud.js', 'script'),
    ('<script src="sitebestanden.js"></script>', 'sitebestanden.js', 'script'),
])
schrijf('beheer-compleet.html', beheer, 'Rania Works - het beheer in een bestand.')
