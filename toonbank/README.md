# Toonbank

**Je eigen webshop in een paar minuten.** Een e-commerceplatform: iedereen kan
zich aanmelden, een winkel openen, producten verkopen en bestellingen beheren.
Jij als eigenaar van het platform verdient aan elke verkoop (platformkosten) en
aan het Pro-abonnement.

## Wat zit erin

**Voor winkeliers (`/admin`)**
- Overzicht met omzet per dag, kerncijfers en een startlijst voor nieuwe winkels
- Producten met varianten (maat, kleur…), eigen prijs, "van"-prijs, voorraad en artikelnummer per variant
- Foto's uploaden (opgeslagen in de database, geen aparte opslagdienst nodig)
- Collecties, ook als menu en op de voorpagina van de winkel
- Bestellingen: filteren, zoeken, verzenden met track & trace, annuleren, handmatig op betaald zetten, terugbetalen (met voorraad terugzetten), export naar CSV voor Excel
- Klanten, gesorteerd op wat ze besteed hebben
- Kortingscodes: procent of vast bedrag, minimumbedrag, einddatum, maximaal gebruik
- Instellingen: naam, winkeladres, logo, hoofdfoto, accentkleur, verzendkosten, gratis verzending vanaf, btw
- Stripe koppelen en abonnement (Start/Pro)

**Voor klanten (`/s/<winkel>`)**
- Voorpagina, alle producten met zoeken en sorteren, collecties, productpagina met fotogalerij en variantkeuze
- Winkelwagen, afrekenen met kortingscode, betalen via Stripe (Bancontact, kaart, Apple Pay…)
- Bedankpagina met de status van de bestelling
- Werkt op elke telefoon; productpagina's hebben gegevens voor Google (prijs, voorraad)

## Hoe het platform geld verdient

Betalingen lopen via **Stripe Connect**. Elke winkelier koppelt zijn eigen
Stripe-rekening. Bij een verkoop gaat het geld naar de winkelier, en Stripe
houdt automatisch de **platformkosten** in voor jou:

| Abonnement | Per maand | Platformkosten per verkoop |
| ---------- | --------- | -------------------------- |
| Start      | €0        | 2%   (`PLATFORM_FEE_PERCENT_FREE`) |
| Pro        | €29       | 0,5% (`PLATFORM_FEE_PERCENT_PRO`) |

Stripe rekent daarbovenop zijn eigen transactiekosten.

Omdat Stripe het geld beheert, heb jij geen vergunning als betaalinstelling
nodig en komen kaartgegevens nooit op jouw server.

## Snel starten

Je hebt **Node.js 20+** en **PostgreSQL** nodig.

```bash
cd toonbank
npm install
cp .env.example .env        # vul DATABASE_URL in
npm run db:migrate          # tabellen aanmaken
npm run db:seed             # demo-winkel (optioneel)
npm run dev                 # http://localhost:3100
```

Demo: winkel op **/s/demo**, inloggen met `demo@toonbank.test` / `demo12345`.

### Testmodus

Zonder `STRIPE_SECRET_KEY` draait alles in **testmodus**: klanten kunnen
bestellen, maar "betalen" op een testpagina. Overal staat een duidelijke
melding dat er niets echt betaald wordt. **Zet het platform niet open voor
echte klanten zonder Stripe-sleutel**, anders kan iedereen bestellingen op
"betaald" zetten.

## Echt geld ontvangen met Stripe

1. Maak een account op [stripe.com](https://stripe.com) en zet **Connect** aan
   (Dashboard → Connect → Get started, kies het model *Platform/marketplace*).
2. Zet bij Settings → Payment methods **Bancontact** aan (en wat je verder wilt).
3. Vul in `.env` in:
   - `STRIPE_SECRET_KEY`: begint met `sk_test_` om te testen, `sk_live_` voor echt
   - `BASE_URL`: het publieke adres van je platform
4. Maak een webhook (Developers → Webhooks) naar `<BASE_URL>/api/stripe/webhook`
   met deze events, en zet "Events on Connected accounts" aan:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`, `account.updated`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Zet het signing secret in `STRIPE_WEBHOOK_SECRET`.
5. Voor het Pro-abonnement: maak een product met een maandprijs van €29 en zet
   de prijs-ID (`price_...`) in `STRIPE_PRO_PRICE_ID`. Zet ook het Customer
   Portal aan (Settings → Billing → Customer portal).

Winkeliers koppelen daarna hun rekening via **Betalingen & abonnement** in hun beheer.

## Online zetten

`render.yaml` in de hoofdmap bevat een dienst `toonbank` met een database.
Kies op [render.com](https://render.com) **New → Blueprint** en wijs deze
repository aan. Vul daarna `BASE_URL` en de Stripe-sleutels in.

## Veiligheid

- Wachtwoorden met bcrypt; sessies als willekeurige sleutel in een httpOnly-cookie, alleen de hash in de database
- Elke beheeractie controleert dat het product, de bestelling of de code bij de winkel van de ingelogde gebruiker hoort
- Prijzen, voorraad en kortingen worden bij het afrekenen altijd op de server opnieuw berekend
- Geüploade foto's worden herkend aan hun inhoud, niet aan wat de browser zegt
- Inloggen en afrekenen hebben een limiet per IP-adres
- Stripe-webhooks worden op handtekening gecontroleerd en elk event wordt maar één keer verwerkt
- CSV-export is beschermd tegen formule-injectie in Excel

## Nog niet gebouwd (goede volgende stappen)

- Bevestigingsmails naar klant en winkelier (bv. met Resend of Postmark)
- Eigen domeinnaam per winkel (bv. `www.ateliernoor.be`)
- Meerdere opties per product (maat én kleur tegelijk)
- Meerdere medewerkers per winkel
- Facturen als PDF
