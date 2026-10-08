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
| Werkt op elk scherm | Op de telefoon schuift de zijbalk in, en openen modelkiezer en vensters als paneel van onderaf. Op desktop klapt de zijbalk in tot een smalle strook. |
| Abonnementen | Standaard, Medium en Pro via Stripe, met gebruiksmeter en upgraden in de app. Zie hieronder. |

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

Wil je dat anderen voor de app betalen, dan zet je er abonnementen op. Er zijn
drie abonnementen:

| Abonnement | Prijs per maand | Modellen | Denkkracht tot | Gebruik |
|---|---|---|---|---|
| Standaard | € 8 | Sonnet 5, Haiku 4.5 | Hoog | 1x |
| Medium | € 15 | + Opus 5 | Extra | ca. 2x |
| Pro | € 22 | + Fable 5.1 | Max | ca. 3x |

Prijzen zijn inclusief btw. Staat Stripe niet ingesteld, dan is de app gewoon
vrij toegankelijk, met alle modellen. Zo gebruik je hem zelf zonder een
abonnement op je eigen app te nemen.

### Instellen

1. Maak een account op [stripe.com](https://stripe.com).
2. Haal je geheime sleutel op bij
   [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
3. Zet hem in `.env` (of bij je hoster onder de omgevingsvariabelen):

```
STRIPE_SECRET_KEY=sk_test_...
BASE_URL=http://localhost:3000
```

Meer is niet nodig. **De drie prijzen hoef je niet zelf in Stripe aan te
maken**: de server doet dat de eerste keer dat iemand een abonnement kiest.
Je ziet ze daarna in Stripe onder *Productcatalogus* als "Mijn AI Standaard",
"Mijn AI Medium" en "Mijn AI Pro". Heb je liever eigen prijzen, zet dan
`STRIPE_PRICE_STANDAARD`, `STRIPE_PRICE_MEDIUM` en `STRIPE_PRICE_PRO`.

4. Zet in Stripe éénmalig de klantportal aan: *Instellingen → Billing →
   Customer portal → Opslaan*. Daar gaan abonnees heen om op te zeggen, hun
   kaart te wijzigen of facturen te downloaden.

Begin met de **testsleutel** (`sk_test_`). Alles werkt dan hetzelfde, maar er
wordt geen echt geld overgemaakt. Testen doe je met kaart
`4242 4242 4242 4242`, een datum in de toekomst en willekeurige cijfers.

### Wat een abonnee ziet

- Zonder abonnement opent het scherm met de drie abonnementen. Chatten kan
  pas na het afrekenen.
- In de modelkiezer staan modellen die niet in het abonnement zitten met een
  label ("Medium", "Pro"). Erop klikken opent het upgradescherm.
- Bij Instellingen staat het abonnement, een **gebruiksmeter** (percentage van
  deze periode) en de datum waarop het gebruik weer wordt aangevuld. Vanaf 80%
  verschijnt er een waarschuwing boven het invoerveld, zoals bij Claude.
- **Upgraden of downgraden** gaat direct in de app. Het verschil voor de rest
  van de maand wordt meteen verrekend: bij een upgrade betaalt de klant
  bij, bij een downgrade krijgt hij tegoed. Lukt de bijbetaling niet, dan
  blijft het oude abonnement staan.

### Hoe het werkt

- **Alles wordt op de server gecontroleerd**, bij elk verzoek: loopt het
  abonnement, zit het gekozen model erin, en is de limiet nog niet bereikt?
  Te hoge denkkracht wordt verlaagd tot wat het abonnement toestaat.
- **Gebruikslimiet.** Elk abonnement heeft een maandbudget aan API-kosten
  (`budget` in `lib/plannen.js`: $3, $6 en $9). Zo kan één abonnee die de hele
  maand Fable 5.1 op Max gebruikt nooit meer kosten dan hij betaalt. Het
  budget zelf ziet de abonnee niet, alleen het percentage. Wie halverwege op
  stop drukt, betaalt een schatting van wat er al gegenereerd was.
- **Geen database nodig.** Na het afrekenen krijgt de bezoeker een cookie met
  een ondertekende toegangscode: zijn Stripe-klantnummer plus een handtekening
  die alleen de server kan maken. Het verbruik staat in de metadata van de
  klant bij Stripe. Daardoor werkt het ook op Netlify, en raakt niemand iets
  kwijt als de server herstart.
- Dezelfde code staat bij Instellingen als **toegangscode**, zodat iemand op
  een tweede apparaat kan inloggen. Behandel hem als een wachtwoord.
- Zegt iemand op, dan houdt hij toegang tot het einde van de betaalde periode.

### Prijzen of limieten aanpassen

Alles staat in `lib/plannen.js`: naam, bedrag, modellen, maximale
denkkracht, budget en de tekst op de kaartjes. Verander je een bedrag, verhoog
dan ook `PRIJS_VERSIE`. Een Stripe-prijs is niet te wijzigen, dus de server
maakt dan een nieuwe aan; lopende abonnementen houden hun oude prijs.

> Ververs je ooit je Stripe-sleutel, dan vervallen alle toegangscodes (ze zijn
> ermee ondertekend). Abonnees moeten dan opnieuw inloggen. Wil je dat
> voorkomen, zet dan vooraf een eigen `APP_SECRET`.

### Voordat je echt geld ontvangt

Stripe vraagt om je KvK-nummer, bankrekening en een identiteitsbewijs. Dat is
wettelijk verplicht. Daarna zet je de live sleutel (`sk_live_...`) in de
omgevingsvariabelen van je hoster, en `BASE_URL` op het echte adres van de
app. Op Netlify mag `BASE_URL` leeg blijven: dan wordt het adres van de site
gebruikt.

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
