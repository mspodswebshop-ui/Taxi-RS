/* Arena FC 27 — landenteams, tenues en volksliedmelodieën.
   Statistieken worden afgeleid uit rating + positie, zodat de data compact blijft. */

/* Positieprofielen: afwijking t.o.v. de rating per statistiek. */
const ARCH = {
  GK:  { pac: -12, sho: -45, pas:  -8, dri: -35, def: -30, phy:  -2, gk: true },
  RB:  { pac:  +5, sho: -18, pas:  -2, dri:  -3, def:  -1, phy:  -3 },
  LB:  { pac:  +5, sho: -18, pas:  -2, dri:  -3, def:  -1, phy:  -3 },
  CB:  { pac:  -6, sho: -32, pas:  -9, dri: -13, def:  +3, phy:  +3 },
  CDM: { pac:  -7, sho: -12, pas:  +1, dri:  -4, def:  +1, phy:  +2 },
  CM:  { pac:  -3, sho:  -7, pas:  +3, dri:  +1, def:  -6, phy:  -2 },
  CAM: { pac:  -1, sho:  +1, pas:  +3, dri:  +5, def: -22, phy:  -7 },
  RW:  { pac:  +6, sho:  -1, pas:  -2, dri:  +5, def: -28, phy:  -8 },
  LW:  { pac:  +6, sho:  -1, pas:  -2, dri:  +5, def: -28, phy:  -8 },
  ST:  { pac:  +3, sho:  +5, pas:  -8, dri:  +1, def: -35, phy:  +1 }
};

/* Kleine, stabiele variatie per speler zodat teams niet uniform aanvoelen. */
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function statsFor(name, pos, rating) {
  const a = ARCH[pos] || ARCH.CM;
  const s = seedOf(name);
  const jit = (k) => Math.round((seedOf(name + k) - 0.5) * 7);
  const cl = (v) => Math.max(28, Math.min(97, Math.round(v)));
  return {
    pac: cl(rating + a.pac + jit("p")),
    sho: cl(rating + a.sho + jit("s")),
    pas: cl(rating + a.pas + jit("a")),
    dri: cl(rating + a.dri + jit("d")),
    def: cl(rating + a.def + jit("v")),
    phy: cl(rating + a.phy + jit("f")),
    foot: s > 0.78 ? "L" : "R"
  };
}

/* Volksliedmelodieën — benaderingen van de openingsmaten, synthetisch gespeeld.
   Notatie: [toon, tellen]; "-" is een rust. Aanpassen mag: het is gewoon een lijst. */
const ANTHEMS = {
  wilhelmus: { tempo: 68, notes: [
    ["D4",1],["G4",1],["G4",.5],["A4",.5],["B4",1],["B4",1],["A4",1],["G4",1],["A4",1],["B4",1],["C5",1],["B4",2],
    ["D4",1],["G4",1],["G4",.5],["A4",.5],["B4",1],["B4",1],["A4",1],["G4",1],["A4",1],["B4",1],["A4",1],["G4",2]] },
  marseillaise: { tempo: 88, notes: [
    ["D4",.75],["D4",.25],["D4",1],["G4",1],["G4",1],["A4",1],["A4",1],["D5",1.5],["B4",.5],["G4",1],["G4",1],
    ["B4",.75],["G4",.25],["B4",1],["D5",1],["C5",.5],["B4",.5],["A4",1],["A4",2]] },
  gstk: { tempo: 70, notes: [
    ["G4",1],["G4",1],["A4",1],["F#4",1.5],["G4",.5],["A4",1],["B4",1],["B4",1],["C5",1],["B4",1.5],["A4",.5],
    ["G4",1],["A4",1],["G4",1],["F#4",1],["G4",2]] },
  deutschland: { tempo: 66, notes: [
    ["G4",1],["A4",1],["F#4",.5],["G4",.5],["A4",1],["B4",1],["A4",1],["G4",1],["D5",1],["C5",1],["B4",1],["A4",1],
    ["B4",1],["C5",1],["B4",1],["A4",1],["G4",2]] },
  brasil: { tempo: 74, notes: [
    ["G4",.5],["A4",.5],["B4",1],["D5",1],["C5",.5],["B4",.5],["A4",1],["B4",1],["G4",1],["D5",1],["D5",.5],["C5",.5],
    ["B4",1],["A4",1],["G4",1],["A4",1],["B4",2]] },
  argentina: { tempo: 72, notes: [
    ["E4",1],["G4",.5],["A4",.5],["B4",1],["B4",1],["A4",.5],["G4",.5],["A4",1],["B4",1],["C5",1],["B4",1],["A4",1],
    ["G4",1],["A4",1],["G4",1],["E4",2]] },
  espana: { tempo: 64, notes: [
    ["B4",1],["B4",.5],["C5",.5],["D5",1],["D5",1],["C5",.5],["B4",.5],["A4",1],["B4",1],["G4",1],["A4",1],["B4",1],
    ["A4",1],["G4",1],["F#4",1],["G4",2]] },
  italia: { tempo: 92, notes: [
    ["B4",.5],["B4",.5],["B4",.5],["B4",.5],["D5",1],["C#5",.5],["B4",.5],["A4",1],["B4",1],["G4",.5],["A4",.5],
    ["B4",1],["B4",.5],["A4",.5],["G4",1],["F#4",1],["G4",2]] }
};

/* Landenteams. Elke speler: [naam, positie, rating, rugnummer]. */
const TEAMS = [
  { id: "ned", name: "Nederland", abbr: "NED", anthem: "wilhelmus", anthemName: "Het Wilhelmus",
    kit: { shirt: "#ff7a1a", short: "#12213f", sock: "#ff7a1a", num: "#12213f" },
    gkKit: { shirt: "#25d07a", short: "#0d2a1c", sock: "#25d07a", num: "#0d2a1c" },
    squad: [
      ["Verbruggen", "GK", 82, 1], ["Frimpong", "RB", 82, 2], ["Van Dijk", "CB", 88, 4],
      ["De Ligt", "CB", 84, 3], ["Aké", "LB", 83, 5], ["Gravenberch", "CDM", 84, 6],
      ["De Jong", "CM", 86, 21], ["Reijnders", "CM", 84, 14], ["Simons", "RW", 84, 7],
      ["Depay", "ST", 83, 10], ["Gakpo", "LW", 84, 11],
      ["Malen", "RW", 81, 18], ["Weghorst", "ST", 78, 19], ["Flekken", "GK", 79, 12],
      ["Geertruida", "RB", 80, 22], ["Timber", "CB", 82, 15], ["Schouten", "CDM", 80, 8], ["Brobbey", "ST", 78, 9]
    ] },

  { id: "fra", name: "Frankrijk", abbr: "FRA", anthem: "marseillaise", anthemName: "La Marseillaise",
    kit: { shirt: "#1b3fae", short: "#ffffff", sock: "#c8102e", num: "#ffffff" },
    gkKit: { shirt: "#f2c200", short: "#2a2410", sock: "#f2c200", num: "#2a2410" },
    squad: [
      ["Maignan", "GK", 85, 16], ["Koundé", "RB", 84, 5], ["Saliba", "CB", 87, 17],
      ["Upamecano", "CB", 84, 4], ["Hernández", "LB", 85, 22], ["Tchouaméni", "CDM", 85, 8],
      ["Camavinga", "CM", 84, 6], ["Rabiot", "CM", 83, 14], ["Dembélé", "RW", 87, 11],
      ["Mbappé", "ST", 91, 10], ["Barcola", "LW", 82, 20],
      ["Olise", "RW", 86, 7], ["Thuram", "ST", 83, 9], ["Chevalier", "GK", 80, 1],
      ["Konaté", "CB", 84, 3], ["Zaïre-Emery", "CM", 82, 18], ["Kolo Muani", "ST", 81, 12], ["Digne", "LB", 79, 21]
    ] },

  { id: "eng", name: "Engeland", abbr: "ENG", anthem: "gstk", anthemName: "God Save the King",
    kit: { shirt: "#ffffff", short: "#12225c", sock: "#ffffff", num: "#12225c" },
    gkKit: { shirt: "#8a2be2", short: "#25103f", sock: "#8a2be2", num: "#ffffff" },
    squad: [
      ["Pickford", "GK", 83, 1], ["Alexander-Arnold", "RB", 86, 12], ["Stones", "CB", 84, 5],
      ["Guéhi", "CB", 82, 6], ["Lewis-Skelly", "LB", 79, 3], ["Rice", "CDM", 87, 4],
      ["Bellingham", "CAM", 90, 10], ["Palmer", "CM", 86, 20], ["Saka", "RW", 87, 7],
      ["Kane", "ST", 89, 9], ["Foden", "LW", 87, 11],
      ["Gordon", "LW", 83, 17], ["Konsa", "CB", 80, 2], ["Henderson", "GK", 79, 13],
      ["Trippier", "RB", 80, 21], ["Mainoo", "CM", 81, 26], ["Watkins", "ST", 83, 18], ["Branthwaite", "CB", 80, 15]
    ] },

  { id: "ger", name: "Duitsland", abbr: "GER", anthem: "deutschland", anthemName: "Deutschlandlied",
    kit: { shirt: "#f2f2f2", short: "#101010", sock: "#f2f2f2", num: "#101010" },
    gkKit: { shirt: "#00a3a3", short: "#04302f", sock: "#00a3a3", num: "#04302f" },
    squad: [
      ["Neuer", "GK", 85, 1], ["Kimmich", "RB", 87, 6], ["Rüdiger", "CB", 85, 2],
      ["Tah", "CB", 83, 4], ["Raum", "LB", 81, 3], ["Andrich", "CDM", 82, 23],
      ["Wirtz", "CAM", 88, 17], ["Musiala", "CAM", 88, 10], ["Sané", "RW", 84, 19],
      ["Havertz", "ST", 84, 7], ["Gnabry", "LW", 83, 20],
      ["Füllkrug", "ST", 81, 9], ["Schlotterbeck", "CB", 82, 15], ["Baumann", "GK", 78, 12],
      ["Ter Stegen", "GK", 87, 22], ["Henrichs", "RB", 79, 5], ["Groß", "CM", 79, 8], ["Undav", "ST", 81, 11]
    ] },

  { id: "bra", name: "Brazilië", abbr: "BRA", anthem: "brasil", anthemName: "Hino Nacional Brasileiro",
    kit: { shirt: "#ffd400", short: "#1b3fae", sock: "#ffffff", num: "#0b6b3a" },
    gkKit: { shirt: "#1b1b1b", short: "#1b1b1b", sock: "#1b1b1b", num: "#ffd400" },
    squad: [
      ["Alisson", "GK", 88, 1], ["Danilo", "RB", 81, 2], ["Marquinhos", "CB", 85, 4],
      ["Gabriel", "CB", 85, 3], ["Wendell", "LB", 79, 6], ["Bruno Guimarães", "CDM", 85, 5],
      ["Paquetá", "CM", 83, 8], ["Rodrygo", "CAM", 85, 10], ["Raphinha", "RW", 87, 11],
      ["Endrick", "ST", 80, 9], ["Vinícius Jr.", "LW", 90, 7],
      ["Militão", "CB", 84, 13], ["Martinelli", "LW", 81, 19], ["Éderson", "GK", 86, 12],
      ["Casemiro", "CDM", 83, 15], ["Arana", "LB", 78, 16], ["Savinho", "RW", 82, 20], ["João Pedro", "ST", 80, 18]
    ] },

  { id: "arg", name: "Argentinië", abbr: "ARG", anthem: "argentina", anthemName: "Himno Nacional Argentino",
    kit: { shirt: "#7ec8e8", short: "#101a3c", sock: "#ffffff", num: "#101a3c", streep: true },
    gkKit: { shirt: "#12d18e", short: "#052b1e", sock: "#12d18e", num: "#052b1e" },
    squad: [
      ["E. Martínez", "GK", 86, 23], ["Molina", "RB", 82, 26], ["Romero", "CB", 85, 13],
      ["Otamendi", "CB", 82, 19], ["Tagliafico", "LB", 80, 3], ["De Paul", "CDM", 83, 7],
      ["Mac Allister", "CM", 85, 20], ["E. Fernández", "CM", 85, 24], ["Messi", "CAM", 88, 10],
      ["L. Martínez", "ST", 88, 22], ["Álvarez", "LW", 86, 9],
      ["Dybala", "CAM", 84, 21], ["Nico Paz", "CM", 79, 15], ["Rulli", "GK", 80, 1],
      ["Paredes", "CDM", 81, 5], ["Acuña", "LB", 80, 8], ["N. González", "RW", 81, 11], ["Lo Celso", "CAM", 80, 18]
    ] },

  { id: "esp", name: "Spanje", abbr: "ESP", anthem: "espana", anthemName: "Marcha Real",
    kit: { shirt: "#c8102e", short: "#12225c", sock: "#c8102e", num: "#ffd400" },
    gkKit: { shirt: "#2b2b2b", short: "#2b2b2b", sock: "#2b2b2b", num: "#ffd400" },
    squad: [
      ["Simón", "GK", 84, 23], ["Carvajal", "RB", 85, 2], ["Le Normand", "CB", 82, 14],
      ["Laporte", "CB", 83, 14], ["Cucurella", "LB", 82, 24], ["Rodri", "CDM", 91, 16],
      ["Zubimendi", "CM", 84, 18], ["Pedri", "CM", 88, 8], ["Yamal", "RW", 89, 19],
      ["Morata", "ST", 82, 7], ["N. Williams", "LW", 85, 17],
      ["Olmo", "CAM", 85, 10], ["Merino", "CM", 83, 20], ["Raya", "GK", 84, 1],
      ["Grimaldo", "LB", 83, 3], ["Baena", "CAM", 81, 22], ["Oyarzabal", "ST", 83, 21], ["Vivian", "CB", 80, 4]
    ] },

  { id: "ita", name: "Italië", abbr: "ITA", anthem: "italia", anthemName: "Il Canto degli Italiani",
    kit: { shirt: "#1b4fa0", short: "#ffffff", sock: "#1b4fa0", num: "#ffffff" },
    gkKit: { shirt: "#c9d600", short: "#2a2f04", sock: "#c9d600", num: "#2a2f04" },
    squad: [
      ["Donnarumma", "GK", 89, 21], ["Di Lorenzo", "RB", 83, 2], ["Bastoni", "CB", 86, 23],
      ["Calafiori", "CB", 82, 5], ["Dimarco", "LB", 84, 32], ["Tonali", "CDM", 84, 8],
      ["Barella", "CM", 86, 18], ["Frattesi", "CM", 81, 16], ["Chiesa", "RW", 82, 14],
      ["Retegui", "ST", 83, 9], ["Politano", "LW", 80, 11],
      ["Raspadori", "ST", 79, 10], ["Buongiorno", "CB", 82, 4], ["Vicario", "GK", 82, 1],
      ["Cambiaso", "RB", 81, 3], ["Locatelli", "CDM", 80, 6], ["Zaccagni", "LW", 80, 20], ["Scamacca", "ST", 79, 7]
    ] }
];

/* 4-3-3 als fracties van de veldlengte/breedte, voor het team dat naar rechts speelt. */
const FORMATION = [
  { role: "GK",  x: 0.045, y: 0.50 },
  { role: "RB",  x: 0.22,  y: 0.16 },
  { role: "CB",  x: 0.16,  y: 0.38 },
  { role: "CB",  x: 0.16,  y: 0.62 },
  { role: "LB",  x: 0.22,  y: 0.84 },
  { role: "CDM", x: 0.34,  y: 0.50 },
  { role: "CM",  x: 0.45,  y: 0.28 },
  { role: "CM",  x: 0.45,  y: 0.72 },
  { role: "RW",  x: 0.68,  y: 0.16 },
  { role: "ST",  x: 0.74,  y: 0.50 },
  { role: "LW",  x: 0.68,  y: 0.84 }
];

function buildSquad(team) {
  return team.squad.map((row, i) => {
    const [name, pos, rating, num] = row;
    return {
      name: name, pos: pos, rating: rating, number: num,
      stats: statsFor(name + team.id, pos, rating),
      isGK: pos === "GK", starter: i < 11
    };
  });
}
