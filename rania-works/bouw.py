#!/usr/bin/env python3
"""Bouwt de website uit de losse stukken.

    python3 bouw.py

Uit sjabloon.html en de stukken in delen/ komen de zeven pagina's van de
site. Daarnaast maakt dit script drie bestanden die op zichzelf werken:
rania-works-compleet.html (alles op één pagina), beheer-compleet.html en
sitebestanden.js (dat het beheer gebruikt om een zip te maken).

De pagina's worden overschreven bij elke keer dat je dit draait. Wil je iets
veranderen aan de opbouw, doe dat dan in sjabloon.html of in delen/.
"""

import json
import pathlib

hier = pathlib.Path(__file__).parent


def lees(naam):
    return (hier / naam).read_text(encoding='utf-8')


def inbakken(html, vervangingen):
    """Zet de stijl en de scripts rechtstreeks in de pagina."""
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


# --------------------------------------------------------------------------
# De pagina's van de site
# --------------------------------------------------------------------------
# bestand, sleutel, titel, beschrijving, welke stukken erop staan
PAGINAS = [
    ('index.html', 'home',
     'Rania Works — video-edits met karakter',
     'Video-edits voor bedrijven, merken en particulieren. Boek je edit direct via WhatsApp.',
     ['hero', 'snelkoppelingen', 'oproep']),
    ('werk.html', 'werk',
     'Werk — Rania Works',
     'Een greep uit de edits die ik maakte.',
     ['werk', 'oproep']),
    ('diensten.html', 'diensten',
     'Diensten — Rania Works',
     'Social media edits, promovideo, persoonlijke edits en losse afwerking.',
     ['diensten', 'oproep']),
    ('werkwijze.html', 'werkwijze',
     'Werkwijze — Rania Works',
     'Van appje tot afgewerkte video, in vier stappen.',
     ['werkwijze', 'oproep']),
    ('tarieven.html', 'tarieven',
     'Tarieven — Rania Works',
     'De prijs per lengte van je video. Geen verrassingen achteraf.',
     ['tarieven', 'oproep']),
    ('aanvraag.html', 'aanvraag',
     'Aanvraag — Rania Works',
     'Vraag je edit aan. Je bericht staat met één klik klaar in WhatsApp.',
     ['aanvraag']),
    ('vragen.html', 'vragen',
     'Vragen — Rania Works',
     'Veelgestelde vragen over levering, betaling en aanpassingen.',
     ['vragen', 'oproep']),
]

ALLES = ['hero', 'werk', 'diensten', 'werkwijze', 'tarieven', 'aanvraag', 'vragen', 'oproep']

WAARSCHUWING = """<!--
  Deze pagina wordt gemaakt door bouw.py, uit sjabloon.html en de stukken in
  delen/. Aanpassingen hier gaan verloren zodra je bouw.py opnieuw draait.
-->
"""


def pagina_maken(sleutel, titel, beschrijving, stukken, modus=''):
    html = lees('sjabloon.html')
    inhoud = '\n'.join(lees('delen/' + s + '.html').rstrip() for s in stukken)
    html = (html
            .replace('{{TITEL}}', titel)
            .replace('{{BESCHRIJVING}}', beschrijving)
            .replace('{{PAGINA}}', sleutel)
            .replace('{{MODUS}}', modus)
            .replace('{{INHOUD}}', inhoud))
    return html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + WAARSCHUWING, 1)


for bestand, sleutel, titel, beschrijving, stukken in PAGINAS:
    (hier / bestand).write_text(pagina_maken(sleutel, titel, beschrijving, stukken), encoding='utf-8')
    print('geschreven:', bestand)


# --- De sitebestanden als tekst, zodat het beheer er een zip van kan maken ---
def als_js_tekst(tekst):
    """Een stuk tekst als JavaScript-string, veilig binnen een <script>."""
    return json.dumps(tekst).replace('</', '<\\/')


MARKERING = '/* Waar het beheer zijn gegevens bewaart in de browser. */'
staart = MARKERING + lees('inhoud.js').split(MARKERING, 1)[1]

pakket = {'styles.css': lees('styles.css'),
          'script.js': lees('script.js'),
          'inhoud-staart.js': staart}
for bestand, *_ in PAGINAS:
    pakket[bestand] = lees(bestand)
(hier / 'sitebestanden.js').write_text(
    '/* Automatisch gemaakt door bouw.py — niet met de hand aanpassen.\n'
    '   Hierin zitten de sitebestanden als tekst, zodat het beheer er een\n'
    '   zip van kan maken met jouw wijzigingen erin. */\n\n'
    'var SITEBESTANDEN = {\n'
    + ',\n'.join('  ' + json.dumps(naam) + ': ' + als_js_tekst(inhoud)
                 for naam, inhoud in pakket.items())
    + '\n};\n', encoding='utf-8')
print('geschreven: sitebestanden.js')

een_pagina = pagina_maken('home',
                         'Rania Works — video-edits met karakter',
                         'Video-edits voor bedrijven, merken en particulieren.',
                         ALLES,
                         modus=' data-modus="een-pagina"')
site = inbakken(een_pagina, [
    ('<link rel="stylesheet" href="styles.css">', 'styles.css', 'style'),
    ('<script src="inhoud.js"></script>', 'inhoud.js', 'script'),
    ('<script src="opslag.js"></script>', 'opslag.js', 'script'),
    ('<script src="script.js"></script>', 'script.js', 'script'),
])
schrijf('rania-works-compleet.html', site, 'Rania Works - de website in een bestand.')

beheer = inbakken(lees('beheer.html'), [
    ('<script src="inhoud.js"></script>', 'inhoud.js', 'script'),
    ('<script src="opslag.js"></script>', 'opslag.js', 'script'),
    ('<script src="sitebestanden.js"></script>', 'sitebestanden.js', 'script'),
])
schrijf('beheer-compleet.html', beheer, 'Rania Works - het beheer in een bestand.')
