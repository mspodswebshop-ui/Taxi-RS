# Finesse Decor — website

Website voor **Finesse Decor** (bruiloft- en eventdecoratie), in het thema van het
nieuwe logo: een crème embleem met champagne- en roségoud reliëf, de boog rond het
FD-monogram, de roos met salieblad en een klassieke serif. Zes pagina's: home,
diensten, prijzen, werkwijze, galerij en contact.

Statische site — geen build, geen server nodig. Openen kan gewoon door `index.html`
in de browser te slepen.

## Bestanden

| Bestand | Wat het doet |
|---|---|
| `index.html` | Startpagina — hero met logo-embleem, intro, uitgelichte diensten en werk |
| `diensten.html` | Alle diensten, elk met een knop "Vraag offerte aan" |
| `prijzen.html` | Drie pakketten (Essentieel, Signature, Prestige) en losse verhuurprijzen |
| `werkwijze.html` | De vier stappen van kennismaking tot afbraak + veelgestelde vragen |
| `galerij.html` | Portfolio |
| `contact.html` | Offerteformulier en contactgegevens |
| `styles.css` | Alle styling; de kleuren staan bovenaan in `:root` |
| `script.js` | Mobiel menu, scroll-animaties, offerteformulier (gedeeld) |
| `assets/logo-badge.png` | Het ronde logo-embleem (hero en footer) |
| `assets/favicon.png`, `assets/apple-touch-icon.png` | Tabblad- en beginschermicoon |
| `assets/social-card.jpg` | Deelafbeelding voor WhatsApp/Facebook/Instagram (1200×630) |
| `assets/welcome-board.jpg` | Voorbeeldfoto (vervangen door eigen foto's) |
| `assets/pattern.svg` | Het arabesk motief op de achtergrond |

## Kleuren

| Naam | Kleur | Waar vandaan |
|---|---|---|
| `--sand` | `#E9DDD1` | achtergrond van het logo-embleem |
| `--gold` | `#A6855F` | de letters van het logo |
| `--champagne` | `#CBB091` | het licht op het goud |
| `--bronze` | `#7E6247` | de schaduw van het reliëf |
| `--rose` / `--sage` | `#C9A396` / `#8E9B7E` | de roos en het blad |
| `--espresso` | `#2A2521` | donkere knoppen, footer |

In de navigatie staat het logo als tekst (boog met FD, "FINESSE — DECOR"), zodat het
scherp blijft op elk scherm. Het echte embleem staat als afbeelding in de hero en footer.

## Prijzen

De klant bezorgt de bedragen nog. Tot dan staat overal **"Prijs volgt"**. Zoek in
`prijzen.html` op **`INVULLEN:PRIJS`** en vervang per pakket:

```html
<p class="price__amount price__amount--tbd">Prijs volgt</p>
```

door bijvoorbeeld:

```html
<p class="price__amount"><small>vanaf</small>€ 450</p>
```

En bij de losse items `<span class="ratelist__val ratelist__val--tbd">prijs volgt</span>`
door `<span class="ratelist__val">€ 35</span>`. Namen van pakketten, de opsommingen
en het kadertje "Goed om te weten" (btw, voorschot) even met de klant nakijken.

## Nog zelf in te vullen

Twee dingen staan nog op voorbeeldwaarden. Ze komen op **elke pagina** voor, dus vervang
ze in alle zes de HTML-bestanden (of gebruik zoek-en-vervang over de hele map):

1. **`INVULLEN:CONTACT`** — WhatsApp-nummer (`+32 000 00 00 00`), e-mailadres
   (`info@finessedecor.be`), Instagram-link en de regio. Het e-mailadres staat ook
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

