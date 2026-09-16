/* =====================================================================
   DIT BESTAND PAS JE AAN.  Alle tekst, prijzen en producten van de
   website staan hier. De rest van de website hoef je niet aan te raken.

   Twee delen:
     1. WINKEL     - naam, telefoonnummer, openingsuren, adres
     2. PRODUCTEN  - de lijst met snoep, chips en blikjes

   Sla het bestand op en ververs de pagina in je browser: klaar.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. DE WINKEL
   Vul hier jouw echte gegevens in. Alles wat tussen "..." staat mag je
   overschrijven. Laat een regel leeg ("") en dat stukje verdwijnt van
   de website.
   --------------------------------------------------------------------- */
window.WINKEL = {
  naam: "Sahli Candy",
  slogan: "Zoet genot in elke hap",
  introTitel: "Takis, Toxic Waste, Red Bull en alles wat zuur is",
  introTekst:
    "Amerikaanse chips, zure bommen en elk blikje Red Bull dat je kan bedenken. " +
    "Alles uit voorraad, vers binnen en klaar om af te halen.",

  // Telefoonnummer voor WhatsApp-bestellingen, in internationaal formaat
  // zonder + en zonder spaties. Belgisch nummer 0470 12 34 56 wordt dus
  // "32470123456". Laat je dit staan op XX, dan toont de website de
  // bestelling gewoon als tekst die de klant kan kopiëren.
  whatsapp: "32XXXXXXXXX",
  telefoonZichtbaar: "+32 4XX XX XX XX",

  email: "info@sahlicandy.be",
  instagram: "sahlicandy",

  adres: "Vul hier je straat en huisnummer in",
  gemeente: "1000 Brussel",

  // Openingsuren. Zet "Gesloten" bij een dag dat je dicht bent.
  uren: [
    { dag: "Maandag", tijd: "Gesloten" },
    { dag: "Dinsdag", tijd: "10:00 - 18:00" },
    { dag: "Woensdag", tijd: "10:00 - 18:00" },
    { dag: "Donderdag", tijd: "10:00 - 18:00" },
    { dag: "Vrijdag", tijd: "10:00 - 20:00" },
    { dag: "Zaterdag", tijd: "10:00 - 20:00" },
    { dag: "Zondag", tijd: "12:00 - 18:00" },
  ],
};


/* ---------------------------------------------------------------------
   2. DE PRODUCTEN

   Eén product ziet er zo uit:

     {
       naam: "Takis Fuego",          // verplicht
       categorie: "Takis",           // verplicht, bepaalt onder welke knop
                                     // het product komt te staan
       prijs: 3.50,                  // in euro, met een punt (niet ,)
       inhoud: "90 g",               // wat de klant krijgt
       beschrijving: "Chili en limoen, de klassieker.",
       zuur: 3,                      // 0 tot 5, toont de zuurmeter.
                                     // laat weg bij niet-zuur
       emoji: "🌶️",                  // plaatje op de kaart
       label: "populair",            // "nieuw", "populair" of "bijna op".
                                     // laat weg als er geen label hoeft
       voorraad: true,               // false = uitverkocht op de site
     },

   Een product bijzetten doe je door zo'n blok te kopiëren, aan te passen
   en er een komma achter te laten staan. Verwijderen mag ook gewoon.

   LET OP: de prijzen hieronder zijn voorbeelden zodat je meteen ziet hoe
   het eruitziet. Zet er je eigen prijzen in voor je de site online gooit.
   --------------------------------------------------------------------- */
window.PRODUCTEN = [

  /* ============================ TAKIS ============================ */
  { naam: "Takis Fuego", categorie: "Takis", prijs: 3.50, inhoud: "90 g", zuur: 3, emoji: "🌶️", label: "populair",
    beschrijving: "Hete chili en limoen. De paarse zak die iedereen kent." },
  { naam: "Takis Blue Heat", categorie: "Takis", prijs: 3.50, inhoud: "92 g", zuur: 3, emoji: "💙",
    beschrijving: "Zelfde vuur als Fuego, maar dan knalblauw." },
  { naam: "Takis Nitro", categorie: "Takis", prijs: 3.50, inhoud: "90 g", zuur: 2, emoji: "⚡",
    beschrijving: "Habanero en limoen, iets zachter dan Fuego." },
  { naam: "Takis Xplosion", categorie: "Takis", prijs: 3.50, inhoud: "90 g", zuur: 2, emoji: "🧀",
    beschrijving: "Cheese en chili, romig en pittig tegelijk." },
  { naam: "Takis Zombie", categorie: "Takis", prijs: 3.95, inhoud: "92 g", zuur: 4, emoji: "🧟",
    beschrijving: "Habanero met komkommer. Groen, raar en verslavend." },
  { naam: "Takis Guacamole", categorie: "Takis", prijs: 3.95, inhoud: "92 g", zuur: 2, emoji: "🥑",
    beschrijving: "Avocado en kruiden, mild pittig." },
  { naam: "Takis Crunchy Fajita", categorie: "Takis", prijs: 3.50, inhoud: "92 g", zuur: 1, emoji: "🌮",
    beschrijving: "Fajitasmaak, crunchy in plaats van gerold." },
  { naam: "Takis Dragon Sweet Chili", categorie: "Takis", prijs: 3.95, inhoud: "92 g", zuur: 1, emoji: "🐉",
    beschrijving: "Zoete chili met een staartje." },

  /* ========================= TOXIC WASTE ========================= */
  { naam: "Toxic Waste Sour Drum — Geel", categorie: "Toxic Waste", prijs: 2.50, inhoud: "42 g", zuur: 5, emoji: "🛢️", label: "populair",
    beschrijving: "Het gele vaatje met ananas, citroen en meer. Extreem zuur." },
  { naam: "Toxic Waste Sour Drum — Paars", categorie: "Toxic Waste", prijs: 2.50, inhoud: "42 g", zuur: 5, emoji: "🟣",
    beschrijving: "Paarse editie: blauwe framboos, druif en kers." },
  { naam: "Toxic Waste Slime Licker — Aardbei", categorie: "Toxic Waste", prijs: 4.50, inhoud: "60 ml", zuur: 4, emoji: "👅", label: "nieuw",
    beschrijving: "Rollerflesje met zure vloeibare aardbei. TikTok-klassieker." },
  { naam: "Toxic Waste Slime Licker — Blue Razz", categorie: "Toxic Waste", prijs: 4.50, inhoud: "60 ml", zuur: 4, emoji: "🔵",
    beschrijving: "Blauwe framboos, zuur en blauw tot in je tong." },
  { naam: "Toxic Waste Slime Licker — Black Cherry", categorie: "Toxic Waste", prijs: 4.50, inhoud: "60 ml", zuur: 4, emoji: "🍒",
    beschrijving: "Donkere kers met een zure kick." },
  { naam: "Toxic Waste Nuclear Fusion", categorie: "Toxic Waste", prijs: 2.95, inhoud: "42 g", zuur: 5, emoji: "☢️",
    beschrijving: "Twee smaken per snoepje. Het zuurste van de reeks." },
  { naam: "Toxic Waste Hi-Voltage Bar", categorie: "Toxic Waste", prijs: 2.20, inhoud: "40 g", zuur: 4, emoji: "🔋",
    beschrijving: "Zure kauwreep, taai en fel." },
  { naam: "Toxic Waste Smog Balls", categorie: "Toxic Waste", prijs: 2.50, inhoud: "48 g", zuur: 4, emoji: "💨",
    beschrijving: "Harde bollen met een zuur poederhart." },
  { naam: "Toxic Waste Short Circuits", categorie: "Toxic Waste", prijs: 2.50, inhoud: "42 g", zuur: 4, emoji: "🔌",
    beschrijving: "Zure kauwstukjes met bruispoeder." },

  /* =========================== RED BULL ========================== */
  { naam: "Red Bull Original", categorie: "Red Bull", prijs: 2.20, inhoud: "250 ml", emoji: "🐂", label: "populair",
    beschrijving: "Het blauw-zilveren blikje. De originele smaak." },
  { naam: "Red Bull Sugarfree", categorie: "Red Bull", prijs: 2.20, inhoud: "250 ml", emoji: "🚫",
    beschrijving: "Originele smaak, zonder suiker." },
  { naam: "Red Bull Zero", categorie: "Red Bull", prijs: 2.20, inhoud: "250 ml", emoji: "0️⃣",
    beschrijving: "Zero calorieën, volle smaak." },
  { naam: "Red Bull Red Edition — Watermeloen", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🍉",
    beschrijving: "Zoete watermeloen." },
  { naam: "Red Bull Yellow Edition — Tropisch", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🥭",
    beschrijving: "Tropisch fruit, mango en ananas." },
  { naam: "Red Bull Blue Edition — Blauwe bes", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🫐",
    beschrijving: "Blauwe bessen." },
  { naam: "Red Bull White Edition — Kokos & bes", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🥥",
    beschrijving: "Kokosnoot met bessen." },
  { naam: "Red Bull Apricot Edition — Abrikoos & aardbei", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🍑",
    beschrijving: "Abrikoos met aardbei." },
  { naam: "Red Bull Pink Edition — Suikerspin", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🎀",
    beschrijving: "Zoete suikerspin." },
  { naam: "Red Bull Green Edition — Cactusvijg", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🌵",
    beschrijving: "Cactusvijg, fris en licht." },
  { naam: "Red Bull Purple Edition — Açai", categorie: "Red Bull", prijs: 2.40, inhoud: "250 ml", emoji: "🍇",
    beschrijving: "Açai-bes." },
  { naam: "Red Bull Winter Edition", categorie: "Red Bull", prijs: 2.60, inhoud: "250 ml", emoji: "❄️", label: "bijna op",
    beschrijving: "Wisselende wintersmaak, zolang de voorraad strekt." },
  { naam: "Red Bull Original — groot blik", categorie: "Red Bull", prijs: 3.50, inhoud: "473 ml", emoji: "🥫",
    beschrijving: "Het grote blik voor lange dagen." },
  { naam: "Red Bull — blad van 24", categorie: "Red Bull", prijs: 48.00, inhoud: "24 x 250 ml", emoji: "📦",
    beschrijving: "Hele doos, smaak naar keuze. Vraag ernaar in de winkel." },

  /* ========================== ZURE SNOEP ========================= */
  { naam: "Warheads Extreme Sour", categorie: "Zure snoep", prijs: 2.50, inhoud: "50 g", zuur: 5, emoji: "😖", label: "populair",
    beschrijving: "De eerste vijf seconden zijn het ergst. Daarna wordt het lekker." },
  { naam: "Warheads Sour Chewy Cubes", categorie: "Zure snoep", prijs: 2.50, inhoud: "70 g", zuur: 3, emoji: "🧊",
    beschrijving: "Zure kauwblokjes, iets vriendelijker." },
  { naam: "Sour Punch Straws", categorie: "Zure snoep", prijs: 2.20, inhoud: "57 g", zuur: 3, emoji: "🥤",
    beschrijving: "Zure rietjes, aardbei of blauwe framboos." },
  { naam: "Sour Patch Kids", categorie: "Zure snoep", prijs: 2.80, inhoud: "100 g", zuur: 3, emoji: "👶",
    beschrijving: "Eerst zuur, dan zoet." },
  { naam: "Trolli Sour Brite Crawlers", categorie: "Zure snoep", prijs: 3.20, inhoud: "113 g", zuur: 3, emoji: "🪱",
    beschrijving: "Zure wormen in fluokleuren." },
  { naam: "Cry Baby Extra Sour", categorie: "Zure snoep", prijs: 1.50, inhoud: "36 g", zuur: 5, emoji: "😭",
    beschrijving: "Kauwgomballen die je ogen laten tranen." },
  { naam: "Juicy Drop Pop", categorie: "Zure snoep", prijs: 2.95, inhoud: "26 g", zuur: 4, emoji: "💧",
    beschrijving: "Lolly met een tube zure gel erbij. Jij bepaalt hoe erg." },
  { naam: "Big Baby Pop", categorie: "Zure snoep", prijs: 2.50, inhoud: "32 g", zuur: 3, emoji: "🍭",
    beschrijving: "Grote lolly om in zuur poeder te dopen." },
  { naam: "Mega Sour Mix — 100 g", categorie: "Zure snoep", prijs: 3.50, inhoud: "100 g", zuur: 4, emoji: "🎲",
    beschrijving: "Zelf samengestelde mix van onze zuurste stukken." },

  /* ====================== AMERIKAANS & ANDERS ==================== */
  { naam: "Prime Hydration", categorie: "Drank & anders", prijs: 3.50, inhoud: "500 ml", emoji: "🧃",
    beschrijving: "Wisselende smaken, vraag wat er vandaag staat." },
  { naam: "Mountain Dew — USA", categorie: "Drank & anders", prijs: 2.50, inhoud: "355 ml", emoji: "🟢",
    beschrijving: "Het Amerikaanse blikje, niet de Europese versie." },
  { naam: "Fanta USA", categorie: "Drank & anders", prijs: 2.50, inhoud: "355 ml", emoji: "🍊",
    beschrijving: "Amerikaanse smaken die je hier niet vindt." },
  { naam: "Reese's Peanut Butter Cups", categorie: "Drank & anders", prijs: 2.20, inhoud: "42 g", emoji: "🥜",
    beschrijving: "Chocolade met pindakaas." },
  { naam: "Oreo — Amerikaanse editie", categorie: "Drank & anders", prijs: 4.50, inhoud: "303 g", emoji: "🍪",
    beschrijving: "Smaken die alleen in de VS bestaan." },
  { naam: "Nerds Gummy Clusters", categorie: "Drank & anders", prijs: 3.95, inhoud: "85 g", emoji: "🌈", label: "nieuw",
    beschrijving: "Gummy met een laag krokante Nerds errond." },

];
