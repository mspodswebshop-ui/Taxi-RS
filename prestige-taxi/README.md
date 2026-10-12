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
