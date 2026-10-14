# Dripp It

Luxe webshop voor Dripp It met dames, heren, schoenen en elektronica. Gewone HTML, CSS en
JavaScript, zonder buildstap.

## Pagina's

| Bestand | Pagina |
| --- | --- |
| `index.html` | Home: hero, categorieën, nieuw binnen, atelier, lookbook, private list |
| `collectie.html` | Alle stukken; `collectie.html#dames`, `#heren`, `#schoenen`, `#elektronica` per categorie |
| `product.html#<id>` | Productpagina, bijvoorbeeld `product.html#molten` |
| `atelier.html` | Het verhaal: werkwijze, productieproces, anatomie van het logo |
| `service.html` | Verzending, retour, maattabel, verzorging, veelgestelde vragen |
| `contact.html` | Contactformulier en showroom op afspraak |
| `tas.html` | Winkeltas (bewaard in de browser van de bezoeker) |

## Aanpassen

- **Producten, categorieën, prijzen, e-mailadres, stad en verzendkosten** staan bovenaan
  `assets/app.js` (`BRAND`, `CATS` en `PRODUCTS`).
- **Kleuren en lettertypes** staan bovenaan `assets/style.css`.
- Kop, menu en voettekst worden door `assets/app.js` op elke pagina gezet.

## Foto's toevoegen

Tot er foto's zijn, toont de site getekende illustraties. Zo vervang je ze:

1. Zet de foto's in `assets/img/` (staand 4:5, bijvoorbeeld 1200 × 1500 pixels).
2. Geef het product in `assets/app.js` een lijst `images`:
   `images: ['assets/img/aurum-1.jpg', 'assets/img/aurum-2.jpg']`.
   De eerste foto komt op de productkaart, alle foto's in de galerij.
3. Een categoriefoto zet je bij `CATS`, bijvoorbeeld `img: 'assets/img/cat-dames.jpg'`.

## Online zetten op Netlify

1. Maak een nieuwe site aan vanuit deze repository.
2. Zet **Base directory** op `dripp-it`. De rest komt uit `dripp-it/netlify.toml`.
3. De formulieren (private list en contact) werken dan via Netlify Forms; inzendingen
   verschijnen in het Netlify-dashboard onder *Forms*.

## Nog te doen

- Echte productfoto's, teksten, prijzen en specificaties invullen (nu voorbeeldinhoud).
- Een echt e-mailadres invullen in `BRAND.email`.
- Betalen koppelen (bijvoorbeeld Stripe of Mollie). De knop *Afrekenen* toont nu een melding.
