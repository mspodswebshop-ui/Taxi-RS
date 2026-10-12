# CMS — Prestige Taxi Antwerpen

De website van Prestige Taxi Antwerpen, met een beheer erbij. Je logt in op
**`/admin`**, past teksten en foto's aan en klikt op **Publiceren**. Vanaf dat
moment ziet iedereen de nieuwe versie. Geen zip, geen upload.

## Wat kan je in het beheer?

- **Teksten:** klik op een tekst in het voorbeeld en typ.
- **Foto's:** klik op "Foto wijzigen". Kies een eigen foto (wordt automatisch
  verkleind) of laat een AI-foto maken door te beschrijven wat erop moet staan.
- **Reviews, prijzen en vragen:** "+ Kopie" maakt er een bij, "Verwijder"
  haalt er een weg.
- **Instellingen:** telefoonnummer en e-mail (wijzigt overal tegelijk, ook de
  bel- en WhatsApp-knoppen en het reservatieformulier), de titel en
  omschrijving voor Google, een back-up downloaden en uitloggen.
- **Computer / Gsm:** bekijk hoe de pagina eruitziet op beide.

Wijzigingen die je nog niet gepubliceerd hebt, blijven in je browser bewaard.
Sluit je per ongeluk het venster, dan kan je gewoon verder.

## Hoe werkt het?

- De oorspronkelijke website staat in de map [`prestige-taxi`](../prestige-taxi).
- Alles wat je in het beheer publiceert (pagina's, foto's) wordt bewaard in een
  **Postgres-database**, of zonder database in de map `data/`.
- Wat in de opslag staat, gaat voor op het origineel. Met "Terug naar de
  originele website" (bij Instellingen) gooi je alle tekstwijzigingen weg.

Beveiliging:

- Inloggen met één wachtwoord. Er is een wachtwoord ingebouwd (de eigenaar heeft
  het gekregen); in de code staat alleen een versleutelde versie. Een ander
  wachtwoord kiezen kan met `ADMIN_PASSWORD`. Na 8 foute pogingen is inloggen
  15 minuten geblokkeerd.
- De login is een beveiligde cookie, 14 dagen geldig.
- Foto's worden gecontroleerd (alleen echte JPG, PNG of WebP, max. 8 MB).
- Het beheer kan alleen de 5 pagina's en het reservatiescript wijzigen, niets
  anders op de server.
- Publiceren twee mensen tegelijk, dan krijgt de tweede een melding in plaats
  van ongemerkt het werk van de eerste te overschrijven.

## Lokaal starten

Je hebt [Node.js 20 of nieuwer](https://nodejs.org) nodig.

```bash
cd prestige-cms
npm install
cp .env.example .env
```

Je kunt meteen inloggen met het ingebouwde wachtwoord. Een ander wachtwoord
kiezen? Zet het in `.env`:

```
ADMIN_PASSWORD=kies-een-lang-wachtwoord
```

Start:

```bash
npm start
```

- Website: <http://localhost:5000>
- Beheer: <http://localhost:5000/admin>

Zonder `DATABASE_URL` komt alles in de map `data/`.

## Online zetten (Render + Neon, gratis te starten)

**1. Database.** Staat al klaar bij [Neon](https://console.neon.tech): project
**prestige-taxi** (regio Frankfurt), database `prestige_taxi`. Kopieer daar de
*connection string* (begint met `postgresql://`) via *Connect*. Zet die nooit in
de code of in GitHub.

**2. Server.** Maak een account op [render.com](https://render.com), kies
**New > Blueprint** en wijs deze repository aan. Render leest `render.yaml` en
maakt de service `prestige-taxi` aan. Vul bij de omgevingsvariabelen in:

| Variabele | Wat |
| --- | --- |
| `ADMIN_PASSWORD` | Leeg laten voor het ingebouwde wachtwoord, of een ander wachtwoord voor `/admin` |
| `DATABASE_URL` | De connection string van Neon |
| `SESSION_SECRET` | Maakt Render zelf aan |

**3. Domeinnaam.** Koppel bij Render onder *Settings > Custom Domains* je eigen
domein, bv. `prestigetaxi.be`.

> **Let op:** de gratis server van Render valt na een tijdje zonder bezoekers
> in slaap. De eerste bezoeker wacht dan tot een minuut. Voor een taxibedrijf
> is een betaald plan (*Starter*) aan te raden, zodat de site altijd meteen laadt.

**Zonder database?** Kan alleen op een server met een vaste schijf (bv. een
VPS). Op het gratis plan van Render wordt de schijf bij elke herstart gewist en
ben je je wijzigingen kwijt.
