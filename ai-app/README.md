# Mijn AI — eigen chat-app

Een eigen AI-chatapp in de stijl van Claude: streamende antwoorden, meerdere
gesprekken, markdown-weergave, een modelkiezer, licht/donker thema en een
instelbare persoonlijkheid. Draait standaard op **Claude Fable 5.1**, het
krachtigste model, met denkkracht op **max**.

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

## Let op de kosten

Fable 5.1 op denkkracht `max` is de duurste combinatie die er is: **$10 per
miljoen tokens erin, $50 per miljoen tokens eruit**, en op `max` denkt het
model lang door — dat denken wordt als uitvoer geteld. Eén stevige vraag kan
daardoor tientallen centen kosten.

De app laat daarom onder elk antwoord een schatting zien, plus een totaal voor
het hele gesprek. Voor dagelijks werk is het de moeite waard om via de
modelkiezer naar Opus 5 of Sonnet 5 te gaan, of de denkkracht op `hoog` te
zetten. Je kunt de schatting uitzetten bij Instellingen.

| Model | Per miljoen tokens | Waarvoor |
|---|---|---|
| Fable 5.1 | $10 in / $50 uit | De moeilijkste vragen |
| Opus 5 | $5 in / $25 uit | Sterk voor code, half zo duur |
| Sonnet 5 | $2 in / $10 uit | Dagelijks werk |
| Haiku 4.5 | $1 in / $5 uit | Korte vragen, maximale snelheid |

De prijzen staan in `MODELS` in `server.js`. Controleer de actuele tarieven op
[anthropic.com/pricing](https://www.anthropic.com/pricing) voordat je er iets
op baseert.

---

## Wat kan de app?

| Functie | Toelichting |
|---|---|
| Streamende antwoorden | De tekst verschijnt woord voor woord, net als bij Claude. |
| Modelkiezer | Wissel bovenin tussen Fable 5.1, Opus 5, Sonnet 5 en Haiku 4.5, met prijs erbij. |
| Denkkracht | Van `laag` (snel en goedkoop) tot `max` (voor echt moeilijke vragen). |
| Kostenraming | Per antwoord en per gesprek, op basis van het werkelijke tokengebruik. |
| Meerdere gesprekken | Gegroepeerd op datum, met zoekfunctie en hernoembare titels. |
| Blijft bewaard | Gesprekken staan in de `localStorage` van je browser. |
| Stopknop | Breekt het antwoord af én stopt het API-verzoek, zodat je niet doorbetaalt. |
| Opnieuw | Genereert een nieuw antwoord op dezelfde vraag. |
| Downloaden | Exporteert een gesprek als markdown-bestand. |
| Markdown | Koppen, lijsten, tabellen, links en codeblokken met een kopieerknop. |
| Denkproces | Optioneel zie je een samenvatting van hoe het model tot zijn antwoord komt. |
| Eigen systeemprompt | Bepaal zelf de persoonlijkheid en regels van je assistent. |
| Licht/donker thema | Met één klik om te schakelen. |

---

## Hoe het werkt

```
Browser  ──POST /api/chat──▶  server.js  ──messages.stream()──▶  Claude API
   ▲                                                                 │
   └──────────── Server-Sent Events (stukje tekst per keer) ─────────┘
```

1. De browser stuurt de volledige gespreksgeschiedenis naar `/api/chat`.
2. De server voegt het systeemprompt toe en roept de Claude API aan.
3. Elk stukje tekst wordt meteen als Server-Sent Event doorgestuurd naar de
   browser, die het direct rendert.

### Drie dingen die Fable 5.1 anders doet

Deze zijn makkelijk over het hoofd te zien, maar leiden tot fouten als je ze
mist:

**1. Denken staat altijd aan.** Je kunt het niet uitzetten: een verzoek met
`thinking: {type: "disabled"}` of met een `budget_tokens` wordt geweigerd met
een 400. Hoe diep het model nadenkt regel je met `output_config.effort`.

**2. Thinking-blokken moeten onveranderd terug.** Bij een vervolgvraag stuurt
de app niet alleen de tekst van eerdere antwoorden terug, maar de complete
content-blokken inclusief hun `signature`. Die aanpassen of weglaten breekt de
beurt. De app bewaart die blokken daarom in `localStorage` en stuurt ze
letterlijk terug — behalve wanneer je van model wisselt, want thinking-blokken
van het ene model zijn niet altijd leesbaar voor het andere. Dan gaat alleen de
tekst mee.

**3. Een verzoek kan geweigerd worden.** De veiligheidsclassificaties van Fable
5.1 kunnen een verzoek afwijzen. Dat komt terug als een geslaagd HTTP
200-antwoord met `stop_reason: "refusal"` — dus niet als een foutmelding. De
server controleert dat altijd vóórdat hij de inhoud uitleest.

Daarom staat **server-side fallback** aan (`fallbacks: "default"`): weigert
Fable 5.1 een verzoek, dan beantwoordt de API het in dezelfde aanroep alsnog
met een ander model, en de app meldt dat in het gesprek. Wil je dat niet, haal
dan `FALLBACK_MODELS` leeg in `server.js`.

### Overige keuzes

- **Het systeemprompt wordt gecached** (`cache_control: ephemeral`). Het staat
  vooraan in elk verzoek en verandert zelden, dus hergebruik scheelt geld.
  Onder een antwoord zie je hoeveel tokens uit de cache kwamen.
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

**Ander standaardmodel of andere denkkracht?** `MODELS` (het eerste item is de
standaard) en `DEFAULT_EFFORT`, allebei bovenin `server.js`. De frontend haalt
die lijst op via `/api/config`, dus je hoeft verder niets te wijzigen.

**Langere antwoorden?** Verhoog `MAX_TOKENS` in `server.js`. Fable 5.1 kan tot
128.000 tokens uitvoer aan.

**Andere kleuren?** Bovenin `public/styles.css` staan alle kleuren als
variabelen, gescheiden voor het lichte en het donkere thema.

---

## Online zetten

De app is een gewone Node-server en draait op elke hoster die Node
ondersteunt, bijvoorbeeld Render, Railway of Fly.io. Let op drie dingen:

1. Zet `ANTHROPIC_API_KEY` als **environment variable** bij de hoster — commit
   je `.env` nooit (die staat daarom in `.gitignore`).
2. De hoster geeft zelf een poort door via `PORT`; dat regelt de server al.
3. **Iedereen die de URL kent, gebruikt jouw API-tegoed.** Met Fable 5.1 op
   `max` kan dat hard gaan. Zet er een wachtwoord of login voor als de app
   publiek bereikbaar is. De ingebouwde rate limit (20 verzoeken per minuut per
   IP) is een rem, geen slot.

---

## Problemen oplossen

**"Er is geen API-sleutel ingesteld op de server"**
Er is geen `.env` met `ANTHROPIC_API_KEY`, of de server is na het aanmaken niet
opnieuw gestart.

**"De API-sleutel is ongeldig of ontbreekt"**
De sleutel klopt niet. Maak een nieuwe aan in de console en plak hem opnieuw —
let op spaties of een ontbrekend stuk.

**"Dit model is niet beschikbaar voor jouw account"**
Je account heeft geen toegang tot Fable 5.1. Kies een ander model via de
modelkiezer bovenin. Fable 5.1 vereist bovendien dat je organisatie 30 dagen
dataretentie heeft staan; onder zero data retention is het niet beschikbaar.

**"Dit verzoek is geweigerd door de veiligheidscontrole"**
De classificaties van Fable 5.1 hebben de vraag afgewezen — dat gebeurt vooral
rond biologie- en cybersecurity-onderwerpen, soms ook bij onschuldige vragen
daaromheen. Formuleer de vraag anders, of kies een ander model.

**Het antwoord stopt halverwege**
Dan is de tokenlimiet bereikt. Verhoog `MAX_TOKENS` in `server.js`.

**Mijn gesprekken zijn weg**
Ze staan in de `localStorage` van je browser. Een andere browser, een ander
apparaat of een incognitovenster laat dus andere gesprekken zien. Wil je ze
overal beschikbaar? Dan is een database nodig; dat is een logische volgende
stap.
