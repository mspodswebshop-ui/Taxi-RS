/* Spelersdatabase — fictieve ratings, seizoen 26. */
const PLAYERS = [
  // ---------------- KEEPERS (stats: DIV HAN KIC REF SPD POS) ----------------
  { n: "G. Donnarumma",   p: "GK",  r: 89, c: "Manchester City", t: "Italië",     s: [88, 86, 83, 90, 52, 87], k: 1 },
  { n: "T. Courtois",     p: "GK",  r: 89, c: "Real Madrid",     t: "België",     s: [90, 85, 78, 90, 49, 88], k: 1 },
  { n: "Alisson",         p: "GK",  r: 88, c: "Liverpool",       t: "Brazilië",   s: [87, 85, 86, 89, 55, 86], k: 1 },
  { n: "J. Oblak",        p: "GK",  r: 86, c: "Atlético Madrid", t: "Slovenië",   s: [86, 84, 74, 88, 47, 85], k: 1 },
  { n: "M. Maignan",      p: "GK",  r: 85, c: "Milan",           t: "Frankrijk",  s: [85, 83, 82, 87, 58, 84], k: 1 },
  { n: "B. Verbruggen",   p: "GK",  r: 82, c: "Brighton",        t: "Nederland",  s: [81, 80, 84, 83, 56, 80], k: 1 },

  // ---------------- VERDEDIGERS ----------------
  { n: "V. van Dijk",     p: "CB",  r: 88, c: "Liverpool",       t: "Nederland",  s: [74, 61, 73, 74, 90, 87] },
  { n: "R. Dias",         p: "CB",  r: 88, c: "Manchester City", t: "Portugal",   s: [69, 43, 70, 71, 89, 85] },
  { n: "W. Saliba",       p: "CB",  r: 87, c: "Arsenal",         t: "Frankrijk",  s: [82, 42, 68, 72, 87, 84] },
  { n: "A. Bastoni",      p: "CB",  r: 86, c: "Inter",           t: "Italië",     s: [76, 45, 76, 74, 86, 82] },
  { n: "A. Rüdiger",      p: "CB",  r: 85, c: "Real Madrid",     t: "Duitsland",  s: [80, 48, 68, 70, 85, 86] },
  { n: "J. Gvardiol",     p: "CB",  r: 85, c: "Manchester City", t: "Kroatië",    s: [79, 52, 71, 74, 84, 83] },
  { n: "A. Hakimi",       p: "RB",  r: 86, c: "Paris SG",        t: "Marokko",    s: [93, 74, 80, 85, 76, 78] },
  { n: "T. Alexander-A.", p: "RB",  r: 86, c: "Real Madrid",     t: "Engeland",   s: [78, 74, 91, 82, 76, 74] },
  { n: "T. Hernández",    p: "LB",  r: 85, c: "Milan",           t: "Frankrijk",  s: [92, 73, 78, 84, 76, 82] },
  { n: "A. Davies",       p: "LB",  r: 84, c: "Bayern München",  t: "Canada",     s: [95, 66, 76, 85, 75, 76] },
  { n: "N. Mendes",       p: "LB",  r: 84, c: "Paris SG",        t: "Portugal",   s: [90, 58, 74, 82, 80, 77] },
  { n: "J. Frimpong",     p: "RB",  r: 82, c: "Liverpool",       t: "Nederland",  s: [95, 70, 73, 84, 71, 70] },
  { n: "M. Akanji",       p: "CB",  r: 84, c: "Inter",           t: "Zwitserland",s: [77, 44, 72, 73, 84, 81] },
  { n: "L. Hernández",    p: "CB",  r: 83, c: "Paris SG",        t: "Frankrijk",  s: [83, 46, 68, 72, 83, 84] },

  // ---------------- MIDDENVELDERS ----------------
  { n: "Rodri",           p: "CDM", r: 91, c: "Manchester City", t: "Spanje",     s: [66, 78, 86, 82, 88, 84] },
  { n: "J. Bellingham",   p: "CAM", r: 90, c: "Real Madrid",     t: "Engeland",   s: [82, 87, 85, 88, 78, 84] },
  { n: "F. Valverde",     p: "CM",  r: 89, c: "Real Madrid",     t: "Uruguay",    s: [86, 85, 86, 85, 79, 84] },
  { n: "F. Wirtz",        p: "CAM", r: 88, c: "Liverpool",       t: "Duitsland",  s: [82, 83, 89, 91, 58, 68] },
  { n: "Pedri",           p: "CM",  r: 88, c: "Barcelona",       t: "Spanje",     s: [76, 76, 89, 90, 68, 66] },
  { n: "J. Musiala",      p: "CAM", r: 88, c: "Bayern München",  t: "Duitsland",  s: [84, 82, 84, 93, 52, 68] },
  { n: "K. De Bruyne",    p: "CAM", r: 88, c: "Napoli",          t: "België",     s: [70, 87, 94, 85, 62, 76] },
  { n: "D. Rice",         p: "CM",  r: 87, c: "Arsenal",         t: "Engeland",   s: [76, 77, 83, 81, 87, 86] },
  { n: "Vitinha",         p: "CM",  r: 87, c: "Paris SG",        t: "Portugal",   s: [79, 79, 88, 89, 74, 70] },
  { n: "M. Ødegaard",     p: "CAM", r: 87, c: "Arsenal",         t: "Noorwegen",  s: [74, 82, 89, 88, 60, 66] },
  { n: "J. Kimmich",      p: "CDM", r: 87, c: "Bayern München",  t: "Duitsland",  s: [70, 76, 90, 83, 82, 76] },
  { n: "F. de Jong",      p: "CM",  r: 86, c: "Barcelona",       t: "Nederland",  s: [77, 71, 87, 89, 76, 78] },
  { n: "C. Palmer",       p: "CAM", r: 86, c: "Chelsea",         t: "Engeland",   s: [78, 85, 86, 88, 56, 70] },
  { n: "E. Fernández",    p: "CM",  r: 85, c: "Chelsea",         t: "Argentinië", s: [72, 79, 87, 83, 78, 78] },
  { n: "A. Tchouaméni",   p: "CDM", r: 85, c: "Real Madrid",     t: "Frankrijk",  s: [72, 66, 79, 76, 85, 85] },
  { n: "X. Simons",       p: "CAM", r: 84, c: "Tottenham",       t: "Nederland",  s: [84, 79, 82, 88, 52, 64] },

  // ---------------- AANVALLERS ----------------
  { n: "K. Mbappé",       p: "ST",  r: 91, c: "Real Madrid",     t: "Frankrijk",  s: [97, 90, 80, 92, 36, 78] },
  { n: "E. Haaland",      p: "ST",  r: 91, c: "Manchester City", t: "Noorwegen",  s: [89, 93, 68, 81, 45, 89] },
  { n: "Vinícius Jr.",    p: "LW",  r: 90, c: "Real Madrid",     t: "Brazilië",   s: [95, 84, 79, 93, 30, 70] },
  { n: "L. Yamal",        p: "RW",  r: 89, c: "Barcelona",       t: "Spanje",     s: [88, 82, 86, 93, 36, 64] },
  { n: "M. Salah",        p: "RW",  r: 89, c: "Liverpool",       t: "Egypte",     s: [90, 88, 82, 89, 45, 76] },
  { n: "H. Kane",         p: "ST",  r: 89, c: "Bayern München",  t: "Engeland",   s: [69, 93, 85, 83, 48, 84] },
  { n: "L. Martínez",     p: "ST",  r: 88, c: "Inter",           t: "Argentinië", s: [86, 89, 76, 86, 46, 82] },
  { n: "B. Saka",         p: "RW",  r: 87, c: "Arsenal",         t: "Engeland",   s: [86, 83, 82, 88, 48, 72] },
  { n: "O. Dembélé",      p: "RW",  r: 87, c: "Paris SG",        t: "Frankrijk",  s: [92, 84, 82, 91, 40, 68] },
  { n: "V. Gyökeres",     p: "ST",  r: 86, c: "Arsenal",         t: "Zweden",     s: [87, 87, 68, 80, 42, 86] },
  { n: "M. Olise",        p: "RW",  r: 86, c: "Bayern München",  t: "Frankrijk",  s: [83, 82, 86, 89, 44, 66] },
  { n: "R. Leão",         p: "LW",  r: 85, c: "Milan",           t: "Portugal",   s: [93, 81, 76, 88, 34, 78] },
  { n: "C. Gakpo",        p: "LW",  r: 84, c: "Liverpool",       t: "Nederland",  s: [83, 82, 78, 84, 42, 79] },
  { n: "D. Núñez",        p: "ST",  r: 83, c: "Al-Hilal",        t: "Uruguay",    s: [92, 84, 66, 78, 40, 84] },

  // ---------------- ICONEN ----------------
  { n: "Z. Zidane",       p: "CAM", r: 95, c: "Iconen",          t: "Frankrijk",  s: [80, 86, 93, 96, 72, 84], i: 1 },
  { n: "Ronaldinho",      p: "CAM", r: 94, c: "Iconen",          t: "Brazilië",   s: [89, 88, 92, 97, 42, 76], i: 1 },
  { n: "T. Henry",        p: "ST",  r: 94, c: "Iconen",          t: "Frankrijk",  s: [96, 93, 82, 93, 40, 80], i: 1 },
  { n: "P. Maldini",      p: "CB",  r: 94, c: "Iconen",          t: "Italië",     s: [83, 55, 78, 80, 94, 87], i: 1 },
  { n: "R. Gullit",       p: "CM",  r: 92, c: "Iconen",          t: "Nederland",  s: [86, 89, 86, 88, 80, 90], i: 1 },
  { n: "R. Carlos",       p: "LB",  r: 92, c: "Iconen",          t: "Brazilië",   s: [95, 86, 82, 88, 84, 89], i: 1 },
  { n: "L. Yashin",       p: "GK",  r: 91, c: "Iconen",          t: "Rusland",    s: [92, 88, 82, 92, 60, 90], k: 1, i: 1 }
];
PLAYERS.forEach(function (p, idx) { p.id = idx; });
