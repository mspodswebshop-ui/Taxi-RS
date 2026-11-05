# REVIEW: Weblity reclame

## Keuzes
- Storyline A "Eén site die groeit" gebouwd (klant liet de keuze vrij). B (iemand die online wil) en C (grote letters op het ritme) staan in STORYLINES.md.
- 1080x1920, 25 s, staand voor TikTok/Reels/Stories. Alle tekst blijft tussen 190 en 1330 px (veilige zone onder de app-knoppen).
- Voorbeeldzaak "Bloemen Lies" (bloemenlies.be) is verzonnen als demo; de bloemen zijn getekende illustraties.
- Weblity heeft (nog) geen logo-bestand: de naam staat er als woordmerk in Archivo Black.
- Prijzen, teksten, kleuren en het WhatsApp-nummer zijn variabelen (aanpasbaar in de Studio).

## Gemeten / bekeken
- `hyperframes check`: geen fouten.
- Snapshots bekeken op 0, 0.8, 2.6, 3.3, 4.5, 6.3, 8.45, 9.7, 11.8, 12.5, 13.6, 15.3, 17.5, 19.3, 20.2, 20.9, 21.6, 24.5 s.

## Bewust behouden waarschuwingen
- `film_silent`: geleverd zonder geluid. In deze omgeving is geen muziekbron bereikbaar (HeyGen geblokkeerd, geen lokaal muziekmodel). Op TikTok/Instagram kan je zelf een trending geluid toevoegen bij het posten.
- `composition_file_too_large` / `timeline_track_too_dense`: de hoofdscène is bewust één doorlopende shot (de site groeit in één venster).

## Zwakste punt
- Onder 1330 px is de grond leeg (bewust: daar liggen de knoppen en het bijschrift van de app). Met meer tijd: decoratieve stickers in die zone.
