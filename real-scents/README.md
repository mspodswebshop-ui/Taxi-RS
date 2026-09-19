# Real Scents

Statische webshop voor luxe parfums, met bestellen via WhatsApp.

Het uiterlijk volgt de aangeleverde stijl: een donker thema met goudaccenten,
Playfair Display voor de koppen, een schermvullende hero met de sfeerfoto,
gouden pill-knoppen en zwevende WhatsApp- en telefoonknoppen.

## Bestanden

| Bestand | Inhoud |
| --- | --- |
| `index.html` | Opbouw van de pagina (hero, shop, merken, acties, contact, winkelmandje) |
| `style.css` | Het volledige thema |
| `script.js` | Catalogus, filters, paginatie, winkelmandje en WhatsApp-afrekenen |
| `assets/hero.jpg` | Hero-foto voor desktop (breed) |
| `assets/hero-mobile.jpg` | Uitsnede van dezelfde foto voor telefoons |

Geen build-stap nodig: open `index.html` of zet de map op een statische host.

## Aanpassen

- **WhatsApp-nummer** — `WHATSAPP_NUMBER` bovenaan `script.js`, plus de twee
  `tel:`-links in `index.html`.
- **Catalogus** — de `RAW_LIST` in `script.js`, één regel per parfum in de
  vorm `Merk | Naam | Prijs | Fotolink`. Zonder prijs (`—`) toont de kaart
  "Prijs op aanvraag".
- **Kleuren** — de custom properties in `:root` bovenaan `style.css`
  (`--gold`, `--bg`, `--text`, …).
- **Hero-foto** — vervang de bestanden in `assets/`. De foto staat onderaan
  vastgezet en vervaagt bovenin in de achtergrondkleur, dus een afbeelding
  zonder tekst erin werkt het best.

Playfair Display en Inter worden via Google Fonts geladen; zonder internet
valt de pagina terug op systeemlettertypen.
