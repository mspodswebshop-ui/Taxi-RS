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
| `inhoud.js` | **de teksten, het werk, de diensten, de vragen en de tarieven** — gedeeld door beide pagina's |
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

`beheer.html` opent meteen — geen code, niets om in te vullen. Acht onderdelen:

- **Overzicht** — wat openstaat, wat je deze maand geleverd hebt, en de omzet
  daarvan. Plus de laatste vijf aanvragen.
- **Aanvragen** — wat via WhatsApp binnenkomt, zet je hier bij. Met status
  (nieuw · bezig · geleverd · geannuleerd), prijs, deadline, notitie en een
  knop om de klant meteen te appen. Filteren en zoeken kan.
- **Werk** — de voorbeelden in "Een greep uit de edits". Toevoegen, wijzigen,
  van volgorde wisselen. Staat er één voorbeeld, dan toont de site het groot,
  met het beeld naast de tekst.
- **Tarieven** — de prijzen per lengte. Wat je hier verandert, verandert
  meteen ook de keuzelijst in het aanvraagformulier.
- **Diensten** — de vier blokken onder "Voor je bedrijf, of gewoon voor
  jezelf".
- **Vragen** — de veelgestelde vragen onderaan de site.
- **Teksten** — de grote titel, de tekst eronder, de levertijd en de revisies.
  Wat je in de titel tussen \*sterretjes\* zet, wordt paars en cursief.
- **Instellingen** — het WhatsApp-nummer, en een kopie van je gegevens opslaan
  of terugzetten.

### Twee dingen om te weten

**Er zit geen slot op.** Wie de pagina opent, kan de site aanpassen. Zet
`beheer.html` dus niet op je webhosting: hou het op je eigen computer of gsm,
en zet online enkel `index.html`, `styles.css`, `script.js` en `inhoud.js`.

**De gegevens staan in je browser, op dat ene toestel.** Ze gaan niet naar een
server en zijn dus niet zichtbaar op je gsm als je ze op je laptop invulde.
Maak daarom af en toe een kopie (Instellingen → *Kopie opslaan*); dat bestand
kan je op een ander toestel terugzetten. Wis je je browsergegevens, dan is het
weg — met een kopie zet je alles weer recht.

Wat je in het beheer aanpast, gaat vóór op wat in `inhoud.js` staat. Wil je iets
blijvend veranderen — voor iedereen, op elk toestel — pas het dan aan in
`inhoud.js`.

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
