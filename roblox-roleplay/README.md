# Zonnestad: een roleplay-spel voor Roblox (zoals Brookhaven)

Een grote roleplay-stad die zichzelf met code bouwt zodra het spel start.

![Plattegrond van Zonnestad](plattegrond.png)

## Wat zit erin?

| | |
|---|---|
| 🗺️ **Stad** | 16 blokken met straten, stoepen, zebrapaden, verkeerslichten en 128 lantaarns die 's avonds aangaan. Rondom liggen heuvels met dennenbomen, en in het zuiden een strand met echte zee om in te zwemmen |
| 🌅 **Sfeer** | Dag en nacht (12 minuten), wolken, zonnestralen en realistisch licht en schaduw |
| 🏠 **16 moderne huizen** | 2 verdiepingen met trap, balkon, garage, keuken met kookeiland, woonkamer, ouderslaapkamer, kinderkamer, badkamer, tuin met terras en barbecue |
| 👑 **4 villa's** | Met zwembad (echt water), supercar in de garage, bioscoopkamer, pooltafel, basketbalveld, palmbomen en een poort |
| 🚪 **Deuren** | Deuren gaan echt open: draaideuren, schuifdeuren, garagedeuren, en automatische deuren bij winkels |
| 👮 **Politiebureau** | Balie, bureaus, 3 cellen en garages voor politieauto's |
| 🚒 **Brandweer** | Brandweerwagens, garagedeuren, kluisjes, glijpaal en oefentoren |
| 🏥 **Ziekenhuis** | Wachtkamer, ziekenhuisbedden, ambulances en helikopterplatform |
| 🏫 **School** | 2 klaslokalen, gang met kluisjes, sportveld en schoolbus |
| 🏦 **Bank** | Loketten en een kluis die boeven kunnen kraken (met alarm!) |
| 🍟 **Winkels** | Snackbar met terras, supermarkt met schappen en kassa's, tankstation |
| 🏢 **Kantoortoren** | 6 verdiepingen met lift en helikopterplatform |
| 🚗 **Autodealer** | Showroom en 5 garages om je voertuig te kiezen |
| 🌳 **Park** | Vijver met steiger, speeltuin met glijbaan en schommels, sportveld, picknicktafels en een ijscokar |
| 🏖️ **Strand** | Palmbomen, parasols, ligbedden, strandwacht, volleybalnet en een strandtent |
| 🚙 **13 voertuigen** | Gezinsauto, pick-up, busje, taxi, schoolbus, scooter, politieauto, ambulance, brandweerwagen, sportwagen, supercar, racemotor en crossmotor, in 8 kleuren |
| 👔 **9 rollen** | Burger, Politie, Brandweer, Dokter, Leraar, Leerling, Snackbar, Kantoor en Boef |
| 💎 **Robux-winkel** | 3 gamepasses: Premium (villa's en een gouden naam), Sportwagens en Motoren |

### Besturing
- **Menu**: de 4 knoppen links op je scherm (🚗 voertuigen, 🏠 huizen, 👔 banen, 💎 winkel)
- **Rijden**: W/S = gas en remmen, A/D = sturen, spatie = uitstappen
- **Instappen**: loop naar een voertuig en druk op **E**
- **Deuren**: **E** om open of dicht te doen
- **Huis claimen of op slot doen**: **F** bij de deurbel naast de voordeur
- **Baan nemen**: **F** bij de balie of het kluisje van het gebouw
- **Lift in het kantoor**: **E** = omhoog, **R** = omlaag
- **Bank overvallen** (als Boef): houd **E** ingedrukt bij het toetsenpaneel naast de kluis, en pak dan het geld
- **Arresteren** (als Politie): houd **F** ingedrukt bij een boef

---

## Zo zet je het in Roblox Studio

1. Download **`Zonnestad.rbxl`** uit deze map.
2. Open het in Roblox Studio via *File > Open from File*.
3. Druk op **Play**. De stad wordt gebouwd en je verschijnt op het plein.
4. Op Roblox zetten: *File > Publish to Roblox*. Zet het spel daarna op **Public** op create.roblox.com.

**Meer spelers per server?** Ga naar *Game Settings > Places* en zet **Max Players** hoger, bijvoorbeeld 30.

Werk je met [Rojo](https://rojo.space)? Gebruik dan `rojo serve`, of maak een nieuw bestand met:
```
rojo build default.project.json -o Zonnestad.rbxl
```

---

## Robux verdienen met gamepasses

1. Publiceer je spel.
2. Ga op [create.roblox.com](https://create.roblox.com) naar je spel → **Monetization → Passes**.
3. Maak 3 passes aan: **Premium**, **Sportwagens** en **Motoren**. Kies een plaatje en een prijs, en zet ze te koop.
4. Kopieer van elke pass het **ID**.
5. Vul de ID's in bij `Id = 0` in `ReplicatedStorage > Shared > Config`. Publiceer daarna opnieuw.

Spelers zien alleen "✔ In bezit" als ze de gamepass echt gekocht hebben. Zolang een ID op `0` staat, heeft niemand die pass.

> 💡 Wil je in Studio alles zelf testen, zoals villa's en sportwagens? Zet dan in Config `GratisInStudio = true`. Dit werkt alleen in Studio en nooit in het echte spel.

---

## Waar staat wat?

```
src/
  shared/
    Config.luau          <- ALLE instellingen: gamepasses, voertuigen, kleuren, rollen, winkels
    Remotes.luau         <- communicatie tussen server en speler
  server/
    Main.server.luau     <- start alles op: licht, dag en nacht, spelers
    WorldBuilder.luau    <- indeling van de stad, wegen, terrein, heuvels en zee
    Buildings.luau       <- alle openbare gebouwen
    Homes.luau           <- huizen en villa's
    Furniture.luau       <- meubels, bomen, lantaarns en andere decoratie
    Doors.luau           <- deuren die opengaan
    Build.luau           <- hulpfuncties: muren met ramen, trappen, relingen
    VehicleBuilder.luau  <- hoe de voertuigen eruitzien
    VehicleService.luau  <- spawnen en besturen van voertuigen
    HouseService.luau    <- huizen claimen en op slot doen
    RoleService.luau     <- banen, teams, naambordjes en hoedjes
    PoliceService.luau   <- arresteren en de cel
    BankService.luau     <- bankoverval met alarm
    FoodService.luau     <- eten en spullen uit de winkels
    Monetization.luau    <- gamepasses (Robux)
  client/
    Main.client.luau     <- het menu op je scherm
```

## Nog mooier maken
Alles in Zonnestad is met code gebouwd uit blokken. Brookhaven gebruikt ook 3D-modellen die in Blender gemaakt zijn. Wil je het nog echter maken? Zoek dan in Studio in de **Toolbox** (Creator Store) naar gratis modellen, bijvoorbeeld meubels, en zet die in de huizen.
