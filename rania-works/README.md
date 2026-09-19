# Rania Works — website + beheer

Een website waar bezoekers een video-edit kunnen aanvragen, en een beheerpagina
waar Rania de site bijhoudt. Donker en strak: zwart en wit, met paars als accent.
Aanvragen komen als kant-en-klaar bericht binnen op WhatsApp — **0473 29 27 39**.

Gewone HTML, CSS en JavaScript. Geen buildstap, geen framework, geen server.

| Bestand | Wat het is |
|---|---|
| `index.html` | de website |
| `styles.css` | de vormgeving van de website |
| `script.js` | het gedrag van de website |
| `inhoud.js` | **alle inhoud**: teksten, werk, diensten, werkwijze, vragen, tarieven |
| `sitebestanden.js` | door `bouw.py` gemaakt: de sitebestanden als tekst, zodat het beheer er een zip van kan maken |
| `beheer.html` | de beheerpagina (stijl en script zitten erin) |
| `bouw.py` | maakt de twee "compleet"-bestanden hieronder |
| `rania-works-compleet.html` | de hele website in één bestand |
| `beheer-compleet.html` | het hele beheer in één bestand |

---

## Bekijken

Dubbelklik `index.html` of `beheer.html`. Of draai een kleine server, wat het
dichtst bij de echte situatie komt:

```bash
cd rania-works
python3 -m http.server 8080
```

Dan staat de site op <http://localhost:8080> en het beheer op
<http://localhost:8080/beheer.html>.

---

## Het beheer

`beheer.html` opent meteen — geen code, niets om in te vullen. Negen onderdelen:

- **Overzicht** — wat openstaat, wat je deze maand geleverd hebt, en de omzet
  daarvan. Plus de laatste vijf aanvragen.
- **Aanvragen** — wat via WhatsApp binnenkomt, zet je hier bij. Met status
  (nieuw · bezig · geleverd · geannuleerd), prijs, deadline, notitie en een
  knop om de klant meteen te appen. Filteren en zoeken kan.
- **Werk** — de voorbeelden in "Een greep uit de edits". Staat er één
  voorbeeld, dan toont de site het groot, met het beeld naast de tekst.
- **Tarieven** — de prijzen per lengte. Wat je hier verandert, verandert
  meteen ook de keuzelijst in het aanvraagformulier.
- **Diensten** — de vier blokken onder "Voor je bedrijf, of gewoon voor
  jezelf".
- **Werkwijze** — de stappen van appje tot afgewerkte video. De nummers komen
  er vanzelf bij.
- **Vragen** — de veelgestelde vragen onderaan de site.
- **Teksten** — élke tekst op de site, per stuk van de pagina gegroepeerd:
  titels, labeltjes, knopteksten, de lopende band, de voettekst. Wat je tussen
  \*sterretjes\* zet, wordt paars en cursief.
- **Instellingen** — het WhatsApp-nummer, je site downloaden, en een kopie van
  je gegevens opslaan of terugzetten.

### Hoe komt je wijziging op de site?

Wat je in het beheer aanpast, staat eerst alleen in de browser van dat toestel.
Online zetten doe je zo:

1. Ga naar **Instellingen → Download de site (zip)**.
2. Pak de zip uit. Daar zitten `index.html`, `styles.css`, `script.js` en
   `inhoud.js` in — je volledige site, met jouw wijzigingen erin.
3. Zet die bestanden op je webhosting, of sleep de map naar
   [Netlify Drop](https://app.netlify.com/drop).

Staat je site al online en verander je later iets? Dan volstaat het om enkel
**`inhoud.js`** te vervangen; daar zit alle inhoud in. Daarvoor is er de knop
*Alleen inhoud.js*.

Het beheer zit bewust niet in de zip: dat hoort niet online te staan.

### Twee dingen om te weten

**Er zit geen slot op.** Wie de pagina opent, kan de site aanpassen. Zet
`beheer.html` dus niet op je webhosting: hou het op je eigen computer of gsm,
en zet online enkel `index.html`, `styles.css`, `script.js` en `inhoud.js`.

**De gegevens staan in je browser, op dat ene toestel.** Ze gaan niet naar een
server en zijn dus niet zichtbaar op je gsm als je ze op je laptop invulde.
Maak daarom af en toe een kopie (Instellingen → *Kopie opslaan*); dat bestand
kan je op een ander toestel terugzetten. Wis je je browsergegevens, dan is het
weg — met een kopie zet je alles weer recht.

Wat je in het beheer aanpast, gaat vóór op wat in `inhoud.js` staat. Met de
downloadknop hierboven giet je je wijzigingen terug in `inhoud.js`, en dan geldt
het voor iedereen.

---

## De prijzen

Staan in `inhoud.js`, en zijn ook in het beheer aan te passen:

| Lengte | Prijs |
|---|---|
| tot 10 seconden | € 10 |
| 10 tot 20 seconden | € 15 |
| 20 tot 30 seconden | € 20 |
| 60 tot 90 seconden | € 40 |

Voor lengtes tussen 30 en 60 seconden — en alles boven anderhalve minuut —
staat er "prijs op aanvraag". Heb je daar een vast tarief voor, voeg het dan
toe bij Tarieven.

---

## Het WhatsApp-nummer

Staat bovenaan in `inhoud.js`:

```js
nummer: '32473292739',
nummerGetoond: '0473 29 27 39',
```

Dat eerste is het nummer waar de berichten heen gaan: internationaal, zonder
`+`, zonder spaties, zonder de nul vooraan. Het tweede is hoe het op de site
getoond wordt.

Wat het formulier verstuurt:

```
Hallo Rania, ik zou graag een edit laten maken.

Naam: ...
Bedrijf: ...
Soort edit: ...
Platform: ...
Lengte: ...
Nodig tegen: ...

Wat ik in gedachten heb:
...
```

De bezoeker ziet dat bericht al staan in het telefoonvenster naast het
formulier, en hoeft in WhatsApp enkel nog op verzenden te duwen. Er wordt niets
opgeslagen en niets naar een server gestuurd.

---

## Eigen werk toevoegen

In het beheer, bij **Werk**. Je vult in:

- **titel** en **omschrijving** — wat onder het beeld komt
- **formaat** — het labeltje op het beeld, bv. `9:16` of `16:9`
- **adres van de afbeelding** — bv. `werk/bakkerij.jpg` (zet je bestanden in een
  map `werk/` naast `index.html`). Laat je dit leeg, dan toont de site een paars
  vlak met een afspeelknop.
- **adres van de video** — vul je dit in, dan wordt de kaart klikbaar

---

## De losse bestanden opnieuw samenvoegen

Pas je iets aan in `index.html`, `styles.css`, `script.js`, `inhoud.js` of
`beheer.html`, maak de twee "compleet"-bestanden dan opnieuw:

```bash
cd rania-works
python3 bouw.py
```

---

## Online zetten

Sleep de map naar [Netlify Drop](https://app.netlify.com/drop) of
[Vercel](https://vercel.com). Meer is er niet nodig: het is een statische site.

Let op: de `netlify.toml` in de hoofdmap van deze repository wijst naar
`ai-app`. Wil je deze site via die koppeling publiceren, zet dan `base` op
`rania-works` en `publish` op `.` (en haal de regels over `functions` weg).
