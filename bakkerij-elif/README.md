# Website — Bakkerij Elif (Boom)

Een snelle, mobielvriendelijke website voor Bakkerij Elif, Hoogstraat 37,
2850 Boom, in de kleuren van het uithangbord: neonroze letters op een donkere
bakstenen gevel, met het witte "eb"-ovaal als logo. Gewone HTML, CSS en JavaScript: er hoeft niets geïnstalleerd of
gebouwd te worden.

## Pagina's

| Bestand            | Wat staat erop                                                    |
|--------------------|-------------------------------------------------------------------|
| `index.html`       | Home: "Nu open"-label, favorieten, bestel-oproep, Google-reviews  |
| `assortiment.html` | Het hele menubord                                                 |
| `bestellen.html`   | Bestelformulier dat een WhatsApp-bericht naar de bakkerij maakt   |
| `reviews.html`     | Google-reviews met score, en knoppen om er zelf een te schrijven  |
| `contact.html`     | Openingsuren, adres, telefoon, WhatsApp en kaart                  |

**Alles in één bestand:** `bakkerij-elif.html` bevat alle pagina's, de opmaak
en het script. Handig om door te sturen of los te uploaden. Pas je iets aan in
de pagina's, `style.css` of `script.js`, maak het dan opnieuw met
`node build-standalone.mjs`.

Alle pagina's delen `style.css` en `script.js`. Het "Nu open / gesloten"-label
staat onderaan elke pagina en werkt zichzelf elke minuut bij, op Belgische tijd.
Bovenaan in `index.html` staan ook adres, telefoon en uren in een vorm die
Google begrijpt (schema.org).

## Aanpassen

| Wat                    | Waar                                               |
|------------------------|----------------------------------------------------|
| Openingsuren           | `script.js`, bovenaan in `UREN`, en de `openingHoursSpecification` in `index.html` |
| Teksten en producten   | `index.html`                                       |
| Kleuren en lettertypes | `style.css`, bovenaan in `:root` (roze = `--accent`) |
| WhatsApp-nummer        | `script.js`, `WHATSAPP`                            |
| Google-reviews         | `script.js`, `GOOGLE` (zie hieronder)              |
| Menu bovenaan          | in elke `.html`, het blok `<nav class="nav">`      |

**Controleer de openingsuren.** Op Google staat alleen dat de zaak om 20:00
sluit en om 08:00 opengaat. De site gaat daarom uit van elke dag 08:00–20:00.
Klopt dat niet, pas dan `UREN` aan (een dag op `null` zetten = gesloten).

**Eigen foto's** maken het verschil. Echte foto's van de vitrine, de taarten
en de Turkse pizza werken beter dan de tekening die er nu staat. Het logo in de
kopbalk is nagetekend; heb je het logobestand, zet dat er dan in.

## Google-reviews aanzetten

Zonder instellingen toont de site een knop "Bekijk de reviews op Google". Om de
reviews zelf op de site te tonen heb je een gratis Google-sleutel nodig:

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com) en maak
   een project aan. Google vraagt om een betaalkaart; een kleine site als deze
   blijft normaal binnen het gratis gebruik, maar kijk zelf de actuele prijzen na.
2. Zet bij *API's en services* twee API's aan: **Maps JavaScript API** en
   **Places API (New)**.
3. Maak bij *Inloggegevens* een **API-sleutel** aan.
4. **Beperk de sleutel** (belangrijk, want hij staat zichtbaar in de site):
   - *Websitebeperkingen*: alleen je eigen domein, bv. `https://bakkerijelif.be/*`
   - *API-beperkingen*: alleen de twee API's van stap 2.
5. Plak de sleutel in `script.js` bij `GOOGLE.apiKey`.

De site zoekt de zaak zelf op via het adres. Er bestaan meerdere zaken die
"Bakkerij Elif" heten; toont de site de verkeerde, vul dan bij `GOOGLE.placeId`
de Place ID van de zaak in Boom in (op te zoeken met de
[Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder)).

Goed om te weten: Google geeft maximaal 5 reviews door, en kiest zelf welke.
Ook minder goede reviews kunnen er dus tussen staan, en de gemiddelde score
(nu 3,8) staat er altijd bij.

Liever een kant-en-klare widget, zoals Trustindex of Elfsight? Maak daar een
account, kopieer hun code en plak die in `reviews.html` op de plek die in de
code is aangeduid.

## Deelfoto en icoon

- `deelfoto.jpg` (1200 × 630) verschijnt als je de link deelt op WhatsApp,
  Facebook of Instagram.
- `icon-180.png` is het icoon als iemand de site op het beginscherm van zijn
  telefoon zet.

De deelfoto staat met het volledige adres in de pagina's
(`https://mspodswebshop-ui.github.io/Taxi-RS/bakkerij-elif/`). Verandert het adres, pas dan `og:url`,
`og:image` en `canonical` aan in de vijf pagina's.

## Online zetten

De makkelijkste manier: ga naar [app.netlify.com/drop](https://app.netlify.com/drop)
en sleep de hele map `bakkerij-elif` erin (alle pagina's gaan dan mee). Je krijgt meteen een werkend adres en kunt
daarna een eigen domeinnaam koppelen (bv. `bakkerijelif.be`).

Vanuit deze repository kan ook: maak in Netlify een **nieuwe** site aan op deze
repo en vul bij *Base directory* `bakkerij-elif` in. De `netlify.toml` in die
map regelt de rest; elke push werkt de site dan vanzelf bij.

Zet daarna het adres van de website in het Google-bedrijfsprofiel
("Website toevoegen").
