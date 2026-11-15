# Weblity — boekingen

De website van Weblity staat in de map `weblity/` (vijf gewone HTML-pagina's).
Deze map is het stuk erachter:

- de **boekingsserver**: de website vraagt hier de vrije uren op en stuurt
  boekingen in;
- het **beheerscherm**: op hetzelfde adres log je in en zie je wie er geboekt
  heeft. Je kan er bevestigen, annuleren, de klant bellen of een WhatsApp sturen.

Bij elke nieuwe boeking gaat er een pushmelding naar je gsm via de gratis app
[ntfy](https://ntfy.sh).

## Instellingen (omgevingsvariabelen)

| Naam | Waarvoor |
|---|---|
| `DATABASE_URL` | Verbindingsregel van de Postgres-database (Neon). Verplicht. |
| `ADMIN_PASSWORD` | Het wachtwoord van het beheerscherm. Verplicht. |
| `SESSION_SECRET` | Lange willekeurige tekst waarmee het inloggen beveiligd wordt. Verplicht. |
| `NTFY_TOPIC` | Naam van je meldingskanaal in de ntfy-app. Leeg = geen meldingen. |
| `PUBLIC_ORIGINS` | Adres(sen) van de website die mogen boeken, gescheiden door komma's. Standaard `https://weblity.onrender.com`. |

Zet nooit een van deze waarden in de code of in git.

**Een eigen domeinnaam voor de website?** Zet dat adres dan bij
`PUBLIC_ORIGINS` (bv. `https://weblity.be,https://www.weblity.be`), anders
weigert de server de boekingen van daar.

## Openingsuren aanpassen

Bovenaan `server.js` staan drie regels: op welke dagen (`OPEN_DAGEN`), op welke
uren (`UREN`) en hoeveel dagen vooruit (`DAGEN_VOORUIT`) er geboekt kan worden.

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
