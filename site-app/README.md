# Zetlive

Klanten uploaden hun website, koppelen een domein en passen teksten, kleuren,
knoppen en afbeeldingen aan door er gewoon op te klikken. Elke upload en elke
wijziging staat meteen online.

## Wat het kan

- **Account** aanmaken en inloggen.
- **Uploaden**: een zipbestand of een hele map, ook door te slepen. Direct online
  op een eigen adres.
- **Bewerken door te klikken**: klik op een tekst en typ. Klik op een knop, blok
  of afbeelding en verander tekstkleur, achtergrondkleur, lettergrootte, vet /
  cursief / onderstreept, uitlijning, ronde hoeken, ruimte, de link en de
  afbeelding. Blokken dupliceren of verwijderen. Ongedaan maken met Ctrl+Z.
- **Publiceren** met één knop (of Ctrl+S). Bekijken als computer, tablet of telefoon.
- **Geschiedenis**: de laatste 20 versies van elke pagina en de laatste 5 uploads
  zijn terug te zetten.
- **Eigen domein** koppelen, met uitleg over de DNS-instelling en een controle.

## Uitproberen

```bash
cd site-app
npm install
npm start
```

Open http://localhost:4100, maak een account, en vink bij een nieuwe website
"Begin met een voorbeeldwebsite" aan. Dan kun je de editor meteen proberen.

Zonder `BASE_DOMAIN` staan sites op `/s/<naam>/`. Wil je lokaal al echte
subdomeinen, start dan met `BASE_DOMAIN=localhost npm start`; sites staan dan op
`http://<naam>.localhost:4100`.

## Online zetten op Render (gratis)

1. Maak een Postgres-database, bijvoorbeeld gratis bij [Neon](https://neon.tech),
   en kopieer de verbindingsregel (begint met `postgresql://`).
2. Kies in Render **New > Blueprint**, wijs deze repository aan en vul bij
   **Blueprint Path** in: `site-app/render.yaml`.
3. Plak de verbindingsregel bij `DATABASE_URL`.

Met `DATABASE_URL` bewaart Zetlive alles in de database, omdat Render de schijf
bij elke herstart wist. Beperkingen van de gratis variant:

- Sites staan op `jouwapp.onrender.com/s/<naam>/`, niet op een eigen subdomein.
- Na 15 minuten zonder bezoek valt de app in slaap; het eerste bezoek daarna
  duurt ongeveer een minuut.
- Een website mag maximaal 40 MB zijn (in te stellen met `MAX_SITE_MB`).
- Een eigen domein van een klant voeg je ook in Render toe (Settings > Custom
  Domains). Daarna herkent Zetlive het en toont de juiste site.

## Online zetten op een eigen server

Hier werkt alles automatisch: elke site op `<naam>.jouwdomein.nl` en HTTPS voor
elk domein dat een klant koppelt.

1. Zet in de DNS een `A`-record voor `jouwdomein.nl` **en** voor
   `*.jouwdomein.nl` naar het IP-adres van je server (Ubuntu of Debian).
2. Draai op de server, als root: `bash install.sh jouwdomein.nl`

Maak regelmatig een back-up van `/var/lib/zetlive`: daar staat alles in.

## Goed om te weten

- In de editor draaien de scripts van de website zelf niet. Zo wordt precies de
  HTML uit het bestand bewerkt en teruggeschreven. Websites die hun inhoud
  volledig met JavaScript opbouwen (React, Vue en dergelijke) tonen in de editor
  daarom weinig; gewone HTML-websites werken het best.
- Wijzigingen uit de editor komen als opmaak op het element zelf te staan.
- Een nieuwe upload vervangt de hele website, dus ook wat in de editor is
  aangepast. De vorige upload blijft terug te zetten.
- Er is nog geen betaling, geen "wachtwoord vergeten" en geen formulierafhandeling.

## Opbouw

| Bestand | Wat het doet |
| --- | --- |
| `server.js` | Dashboard, API en het uitserveren van de websites |
| `lib/store.js` | Accounts, sessies en sites (één JSON-bestand) |
| `lib/deploy.js` | Uploads uitpakken, bestanden en paginaversies |
| `lib/mirror.js` | Kopie van alles in Postgres, voor hosting zonder vaste schijf |
| `public/inject.js` | De editor die in de pagina van de klant draait |
| `public/editor.js` | Het editorscherm met het zijpaneel |
| `public/app.js` | Het dashboard |
| `template/` | De voorbeeldwebsite |
