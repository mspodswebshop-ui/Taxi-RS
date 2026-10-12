# Prestige Taxi Antwerpen — website

Statische website van 5 pagina's (gewone HTML, CSS en JavaScript, geen build nodig).

| Pagina | Bestand |
| --- | --- |
| Home | `index.html` |
| Diensten | `diensten.html` |
| Luchthavenvervoer | `luchthaven.html` |
| Over ons | `over-ons.html` |
| Contact & reserveren | `contact.html` |

Gedeelde opmaak staat in `assets/style.css`, het gedrag (menu, reviews-slider met
schuifbalk, reservatieformulier) in `assets/main.js`.

## Contactgegevens

- Telefoon: 0483 85 13 97 (`tel:+32483851397`)
- WhatsApp: `https://wa.me/32483851397`
- E-mail: hamzazahoume@hotmail.com

Het reservatieformulier heeft geen server nodig: het zet de aanvraag klaar in
WhatsApp of in het e-mailprogramma van de klant.

## Beheer: teksten en foto's zelf aanpassen

Open `beheer.html`:

- **Staat de site online** (bv. op Netlify)? Ga naar `jouwsite.be/beheer.html`.
- **Op je computer?** Open `beheer.html` en kies de map van de website.

Daarna:

1. **Tekst wijzigen:** klik op een tekst in het voorbeeld en typ.
2. **Foto wijzigen:** klik op "Foto wijzigen". Kies een eigen foto (wordt
   automatisch verkleind) of beschrijf een foto en klik "Maak AI-foto".
3. **Reviews, prijzen en vragen:** "+ Kopie" maakt er een bij, "Verwijder" haalt
   er een weg.
4. **Instellingen:** telefoonnummer en e-mail (wijzigt overal tegelijk, ook de
   bel- en WhatsApp-knoppen) en de titel en omschrijving voor Google.
5. **Download zip** en sleep die naar Netlify om de site bij te werken.

Alles wordt tussendoor bewaard in de browser, dus je verliest niets als je het
venster sluit. De beheerpagina kan zelf niets online aanpassen: pas na het
uploaden van de zip verandert de echte website.

## Logo en foto's

- Het logo linksboven is het monogram **PTA** (Prestige Taxi Antwerpen).
- De foto's zijn **AI-foto's** die de browser van de bezoeker ophaalt bij
  `image.pollinations.ai` (een gratis AI-beeldgenerator). De foto wordt gemaakt
  op basis van een beschrijving in het Engels; dezelfde beschrijving en hetzelfde
  `seed`-nummer geven altijd dezelfde foto. De allereerste keer kan het maken een
  paar seconden duren, daarna komt de foto uit de cache.
- Laadt een foto niet, dan blijft de gouden illustratie staan en verdwijnt het
  lege fotovak. De site breekt dus nooit.
- **Tip:** bevalt een foto, sla hem dan op in `assets/img/` en vervang in de HTML
  de lange `https://image.pollinations.ai/...`-link door bv. `assets/img/hero.jpg`.
  Dan ben je niet meer afhankelijk van de generator. Echte foto's van de eigen
  wagen of chauffeur kunnen er op dezelfde manier in.

## Nog aan te passen vóór livegang

- **Reviews**: de 8 reviews zijn voorbeeldteksten. Vervang ze door echte reviews
  (zoek naar `VOORBEELDREVIEWS` in `index.html` en `over-ons.html`).
- **Luchthavenprijzen**: de bedragen in `luchthaven.html` zijn richtprijzen.
  Zoek naar `INDICATIEVE PRIJZEN` en zet er de echte tarieven in.
- **Wagenpark** (`diensten.html`): klopt "Comfort / Business / Van tot 8 personen"
  met de echte wagens? Pas aan waar nodig.

## Online zetten

Sleep de map `prestige-taxi` naar <https://app.netlify.com/drop>, of kies hem als
publish-map bij Netlify, Vercel of GitHub Pages.
