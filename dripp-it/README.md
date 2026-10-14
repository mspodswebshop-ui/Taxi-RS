# Dripp It

Luxe webshop-website voor Dripp It. Gewone HTML, CSS en JavaScript, zonder buildstap.

## Pagina's

| Bestand | Pagina |
| --- | --- |
| `index.html` | Home: hero, uitgelichte stukken, atelier, lookbook, private list |
| `collectie.html` | Alle stukken, met filter (kleding/accessoires) en sortering |
| `product.html#<id>` | Productpagina, bijvoorbeeld `product.html#molten` |
| `atelier.html` | Het verhaal: werkwijze, productieproces, anatomie van het logo |
| `service.html` | Verzending, retour, maattabel, verzorging, veelgestelde vragen |
| `contact.html` | Contactformulier en showroom op afspraak |
| `tas.html` | Winkeltas (bewaard in de browser van de bezoeker) |

## Aanpassen

- **Producten, prijzen, e-mailadres, stad en verzendkosten** staan bovenaan `assets/app.js`
  (`BRAND` en `PRODUCTS`).
- **Kleuren en lettertypes** staan bovenaan `assets/style.css`.
- Kop, menu en voettekst worden door `assets/app.js` op elke pagina gezet.

## Online zetten op Netlify

1. Maak een nieuwe site aan vanuit deze repository.
2. Zet **Base directory** op `dripp-it`. De rest komt uit `dripp-it/netlify.toml`.
3. De formulieren (private list en contact) werken dan via Netlify Forms; inzendingen
   verschijnen in het Netlify-dashboard onder *Forms*.

## Nog te doen

- Echte productfoto's, teksten en prijzen invullen (nu voorbeeldinhoud).
- Een echt e-mailadres invullen in `BRAND.email`.
- Betalen koppelen (bijvoorbeeld Stripe of Mollie). De knop *Afrekenen* toont nu een melding.
