# Taxi-RS

Deze repository bevat drie losse webprojecten.

## `fc27/` — Arena FC 27

De grote versie: elf tegen elf op een veld van 105 bij 68 meter, met de opzet van een
tv-uitzending. Openen kan door `fc27/index.html` in een browser te openen.

**De wedstrijd**
- Acht landenteams met echte spelersnamen, eigen tenues en aparte keeperstenues.
- Opkomst uit de tunnel, opstelling op de middenlijn en het volkslied van het thuisland,
  daarna pas de aftrap. Overslaan kan met `Esc`.
- Camera in perspectief die met de bal meeloopt, publiek op drie ringen, reclameborden.
- Inworpen, hoekschoppen, doeltrappen, overtredingen en gele kaarten.
- Rust met statistieken, tweede helft, eindstand en man of the match.
- Herhaling in slow motion na elk doelpunt, met de naam van de maker en de assist.

**Besturing**

| Toets | Actie |
| --- | --- |
| `W` `A` `S` `D` of pijltjes | Lopen |
| `Spatie` | Schieten — vasthouden voor meer kracht |
| `E` | Passen |
| `Q` | Hoge bal of voorzet |
| `Shift` | Sprinten (kost conditie) |
| `Spatie` zonder bal | Druk zetten en tackelen |
| `Esc` | Volkslied overslaan |

**Geluid** wordt volledig live gesynthetiseerd; er zit geen enkel audiobestand in het spel.
De volksliederen zijn benaderingen van de openingsmaten van de rechtenvrije melodieën,
opgeslagen als lijsten van `[toon, tellen]` in `data.js` en dus makkelijk aan te passen.
Het gesproken commentaar gebruikt de stemmen van je eigen browser.

**Wat er niet in zit:** geen 3D, geen motion capture, geen licenties, geen opgenomen geluid.
Buitenspel wordt niet gefloten, en er zijn geen wissels of strafschoppen. Alle ratings zijn verzonnen.

Handig bij het sleutelen: `index.html?demo=1` laat de computer beide teams spelen,
`index.html?debug` zet een inspectiehaak op `window.__fc27`.

## `fc26/` — Arena FC 26

Een voetbalgame met squad builder. Twee pagina's, allebei zonder build of dependencies:

### `index.html` — Squad Builder

- Klik een lege plek op het veld en kies een speler, of klik een kaart in de spelerslijst
  en die schuift automatisch naar de eerste passende positie.
- Vier formaties: 4-3-3, 4-4-2, 3-5-2 en 4-2-3-1. Wisselen behoudt je spelers waar mogelijk.
- Teamrating en chemie (tot 33 punten) uit gedeelde clubs en landen; een speler buiten zijn
  natuurlijke positie levert een punt in en krijgt een rode rand.
- Ruim vijftig spelers en iconen, te filteren op linie en club, te doorzoeken en te sorteren
  op elke statistiek. Plus knoppen voor het sterkste elftal, een willekeurig elftal en een top 10.
- Je opstelling wordt bewaard in `localStorage`.

### `game.html` — de wedstrijd

Een speelbare 5-tegen-5 arcadewedstrijd op canvas, met de vijf sterkste spelers uit je
opgeslagen opstelling. De statistieken van je spelers bepalen hoe ze spelen: snelheid bepaalt
de loopsnelheid, schot de kracht, verdedigen de kans op een geslaagde tackle, dribbelen hoe
makkelijk je de bal verliest en de reflexen van je keeper zijn actieradius.

| Toets | Actie |
| --- | --- |
| `W` `A` `S` `D` of pijltjes | Lopen |
| `Spatie` | Schieten — ingedrukt houden voor meer kracht |
| `E` | Passen naar de best vrijstaande medespeler |
| `Shift` | Sprinten (kost conditie) |
| `Spatie` zonder bal | Druk zetten en tackelen |
| `P` of `Esc` | Pauzeren |

Je bestuurt automatisch de speler die het dichtst bij de bal staat; je medespelers en de
tegenstander worden door de computer bestuurd. Drie niveaus, drie speelduren, geluid uit te
zetten, en op een touchscreen verschijnen een looppad en een schotknop.

Handig bij het sleutelen: `game.html?debug` zet een inspectiehaak op `window.__arena`, en
`game.html?demo=1` laat beide teams door de computer spelen.

De ratings zijn fictief en het project staat los van welke uitgever of club dan ook.

## `hyml` — Taxi R.S.

De oorspronkelijke één-pagina site voor Taxi R.S. (regio Antwerpen) met bel- en WhatsApp-knop.
Let op: het bestand heeft geen `.html`-extensie, waardoor browsers en hostingdiensten het niet als
webpagina behandelen. Hernoemen naar `index.html` lost dat op.
