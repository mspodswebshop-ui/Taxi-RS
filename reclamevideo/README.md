# Reclamevideo Weblity

Een korte reclamevideo (22 seconden) voor Weblity, in twee formaten:

| Bestand | Formaat | Voor |
| --- | --- | --- |
| `video/weblity-reclame-telefoon.mp4` | 1080×1920 (9:16) | Telefoon: Instagram Reels, TikTok, WhatsApp-status, YouTube Shorts |
| `video/weblity-reclame-laptop.mp4` | 1920×1080 (16:9) | Laptop: YouTube, Facebook, de website |

## Wat er gebeurt

1. **0–3 s:** "Je bedrijf online? Laat het meteen goed zien."
2. **3,5–9 s:** "Wij ontwerpen en bouwen jouw website." In beeld wordt een website eerst
   geschetst, daarna klikt een muis en verschijnt het afgewerkte design. Daarna komt
   dezelfde site op een telefoon in beeld ("op elk scherm").
3. **9,5–15 s:** "Waarom Weblity?": uniek design op maat, snel en mobielvriendelijk,
   een professionele uitstraling en persoonlijk contact.
4. **15,5–22 s:** het logo, "Websites die voor je werken.", knoppen voor bellen en
   WhatsApp, en het adres **weblitybee.netlify.app**.

De video heeft geen geluid. Kies de muziek in Instagram of TikTok bij het plaatsen.
Daar mag je populaire nummers gebruiken; in een eigen bestand mag dat meestal niet.

## Aanpassen

Alle teksten staan in `weblity.html`. Open dat bestand in een browser om de video als
voorbeeld te bekijken:

- `weblity.html?formaat=liggend`
- `weblity.html?formaat=staand`

Opnieuw renderen (je hebt Node.js, Playwright en ffmpeg nodig):

```bash
cd reclamevideo
node render.mjs            # beide formaten
node render.mjs staand     # alleen telefoon
node render.mjs liggend    # alleen laptop
```

Het lettertype is Montserrat (SIL Open Font License). Het staat in `fonts/`.
