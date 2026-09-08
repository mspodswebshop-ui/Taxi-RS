# Taxi-RS

Deze repository bevat twee losse webprojecten.

## `fc26/` — Arena FC 26

Een voetbalsite met squad builder in de stijl van moderne voetbalgames:

- **Squad builder** — sleepvrij opstellen via het veld: klik een lege plek en kies een speler, of klik een kaart in de spelerslijst en die schuift automatisch naar de eerste passende positie.
- **Vier formaties** — 4-3-3, 4-4-2, 3-5-2 en 4-2-3-1. Wisselen van formatie behoudt je spelers waar mogelijk.
- **Teamrating en chemie** — chemie loopt tot 33 punten, opgebouwd uit gedeelde clubs en landen; een speler buiten zijn natuurlijke positie levert een punt in en krijgt een rode rand.
- **Spelerslijst** — ruim vijftig spelers en iconen, te filteren op linie en club, te doorzoeken op naam/club/land en te sorteren op elke statistiek.
- **Sterkste elftal / willekeurig elftal** met één klik, plus een top 10.
- Je opstelling wordt bewaard in `localStorage`, dus die staat er nog na het herladen.

Puur HTML, CSS en JavaScript — geen build, geen dependencies. Openen kan door `fc26/index.html` in een browser te openen.

Bestanden: `index.html` (structuur), `style.css` (opmaak), `players.js` (spelersdata), `app.js` (logica).

De ratings zijn fictief en het project staat los van welke uitgever of club dan ook.

## `hyml` — Taxi R.S.

De oorspronkelijke één-pagina site voor Taxi R.S. (regio Antwerpen) met bel- en WhatsApp-knop.
Let op: het bestand heeft geen `.html`-extensie, waardoor browsers en hostingdiensten het niet als
webpagina behandelen. Hernoemen naar `index.html` lost dat op.
