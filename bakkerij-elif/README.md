# Website — Bakkerij Elif (Boom)

Een snelle, mobielvriendelijke website voor Bakkerij Elif, Hoogstraat 37,
2850 Boom. Gewone HTML, CSS en JavaScript: er hoeft niets geïnstalleerd of
gebouwd te worden.

## Wat zit erin

- **Live "Nu open / gesloten"**: berekend op Belgische tijd uit de openingsuren.
- **Assortiment**: brood, broodjes, Turkse pizza, taarten, gebak, afhalen en bezorging.
- **Taart bestellen via WhatsApp**: de klant vult een formulier in en de
  bestelling komt als kant-en-klaar bericht binnen op 0498 34 19 19.
- **Openingsuren, kaart, belknop en routeplanner**.
- **Google-vindbaarheid**: beschrijving, deelafbeelding-tekst en
  `Bakery`-gegevens (schema.org) zodat Google adres, telefoon en uren snapt.

## Aanpassen

| Wat                    | Waar                                               |
|------------------------|----------------------------------------------------|
| Openingsuren           | `script.js`, bovenaan in `UREN`, en de `openingHoursSpecification` in `index.html` |
| Teksten en producten   | `index.html`                                       |
| Kleuren en lettertypes | `style.css`, bovenaan in `:root`                   |
| WhatsApp-nummer        | `script.js`, `WHATSAPP`                            |

**Controleer de openingsuren.** Op Google staat alleen dat de zaak om 20:00
sluit en om 08:00 opengaat. De site gaat daarom uit van elke dag 08:00–20:00.
Klopt dat niet, pas dan `UREN` aan (een dag op `null` zetten = gesloten).

**Eigen foto's** maken het verschil. Echte foto's van de vitrine, de taarten
en de Turkse pizza werken beter dan de tekeningen die er nu staan.

## Online zetten

De makkelijkste manier: ga naar [app.netlify.com/drop](https://app.netlify.com/drop)
en sleep de map `bakkerij-elif` erin. Je krijgt meteen een werkend adres en kunt
daarna een eigen domeinnaam koppelen (bv. `bakkerijelif.be`).

Vanuit deze repository kan ook: maak in Netlify een **nieuwe** site aan op deze
repo en vul bij *Base directory* `bakkerij-elif` in. De `netlify.toml` in die
map regelt de rest; elke push werkt de site dan vanzelf bij.

Zet daarna het adres van de website in het Google-bedrijfsprofiel
("Website toevoegen").
