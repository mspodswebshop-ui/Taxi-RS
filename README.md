# Taxi-RS

Deze repository bevat drie losse webprojecten.

## `fc27/` — Arena FC 27

De grote versie: elf tegen elf op een veld van 105 bij 68 meter, met de opzet van een
tv-uitzending. Openen kan door `fc27/index.html` in een browser te openen.

**Beginscherm** met vier keuzes: wedstrijd spelen, opstelling maken, samen spelen, uitleg.

**De wedstrijd**
- Acht landen van elk achttien spelers, met eigen tenues en aparte keeperstenues.
- Opkomst uit de tunnel, opstelling op de middenlijn en het volkslied van het thuisland.
- Camera in perspectief die met de bal meeloopt, publiek op drie ringen, reclameborden.
- Een **rode driehoek** met kleine naam wijst de speler aan die jij bestuurt; speler 2
  krijgt een blauwe. Linksonder staat zijn portret met schotkracht en conditie,
  linksboven het scorebord.
- Inworpen, hoekschoppen, doeltrappen, overtredingen en gele kaarten.
- Rust met statistieken, tweede helft, eindstand, man of the match en een herhaling
  in slow motion na elk doelpunt.

**Opstelling maken** — spelerskaarten met portret, rating, positie en statistieken.
Klik een plek om te wisselen of een reserve om hem op te stellen. Wordt per land
bewaard en gebruikt zodra je met dat land speelt.

**Samen spelen**
- *Op één toetsenbord*: speler 1 met `WASD` + `Spatie`/`E`/`Q`/`Shift`,
  speler 2 met de pijltjes + `Enter`/`/`/`.`/rechter `Shift`.
- *Online*: werkt zonder server. De een klikt "Ik nodig uit" en stuurt de code door,
  de ander plakt hem, maakt een antwoordcode en stuurt die terug. De uitnodiger rekent
  de wedstrijd door en bestuurt het thuisteam.

**Portretten** zijn getekend uit de naam van de speler — geen foto's, en nadrukkelijk
geen gelijkenis met de echte persoon. Foto's van echte voetballers kunnen er niet in:
er zitten geen afbeeldingen in het pakket en portretrechten staan dat niet toe.

**Geluid** wordt volledig live gesynthetiseerd; er zit geen enkel audiobestand in het spel.
De volksliederen zijn benaderingen van de openingsmaten van de rechtenvrije melodieën,
opgeslagen als lijsten van `[toon, tellen]` in `data.js`. Gesproken commentaar is eruit;
wat er gebeurt lees je in de balk onder het veld.

**Wat er niet in zit:** geen 3D, geen motion capture, geen licenties, geen opnames.
Buitenspel, wissels en strafschoppen ontbreken. Alle ratings zijn verzonnen.

Handig bij het sleutelen: `index.html?debug` zet een inspectiehaak op `window.__fc27`.

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
