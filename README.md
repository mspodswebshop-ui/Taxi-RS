# Finesse Decore — website

Eenpagina-website voor **Finesse Decore** (bruiloft- en eventdecoratie), in de stijl van
het handgemaakte welkomstbord: ivoor en zand, satijnen champagne-goud, arabesk motieven
en een klassieke serif.

Statische site — geen build, geen server nodig. Openen kan gewoon door `index.html`
in de browser te slepen.

## Bestanden

| Bestand | Wat het doet |
|---|---|
| `index.html` | De volledige pagina (hero, diensten, werkwijze, prijzen, galerij, contact) |
| `styles.css` | Alle styling, kleuren en responsief gedrag |
| `script.js` | Mobiel menu, scroll-animaties, offerteformulier |
| `assets/logo.svg` | Het logo als vector, transparante achtergrond |
| `assets/logo-light.svg` | Lichte versie voor donkere achtergronden |
| `assets/logo-badge.svg` | Het logo in de beige cirkel — footer, en scherpe vervanger van je profielfoto |
| `assets/rose.svg` | Alleen de roos — voor kleine accenten |
| `assets/favicon.svg` | De roos in een cirkel — tabblad-icoon (tekst is te klein op 16 px) |
| `assets/apple-touch-icon.png` | Icoon voor "Zet op beginscherm" (180×180) |
| `assets/social-card.jpg` | Deelafbeelding voor WhatsApp/Facebook/Instagram (1200×630) |
| `assets/logo-origineel.png` | De originele profielfoto waaruit het logo is nagetekend (bron) |
| `assets/welcome-board.jpg` | Sfeerfoto van het welkomstbord |
| `assets/pattern.svg` | Het arabesk motief dat als achtergrond gebruikt wordt |

## Het logo

Het bestaande Finesse Decore-logo is **nagetekend als vector**. Het ontwerp is niet
veranderd — dezelfde letters, dezelfde roos, dezelfde tekst — maar het is nu opgebouwd
uit vectorpaden in plaats van een screenshot van 640 pixels. Daardoor blijft het scherp
op elk formaat: van een favicon van 16 pixels tot een spandoek van drie meter, en het is
bruikbaar voor drukwerk, folie en borduurwerk.

* **Inktkleur:** `#701E19` — uit het origineel gemeten
* **Achtergrond van het ronde embleem:** `#DBC6BA` — dezelfde tint als je profielfoto
* Het logo zit in de website als inline SVG (`<symbol id="fd-logo">` bovenaan
  `index.html`) en neemt de tekstkleur over; in `styles.css` bepaalt `--wine` die kleur.

## Nog zelf in te vullen

Alle plekken staan gemarkeerd met een zoekwoord in de code:

1. **`INVULLEN:PRIJZEN`** — de bedragen in de pakketten (Essentials / Signature / Couture)
   en in de tabel "Losse onderdelen & verhuur" zijn **plaatshouders**. Vervang ze door je
   echte tarieven. Wil je (nog) geen bedragen tonen, zet er dan `Op aanvraag` en verwijder
   de regel `<span class="price__from">vanaf</span>`.
2. **`INVULLEN:CONTACT`** — telefoon/WhatsApp, e-mailadres, Instagram-link en de regio.
   Staan nu op voorbeeldwaarden (`+32 000 00 00 00`, `info@finessedecore.be`).
   Het e-mailadres staat óók bovenaan `script.js` in `MAIL_TO`.
3. **`INVULLEN:FOTO`** — zet je eigen foto's in `assets/` en vervang de `src` van de
   `<img>`-tags. De galerij heeft nu vier tegels met "Binnenkort"; vervang zo'n
   `<figure class="gallery__item gallery__item--empty">` door:

   ```html
   <figure class="gallery__item reveal">
     <img src="assets/mijn-foto.jpg" alt="Korte omschrijving">
     <figcaption>Bruiloft &middot; Naam</figcaption>
   </figure>
   ```

   Beste formaat: staand (3:4), minstens 1000px breed.

## Offerteformulier

Het formulier opent standaard het mailprogramma van de bezoeker met alles ingevuld.
Wil je de aanvragen liever rechtstreeks in je mailbox zonder mailclient, maak dan een
gratis account op [formspree.io](https://formspree.io) en vervang in `index.html`:

```html
<form class="form reveal" id="quoteForm" action="https://formspree.io/f/JOUW_ID" method="POST">
```

en verwijder de `submit`-handler onderaan `script.js`.

## Online zetten

Met GitHub Pages: **Settings → Pages → Source: deze branch, map `/root`**.
Werkt ook op elke andere hosting — het zijn gewone bestanden.

---

_Let op: het bestand `hyml` (de oude Taxi R.S.-pagina) staat nog ongewijzigd in deze
repository en wordt door de site niet gebruikt._
