# Finesse Decore — website

Website voor **Finesse Decore** (bruiloft- en eventdecoratie), in de stijl van het
handgemaakte welkomstbord: ivoor en zand, satijnen champagne-goud, arabesk motieven en
een klassieke serif. Vijf pagina's: home, diensten, werkwijze, galerij en contact.

Statische site — geen build, geen server nodig. Openen kan gewoon door `index.html`
in de browser te slepen.

## Bestanden

| Bestand | Wat het doet |
|---|---|
| `index.html` | Startpagina — hero, intro, uitgelichte diensten en werk |
| `diensten.html` | Alle diensten, elk met een knop "Vraag offerte aan" |
| `werkwijze.html` | De vier stappen van kennismaking tot afbraak + veelgestelde vragen |
| `galerij.html` | Portfolio |
| `contact.html` | Offerteformulier en contactgegevens |
| `styles.css` | Alle styling, kleuren en responsief gedrag (gedeeld door alle pagina's) |
| `script.js` | Mobiel menu, scroll-animaties, offerteformulier (gedeeld) |
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

## Geen prijzen op de site

Er staan nergens bedragen. Overal waar iemand naar de prijs zou zoeken — bij elke dienst,
onderaan elke pagina en in de navigatie — staat een knop **"Vraag offerte aan"** die naar
`contact.html` leidt. Wil je later toch met vaste tarieven werken, laat het weten, dan
bouwen we daar een aparte pagina voor.

## Nog zelf in te vullen

Twee dingen staan nog op voorbeeldwaarden. Ze komen op **elke pagina** voor, dus vervang
ze in alle vijf de HTML-bestanden (of gebruik zoek-en-vervang over de hele map):

1. **`INVULLEN:CONTACT`** — WhatsApp-nummer (`+32 000 00 00 00`), e-mailadres
   (`info@finessedecore.be`), Instagram-link en de regio. Het e-mailadres staat ook
   bovenaan `script.js` in `MAIL_TO`.
2. **`INVULLEN:FOTO`** — zet je eigen foto's in `assets/` en vervang de `src` van de
   `<img>`-tags. In `galerij.html` staan tegels met "Binnenkort"; vervang zo'n
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
gratis account op [formspree.io](https://formspree.io) en vervang in `contact.html`:

```html
<form class="form reveal" id="quoteForm" action="https://formspree.io/f/JOUW_ID" method="POST">
```

en verwijder de `submit`-handler onderaan `script.js`.

## Online zetten

Met GitHub Pages: **Settings → Pages → Source: deze branch, map `/root`**.
`index.html` wordt dan de startpagina, de andere pagina's volgen automatisch.
Werkt ook op elke andere hosting — het zijn gewone bestanden.

---

_Let op: het bestand `hyml` (de oude Taxi R.S.-pagina) staat nog ongewijzigd in deze
repository en wordt door de site niet gebruikt._
