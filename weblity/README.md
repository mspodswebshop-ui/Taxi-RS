# Weblity

De website van Weblity en de bouwer waarmee klanten een template kiezen.
Gewone HTML, CSS en JavaScript: geen framework, geen buildstap, geen server.

## Lees dit eerst

**Klanten kunnen een template kiezen, invullen en aanvragen; online zetten
doe jij.** De bouwer (`bouwer.html`) heeft zes templates. De klant vult zijn
naam, teksten, kleur en foto in en ziet meteen het resultaat. Met "Vraag deze
website aan" komt zijn ontwerp bij jou terecht. Zie
[Zo werkt een aanvraag](#zo-werkt-een-aanvraag).

Zelf blokken slepen, zoals de bewegende illustratie op de startpagina toont,
kan nog niet. Daarvoor dient het formulier voor vroege toegang.

Er wordt nergens betaald: de bouwer kent geen accounts en geen kassa. Afrekenen
met je klant regel je voorlopig zelf.

Drie dingen op de startpagina zijn **voorstellen** die je zelf moet nakijken
voor je de site online zet:

| Wat | Waar in `index.html` |
|---|---|
| Plannen en prijzen (€6, €12, €29 per maand; €5, €10 en €24 bij jaarbetaling) | het blok `id="prijzen"` |
| Wat elk plan bevat, en de antwoorden op de vragen | de blokken `id="prijzen"` en `id="faq"` |
| Telefoon- en WhatsApp-nummer (nu +32 484 90 81 95) | het blok `id="toegang"` |

Wat nog ontbreekt: een pagina met bedrijfsgegevens en privacyverklaring. Het
formulier verzamelt naam en e-mailadres, dus die pagina heb je nodig voor je
live gaat.

## Zo werkt een aanvraag

1. **De klant** kiest een template op `bouwer.html`, vult alles in en klikt op
   "Vraag deze website aan".
2. **Jij** krijgt de aanvraag in Netlify (Forms → `website-aanvraag`) of via
   WhatsApp. Er staat een link in die begint met `…/bouwer.html#o=`. Die link
   is het ontwerp: alle teksten en de kleur zitten erin.
3. Open **`weblity-beheer.html`** op je eigen toestel (zie
   [Losse bestanden](#losse-bestanden)), klik op "Ontwerp laden" en plak de link.
4. Voeg de foto toe die de klant je stuurde, pas aan wat nodig is en klik op
   "Download website". Je krijgt één HTML-bestand, bijvoorbeeld
   `trattoria-luna.html`.
5. Zet dat bestand online. Het heeft niets anders nodig: geen map, geen
   script, geen externe bestanden. Hernoem het naar `index.html` als het de
   startpagina van een domein wordt.

Goed om te weten:

- **Foto's reizen niet mee met de aanvraag.** De klant ziet zijn foto in het
  voorbeeld, maar stuurt hem apart door. Jij voegt hem toe in de beheerversie.
- **De beheerversie staat niet online.** Ze bestaat alleen als gebouwd bestand
  op je eigen toestel. Het is wel geen slot: wie het voorbeeld in zijn browser
  ziet en technisch onderlegd is, kan die pagina ook zelf kopiëren. Je klant
  betaalt dus voor het online zetten, het domein en je service.
- **"Gemaakt met Weblity"** onderaan zet je in de beheerversie aan of uit, per
  site.
- Het WhatsApp-nummer voor aanvragen staat bovenaan `bouwer.js`.

Een template toevoegen of aanpassen doe je in `templates.js`: elk template is
een blok met een naam, kleuren, een indeling en voorbeeldtekst.

## Bekijken op je eigen computer

```bash
cd weblity
python3 -m http.server 4173
# open http://localhost:4173
```

Dubbelklikken op `index.html` werkt ook, maar het formulier versturen kan dan
niet.

## Losse bestanden

```bash
cd weblity
node build-standalone.mjs
```

Dat maakt drie bestanden, elk met stijl, script, lettertypes en icoon erin:

| Bestand | Wat |
|---|---|
| `weblity.html` | de startpagina |
| `weblity-bouwer.html` | de bouwer zoals de klant hem ziet |
| `weblity-beheer.html` | de bouwer voor jou: ontwerp laden en site downloaden |

Je kunt ze doorsturen en met een dubbelklik openen, zonder map of server
eromheen. Een formulier versturen werkt daarin niet; de bezoeker krijgt dan
de WhatsApp-knop.

Na een wijziging in de bronbestanden bouw je ze opnieuw.

## Online zetten met Netlify

1. Maak in Netlify een **nieuwe site** van deze repository.
2. Vul bij **Base directory** `weblity` in. De rest staat in `netlify.toml`.
3. Zet onder **Forms** de formulierdetectie aan en deploy opnieuw.

Daarna komen berichten binnen onder **Forms**: `website-aanvraag` voor sites
die klanten in de bouwer aanvragen, `vroege-toegang` voor het formulier op de
startpagina. Daar stel je ook in dat je bij elk bericht een e-mail krijgt.

Op een andere host werkt alles behalve het formulier: de bezoeker krijgt dan
de melding om via WhatsApp te schrijven.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `index.html` | De startpagina: alle tekst en de opbouw |
| `styles.css` | Kleuren, lettertypes, opmaak en de CSS-animaties |
| `app.js` | De animaties met gedrag, de prijswissel en het formulier |
| `bedankt.html` | Bevestiging na het formulier, voor wie geen JavaScript heeft |
| `bouwer.html` | De bouwer: template kiezen, invullen, aanvragen |
| `bouwer.css`, `bouwer.js` | Opmaak en gedrag van de bouwer |
| `templates.js` | De zes templates en de code die er een website van maakt |
| `build-standalone.mjs` | Maakt de losse bestanden, ook de beheerversie |
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
