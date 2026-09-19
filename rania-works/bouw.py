#!/usr/bin/env python3
"""Maakt van de losse bestanden twee bestanden die op zichzelf werken.

    python3 bouw.py

Uit index.html + inhoud.js + script.js + styles.css komt
rania-works-compleet.html, en uit beheer.html + inhoud.js komt
beheer-compleet.html. Handig om door te sturen of op een usb-stick te zetten.
"""

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


site = inbakken(lees('index.html'), [
    ('<link rel="stylesheet" href="styles.css">', 'styles.css', 'style'),
    ('<script src="inhoud.js"></script>', 'inhoud.js', 'script'),
    ('<script src="script.js"></script>', 'script.js', 'script'),
])
schrijf('rania-works-compleet.html', site, 'Rania Works - de website in een bestand.')

beheer = inbakken(lees('beheer.html'), [
    ('<script src="inhoud.js"></script>', 'inhoud.js', 'script'),
])
schrijf('beheer-compleet.html', beheer, 'Rania Works - het beheer in een bestand.')
