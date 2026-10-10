# Weblity

**Websites voor lokale ondernemers, die ze zelf kunnen beheren.**

Jij maakt in Weblity een website aan voor een klant. De klant krijgt een eigen
code (bv. `WBL-7K3F-9QX2-M4TP`) en past daarmee zelf zijn openingsuren,
producten, prijzen, teksten, reviews en kleuren aan. Met die code kan hij
alleen aan zijn eigen website, nooit aan die van een ander.

---

## Hoe het werkt

| Wie | Waar | Wat |
|---|---|---|
| Jij (beheerder) | `/admin` | Klanten aanmaken, codes maken en vernieuwen, status (concept/live/offline), eigen domein, alles aanpassen |
| Klant | `/beheer` | Inloggen met de code en de eigen website aanpassen |
| Bezoeker | `/s/<adres>` of het eigen domein | De website zelf |

**Een klant toevoegen:**

1. Log in op `/admin` en klik op **+ Nieuwe klant**.
2. Je krijgt één keer de klantcode te zien. Kopieer hem, of stuur hem meteen
   via WhatsApp met de knop **Versturen via WhatsApp**.
3. De site staat eerst op **Concept**: met een balk "in opbouw" bovenaan, en
   niet zichtbaar in Google. Zet hem op **Live** als de klant klaar is.

**Code kwijt?** Klik bij de klant op **Nieuwe code maken**. De oude code werkt
meteen niet meer en wie ermee ingelogd was, wordt uitgelogd.

### Wat een klant kan aanpassen

- Gegevens: naam, adres, telefoon, WhatsApp, e-mail, Google-link en -score
- Homepagina: titel, introductie, drie sterke punten
- Producten: naam, prijs, beschrijving, categorie, tekening, zichtbaar, op de homepagina
- Openingsuren per dag, plus een extra melding (feestdagen, vakantie)
- Reviews: toevoegen, aanpassen, verbergen
- Over ons: verhaal en citaat
- Bestellen via WhatsApp: aan/uit, begin van het bericht, opmerking
- Kleuren: vijf kleurensets of eigen kleuren

De website laat zelf zien of de zaak nu open of gesloten is.

---

## Snel starten

Je hebt nodig: **Node.js 20+** en een **PostgreSQL**-database (lokaal, of
gratis via [Neon](https://neon.tech) of Supabase).

```bash
cd weblity
npm install
cp .env.example .env      # vul DATABASE_URL en ADMIN_EMAIL in
npm run db:migrate        # tabellen aanmaken
npm run db:seed           # jouw beheerdersaccount + de site van Idriss Bakkerij
npm run dev               # → http://localhost:3000
```

De seed toont één keer het wachtwoord (als je geen `ADMIN_PASSWORD` invulde)
en de klantcode van Idriss Bakkerij. **Noteer ze**: ze staan alleen versleuteld
in de database.

Nog een beheerder toevoegen of een wachtwoord vervangen:

```bash
npm run admin:create -- collega@weblity.be "Naam Collega"
```

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` / `npm start` | Productieversie bouwen en starten |
| `npm run db:migrate` | Databasewijzigingen toepassen (ontwikkeling) |
| `npm run db:deploy` | Databasewijzigingen toepassen (productie) |
| `npm run db:studio` | Database bekijken in de browser |
| `npm run typecheck` / `npm run lint` | Code controleren |

---

## Online zetten

### Render

In `render.yaml` (in de hoofdmap van de repo) staat een blueprint voor
Weblity, met een eigen PostgreSQL-database. Kies op render.com **New →
Blueprint**, wijs deze repository aan en vul `ADMIN_EMAIL` in. Daarna, in de
Shell van de service:

```bash
npm run db:seed
```

Let op: de gratis database van Render vervalt na een tijd. Voor echte klanten
neem je een betaald plan, of een database bij Neon en zet je die
`DATABASE_URL` in de omgevingsvariabelen.

### Eigen domein voor een klant

1. Zet bij de server `PLATFORM_HOSTS` op de adressen van Weblity zelf,
   bv. `weblity.be,www.weblity.be`.
2. Vul bij de klant in `/admin` het domein in, bv. `idrissbakkerij.be`.
3. Laat het domein bij de domeinprovider naar je server wijzen (bij Render:
   voeg het domein toe onder *Settings → Custom Domains*; Render regelt
   https).

Elk adres dat niet in `PLATFORM_HOSTS` staat, zoekt Weblity op als domein van
een klant. `www.` ervoor mag ook.

---

## Beveiliging

- **Klantcodes** zijn 12 willekeurige tekens (ruim 10^18 mogelijkheden). In de
  database staat alleen de SHA-256 ervan.
- **Raden** wordt afgeremd: na 10 foute pogingen per kwartier per IP-adres
  volgt een pauze. Een foute code en een niet-bestaande code geven dezelfde
  melding.
- **Eén klant, één site**: welke site een klant bewerkt, komt uit zijn sessie
  op de server, nooit uit wat de browser meestuurt.
- **Wachtwoorden** van beheerders: bcrypt. **Sessies**: willekeurige sleutel
  in een httpOnly-cookie, alleen de hash in de database.
- **Alles wat iets verandert** weigert verzoeken van andere websites.
- **Inhoud wordt gecontroleerd** (lengte, vorm, kleuren, links) voor hij wordt
  opgeslagen, en wordt op de website als tekst getoond, nooit als HTML. Een
  klant kan dus geen scripts in zijn site zetten.
- **Tegelijk bewerken**: slaan jij en de klant allebei op, dan krijgt de
  tweede een melding in plaats van het werk van de ander te overschrijven.
- **Logboek** per site: wie wat wanneer deed.

---

## Een ontwerp toevoegen

Nu is er één ontwerp: **bakkerij** (geschikt voor bakkers, slagers,
traiteurs, ...). Een nieuw ontwerp, bv. voor een kapper of een taxi:

1. Maak een map naast `src/templates/bakkerij/` met een component, een
   stylesheet en standaardinhoud (`defaults.ts`).
2. Zet het in `TEMPLATES` in `src/templates/index.ts`.

---

## Nog niet in v1

- **Foto's uploaden.** De website gebruikt nu tekeningen. Uploaden vraagt om
  opslag voor bestanden (bv. S3, Cloudflare R2 of Neon/Supabase Storage).
- **Meer ontwerpen** dan bakkerij.
- **Rate limiting over meerdere servers.** De teller zit in het geheugen van
  één proces. Draai je meer dan één server, vervang hem dan door Redis of
  Upstash (`src/lib/rate-limit.ts`).
