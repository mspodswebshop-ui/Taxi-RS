# Mijn AI — eigen chat-app

Een eigen AI-chatapp in de stijl van Claude: streamende antwoorden, meerdere
gesprekken, markdown-weergave, licht/donker thema en een instelbare
persoonlijkheid. Draait op de Claude API.

De app bestaat uit twee delen:

- **Backend** (`server.js`) — een kleine Express-server die met de Claude API
  praat. Hier staat je API-sleutel. Die komt nooit in de browser terecht.
- **Frontend** (`public/`) — de chatinterface. Gewoon HTML, CSS en JavaScript,
  zonder buildstap of framework.

---

## Snel starten

Je hebt [Node.js 20 of nieuwer](https://nodejs.org) nodig.

```bash
cd ai-app
npm install
cp .env.example .env
```

Open `.env` en vul je API-sleutel in. Die haal je op bij
[console.anthropic.com](https://console.anthropic.com) → *API keys*:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Start de app:

```bash
npm start
```

Open daarna **http://localhost:3000**.

> Tijdens het ontwikkelen is `npm run dev` handig: de server herstart dan
> automatisch zodra je een bestand aanpast.

---

## Wat kan de app?

| Functie | Toelichting |
|---|---|
| Streamende antwoorden | De tekst verschijnt woord voor woord, net als bij Claude. |
| Meerdere gesprekken | Elk gesprek krijgt automatisch een titel op basis van je eerste vraag. |
| Blijft bewaard | Gesprekken staan in de `localStorage` van je browser, dus ze overleven een herlaad. |
| Stopknop | Breekt het antwoord af én stopt het API-verzoek, zodat je niet doorbetaalt. |
| Markdown | Koppen, lijsten, tabellen, links en codeblokken met een kopieerknop. |
| Denkproces | Optioneel zie je een samenvatting van hoe het model tot het antwoord komt. |
| Modelkeuze | Wissel tussen Opus 5, Sonnet 5 en Haiku 4.5. |
| Denkkracht | Van `low` (snel en goedkoop) tot `max` (voor moeilijke vragen). |
| Eigen systeemprompt | Bepaal zelf de persoonlijkheid en regels van je assistent. |
| Tokengebruik | Onder elk antwoord zie je wat het gekost heeft aan tokens. |
| Licht/donker thema | Met één klik om te schakelen. |

Instellingen pas je aan via **Instellingen** linksonder.

---

## Hoe het werkt

```
Browser  ──POST /api/chat──▶  server.js  ──messages.stream()──▶  Claude API
   ▲                                                                 │
   └──────────── Server-Sent Events (stukje tekst per keer) ─────────┘
```

1. De browser stuurt de volledige gespreksgeschiedenis naar `/api/chat`.
2. De server voegt het systeemprompt toe en roept de Claude API aan met
   `client.messages.stream()`.
3. Elk stukje tekst wordt meteen als Server-Sent Event doorgestuurd naar de
   browser, die het direct rendert.

Een paar keuzes die de moeite waard zijn om te weten:

- **Het systeemprompt wordt gecached** (`cache_control: ephemeral`). Het staat
  vooraan in elk verzoek en verandert zelden, dus hergebruik scheelt geld.
  Onder een antwoord zie je hoeveel tokens uit de cache kwamen.
- **Adaptive thinking staat aan** met `display: "summarized"`, zodat het model
  zelf bepaalt hoe diep het nadenkt. Bij Haiku 4.5 wordt dit weggelaten, want
  dat model ondersteunt het niet.
- **Afbreken werkt door tot aan de API.** Sluit je het tabblad of klik je op
  stop, dan stopt het verzoek naar Claude ook echt.
- **De server valideert alles wat binnenkomt**: rollen, lege berichten,
  maximale lengte, en een limiet van 20 verzoeken per minuut per IP-adres.
- **Antwoorden worden veilig weergegeven.** Alle tekst van het model wordt
  ge-escaped voordat er markdown op wordt toegepast, dus HTML in een antwoord
  kan nooit als code worden uitgevoerd. Links werken alleen met `http(s):`
  en `mailto:`.

---

## Zelf aanpassen

**Ander standaardgedrag?** Pas `DEFAULT_SYSTEM_PROMPT` bovenin `server.js` aan
(of, alleen voor jezelf, via Instellingen in de app).

**Andere modellen in de keuzelijst?** Pas de lijst `MODELS` bovenin
`server.js` aan. De frontend haalt die lijst op via `/api/config`, dus je hoeft
verder niets te wijzigen.

**Langere antwoorden?** Verhoog `MAX_TOKENS` in `server.js`.

**Andere kleuren?** Bovenin `public/styles.css` staan alle kleuren als
variabelen, gescheiden voor het lichte en het donkere thema.

---

## Online zetten

De app is een gewone Node-server en draait op elke hoster die Node
ondersteunt, bijvoorbeeld Render, Railway of Fly.io. Let op drie dingen:

1. Zet `ANTHROPIC_API_KEY` als **environment variable** bij de hoster — commit
   je `.env` nooit (die staat daarom in `.gitignore`).
2. De hoster geeft zelf een poort door via `PORT`; dat regelt de server al.
3. **Iedereen die de URL kent, gebruikt jouw API-tegoed.** Zet er een
   wachtwoord of login voor als de app publiek bereikbaar is. De ingebouwde
   rate limit (20 verzoeken per minuut per IP) is een rem, geen slot.

---

## Problemen oplossen

**"Er is geen API-sleutel ingesteld op de server"**
Er is geen `.env` met `ANTHROPIC_API_KEY`, of de server is na het aanmaken niet
opnieuw gestart.

**"De API-sleutel is ongeldig of ontbreekt"**
De sleutel klopt niet. Maak een nieuwe aan in de console en plak hem opnieuw —
let op spaties of een ontbrekend stuk.

**"Dit model is niet beschikbaar voor jouw organisatie"**
Je account heeft geen toegang tot het gekozen model. Kies een ander model bij
Instellingen.

**Het antwoord stopt halverwege**
Dan is de tokenlimiet bereikt. Verhoog `MAX_TOKENS` in `server.js`.

**Mijn gesprekken zijn weg**
Ze staan in de `localStorage` van je browser. Een andere browser, een ander
apparaat of een incognitovenster laat dus andere gesprekken zien. Wil je ze
overal beschikbaar? Dan is een database nodig; dat is een logische volgende
stap.
