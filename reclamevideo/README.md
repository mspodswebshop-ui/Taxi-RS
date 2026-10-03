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

## Geluid

De video's hebben een Nederlandse voice-over en muziek:

| Tijd | Voice-over |
| --- | --- |
| 0,3 s | "Wil jij je bedrijf online laten zien?" |
| 4,0 s | "Bij Weblity ontwerpen en bouwen we jouw website." |
| 7,2 s | "Mooi op je laptop, én op je telefoon." |
| 10,3 s | "Uniek design op maat. Supersnel. Professioneel. En altijd persoonlijk contact." |
| 15,6 s | "Weblity. Websites die voor jou werken." |
| 18,2 s | "Bel of WhatsApp ons vandaag nog!" |

- De stem is een computerstem: de Nederlandse neurale stem "rdh" van
  [Piper](https://github.com/rhasspy/piper).
- De muziek is zelf gemaakt in `audio/maak_audio.py`, dus je hoeft geen rechten te
  regelen. Het is een vrolijk elektronisch nummer op 125 BPM. Op dat tempo vallen de
  overgangen in de muziek precies op de scènewissels.
- Terwijl de stem praat, gaat de muziek automatisch zachter.
- Het volume staat op -14 LUFS, de norm van Instagram, TikTok en YouTube.

Andere tekst of timing? Pas `TEKST` aan in `audio/maak_audio.py` en draai daarna:

```bash
pip install piper-tts numpy scipy
python audio/maak_audio.py   # maakt audio/weblity-audio.wav (en audio/muziek.wav)
node render.mjs              # rendert de video's opnieuw, met het geluid erbij
```

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
