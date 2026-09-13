# Paylity

**Payments made simple.**

Een betaalplatform voor webshops: betaallinks, checkout, dashboard, REST API,
webhooks en een AI-assistent.

---

## Lees dit eerst

**Paylity v1 verwerkt geen echt geld.** Onder de motorkap draait een
*gesimuleerde* betaalprovider. Je kunt de volledige flow doorlopen — betaallink
maken, afrekenen, een geslaagde en een mislukte betaling, terugbetalen — maar er
wordt niets afgeschreven en niets overgemaakt.

**Er wordt nergens om gevoelige betaalgegevens gevraagd.** Geen kaartnummer,
geen CVC/CVV, geen pincode, geen IBAN, geen bankwachtwoord. Die velden bestaan
niet in de checkout en niet in het databaseschema. Wat je niet vraagt, kan ook
niet lekken.

Om echt geld te ontvangen heb je een **erkende betaalprovider** nodig. Dat is
geen softwarekwestie maar een vergunningskwestie: geld van anderen ontvangen en
doorbetalen vereist een vergunning als betalingsinstelling. Paylity is erop
voorbereid dat je zo'n provider koppelt — zie [Een echte provider
koppelen](#een-echte-provider-koppelen).

---

## Snel starten

### De makkelijke manier

Dubbelklik **`start.command`** in deze map (op een Mac; elders: `bash
start.command`).

Dat script doet alles: het controleert Node.js, maakt `.env` aan, zoekt of
start een database, installeert de pakketten, maakt de tabellen aan, vraagt om
je e-mailadres en wachtwoord, vult het dashboard met testgegevens en opent de
app in je browser. Ontbreekt er iets, dan stopt het met een uitleg van wat je
moet installeren — geen foutmelding waar je niets mee kunt.

Je hebt nodig: **Node.js 20+** ([nodejs.org](https://nodejs.org)) en een
**PostgreSQL**-database. Op een Mac is [Postgres.app](https://postgresapp.com)
het eenvoudigst: downloaden, naar Programma's slepen, openen, "Initialize"
klikken. Het script vindt hem daarna vanzelf.

### Met de hand

```bash
cd paylity
npm install
cp .env.example .env
```

Vul in `.env` minstens `DATABASE_URL` in. Daarna:

```bash
npm run db:migrate     # tabellen aanmaken
npm run db:seed        # testgegevens (optioneel, maar aanbevolen)
npm run dev            # → http://localhost:3000
```

De seed toont aan het eind een inlognaam, wachtwoord en API-sleutel. **Noteer de
API-sleutel**: die staat alleen gehasht in de database en is daarna niet meer op
te vragen.

### Je eigen account

Je kunt een account aanmaken via `/signup`, maar het kan ook vanaf de
opdrachtregel. Dat is handig als je je wachtwoord kwijt bent of als het
formulier je om wat voor reden dan ook niet verder helpt:

```bash
npm run account -- --email jij@voorbeeld.be --wachtwoord "minstens10tekens" --demo
```

| Optie | Wat het doet |
|---|---|
| `--email` | verplicht |
| `--wachtwoord` | verplicht, minstens 10 tekens |
| `--naam` | je eigen naam (standaard: het deel voor de `@`) |
| `--bedrijf` | je bedrijfsnaam |
| `--demo` | vult het dashboard met 90 dagen testgegevens |
| `--leegmaken` | wist eerst de bestaande testgegevens van dit bedrijf |

Bestaat het account al, dan wordt het **wachtwoord bijgewerkt** en blijft de
rest staan — zo kom je er altijd weer in. Bestaande sessies worden dan
ongeldig. Het wachtwoord gaat gehasht (bcrypt) de database in en wordt nergens
getoond of gelogd. Wil je het niet in je shell-geschiedenis, zet het dan in
`PAYLITY_WACHTWOORD` en laat `--wachtwoord` weg.

### Kom je er niet in?

Open eerst **`/api/health`** in je browser. Die pagina zegt in gewone taal of
de database werkt en wat je eraan doet. Staat daar `"ok": true`, dan ligt het
niet aan de opzet.

Op de inlog- en registratiepagina verschijnt bovendien vanzelf een gele
waarschuwing zodra de database niet bereikbaar is — dan hoef je het formulier
niet eens in te vullen.

**"De tekenreeks kwam niet overeen met het verwachte patroon."** Die melding
komt van Safari en betekent: de server stuurde iets terug wat geen JSON is.
Bijna altijd is dat een lege foutpagina omdat de **database niet bereikbaar**
is — vaak omdat de app online staat zonder dat `DATABASE_URL` daar is
ingesteld. Paylity vangt dat nu zelf af en zegt wat er mis is; zie
`/api/health`.

**Je registreert of logt in, en belandt meteen weer op de inlogpagina.** Dan
heeft je browser de sessiecookie weggegooid. Dat gebeurde in eerdere versies
omdat de cookie `Secure` kreeg zodra `NODE_ENV=production` stond, ook als de
app gewoon over `http://` draaide; Safari gooit zo'n cookie dan weg. Paylity
kijkt nu per verzoek of de verbinding écht https is (`x-forwarded-proto`, of
anders `NEXT_PUBLIC_APP_URL`). Draai je een oudere versie, werk dan bij.

**"Er bestaat al een account met dit e-mailadres."** Het account staat er al.
Log in, of zet met `npm run account` een nieuw wachtwoord.

**"Te veel pogingen. Wacht even."** Je hebt het meer dan 20 keer in een minuut
geprobeerd. Een minuut wachten is genoeg.

**"Gebruik minstens 10 tekens."** Het wachtwoord is te kort. Er zijn verder
geen eisen: geen hoofdletters, cijfers of tekens verplicht.

### Online zetten

**De zip naar Netlify slepen werkt niet.** Dat sleepvak neemt kant-en-klare
bestanden aan en zet ze online. Paylity is geen map met bestanden maar een
draaiende server: inloggen, betalingen en de API gebeuren op het moment zelf.
Sleep je de zip erin, dan laden de pagina's misschien wel, maar faalt alles
wat de server nodig heeft.

Wat je nodig hebt is **een host die Next.js écht draait** en je code uit een
**Git-repository** haalt in plaats van uit een bestandsupload. Netlify kan dat
met de Next.js-plug-in; die staat al ingesteld in `netlify.toml`. Vercel,
Render en Railway kunnen het ook.

Een database hoef je niet zelf te regelen: omdat `@netlify/database` in
`package.json` staat, zet Netlify er bij het uitrollen zelf een klaar.

#### Stap voor stap op Netlify

1. **Site koppelen.** *Add new site → Import an existing project*, kies je
   Git-repository. Dus niet het sleepvak.
2. **Base directory:** `paylity`. Netlify leest dan de `netlify.toml` uit die
   map, en die regelt de rest.
3. **Uitrollen.** Netlify zet een PostgreSQL klaar, voert
   `netlify/database/migrations/` uit en bouwt de app.
4. **Controleren.** Open `https://jouwadres/api/health`. Staat daar
   `"ok": true`, dan werkt alles.
5. **Account.** Maak het aan op `https://jouwadres/signup`.

Twee variabelen zijn het instellen waard onder *Site configuration →
Environment variables*, al werkt het ook zonder:

| Variabele | Waarde |
|---|---|
| `NEXT_PUBLIC_APP_URL` | het adres van je site, met `https://` |
| `WEBHOOK_SIGNING_SECRET` | een eigen geheim (zie `.env.example`) |

**Liever je eigen database?** Zet `DATABASE_URL` bij de omgevingsvariabelen —
die gaat vóór op die van Netlify. [Neon](https://neon.com) en
[Supabase](https://supabase.com) hebben een gratis laag. Je kunt er dan ook
vanaf je eigen computer bij:

```bash
DATABASE_URL="postgresql://…" npm run account -- \
  --email jij@voorbeeld.be --wachtwoord "minstens10tekens" --demo
```

Staat er nog een oudere `netlify.toml` in de hoofdmap van je repository voor
een ander project? Die blijft gewoon staan; door de base directory op `paylity`
te zetten leest Netlify de juiste.

Waar de verbindingsreeks vandaan komt, in volgorde: `DATABASE_URL`, dan
`NETLIFY_DB_URL` (zet Netlify zelf), dan `NETLIFY_DATABASE_URL`. Vindt hij
niets, dan start de app tóch op en zegt `/api/health` wat eraan ontbreekt.

### Database

**Lokaal met PostgreSQL:**

```bash
createdb paylity
# DATABASE_URL="postgresql://postgres:wachtwoord@localhost:5432/paylity?schema=public"
```

**Met Supabase:** maak een project aan, ga naar *Project Settings → Database →
Connection string*, kies **URI** en plak die in `DATABASE_URL`.

Nuttige commando's:

| Commando | Wat het doet |
|---|---|
| `npm run db:migrate` | Migratie aanmaken en uitvoeren (tijdens ontwikkelen) |
| `npm run db:deploy` | Bestaande migraties uitvoeren, zonder nieuwe te maken |
| `npm run db:push` | Schema doorduwen zonder migratiebestand (snel, voor experimenteren) |
| `npm run db:seed` | Testgegevens aanmaken |
| `npm run account` | Account aanmaken of wachtwoord opnieuw instellen |
| `npm run db:studio` | Database bekijken in de browser |

---

## Wat er in zit

### Pagina's

| Pad | Wat het is |
|---|---|
| `/` | Landingspagina |
| `/pricing` | Tarieven |
| `/login`, `/signup` | Inloggen en registreren |
| `/docs` | API-documentatie |
| `/dashboard` | Overzicht: omzet, geslaagd, mislukt, terugbetaald, grafiek |
| `/dashboard/payments` | Alle betalingen, met zoeken en statusfilter |
| `/dashboard/payment-links` | Betaallinks maken en bekijken |
| `/dashboard/customers` | Klanten met hun totalen |
| `/dashboard/invoices` | Facturen |
| `/dashboard/payouts` | Uitbetalingen (berekend; zie de melding op die pagina) |
| `/dashboard/analytics` | Slagingspercentage, gemiddeld bedrag, per methode |
| `/dashboard/settings` | Bedrijf, provider en API-sleutels |
| `/pay/[paymentLinkId]` | De checkout voor je klant |

Het dashboard werkt op telefoon en desktop, en heeft een donker en licht thema.
Op elke pagina waar met bedragen gewerkt wordt staat een **TEST MODE**-melding.

### Betaalstatussen

```
pending ──▶ paid ──▶ refunded
   │
   ├──▶ failed
   └──▶ cancelled
```

Een betaling gaat nooit terug naar een eerdere stand. Dat wordt afgedwongen in
`src/lib/payments.ts`, niet in de interface: een knop kan verdwijnen, een regel
niet.

---

## De API

Alle endpoints zitten onder `/api/v1`. Elke aanroep heeft een testsleutel nodig:

```
Authorization: Bearer sk_test_...
```

**Bedragen zijn altijd in centen als geheel getal.** `2450` is € 24,50. Rekenen
met kommagetallen levert afrondingsfouten op, en die wil je niet in een bedrag
dat iemand moet betalen.

### Endpoints

| Methode | Pad | Wat het doet |
|---|---|---|
| `POST` | `/api/v1/payment-links` | Betaallink aanmaken |
| `GET` | `/api/v1/payment-links` | Betaallinks opvragen |
| `GET` | `/api/v1/payment-links/{id}` | Eén betaallink |
| `PATCH` | `/api/v1/payment-links/{id}` | Betaallink aanpassen |
| `GET` | `/api/v1/payments` | Betalingen (filter: `status`, `search`, `limit`, `offset`) |
| `GET` | `/api/v1/payments/{id}` | Eén betaling, met klant, order en terugbetalingen |
| `POST` | `/api/v1/customers` | Klant aanmaken |
| `GET` | `/api/v1/customers` | Klanten opvragen |
| `POST` | `/api/v1/invoices` | Factuur aanmaken |
| `GET` | `/api/v1/invoices` | Facturen opvragen |
| `POST` | `/api/v1/refunds` | Betaling terugbetalen (deels of volledig) |
| `POST` | `/api/v1/webhooks/payment` | Melding van de betaalprovider ontvangen |

### Voorbeeld

```bash
# Betaallink maken
curl -X POST http://localhost:3000/api/v1/payment-links \
  -H "Authorization: Bearer sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{"title":"Bestelling #1042","amount":2450,"currency":"EUR"}'

# Betalingen opvragen, alleen de mislukte
curl "http://localhost:3000/api/v1/payments?status=failed" \
  -H "Authorization: Bearer sk_test_..."

# Terugbetalen
curl -X POST http://localhost:3000/api/v1/refunds \
  -H "Authorization: Bearer sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"cmt...","reason":"Klant retourneerde"}'
```

### Foutformaat

```json
{
  "error": {
    "code": "validation_failed",
    "message": "De meegestuurde gegevens kloppen niet.",
    "details": [{ "veld": "amount", "melding": "Het bedrag moet groter zijn dan nul." }]
  }
}
```

`400` verzoek klopt niet · `401` ontbrekende of ongeldige sleutel ·
`404` onbekend of niet van jou · `405` methode werkt niet op dit pad ·
`409` bestaat al, of link staat uit · `422` validatie mislukt, of niets terug te
betalen · `429` te veel verzoeken · `500` fout aan onze kant.

Elk pad onder `/api` antwoordt altijd met JSON, ook bij een onbekend pad of een
verkeerde methode.

---

## Beveiliging

Wat er gedaan is, en waarom:

| Maatregel | Waarom |
|---|---|
| Wachtwoorden gehasht met bcrypt (12 ronden) | Het wachtwoord zelf staat nergens |
| Sessies als willekeurige sleutel, **gehasht** opgeslagen | Lekt de database, dan is er geen sessie over te nemen |
| Cookie `httpOnly`, `sameSite=lax`, `secure` zodra de verbinding https is | Niet leesbaar voor scripts, beperkt misbruik vanaf andere sites — en over http zou een `Secure`-cookie stilzwijgend weggegooid worden |
| API-sleutels gehasht opgeslagen, eenmalig zichtbaar | Zelfde reden; de sleutel is onze kant op onleesbaar |
| Elke query gefilterd op `businessId` | Een sleutel kan nooit bij gegevens van een ander bedrijf |
| Alle invoer door Zod | Wat niet door de validatie komt, komt het systeem niet in |
| Rate limiting per sleutel en per IP | Remt doorgeschoten scripts en brute kracht af |
| Webhooks met HMAC-handtekening + tijdstempel | Voorkomt vervalste en herhaalde meldingen |
| Bedrag komt uit de database, nooit uit het verzoek | Anders stuurt een klant zijn eigen prijs mee |
| Wachtwoordcontrole ook bij onbekend e-mailadres | Anders verraadt de reactietijd welke adressen bestaan |
| Geen enkel veld voor kaartgegevens | Wat je niet vraagt, kan niet lekken |

**Geheimen horen in environment variables**, nooit in code die de browser
bereikt. Het dashboard gebruikt daarom de sessie in plaats van een API-sleutel.

De rate limiting telt in het geheugen van één proces. Draai je op meerdere
servers, vervang `RateLimiter` in `src/lib/rate-limit.ts` dan door een variant
op Redis; de rest van de code merkt daar niets van.

---

## Testen

### Handmatig

1. `npm run db:seed` en log in met de getoonde gegevens.
2. Ga naar **Betaallinks** en maak er een aan.
3. Open de link (`/pay/pl_...`) in een nieuw tabblad.
4. Kies **Bancontact** of **Kaart**, kies **Betaling slaagt**, klik betalen.
5. Herhaal met **Betaling mislukt**.
6. Kijk in **Betalingen**: beide staan er, met de juiste status.
7. Vraag de assistent: *"Hoeveel heb ik vandaag ontvangen?"*

### Met de API

```bash
KEY="sk_test_..."

# Geslaagde testbetaling
SLUG=$(curl -s -X POST localhost:3000/api/v1/payment-links \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"title":"Test","amount":1250}' | jq -r .slug)

curl -s -X POST localhost:3000/api/checkout/start \
  -H 'Content-Type: application/json' \
  -d "{\"slug\":\"$SLUG\",\"method\":\"bancontact\",\"simulate\":\"success\"}"

# Mislukte testbetaling: vervang "success" door "failure"
```

### Controles

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # productiebuild
```

---

## De AI-assistent

Rechtsonder in het dashboard. Hij beantwoordt vragen als:

- "Hoeveel heb ik vandaag ontvangen?"
- "Toon mijn laatste betalingen."
- "Hoeveel betalingen zijn mislukt?"
- "Wat was mijn omzet deze maand?"

De opzet staat in `src/lib/assistant/index.ts` en bestaat uit twee lagen:

- **Tools** — functies die de cijfers uit de database halen. Ze werken altijd
  binnen één bedrijf en lezen alleen; ze kunnen niets wijzigen of betalen.
- **Brain** — de laag die een vraag omzet in een aanroep van die tools. Nu is dat
  eenvoudige trefwoordherkenning: geen externe dienst, geen kosten, geen
  gegevens die je huis verlaten.

**Een echte AI-API koppelen:** schrijf een tweede klasse die `Brain`
implementeert, stuur de vraag samen met `tools` naar het model en laat het model
kiezen welke tool nodig is. Alleen `getBrain()` hoeft dan te wijzigen — de tools
niet. Dat is precies waarom ze apart staan.

---

## Een echte provider koppelen

Alles wat met geld te maken heeft loopt via één interface: `PaymentProvider` in
`src/lib/providers/types.ts`. De rest van Paylity weet niet welke provider
eronder zit.

1. Schrijf `src/lib/providers/mijn-provider.ts` die `PaymentProvider`
   implementeert (`createPayment`, `getPayment`, `refundPayment`).
2. Zet hem in de lijst in `src/lib/providers/index.ts`.
3. Zet `PAYMENT_PROVIDER=mijn-provider` in `.env`.

De API, het dashboard en de checkout hoeven daarvoor **niet** te wijzigen.

Twee dingen om dan goed te doen:

- **De testkeuze op de checkout verdwijnt.** Bij een echte provider bepaalt de
  provider de uitkomst, niet de klant. Verwijder het `simulate`-blok uit
  `src/components/checkout-form.tsx` en uit `checkoutSchema`.
- **De uitkomst komt via de webhook binnen**, niet uit de browser van de klant.
  De route `/api/v1/webhooks/payment` staat daarvoor klaar en controleert al de
  handtekening. Vertrouw nooit op wat de browser terugmeldt over een betaling.

---

## Structuur

```
paylity/
├── start.command              alles opzetten en starten, in één klik
├── netlify.toml               instellingen om online te zetten
├── netlify/database/          migraties die Netlify zelf uitvoert
├── prisma/
│   ├── schema.prisma          9 modellen + refunds, met relaties en indexes
│   ├── seed.ts                testgegevens
│   └── account.ts             account aanmaken of wachtwoord opnieuw instellen
├── src/
│   ├── app/
│   │   ├── (public)/          landing, tarieven, inloggen, registreren, docs
│   │   ├── dashboard/         8 pagina's
│   │   ├── pay/[id]/          checkout
│   │   └── api/               REST API, auth, checkout, assistent
│   ├── components/            interface-onderdelen
│   └── lib/
│       ├── providers/         betaalprovider-interface + simulatie
│       ├── assistant/         tools + denklaag
│       ├── payments.ts        betaallogica en statusregels
│       ├── auth.ts            sessies en wachtwoorden
│       ├── api-auth.ts        API-sleutels
│       ├── validation.ts      alle Zod-schema's
│       ├── rate-limit.ts      rate limiting
│       ├── webhooks.ts        handtekeningen
│       ├── status.ts          controle op database en migratie
│       └── verstuur.ts        verzoeken vanuit de browser, zonder stuk te lopen
└── .env.example
```

---

## Techniek

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL ·
Zod · bcrypt
