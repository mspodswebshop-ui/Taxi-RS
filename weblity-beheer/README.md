# Weblity — boekingen

De website van Weblity staat in de map `weblity/` (vijf gewone HTML-pagina's).
Deze map is het stuk erachter:

- de **boekingsserver**: de website vraagt hier de vrije uren op en stuurt
  boekingen in;
- het **beheerscherm**: op hetzelfde adres log je in en zie je wie er geboekt
  heeft. Je kan er bevestigen, annuleren, de klant bellen of een WhatsApp sturen.

Bij elke nieuwe boeking gaat er een pushmelding naar elk toestel waarop je de
meldingen hebt aangezet. Dat doe je in het beheerscherm zelf, onder "Meldingen
op dit toestel". Op een iPhone moet je het beheerscherm eerst op je beginscherm
zetten (deelknop > Zet op beginscherm); pas dan laat Apple meldingen toe.

## Instellingen (omgevingsvariabelen)

| Naam | Waarvoor |
|---|---|
| `DATABASE_URL` | Verbindingsregel van de Postgres-database (Neon). Verplicht. |
| `ADMIN_PASSWORD` | Het wachtwoord van het beheerscherm. Verplicht. |
| `SESSION_SECRET` | Lange willekeurige tekst waarmee het inloggen beveiligd wordt. Verplicht. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Sleutelpaar waarmee de server pushmeldingen mag versturen. Maak het één keer aan met `npx web-push generate-vapid-keys`. Leeg = geen meldingen. Verander je het, dan moet elk toestel de meldingen opnieuw aanzetten. |
| `PUBLIC_ORIGINS` | Adres(sen) van de website die mogen boeken, gescheiden door komma's. Standaard `https://weblity.onrender.com`. |

Zet nooit een van deze waarden in de code of in git.

**Een eigen domeinnaam voor de website?** Zet dat adres dan bij
`PUBLIC_ORIGINS` (bv. `https://weblity.be,https://www.weblity.be`), anders
weigert de server de boekingen van daar.

## Openingsuren aanpassen

Bovenaan `server.js` staat `OPENINGSUREN`: per weekdag de blokken waarin je
gesprekken aanneemt. Elk gesprek duurt een uur, dus "16 tot 18" geeft de uren
16:00 en 17:00. Met `DAGEN_VOORUIT` stel je in hoeveel dagen vooruit er geboekt
kan worden.

## Lokaal uitproberen

```bash
cd weblity-beheer
npm install
DATABASE_URL=postgresql://... ADMIN_PASSWORD=test npm start   # http://localhost:4200
```

Open in een tweede venster de website (`cd weblity && python3 -m http.server 8080`).
Op `localhost` praat de boekpagina vanzelf met de lokale server.

## Goed om te weten

- Op het gratis Render-plan valt de server na een kwartier zonder bezoek in
  slaap. De boekpagina wekt hem zodra iemand ze opent; dat duurt tot een minuut.
  In die tijd kan de bezoeker altijd via WhatsApp of telefoon boeken.
- Eén boeking per uur: een uur dat geboekt is, verdwijnt van de website. Een
  geannuleerde boeking geeft het uur weer vrij.
- De pushmelding bevat alleen naam, dienst en tijdstip. Telefoonnummer en
  e-mailadres staan er bewust niet in.
- De meldingen gaan rechtstreeks naar de pushdienst van Apple, Google of
  Mozilla. De app ntfy bleek vanaf Render niet bereikbaar en wordt niet gebruikt.
