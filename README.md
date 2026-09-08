# Taxi-RS

Deze repository bevat twee losse webprojecten.

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
