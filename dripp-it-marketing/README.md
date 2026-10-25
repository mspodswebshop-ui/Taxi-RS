# Dripp It: social media

Afbeeldingen en een reclamevideo voor Instagram en TikTok, gemaakt vóór de lancering
(de website staat er nog niet in).

| Bestand | Formaat | Waarvoor |
| --- | --- | --- |
| `dripp-it-reclame.mp4` | 1080 × 1920, 15 s | Reels en TikTok |
| `dripp-it-post-1.png` … `post-5.png` | 1080 × 1350 (4:5) | Instagram-posts |
| `dripp-it-story-1.png`, `story-2.png` | 1080 × 1920 | Instagram- en TikTok-stories |
| `BIJSCHRIFTEN.md` | | Teksten, hashtags en een bio-voorstel |

De beelden zijn getekend in de huisstijl, met dezelfde illustraties als op de website.
Zodra er echte productfoto's zijn, kunnen die in de plaats komen.

## Opnieuw maken of aanpassen

De beelden komen uit `studio/studio.html`. Daar pas je teksten en volgorde aan.
Opnieuw maken (Node.js, Playwright en ffmpeg nodig):

```bash
cd dripp-it-marketing/studio
node render.js beelden ..   # alle posts en stories
node render.js video ..     # de video
```

Wil je de website later in de video of op de beelden? Pas dan de tekst "Volg ons voor de
lancering" in `studio.html` aan naar het webadres en maak ze opnieuw.
