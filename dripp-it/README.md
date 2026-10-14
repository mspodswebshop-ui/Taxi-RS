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
| `afrekenen.html` | Afrekenen: gegevens, bezorging en betalen via Stripe |
| `bedankt.html` | Bevestiging na het betalen (`bedankt.html#voorbeeld` toont een voorbeeld) |

## Aanpassen

- **Producten, categorieën, prijzen en verzendkosten** staan in `assets/catalog.js`. Dat bestand
  gebruikt zowel de website als de betaalfunctie, dus prijzen pas je alleen daar aan.
- **E-mailadres, ondernemingsnummer en adres** staan bovenaan `assets/app.js` (`BRAND`).
  Een Belgische webshop moet bedrijfsnaam, ondernemingsnummer, adres en e-mail tonen.
- **Kleuren en lettertypes** staan bovenaan `assets/style.css`.
- Kop, menu en voettekst worden door `assets/app.js` op elke pagina gezet.

## Logo

Alle logobestanden staan in `assets/logo/`. De letters zijn omgezet naar vaste vormen, dus het
logo ziet er overal hetzelfde uit, ook zonder het lettertype.

| Bestand | Gebruik |
| --- | --- |
| `dripp-it-logo-donker.png` / `.svg` | Liggend logo voor een donkere achtergrond (transparant) |
| `dripp-it-logo-licht.png` / `.svg` | Liggend logo voor een lichte achtergrond (transparant) |
| `dripp-it-logo-*-achtergrond.png` | Liggend logo met eigen achtergrond |
| `dripp-it-icoon-donker.png` | Vierkant icoon: profielfoto, Stripe-icoon, app-icoon |
| `dripp-it-icoon.png` / `.svg` | Alleen het merkteken, transparant (ook het icoon in het browsertabblad) |
| `dripp-it-staand-*.png` | Vierkant met logo en naam, 1080 × 1080, voor Instagram en TikTok |
| `apple-touch-icon.png` | Icoon als iemand de site op het beginscherm van een iPhone zet |

**In Stripe:** ga naar *Settings → Branding*. Upload `dripp-it-icoon-donker.png` als icoon en
`dripp-it-logo-licht.png` als logo, en kies als merkkleur goud `#CFAE6E` en als accent `#0D0A0C`.

## Foto's toevoegen

Tot er foto's zijn, toont de site getekende illustraties. Zo vervang je ze:

1. Zet de foto's in `assets/img/` (staand 4:5, bijvoorbeeld 1200 × 1500 pixels).
2. Geef het product in `assets/app.js` een lijst `images`:
   `images: ['assets/img/aurum-1.jpg', 'assets/img/aurum-2.jpg']`.
   De eerste foto komt op de productkaart, alle foto's in de galerij.
3. Een categoriefoto zet je bij `CATS`, bijvoorbeeld `img: 'assets/img/cat-dames.jpg'`.

## Betalen met Stripe

De afrekenpagina toont een voorbeeld van het betaalscherm tot Stripe gekoppeld is. Zo koppel je het:

1. Maak een account op [stripe.com](https://stripe.com) en blijf in de **testmodus**.
2. Kopieer bij *Developers → API keys* de **Publishable key** (`pk_test_...`) en de
   **Secret key** (`sk_test_...`). Deel de geheime sleutel met niemand.
3. Zet ze in Netlify bij *Site configuration → Environment variables*:
   - `STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
   - `STRIPE_SECRET_KEY` = `sk_test_...`

   Start daarna een nieuwe deploy (*Deploys → Trigger deploy*).
4. Zet in Stripe bij *Settings → Payment methods* **Bancontact**, **Apple Pay** en **Google Pay** aan.
   Voor Apple Pay registreer je ook je domein bij *Settings → Payment method domains*.
5. Test met kaart `4242 4242 4242 4242`, een datum in de toekomst en een willekeurige CVC.
   Bij Bancontact kies je op de testpagina of de betaling lukt of mislukt.
6. Klaar om live te gaan? Activeer je account in Stripe en vervang beide sleutels door
   `pk_live_...` en `sk_live_...`.

De betaalfunctie (`netlify/functions/checkout.mjs`) rekent het bedrag zelf uit met
`assets/catalog.js`. Elke bestelling staat in Stripe bij *Payments*, met bestelnummer,
producten, maten en bezorgadres.

**Meldingen:** installeer de Stripe-app op je telefoon voor een melding bij elke betaling, en zet
bij *Settings → Communication preferences* e-mails voor geslaagde betalingen aan.

## Online zetten op Netlify

1. Maak een nieuwe site aan vanuit deze repository.
2. Zet **Base directory** op `dripp-it`. De rest komt uit `dripp-it/netlify.toml`.
3. De formulieren (private list en contact) werken dan via Netlify Forms; inzendingen
   verschijnen in het Netlify-dashboard onder *Forms*.

## Nog te doen

- Echte productfoto's, teksten, prijzen en specificaties invullen (nu voorbeeldinhoud).
- Een echt e-mailadres invullen in `BRAND.email`.
- Stripe-sleutels in Netlify zetten (zie hierboven).
- Ondernemingsnummer en adres invullen in `BRAND.legal`.
- Een eigen bestellingen-app met database (volgende stap).
