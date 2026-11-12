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

## Echt online zetten

Je hebt een server nodig die blijft draaien en een schijf die blijft bestaan
(bijvoorbeeld een VPS). Gratis hosting zonder vaste schijf is niet geschikt: na
een herstart zijn alle websites weg.

1. Kies een domein voor het platform, bijvoorbeeld `zetlive.nl`.
2. Zet in de DNS een `A`-record voor `zetlive.nl` **en** voor `*.zetlive.nl` naar
   het IP-adres van je server.
3. Kopieer `.env.example` naar `.env` en vul `BASE_DOMAIN=zetlive.nl` in.
4. Start de app (`npm start`) en start Caddy met de meegeleverde `Caddyfile`.
   Caddy regelt HTTPS, ook automatisch voor elk domein dat een klant koppelt.

Maak regelmatig een back-up van de map `data/`: daar staat alles in.

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
| `public/inject.js` | De editor die in de pagina van de klant draait |
| `public/editor.js` | Het editorscherm met het zijpaneel |
| `public/app.js` | Het dashboard |
| `template/` | De voorbeeldwebsite |
