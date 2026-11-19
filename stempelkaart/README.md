# Stempelkaart — Taxi R.S.

Een digitale stempelkaart die je klanten in **Apple Wallet** (iPhone) of
**Google Wallet** (Android) zetten. Bij elke rit scant de chauffeur de kaart,
en na 10 stempels is de volgende rit gratis.

## Hoe het werkt

**Voor de klant**
1. Scant de QR-code in de taxi (of krijgt de link) en vult zijn naam in.
2. Tikt op **Toevoegen aan Apple Wallet** of **Toevoegen aan Google Wallet**.
3. Laat bij elke rit de QR-code op de kaart scannen. De kaart in zijn Wallet
   werkt zichzelf bij, met een melding: "Stempel erbij! Je hebt er nu 4/10."

**Voor de chauffeur**
1. Logt één keer in op `/chauffeur` met de pincode.
2. Richt de **gewone camera** van zijn telefoon op de QR-code van de klant en
   tikt op de link.
3. Tikt op **+1 stempel**. Is de kaart vol, dan krijgt de klant een beloning
   tegoed, die de chauffeur bij een volgende rit inwisselt.

Geen aparte scan-app nodig. Scant een klant zijn eigen QR, dan ziet hij
alleen zijn kaart — stempels zetten kan alleen met de pincode.

Extra's:
- Twee keer stempelen binnen 2 minuten vraagt eerst om bevestiging.
- **Laatste stempel weghalen** voor als er per ongeluk getikt is.
- Zoeken op naam, kaartcode of telefoonnummer als scannen niet lukt.
- Klanten zonder Wallet kunnen de webpagina zelf als kaart gebruiken.

---

## 1. Lokaal proberen (zonder Apple of Google)

Je hebt [Node.js 22 of nieuwer](https://nodejs.org) nodig.

```bash
cd stempelkaart
npm install
cp .env.example .env
```

Zet in `.env` een `CHAUFFEUR_PIN` (bijv. `4821`) en start:

```bash
npm start
```

Open **http://localhost:4100**. Alles werkt al: kaarten aanmaken, stempels
zetten, beloningen inwisselen. Alleen de Wallet-knoppen verschijnen pas als
stap 3 en 4 gedaan zijn.

## 2. Online zetten

De Wallets werken alleen met een echt **https**-adres. Gebruik Render:
`render.yaml` in de hoofdmap bevat al een dienst `taxi-stempelkaart`.

**Belangrijk:** de kaarten staan in een bestand. Op Render zonder "Disk" is
dat bestand na elke herstart weg, en dan zijn alle stempels kwijt. Daarom
staat de dienst op het **Starter-plan met een Disk** (ongeveer $7 per maand
plus de schijf). Sla dit niet over.

Vul bij Render minstens `BASE_URL` (bijv. `https://taxi-stempelkaart.onrender.com`
of je eigen domein) en `CHAUFFEUR_PIN` in.

## 3. Apple Wallet instellen

Je hebt een **Apple Developer-account** nodig ($99 per jaar,
[developer.apple.com](https://developer.apple.com/programs/)). Een Mac is
handig maar niet verplicht.

1. Ga naar **Certificates, Identifiers & Profiles → Identifiers → +** en kies
   **Pass Type IDs**. Noem hem bijv. `pass.be.taxirs.stempelkaart`.
2. Kies die ID en maak een **certificaat** aan. Apple vraagt een CSR:
   ```bash
   mkdir certs && cd certs
   openssl req -new -newkey rsa:2048 -nodes -keyout signerKey.pem -out aanvraag.csr \
     -subj "/CN=Taxi RS Stempelkaart/C=BE"
   ```
   Upload `aanvraag.csr`, download `pass.cer` en zet hem om:
   ```bash
   openssl x509 -inform DER -in pass.cer -out signerCert.pem
   ```
3. Download het **Apple WWDR-certificaat G4** van
   [apple.com/certificateauthority](https://www.apple.com/certificateauthority/)
   en zet het om:
   ```bash
   openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
4. Je **Team ID** staat rechtsboven in het developer-portaal (10 tekens).
5. Vul in: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_WWDR_CERT`,
   `APPLE_SIGNER_CERT`, `APPLE_SIGNER_KEY` (en `APPLE_SIGNER_KEY_PASSPHRASE`
   als je sleutel een wachtwoord heeft).

Bij Render plak je de **inhoud** van de `.pem`-bestanden in de variabelen. Lukt
dat niet met meerdere regels, gebruik dan base64: `base64 -w0 signerCert.pem`.

Het certificaat verloopt na een jaar. Vernieuw het op tijd, anders kunnen
klanten geen nieuwe kaart toevoegen en werken bestaande kaarten zich niet
meer bij.

## 4. Google Wallet instellen

Gratis. Je hebt een Google-account nodig.

1. Ga naar de [Google Pay & Wallet Console](https://pay.google.com/business/console),
   maak een bedrijfsprofiel en open **Google Wallet API**. Noteer je
   **Issuer ID**.
2. Ga naar [console.cloud.google.com](https://console.cloud.google.com), maak
   een project, zet de **Google Wallet API** aan.
3. Maak onder **IAM → Service accounts** een serviceaccount en daarbij een
   **sleutel (JSON)**. Download het bestand.
4. Ga terug naar de Wallet Console → **Users** en nodig het e-mailadres van
   de serviceaccount uit (`...@...iam.gserviceaccount.com`) als
   **Developer**.
5. Vul in: `GOOGLE_ISSUER_ID` en `GOOGLE_SERVICE_ACCOUNT` (pad, inhoud of
   base64 van het JSON-bestand).

In het begin staat je account in **demo-modus**: alleen accounts die je in
de console als testgebruiker toevoegt, kunnen de kaart opslaan. Vraag in de
console **publieke toegang** aan zodra alles werkt; Google keurt dat meestal
binnen een paar dagen goed.

## 5. Laatste puntjes

- **Officiële knoppen.** Apple en Google willen dat je hun officiële
  "Add to Wallet"-badges gebruikt. Download ze (Nederlandse versie) via
  [Apple](https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/)
  en [Google](https://developers.google.com/wallet/generic/resources/brand-guidelines)
  en vervang de knoppen in `public/kaart.html`.
- **Aanmeld-QR in de taxi.** Op de chauffeurspagina staat een QR-code naar
  de aanmeldpagina. Print die en hang hem in de auto.
- **Privacy (GDPR).** Je bewaart naam en eventueel telefoonnummer. Vermeld
  de stempelkaart in je privacyverklaring. Wil een klant eruit, verwijder
  dan zijn kaart uit `kaarten.json`.

---

## Technisch

| Bestand | Wat |
| --- | --- |
| `server.js` | Alle routes, inclusief de Apple-webservice |
| `lib/apple.js` | Maakt en ondertekent de `.pkpass`, stuurt meldingen via APNs |
| `lib/google.js` | Google Wallet: klasse, kaart, opslaan-link, bijwerken |
| `lib/afbeeldingen.js` | Tekent het icoon, logo en de strook met stempels (PNG) |
| `lib/opslag.js` | Bewaart kaarten in `DATA_DIR/kaarten.json` |

Bijwerken van kaarten:
- **Apple**: de iPhone registreert zich bij `BASE_URL/apple/v1/...`. Na een
  stempel stuurt de server een leeg duwtje via APNs, de iPhone haalt de nieuwe
  pas op.
- **Google**: na een stempel past de server het kaartobject aan via de Google
  Wallet API; Google zet het door naar de telefoon.

Lukt het bijwerken even niet (Apple of Google onbereikbaar), dan wordt de
stempel gewoon bewaard. De kaart toont hem bij de volgende update.

## Problemen oplossen

**De iPhone zegt "kan pas niet toevoegen"**
Meestal klopt een certificaat niet, of past `APPLE_PASS_TYPE_ID`/`APPLE_TEAM_ID`
niet bij het certificaat. Kijk in de serverlog.

**De kaart in Apple Wallet werkt zich niet bij**
`BASE_URL` moet https zijn, en het adres moet bereikbaar zijn voor de iPhone.
Pas na het aanpassen van `BASE_URL` moeten klanten de kaart opnieuw toevoegen.

**"Google weigerde de serviceaccount"**
Het JSON-bestand klopt niet, of de serviceaccount is niet uitgenodigd in de
Wallet Console (stap 4.4).

**De Google-kaart toont geen logo**
Google haalt het logo op van `BASE_URL/logo.png`. Dat moet publiek bereikbaar
zijn via https.
