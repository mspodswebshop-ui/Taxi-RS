# Betaalterminal — Taxi R.S.

Je eigen betaalscherm op je telefoon. Je toetst het ritbedrag in, de klant
scant een QR-code en betaalt met Bancontact of kaart. Geen apparaat nodig.

---

## Eerst dit: wat kan wel en wat niet

**Een echte kaartterminal bouwen kan niet.** Kaartbetalingen accepteren vereist
PCI-DSS-certificering, EMV-goedkeuring en een bank die je als acceptant
aanneemt. Dat is geregelde materie.

**Zelf een betaalbedrijf zoals Stripe worden kan ook niet.** Om geld van
anderen te ontvangen en door te betalen heb je een vergunning als
betaalinstelling nodig bij de Nationale Bank, met toezicht op witwassen en het
gescheiden houden van klantengeld.

**Dit is wat wel kan, en wat deze app doet.** Jij bouwt het betaalscherm —
jouw merk, jouw terminal, jouw ritadministratie. Stripe doet het geldverkeer.
De kaartgegevens van je klant komen nooit langs jouw app: die vult hij in op de
betaalpagina van Stripe zelf. Daardoor gelden de zware PCI-verplichtingen niet
voor jou.

---

## Aan de slag

Je hebt [Node.js 20 of nieuwer](https://nodejs.org) nodig.

### 1. Stripe-account aanmaken

Ga naar [stripe.com](https://stripe.com) en maak een account. Voor **testen**
hoeft je bedrijf nog niet goedgekeurd te zijn — dat kun je meteen doen.

Haal je **testsleutel** op bij
[dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys). Die
begint met `sk_test_`.

### 2. Installeren

```bash
cd betaal-app
npm install
cp .env.example .env
```

Open `.env` en zet je testsleutel erin:

```
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Starten

```bash
npm start
```

Open **http://localhost:4000** op je telefoon of computer.

Bovenaan staat dan **TESTMODUS**. Toets een bedrag in, klik Aanrekenen, scan de
QR met je telefoon en betaal met testkaart **4242 4242 4242 4242**, een
vervaldatum in de toekomst en willekeurige cijfers als code. Er wordt geen
echt geld overgemaakt.

---

## Hoe het werkt

```
Jij (telefoon)          Deze app              Stripe            Klant
     │                     │                     │                │
  bedrag ──────────────────▶                     │                │
                           │── betaling ────────▶│                │
                           │◀─ betaallink ───────│                │
     │◀── QR-code ─────────│                     │                │
     │                     │                     │◀── scant QR ───│
     │                     │                     │◀── betaalt ────│
     │                     │── klaar? ──────────▶│                │
     │◀── Betaald ─────────│                     │                │
```

Een paar keuzes die het waard zijn om te weten:

- **"Betaald" komt altijd van Stripe.** De terminal verzint dat nooit zelf,
  ook niet als de klant zegt dat het gelukt is. Zolang Stripe niet bevestigt,
  blijft het scherm op "wachten" staan.
- **Bedragen worden in centen bijgehouden**, nooit als kommagetal. Rekenen met
  kommagetallen levert in JavaScript afrondingsfouten op, en dat wil je niet in
  een bedrag dat iemand moet betalen.
- **Een betaallink vervalt na 30 minuten.** De klant staat naast je auto; een
  link die dagen open blijft staan heeft geen zin.
- **Een betaling komt maar één keer in je overzicht**, ook al vraagt de
  terminal de stand tientallen keren op en meldt Stripe hem daarnaast ook.
- **Bedragen onder € 1,00 en boven € 1.000,00 worden geweigerd**, zodat een
  typfout geen ramp wordt. Aan te passen bovenin `server.js`.

---

## Echt geld ontvangen

Voordat dit met echt geld werkt:

1. **Rond je Stripe-profiel af.** Stripe vraagt om je ondernemingsnummer (KBO),
   je bankrekeningnummer en een identiteitsbewijs. Dat is wettelijk verplicht,
   daar komt niemand omheen.
2. **Zet je live sleutel in `.env`** (`sk_live_...`). De app zegt dan bij het
   starten "LET OP: live modus" en de melding in het scherm verdwijnt.
3. **Zet de app online** met een echt adres, en vul dat in als `BASE_URL`. De
   klant wordt na het betalen daarheen teruggestuurd, dus `localhost` werkt
   niet meer.

Kosten bij Stripe: ongeveer 1,5% + € 0,25 per Bancontact-transactie, en
1,5% + € 0,25 voor Europese kaarten. Controleer de actuele tarieven op
[stripe.com/be/pricing](https://stripe.com/be/pricing).

### Online zetten

Zelfde aanpak als de AI-app: Render leest `render.yaml` en draait `server.js`.
Vergeet niet `STRIPE_SECRET_KEY` en `BASE_URL` als environment variables in te
stellen, en zet je sleutel nooit in een bestand dat je uploadt.

### Melding van Stripe (optioneel maar aanbevolen)

Staat je telefoon net uit als de klant betaalt, dan mist de terminal het
moment. Stripe kan het daarom zelf melden:

1. Ga naar **Developers → Webhooks** in het Stripe-dashboard.
2. Voeg het adres `JOUW-ADRES/api/webhook` toe.
3. Kies de gebeurtenis `checkout.session.completed`.
4. Zet het geheim dat je krijgt in `.env` als `STRIPE_WEBHOOK_SECRET`.

De app controleert de handtekening van elke melding en weigert alles wat niet
aantoonbaar van Stripe komt.

---

## De ritadministratie

Betaalde ritten komen in `betalingen.json` te staan, naast de app. Onder
"Vandaag" zie je het dagtotaal.

Dat bestand staat in `.gitignore`, want het bevat je omzet. Voor de boekhouding
is het Stripe-dashboard leidend: daar staat alles, inclusief kosten en
uitbetalingen.

Draai je dit op een hoster, weet dan dat zo'n bestand bij een herstart
verdwijnen kan. Wil je een betrouwbare eigen administratie, dan is een database
de volgende stap — maar je omzet staat sowieso veilig bij Stripe.

---

## Problemen oplossen

**"Er is geen Stripe-sleutel ingesteld"**
Geen `.env` met `STRIPE_SECRET_KEY`, of de app is na het aanmaken niet
opnieuw gestart.

**"De Stripe-sleutel klopt niet"**
Controleer of je de hele sleutel hebt geplakt. Let op: de *geheime* sleutel
(`sk_...`), niet de publiceerbare (`pk_...`).

**"Stripe wees het verzoek af: ... bancontact ..."**
Bancontact staat nog niet aan voor je account. Zet het aan bij
**Settings → Payment methods** in het dashboard.

**De klant komt na betalen op een foutpagina**
`BASE_URL` in `.env` klopt niet. Die moet het adres zijn waarop de app echt
bereikbaar is, niet `localhost`.

**Het scherm blijft op "wachten" staan**
Dan heeft Stripe de betaling nog niet bevestigd. Dat is goed gedrag: zolang er
niet betaald is, zegt de terminal ook niet dat er betaald is.
