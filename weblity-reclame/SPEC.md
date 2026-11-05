# SPEC: Weblity reclame (storyline A)

GOAL:    een ondernemer ziet in 25 s wat een website, webshop, boekingssysteem en grote webshop kost en stuurt een WhatsApp.
OUTPUT:  HyperFrames, 1080 x 1920 (9:16, TikTok/Reels/Stories), 30 fps
TIME:    25 s x 30 = 750 frames; geen muziek (stil geleverd)
LOOK:    grond = effen kleurvlak per niveau: lime #D9F24A (hook, website, eind), oranje #FF8A3D (webshop),
         roze #FFA8D2 (boeken), hemelsblauw #7FD8FF (grote webshop). Inkt #141414, papier #FFFDF7.
         Accent: de prijs-sticker (inkt met papieren rand, -6°) en de WhatsApp-knop #25D366.
         Display: Archivo Black 104 px (niveau), 130 px (hook), 150 px (merk). UI: Poppins 600/700, min. 28 px.
         Medium: gedrukte stickers: 6 px inktrand, harde schaduw 16 px 16 px 0 inkt, geen blur-schaduwen, geen verloop.
OBJECTS: browservenster (3 bolletjes, adresbalk, navigatie, winkelmandje met teller), productkaarten met bloem,
         maandkalender november 2026 (start zondag), uurknoppen, bevestiging, zoekbalk + productraster, muiscursor 70 px.
MOTION:  aankomst expo.out / power4.out; scroll en kleurvlak power2.inOut 0.6 s / 0.45 s; vertrek power3.in;
         sticker-slam back.out(1.6); prijsrol 0.5 s power3.inOut; motion blur aan op root.
SHOTS:   0-2.0   hook: "Jouw zaak online?" staat er al op frame 0; adres typt 0.5-1.4 · hand-off: titel blurt weg
         2.0-6.0 website: nav, hero, kop, knop bouwen op; sticker €150 slamt op 3.0
         6.0-10.4 webshop: pagina scrolt, grond -> oranje, 4 kaarten; cursor legt 2 boeketten in mandje (teller 1, 2); €200
         10.4-14.2 boeken: scroll, grond -> roze; cursor kiest za 14, 10:30, "Geboekt" verschijnt; €200
         14.2-19.0 grote webshop: scroll, grond -> blauw; zoekbalk typt "rozen", raster van 48 producten scrolt; €300
         19.0-19.8 browser + sticker vliegen weg (power3.in), grond -> lime
         19.8-25.0 eind: "Weblity" letter per letter, prijslijst rij per rij, WhatsApp-knop, cursor klikt, 2 s hold
BANNED:  donkere leegte, glow/deeltjes, verlopen, crème-papier-serif look, alles fade+slide-up, drie kaarten op een rij,
         logo in een hoek, tekst die beweegt tijdens het lezen, tekst onder 1330 px.
QA:      0.0 (thumbnail leesbaar), 4.5 (website + €150), 9.6 (mandje 2), 13.4 (geboekt), 17 (raster), 24.5 (eindkaart).
