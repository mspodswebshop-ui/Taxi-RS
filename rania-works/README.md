# Rania Works — website + beheer

Een website waar bezoekers een video-edit kunnen aanvragen, en een beheerpagina
waar Rania de site bijhoudt. Donker en strak: zwart en wit, met paars als accent.
Aanvragen komen als kant-en-klaar bericht binnen op WhatsApp — **0473 29 27 39**.

Gewone HTML, CSS en JavaScript. Geen buildstap voor de browser, geen framework,
geen server. De site telt zeven pagina's, met een hamburgermenu.

### Wat je zelf aanpast

| Bestand | Wat het is |
|---|---|
| `inhoud.js` | **alle inhoud**: teksten, werk, diensten, werkwijze, vragen, tarieven |
| `sjabloon.html` | het geraamte van elke pagina: kop, menu, voet |
| `delen/*.html` | de stukken waaruit de pagina's zijn opgebouwd |
| `styles.css` | de vormgeving |
| `script.js` | het gedrag |
| `opslag.js` | bewaart de geüploade video's en foto's in de browser |
| `beheer.html` | de beheerpagina |

### Wat `bouw.py` daaruit maakt

| Bestand | Wat het is |
|---|---|
| `index.html` | startpagina — hero en snelkoppelingen |
| `werk.html` · `diensten.html` · `werkwijze.html` | je werk, je diensten, je aanpak |
| `tarieven.html` · `aanvraag.html` · `vragen.html` | prijzen, formulier, FAQ |
| `rania-works-compleet.html` | alles op één pagina, in één bestand |
| `beheer-compleet.html` | het hele beheer in één bestand |
| `sitebestanden.js` | de sitebestanden als tekst, zodat het beheer er een zip van maakt |

> De zeven pagina's worden **overschreven** door `bouw.py`. Pas ze dus niet met
> de hand aan — wijzig `sjabloon.html` of een bestand in `delen/`, en draai
> daarna `python3 bouw.py`.

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

Pas je iets aan in `sjabloon.html`, `delen/`, `styles.css`, `script.js`,
`inhoud.js` of `beheer.html`? Draai dan:

```bash
python3 bouw.py
```

Dat maakt de zeven pagina's en de drie losse bestanden opnieuw.

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

In de zip zitten alle zeven pagina's, de stijl, het script en `inhoud.js`.

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

## Een video toevoegen

In het beheer, bij **Werk**. Klik op een voorbeeld (de hele kaart is
aanklikbaar) of op *Voorbeeld toevoegen*. Bij **De video** heb je twee wegen:

**1. Een bestand van je toestel.** Druk op *Bestand kiezen* en neem je video of
foto. Die wordt bewaard in je browser en speelt meteen af op de site. Bij Werk
zie je onderaan alles wat je zo hebt geüpload, met de grootte erbij.

**2. Een link plakken.** Een YouTube-, Shorts- of Vimeo-link speelt af op de
site zelf. Een link van Instagram of TikTok maakt de kaart aanklikbaar en opent
daar — die diensten laten insluiten niet toe.

| Wat er in het veld staat | Wat de bezoeker ziet |
|---|---|
| `werk/reel.mp4` (geüpload bestand) | de video speelt af op je site |
| een YouTube-, Shorts- of Vimeo-link | de video speelt af op je site |
| een Instagram- of TikTok-link | de kaart opent daar |
| niets | een paars vlak, of je foto als je er een koos |

### Waar staan die bestanden?

In je browser, op dat ene toestel — niet op een server. Ze gaan **mee in de zip**
die je bij Instellingen downloadt, in een map `werk/`. Zet je die bestanden op
je hosting, dan ziet iedereen ze.

Drie dingen om te weten:

- Wis je je browsergegevens, dan zijn ze weg. De zip is je back-up.
- Op een ander toestel staan ze niet; ook de kopie bij *Kopie opslaan* bevat
  ze niet (die is enkel tekst).
- Een video van 50 MB laadt traag op mobiel internet. Voor langere video's is
  een YouTube- of Vimeo-link bijna altijd beter.

---

## Online zetten

Sleep de map naar [Netlify Drop](https://app.netlify.com/drop) of
[Vercel](https://vercel.com). Meer is er niet nodig: het is een statische site.

Let op: de `netlify.toml` in de hoofdmap van deze repository wijst naar
`ai-app`. Wil je deze site via die koppeling publiceren, zet dan `base` op
`rania-works` en `publish` op `.` (en haal de regels over `functions` weg).
