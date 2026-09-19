# Rania Works — website

Een eenpagina-website voor **Rania Works**, waar bezoekers een video-edit kunnen
aanvragen. Donker en strak: zwart en wit, met paars als accent. De aanvraag komt
als kant-en-klaar bericht binnen op WhatsApp — **0473 29 27 39**.

De site is gewone HTML, CSS en JavaScript. Geen buildstap, geen framework, geen
server. Drie bestanden:

- **`index.html`** — de hele pagina en alle teksten
- **`styles.css`** — de vormgeving
- **`script.js`** — het menu, de animaties en het WhatsApp-bericht

---

## Bekijken

Open `index.html` gewoon in je browser. Of, als je liever een echte server draait:

```bash
cd rania-works
python3 -m http.server 8080
```

Ga dan naar <http://localhost:8080>.

---

## Wat staat er op de pagina

| Onderdeel | Inhoud |
|---|---|
| Hero | naam, belofte en twee knoppen |
| Werk | vier voorbeeldkaarten (nog te vervangen door echte video's) |
| Diensten | social edits, bedrijfsvideo, persoonlijke edits, losse afwerking |
| Werkwijze | vier stappen, van aanvraag tot oplevering |
| Tarieven | prijs per lengte van de video |
| Aanvraag | formulier dat live een WhatsApp-bericht opbouwt |
| FAQ | zes veelgestelde vragen |

---

## De prijzen

Die staan in `index.html`, in de sectie `<section id="tarieven">`:

| Lengte | Prijs |
|---|---|
| tot 10 seconden | € 10 |
| 10 tot 20 seconden | € 15 |
| 20 tot 30 seconden | € 20 |
| 60 tot 90 seconden | € 40 |

Wijzig je een prijs of een lengte? Pas dan twee plekken aan, zodat ze gelijk
blijven lopen:

1. de kaart in de sectie `tarieven` (het bedrag én `data-lengte` / `data-prijs`
   op de knop);
2. de keuzelijst `id="lengte"` in het aanvraagformulier.

Voor lengtes tussen 30 en 60 seconden — en alles boven anderhalve minuut — staat
er nu "prijs op aanvraag". Heb je daar een vast tarief voor, zeg het, dan zet ik
er een kaart bij.

---

## Het WhatsApp-nummer

Staat op één plek, bovenaan in `script.js`:

```js
var WHATSAPP = '32473292739';
```

Dat is 0473 29 27 39 in internationale vorm, zonder `+`, zonder spaties en
zonder de nul vooraan. Verandert het nummer, dan pas je enkel deze regel aan —
en het nummer dat onderaan de pagina in beeld staat (in `index.html`).

Wat het formulier verstuurt, ziet er zo uit:

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
formulier, en hoeft in WhatsApp enkel nog op verzenden te duwen.

> Er wordt niets opgeslagen en niets verstuurd naar een server. Alles gebeurt in
> de browser van de bezoeker; het bericht gaat rechtstreeks naar WhatsApp.

---

## Eigen werk toevoegen

De vier kaarten onder "Werk" zijn nu nog gekleurde vlakken. Vervang de
`<div class="work-thumb">` door je eigen beeld of video:

```html
<div class="work-thumb">
  <img src="werk/reel-sneakers.jpg" alt="Beeld uit de sneaker-reel">
</div>
```

Zet je bestanden in een map `werk/` naast `index.html`.

---

## Online zetten

Sleep de map `rania-works` naar [Netlify Drop](https://app.netlify.com/drop) of
[Vercel](https://vercel.com). Meer is er niet nodig: het is een statische site.

Let op: de `netlify.toml` in de hoofdmap van deze repository wijst naar
`ai-app`. Wil je deze site via die Netlify-koppeling publiceren, zet dan `base`
op `rania-works` en `publish` op `.` (en haal de regels over `functions` weg).
