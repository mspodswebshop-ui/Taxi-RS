# Sahli Candy — website

De website van de snoepwinkel: Takis, Toxic Waste, alle smaken Red Bull en
alles wat zuur is. Bezoekers stellen een bestellijst samen en sturen die met
één klik door via WhatsApp of e-mail. Er wordt niets online betaald — de
klant betaalt bij het afhalen.

De site is gewone HTML, CSS en JavaScript. Geen build, geen server, geen
account nodig.

```
snoepwinkel/
└── public/
    ├── index.html      de pagina zelf
    ├── styles.css      de opmaak (kleuren uit het logo)
    ├── app.js          de werking: filters, zoeken, bestellijst
    ├── producten.js    ← DIT bestand pas je aan
    └── logo.png        het logo
```

## Bekijken

Dubbelklik `public/index.html`, of start een klein servertje:

```bash
cd snoepwinkel/public
python3 -m http.server 8080      # daarna: http://localhost:8080
```

## Je eigen lijst maken

Alles wat je zelf invult staat in **`public/producten.js`**. Verder hoef je
geen enkel bestand aan te raken.

Bovenaan staat de winkel: naam, slogan, WhatsApp-nummer, e-mail, Instagram,
adres en de openingsuren. Daaronder staat de productenlijst. De producten die
er nu in staan zijn voorbeelden zodat je meteen ziet hoe het eruitziet —
**de prijzen zijn verzonnen, vul je eigen prijzen in.**

Eén product ziet er zo uit:

```js
{
  naam: "Takis Fuego",
  categorie: "Takis",          // maakt zelf een filterknop aan
  prijs: 3.50,                 // met een punt, niet met een komma
  inhoud: "90 g",
  beschrijving: "Hete chili en limoen.",
  zuur: 3,                     // 0 t/m 5, toont de zuurmeter (mag weg)
  emoji: "🌶️",
  label: "populair",           // "nieuw", "populair" of "bijna op" (mag weg)
  voorraad: true,              // false = uitverkocht op de site
},
```

Een product bijzetten: kopieer zo'n blok, pas het aan, en let erop dat er een
komma achter de sluitende `}` staat. Een product weghalen: verwijder het blok.
Een nieuwe `categorie` intikken volstaat om er een filterknop bij te krijgen —
de knoppen bovenaan het assortiment worden automatisch uit de lijst gehaald.

Sla op, ververs de pagina, klaar.

## WhatsApp aanzetten

In `producten.js` staat bij `whatsapp` nog `"32XXXXXXXXX"`. Zet daar je echte
nummer neer in internationaal formaat, zonder `+` en zonder spaties:
`0470 12 34 56` wordt dus `32470123456`. Zolang er nog X-en in staan, wordt de
bestelling niet verstuurd maar gekopieerd, zodat de klant ze zelf kan plakken.

## Online zetten

De map `public` is de hele website — die kan bij elke hoster.

- **Netlify:** nieuwe site, map `snoepwinkel/public` als *publish directory*.
  Let op: de `netlify.toml` in de hoofdmap van deze repository wijst naar de
  AI-app. Maak voor de snoepwinkel een aparte site aan, of pas die instelling
  aan in het Netlify-dashboard.
- **GitHub Pages of een eigen hosting:** upload de inhoud van `public`.

## Nog te doen

- [ ] Prijzen nakijken en aanvullen
- [ ] Echt WhatsApp-nummer, e-mailadres en Instagram invullen
- [ ] Adres en openingsuren aanpassen
- [ ] Eigen foto's in plaats van de emoji's (optioneel)
