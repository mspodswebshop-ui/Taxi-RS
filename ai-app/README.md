# Mijn AI — eigen chat-app

Een eigen AI-chatapp in de stijl van Claude: streamende antwoorden, meerdere
gesprekken, markdown-weergave, een modelkiezer, licht/donker thema en een
instelbare persoonlijkheid. Draait standaard op **Claude Fable 5.1**, het
krachtigste model, met denkkracht op **max**.

De app bestaat uit deze delen:

- **`lib/chat-core.js`** — de kern: welke modellen er zijn, controle van wat
  binnenkomt, en de aanroep naar de Claude API. Hier stel je dingen in.
- **`server.js`** — een kleine Express-server voor lokaal gebruik. Hier staat
  je API-sleutel. Die komt nooit in de browser terecht.
- **`netlify/functions/`** — dezelfde backend, maar als serverless functie,
  zodat de app ook op Netlify kan draaien. Gebruikt dezelfde kern.
- **`public/`** — de chatinterface. Gewoon HTML, CSS en JavaScript, zonder
  buildstap of framework.

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

De prijzen staan in `MODELS` in `lib/chat-core.js`. Controleer de actuele tarieven op
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
dan `FALLBACK_MODELS` leeg in `lib/chat-core.js`.

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

**Ander standaardgedrag?** Pas `DEFAULT_SYSTEM_PROMPT` in `lib/chat-core.js` aan
(of, alleen voor jezelf, via Instellingen in de app).

**Ander standaardmodel of andere denkkracht?** `MODELS` (het eerste item is de
standaard) en `DEFAULT_EFFORT`, allebei in `lib/chat-core.js`. De frontend haalt
die lijst op via `/api/config`, dus je hoeft verder niets te wijzigen.

**Langere antwoorden?** Verhoog `MAX_TOKENS` in `lib/chat-core.js`. Fable 5.1 kan tot
128.000 tokens uitvoer aan.

**Andere kleuren?** Bovenin `public/styles.css` staan alle kleuren als
variabelen, gescheiden voor het lichte en het donkere thema.

---

## Abonnementen (optioneel)

Wil je dat anderen voor de app betalen, dan kun je er abonnementen op zetten.
Staat Stripe niet ingesteld, dan is de app gewoon vrij toegankelijk — je hoeft
dus geen abonnement op je eigen app te nemen.

**Dit werkt alleen in de serverversie.** Het losse HTML-bestand kan niet
controleren of iemand betaald heeft: die controle staat op de server, want in
de browser zou een bezoeker hem gewoon kunnen uitzetten.

### Instellen

1. Maak een account op [stripe.com](https://stripe.com).
2. Maak onder **Producten** een product met een terugkerende prijs,
   bijvoorbeeld € 9 per maand. Kopieer het prijs-id (begint met `price_`).
3. Haal je geheime sleutel op bij
   [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
4. Zet beide in `.env`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_PROEFDAGEN=0
BASE_URL=http://localhost:3000
```

Begin met de **testsleutel** (`sk_test_`). Alles werkt dan hetzelfde, maar er
wordt geen echt geld overgemaakt. Testen doe je met kaart
`4242 4242 4242 4242`, een datum in de toekomst en willekeurige cijfers.

### Hoe het werkt

- Wie niet betaald heeft, krijgt een betaalscherm en kan niet chatten. Het
  invoerveld staat uit en de server weigert het verzoek ook los daarvan.
- Na het afrekenen krijgt de bezoeker een cookie met een niet te raden code.
  Bij elk verzoek zoekt de server die op en vraagt hij (hooguit eens per
  minuut) aan Stripe of het abonnement nog loopt.
- **Toegang wordt nooit in de browser bepaald.** De controle gebeurt op de
  server, bij elk verzoek aan de assistent.
- Dezelfde code staat bij Instellingen als **toegangscode**, zodat iemand op
  een tweede apparaat naar binnen kan zonder dat jij e-mail hoeft te versturen.
  Behandel hem als een wachtwoord.
- Opzeggen, facturen en betaalgegevens wijzigen doet Stripe zelf, via de knop
  **Abonnement beheren**.
- Zegt iemand op, dan houdt hij toegang tot het einde van de betaalde periode.
  Dat is wat hij betaald heeft. Een stopgezet abonnement vervalt binnen een
  minuut (aan te passen met `ABO_CACHE_MS`).

### Voordat je echt geld ontvangt

Stripe vraagt om je ondernemingsnummer (KBO), bankrekening en een
identiteitsbewijs. Dat is wettelijk verplicht. Daarna zet je de live sleutel
(`sk_live_...`) in de omgevingsvariabelen van je hoster, en `BASE_URL` op het
echte adres van de app — anders komt de klant na het betalen op een
foutpagina terecht.

Abonnees staan in `abonnees.json` naast de app. Draait dit bij een hoster, dan
kan zo'n bestand bij een herstart verdwijnen; je abonnees raken dan hun
toegangscode kwijt (hun abonnement bij Stripe blijft gewoon lopen). Wil je dat
uitsluiten, dan is een database de volgende stap.

---

## Online zetten

Wil je een echte link in plaats van `localhost`, dan zijn er twee routes. Het
verschil zit hem in hoe lang een antwoord mag duren.

> **Belangrijk:** je kunt de map niet zomaar naar een statische hoster slepen.
> `server.js` moet ergens draaien, anders laadt de pagina wel maar komt er geen
> antwoord. En iedereen die de link kent, gebruikt jouw API-tegoed — zet er dus
> een wachtwoord voor als de site publiek staat.

### Render — aanbevolen bij Fable 5.1

Render draait `server.js` als een doorlopende server, dus een antwoord mag zo
lang duren als het nodig heeft. Dat is precies wat je wilt bij Fable 5.1 op
hoge denkkracht.

1. Zet deze repository op GitHub (dat is al gebeurd).
2. Maak een account op [render.com](https://render.com).
3. Kies **New → Blueprint** en wijs deze repository aan. Render leest
   `render.yaml` en weet dan zelf wat het moet doen.
4. Vul `ANTHROPIC_API_KEY` in als environment variable.

### Netlify — werkt, met één beperking

Netlify serveert statische bestanden en draait de backend als *serverless
functie* (`ai-app/netlify/functions/`). Dat werkt, maar Netlify kapt zo'n
functie na ongeveer 10 seconden af (op betaalde plannen wat langer). **Fable
5.1 op `max` denkt vaak langer dan dat**, dus die antwoorden kunnen afbreken.
Kies in de app dan Sonnet 5 of Haiku 4.5, of zet de denkkracht op `laag`.

1. Maak een account op [netlify.com](https://netlify.com).
2. Kies **Add new site → Import an existing project** en koppel deze
   GitHub-repository. Doe dit niet met slepen-en-neerzetten: bij het koppelen
   installeert Netlify de benodigde pakketten, bij slepen niet.
3. De instellingen komen uit `netlify.toml` en staan al goed.
4. Zet `ANTHROPIC_API_KEY` bij **Site configuration → Environment variables**
   en publiceer de site opnieuw.

**Krijg je "Page not found"?** Dan wijst Netlify naar de verkeerde map. Het
bestand `netlify.toml` regelt dat (`publish = "public"` binnen
`base = "ai-app"`). Controleer of dat bestand in de hoofdmap van de repository
staat en of de site aan de repository gekoppeld is, niet handmatig geüpload.

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
