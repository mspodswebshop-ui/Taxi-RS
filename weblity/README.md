# Weblity

De website van Weblity, de websitebouwer. Eén pagina, gewone HTML, CSS en
JavaScript: geen framework, geen buildstap, geen externe diensten.

## Lees dit eerst

**Deze site kondigt Weblity aan; de bouwer zelf bestaat nog niet.** Daarom
leidt elke knop naar het formulier voor vroege toegang en niet naar een
aanmeldpagina. De bewegende "bouwer" bovenaan is een illustratie.

Drie dingen op de pagina zijn **voorstellen** die je zelf moet nakijken voor
je de site online zet:

| Wat | Waar in `index.html` |
|---|---|
| Plannen en prijzen (€6, €12, €29 per maand; €5, €10 en €24 bij jaarbetaling) | het blok `id="prijzen"` |
| Wat elk plan bevat, en de antwoorden op de vragen | de blokken `id="prijzen"` en `id="faq"` |
| Telefoon- en WhatsApp-nummer (nu +32 484 90 81 95) | het blok `id="toegang"` |

Wat nog ontbreekt: een pagina met bedrijfsgegevens en privacyverklaring. Het
formulier verzamelt naam en e-mailadres, dus die pagina heb je nodig voor je
live gaat.

## Bekijken op je eigen computer

```bash
cd weblity
python3 -m http.server 4173
# open http://localhost:4173
```

Dubbelklikken op `index.html` werkt ook, maar het formulier versturen kan dan
niet.

## De hele site als één bestand

```bash
cd weblity
node build-standalone.mjs
```

Dat maakt `weblity.html`: stijl, script, lettertypes en icoon in één bestand.
Je kunt het doorsturen en met een dubbelklik openen, zonder map of server
eromheen. Het formulier versturen werkt daarin niet; de bezoeker krijgt de
melding om via WhatsApp te schrijven.

Na een wijziging in `index.html`, `styles.css` of `app.js` bouw je het
bestand opnieuw.

## Online zetten met Netlify

1. Maak in Netlify een **nieuwe site** van deze repository.
2. Vul bij **Base directory** `weblity` in. De rest staat in `netlify.toml`.
3. Zet onder **Forms** de formulierdetectie aan en deploy opnieuw.

Daarna komen aanvragen binnen onder **Forms → vroege-toegang**. Daar stel je
ook in dat je bij elke aanvraag een e-mail krijgt.

Op een andere host werkt alles behalve het formulier: de bezoeker krijgt dan
de melding om via WhatsApp te schrijven.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `index.html` | Alle tekst en de opbouw van de pagina |
| `styles.css` | Kleuren, lettertypes, opmaak en de CSS-animaties |
| `app.js` | De animaties met gedrag, de prijswissel en het formulier |
| `bedankt.html` | Bevestiging na het formulier, voor wie geen JavaScript heeft |
| `fonts/` | Bricolage Grotesque en Inter, lokaal meegeleverd (OFL-licentie) |

Kleuren pas je aan bovenaan `styles.css`, onder `:root`.

## De animaties

- **De bouwer in de kop** bouwt zelf een site: blokken slepen, een titel
  typen, van kleur wisselen, publiceren. Hij kantelt recht terwijl je scrolt.
- **Koppen** komen woord voor woord omhoog; het woord in de hoofdkop wisselt.
- **Functiekaarten** hebben elk een eigen lopende illustratie en een rand die
  oplicht waar de muis is.
- **Zo werkt het**: de tekst scrolt, het beeld blijft staan en wisselt mee.
- **Templates** schuiven in twee rijen voorbij en hellen mee met je scrollsnelheid.
- **Prijzen**: wissel tussen maand en jaar; om het middelste plan draait licht.

Animaties buiten beeld staan stil. Wie in het besturingssysteem om minder
beweging vraagt, krijgt de pagina zonder beweging te zien. Zonder JavaScript
blijft alle inhoud leesbaar.
