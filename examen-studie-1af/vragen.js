/* Vragenbank Examen studie 1Af.
 * Elke vak-functie krijgt een seeded random-functie (rng) en geeft >100 vragen terug.
 * Vragen met getallen worden elke dag opnieuw gemaakt met nieuwe getallen.
 * Formaat: {vraag, opties:[juist, fout, fout, ...], juist:0, uitleg}. De app schudt de volgorde. */
(function () {
  "use strict";
  const M = (vraag, juist, fout, uitleg) => ({ vraag, opties: [juist, ...fout], juist: 0, uitleg: uitleg || "" });
  const int = (a, b, r) => a + Math.floor(r() * (b - a + 1));
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const others = (all, correct, n, r) => shuffle(all.filter(x => x !== correct), r).slice(0, n);
  const cat = (vraag, juist, cats, uitleg, r) => M(vraag, juist, others(cats, juist, 3, r), uitleg);
  const n = x => (x < 0 ? "−" + Math.abs(x) : String(x));
  const p = x => (x < 0 ? "(" + n(x) + ")" : n(x));
  const nz = (a, b, r) => { let x = 0; while (x === 0) x = int(a, b, r); return x; };
  function numOpts(ans, cands, r) {
    const set = new Set(); for (const c of cands) if (c !== ans && Number.isFinite(c)) set.add(c);
    let k = 1; while (set.size < 3) { if (ans + k !== ans) set.add(ans + k); if (set.size < 3) set.add(ans - k); k++; }
    return shuffle([...set], r).slice(0, 3);
  }
  const NM = (vraag, ans, cands, uitleg, r) => M(vraag, n(ans), numOpts(ans, cands, r).map(n), uitleg);
  const sp = x => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const dec = x => String(Math.round(x * 1e6) / 1e6).replace(".", ",");

  /* ---------------- WISKUNDE ---------------- */
  function wiskunde(r) {
    const Q = [];
    for (let i = 0; i < 14; i++) {
      const a = nz(-25, 25, r), b = nz(-25, 25, r), s = a + b;
      const zelfde = (a < 0) === (b < 0);
      Q.push(NM(p(a) + " + " + p(b) + " = ?", s, [a - b, -s, b - a, Math.abs(a) + Math.abs(b)], zelfde
        ? "Zelfde teken: tel de absolute waarden op en behoud het teken."
        : "Verschillend teken: trek de absolute waarden van elkaar af en neem het teken van het getal met de grootste absolute waarde.", r));
    }
    for (let i = 0; i < 12; i++) {
      const a = nz(-20, 20, r), b = nz(-20, 20, r), s = a - b;
      Q.push(NM(p(a) + " − " + p(b) + " = ?", s, [a + b, -s, b - a], "Aftrekken = optellen met het tegengestelde: " + p(a) + " + " + p(-b) + " = " + n(s) + ".", r));
    }
    for (let i = 0; i < 10; i++) {
      const k = i < 6 ? 2 : 3; const f = []; for (let j = 0; j < k; j++) f.push(nz(-9, 9, r));
      const prod = f.reduce((x, y) => x * y, 1), min = f.filter(x => x < 0).length;
      Q.push(NM(f.map(p).join(" · ") + " = ?", prod, [-prod, f.reduce((x, y) => x + y, 0), prod + f[0]],
        min + (min === 1 ? " minteken" : " mintekens") + ": " + (min % 2 === 0 ? "even aantal, dus positief." : "oneven aantal, dus negatief."), r));
    }
    for (let i = 0; i < 10; i++) {
      const q = nz(-12, 12, r), d = nz(-9, 9, r), a = q * d;
      Q.push(NM(p(a) + " : " + p(d) + " = ?", q, [-q, a - d, d], "Delen: zelfde tekenregel als vermenigvuldigen. " + n(Math.abs(a)) + " : " + Math.abs(d) + " = " + Math.abs(q) + ".", r));
    }
    for (let i = 0; i < 12; i++) {
      const t = i % 5, a = int(2, 20, r), b = int(2, 9, r), c = int(2, 9, r);
      if (t === 0) Q.push(NM(a + " + " + b + " · " + c + " = ?", a + b * c, [(a + b) * c, a * b + c], "Eerst vermenigvuldigen: " + b + " · " + c + " = " + b * c + ", dan optellen.", r));
      if (t === 1) Q.push(NM(a + " − " + b + " · " + c + " = ?", a - b * c, [(a - b) * c, b * c - a], "Eerst vermenigvuldigen: " + b * c + ". Dan " + a + " − " + b * c + ".", r));
      if (t === 2) Q.push(NM("(" + a + " + " + b + ") · " + c + " = ?", (a + b) * c, [a + b * c, a * c + b], "Eerst de haakjes: " + (a + b) + " · " + c + ".", r));
      if (t === 3) { const d = int(2, 6, r), e = d * int(2, 6, r); Q.push(NM(a + " · " + b + " − " + e + " : " + d + " = ?", a * b - e / d, [(a * b - e) / d, a * b - e * d], "Eerst · en : (" + a * b + " en " + e / d + "), dan aftrekken.", r)); }
      if (t === 4) Q.push(NM(a + " − " + b + " + " + c + " = ?", a - b + c, [a - (b + c), a + b - c], "Optellen en aftrekken: gewoon van links naar rechts.", r));
    }
    for (let i = 0; i < 8; i++) {
      const x = nz(-30, 30, r);
      if (i % 2 === 0) Q.push(NM("|" + n(x) + "| = ?", Math.abs(x), [-Math.abs(x), x === Math.abs(x) ? -x : x], "De absolute waarde is het getal zonder toestandsteken.", r));
      else Q.push(NM("Wat is het tegengestelde van " + n(x) + "?", -x, [x, Math.abs(x) === -x ? x : Math.abs(x) + 1], "Een getal en zijn tegengestelde zijn samen 0.", r));
    }
    const getallen = [["7", "ℕ"], ["0", "ℕ"], ["125", "ℕ"], ["−3", "ℤ"], ["−48", "ℤ"], ["−1", "ℤ"], ["1/2", "ℚ"], ["−5/4", "ℚ"], ["0,75", "ℚ"], ["−2,5", "ℚ"], ["10/5", "ℕ"], ["−12/4", "ℤ"]];
    shuffle(getallen, r).slice(0, 10).forEach(([g, s]) => Q.push(cat("Wat is de kleinste verzameling waartoe " + g + " behoort?", s, ["ℕ", "ℤ", "ℚ", "geen van deze"],
      s === "ℕ" ? "Het is een natuurlijk getal (en dus ook geheel en rationaal)." : s === "ℤ" ? "Negatief en geheel: ℤ, niet ℕ." : "Geen geheel getal, wel als breuk te schrijven: ℚ.", r)));
    for (let i = 0; i < 10; i++) {
      const t = i % 3, a = int(12, 85, r);
      if (t === 0) Q.push(NM("Een hoek is " + a + "°. Hoe groot is zijn nevenhoek? (in °)", 180 - a, [90 - a, a, 360 - a], "Nevenhoeken zijn samen 180°.", r));
      if (t === 1) Q.push(NM("Hoek A is " + a + "°. Hoe groot is een hoek die complementair is met A? (in °)", 90 - a, [180 - a, a, 360 - a], "Complementair = samen 90°.", r));
      if (t === 2) Q.push(NM("Twee rechten snijden. Een hoek is " + (a + 40) + "°. Hoe groot is zijn overstaande hoek? (in °)", a + 40, [180 - a - 40, 90, 360 - a - 40], "Overstaande hoeken zijn even groot.", r));
    }
    const hoekSoort = g => g === 0 ? "nulhoek" : g < 90 ? "scherpe hoek" : g === 90 ? "rechte hoek" : g < 180 ? "stompe hoek" : g === 180 ? "gestrekte hoek" : g < 360 ? "inspringende hoek" : "volle hoek";
    const soorten = ["nulhoek", "scherpe hoek", "rechte hoek", "stompe hoek", "gestrekte hoek", "inspringende hoek", "volle hoek"];
    [int(5, 85, r), 90, int(95, 175, r), 180, int(185, 355, r), 360, int(10, 80, r), int(100, 170, r)].forEach(g =>
      Q.push(cat("Een hoek van " + g + "° is een …", hoekSoort(g), soorten, "scherp < 90°, recht = 90°, stomp tussen 90° en 180°, gestrekt = 180°, inspringend tussen 180° en 360°, vol = 360°.", r)));
    const eenh = ["km", "hm", "dam", "m", "dm", "cm", "mm"];
    for (let i = 0; i < 8; i++) {
      let a = int(0, 6, r), b = int(0, 6, r); while (Math.abs(a - b) < 1 || Math.abs(a - b) > 3) b = int(0, 6, r);
      const v = int(1, 99, r) / (r() < .5 ? 1 : 10), ans = v * Math.pow(10, b - a);
      Q.push(M(dec(v) + " " + eenh[a] + " = … " + eenh[b], dec(ans), [dec(ans * 10), dec(ans / 10), dec(b > a ? v * Math.pow(10, b - a - 1) * 100 : ans * 100)].filter((x, j, s) => x !== dec(ans) && s.indexOf(x) === j).concat([dec(ans * 1000)]).slice(0, 3),
        "Elke stap in km – hm – dam – m – dm – cm – mm is × 10 (naar rechts) of : 10 (naar links). Van " + eenh[a] + " naar " + eenh[b] + " is " + Math.abs(b - a) + " stap(pen)."));
    }
    const namen = ["eenheden", "tientallen", "honderdtallen", "duizendtallen", "tienduizendtallen"];
    for (let i = 0; i < 6; i++) {
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, 5), num = Number(digits.join("")), pos = int(1, 4, r), d = digits[4 - pos];
      Q.push(M("Wat is de waarde van het cijfer " + d + " in " + sp(num) + "?", sp(d * Math.pow(10, pos)), [d, d * Math.pow(10, pos + 1), d * Math.pow(10, Math.max(0, pos - 1)) === d ? d * 1000000 : d * Math.pow(10, pos - 1)].map(sp), "Het cijfer " + d + " staat bij de " + namen[pos] + "."));
    }
    Q.push(
      M("Wat is het verschil tussen een cijfer en een getal?", "Een cijfer is een teken 0–9, een getal bestaat uit cijfers", ["Er is geen verschil", "Een getal is altijd kleiner dan 10", "Een cijfer kan negatief zijn"]),
      M("Welke uitspraak klopt?", "ℕ ⊂ ℤ", ["ℤ ⊂ ℕ", "ℚ ⊂ ℤ", "−3 ∈ ℕ"], "Elk natuurlijk getal is ook een geheel getal."),
      M("Wat betekent ∉?", "is geen element van", ["is geen deelverzameling van", "is kleiner dan", "is niet gelijk aan"]),
      M("In 17 : 5 = 3 rest 2, wat is het deeltal?", "17", ["5", "3", "2"], "deeltal : deler = quotiënt (+ rest)."),
      M("Hoe heet de uitkomst van een vermenigvuldiging?", "product", ["som", "quotiënt", "verschil"]),
      M("Hoe heet de uitkomst van een aftrekking?", "verschil", ["som", "product", "quotiënt"]),
      M("Wat is het neutrale element bij optellen?", "0", ["1", "−1", "er is er geen"], "a + 0 = a."),
      M("Wat is het opslorpend element bij vermenigvuldigen?", "0", ["1", "−1", "10"], "Alles maal 0 is 0."),
      M("Welke eigenschap is a · (b + c) = a · b + a · c?", "distributiviteit", ["commutativiteit", "associativiteit", "neutraal element"]),
      M("Welke eigenschap is a + b = b + a?", "commutativiteit", ["associativiteit", "distributiviteit", "opslorpend element"]),
      M("Welke notatie is een lijnstuk?", "[AB]", ["[AB", "AB", "|AB|"], "[AB] is het lijnstuk, [AB een halfrechte, |AB| de lengte."),
      M("Wanneer is M het midden van [AB]?", "M ∈ [AB] en |AM| = |MB|", ["|AM| = |AB|", "M ligt buiten [AB]", "M ∈ AB en |AM| > |MB|"]),
      M("Welke figuur is een veelvlak?", "kubus", ["bol", "cilinder", "kegel"], "Een veelvlak heeft alleen vlakke zijvlakken."),
      M("Welke volgorde van bewerkingen klopt?", "haakjes → machten → · en : → + en −", ["+ en − → · en : → haakjes", "van links naar rechts, altijd", "· → + → haakjes → :"])
    );
    return Q;
  }

  /* ---------------- ENGELS ---------------- */
  function engels(r) {
    const Q = [];
    const subj = [["I", "am", "twelve years old"], ["You", "are", "my best friend"], ["He", "is", "from Spain"], ["She", "is", "very funny"], ["It", "is", "a big dog"], ["We", "are", "in class 1Af"], ["They", "are", "at school"], ["My mum", "is", "a nurse"], ["Tom and Lisa", "are", "cousins"], ["The dog", "is", "hungry"], ["My friends", "are", "at the park"], ["Our teacher", "is", "nice"], ["You and I", "are", "a team"], ["The children", "are", "in the garden"]];
    subj.forEach(([s, v, t]) => Q.push(M(s + " ___ " + t + ".", v, ["am", "is", "are", "be"].filter(x => x !== v),
      v === "am" ? "I → am." : v === "is" ? "Eén persoon of ding (he/she/it) → is." : "Meervoud of you → are.")));
    const neg = { am: "'m not", is: "isn't", are: "aren't" };
    shuffle(subj.slice(1), r).slice(0, 6).forEach(([s, v, t]) => Q.push(M(s + " ___ " + t + ". (ontkenning, kort)", neg[v], ["isn't", "aren't", "not is", "don't"].filter(x => x !== neg[v]).slice(0, 3), "is not → isn't, are not → aren't.")));
    Q.push(
      M("Are you twelve? – Yes, …", "I am.", ["I'm.", "I are.", "you are."], "Bij Yes gebruik je geen samentrekking."),
      M("Is she your sister? – No, …", "she isn't.", ["she is.", "she aren't.", "she not."]),
      M("Are they from Italy? – Yes, …", "they are.", ["they're.", "they is.", "we are."]),
      M("Is it a cat? – No, …", "it isn't.", ["it aren't.", "it's not is.", "he isn't."]),
      M("Are you and Tom friends? – Yes, …", "we are.", ["you are.", "they are.", "we're."]),
      M("Is your dad a teacher? – Yes, …", "he is.", ["he's.", "she is.", "it is."]),
      M("Am I late? – No, …", "you aren't.", ["I'm not.", "you isn't.", "you not."]),
      M("Are the boys at home? – No, …", "they aren't.", ["they isn't.", "he isn't.", "we aren't."])
    );
    const pron = [["Sarah", "she"], ["Mr Smith", "he"], ["my brother and I", "we"], ["the cat", "it"], ["Lisa and Emma", "they"], ["you and Tom", "you"], ["the books", "they"], ["my dad", "he"], ["the house", "it"], ["my sister", "she"]];
    pron.forEach(([w, a]) => Q.push(cat("Welk persoonlijk voornaamwoord vervangt '" + w + "'?", a, ["I", "you", "he", "she", "it", "we", "they"], "", r)));
    [["___ book here in my hand is new.", "This"], ["___ shoes on my feet are new.", "These"], ["Look at ___ car over there!", "that"], ["Look at ___ stars in the sky!", "those"], ["___ is my pen, here on my desk.", "This"], ["___ boys over there are my brothers.", "Those"], ["Is ___ your bike, there across the street?", "that"], ["___ cookies here are delicious!", "These"]].forEach(([z, a]) => {
      const all = ["this", "these", "that", "those"].map(x => a[0] === a[0].toUpperCase() ? x[0].toUpperCase() + x.slice(1) : x);
      Q.push(cat(z, a, all, "Dichtbij: this (1) / these (meer). Veraf: that (1) / those (meer).", r));
    });
    [["___ is your name? – My name is Tom.", "What"], ["___ are you from? – From Spain.", "Where"], ["___ old are you? – I'm twelve.", "How"], ["___ is your best friend? – Emma.", "Who"], ["___ is your birthday? – In May.", "When"], ["___ are you sad? – Because my dog is ill.", "Why"], ["___ are you? – I'm fine, thanks.", "How"], ["___ is your favourite colour? – Blue.", "What"], ["___ do you live? – In Boom.", "Where"], ["___ is that girl? – She's my sister.", "Who"]].forEach(([z, a]) =>
      Q.push(cat(z, a, ["What", "Where", "How", "Who", "When", "Why"], "who = wie, what = wat, where = waar, when = wanneer, why = waarom, how = hoe.", r)));
    const nat = [["Belgium", "Belgian"], ["the Netherlands", "Dutch"], ["France", "French"], ["Germany", "German"], ["England", "English"], ["the United Kingdom", "British"], ["the USA", "American"], ["Spain", "Spanish"], ["Italy", "Italian"], ["Morocco", "Moroccan"], ["Turkey", "Turkish"], ["Poland", "Polish"], ["China", "Chinese"], ["Japan", "Japanese"]];
    nat.forEach(([c, a]) => Q.push(cat("Someone from " + c + " is …", a, nat.map(x => x[1]), "Nationaliteiten schrijf je met een hoofdletter.", r)));
    const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const word = x => x < 20 ? ones[x] : x === 100 ? "a hundred" : tens[Math.floor(x / 10)] + (x % 10 ? "-" + ones[x % 10] : "");
    const wrongWord = (x, k) => {
      const w = word(x);
      const opts = [w.replace("forty", "fourty"), w.replace("teen", "ty"), w.replace(/ty(-|$)/, "teen$1"), w.replace("-", " "), w.replace("nine", "nin"), word(Math.min(100, x + 10)), word(Math.max(0, x - 10))];
      return opts.filter(o => o !== w);
    };
    const nums = new Set(); while (nums.size < 15) nums.add(r() < .3 ? int(13, 19, r) : int(20, 99, r));
    [...nums].forEach(x => { const f = [...new Set(wrongWord(x))]; Q.push(M("Hoe schrijf je " + x + " in het Engels?", word(x), shuffle(f, r).slice(0, 3), "Let op: forty zonder u, en een streepje tussen tientallen en eenheden.")); });
    Q.push(
      M("I love ___ in the sea.", "swimming", ["swim", "swims", "to swimming"], "Na love/like/hate: werkwoord + -ing."),
      M("She hates ___ homework.", "doing", ["do", "does", "did"]),
      M("Welke reeks gaat van heel graag naar helemaal niet?", "love – like – don't mind – don't like – hate", ["like – love – hate – don't like", "hate – like – love – don't mind", "don't mind – love – like – hate"]),
      M("'I don't mind pizza' betekent …", "Pizza vind ik oké", ["Ik haat pizza", "Ik ben gek op pizza", "Ik ken geen pizza"]),
      M("Kies de juiste zin.", "We like playing football.", ["We likes playing football.", "We like play football.", "We liking football."]),
      M("Kies de juiste schrijfwijze.", "She is Dutch.", ["She is dutch.", "she is Dutch.", "She Is Dutch."], "Nationaliteiten krijgen een hoofdletter."),
      M("Maak een vraag van: 'He is your teacher.'", "Is he your teacher?", ["He is your teacher?", "Is your teacher he?", "Does he your teacher?"], "Inversion: het werkwoord komt vooraan."),
      M("Hoe vraag je iemands leeftijd?", "How old are you?", ["How many years you have?", "What old are you?", "How old you are?"]),
      M("'I' schrijf je …", "altijd met een hoofdletter", ["alleen aan het begin van een zin met hoofdletter", "altijd klein", "met een apostrof"]),
      M("Hoe zeg je 'Ik kom uit België'?", "I'm from Belgium.", ["I'm from Belgian.", "I come Belgium.", "I am of Belgium."]),
      M("Wat is 7 + 8 in het Engels?", "fifteen", ["fifty", "fiveteen", "sixteen"]),
      M("Kies de juiste zin.", "My sister and I are twins.", ["My sister and I is twins.", "My sister and I am twins.", "Me and my sister is twins."]),
      M("Wat betekent 'Nice to meet you'?", "Leuk je te ontmoeten", ["Tot ziens", "Hoe gaat het?", "Wat is je naam?"]),
      M("Hoe beantwoord je 'How are you?'", "I'm fine, thank you.", ["I'm twelve.", "I'm from Belgium.", "My name is Tom."]),
      M("Kies de juiste zin.", "These are my friends.", ["This are my friends.", "These is my friends.", "Those is my friends."]),
      M("Hoe schrijf je 100 in het Engels?", "a hundred", ["one houndred", "a hunderd", "ten-ty"]),
      M("Kies de juiste vraag.", "Where are you from?", ["Where you are from?", "Where is you from?", "From where you are?"])
    );
    return Q;
  }

  /* ---------------- FRANS ---------------- */
  function frans(r) {
    const Q = [];
    const P = ["je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles"];
    const etre = { je: "suis", tu: "es", il: "est", elle: "est", on: "est", nous: "sommes", vous: "êtes", ils: "sont", elles: "sont" };
    const avoir = { je: "ai", tu: "as", il: "a", elle: "a", on: "a", nous: "avons", vous: "avez", ils: "ont", elles: "ont" };
    const vorm = (pr, v) => (pr === "je" && /^[aeiouhéê]/.test(v) ? "j'" : pr + " ") + v;
    P.forEach(pr => {
      const goed = etre[pr], fout = shuffle([...new Set(Object.values(etre))].filter(x => x !== goed), r).slice(0, 3);
      Q.push(M("Être: " + pr + " …", vorm(pr, goed), fout.map(f => vorm(pr, f)), "je suis, tu es, il/elle/on est, nous sommes, vous êtes, ils/elles sont."));
    });
    P.forEach(pr => {
      const goed = avoir[pr], fout = shuffle([...new Set(Object.values(avoir))].filter(x => x !== goed), r).slice(0, 3);
      Q.push(M("Avoir: " + pr + " …", vorm(pr, goed), fout.map(f => vorm(pr, f)), "j'ai, tu as, il/elle/on a, nous avons, vous avez, ils/elles ont."));
    });
    const ER = [["parler", "praten, spreken"], ["aimer", "houden van, graag doen"], ["habiter", "wonen"], ["jouer", "spelen"], ["regarder", "kijken"], ["écouter", "luisteren"], ["danser", "dansen"], ["chanter", "zingen"], ["dessiner", "tekenen"], ["travailler", "werken"], ["chercher", "zoeken"], ["adorer", "dol zijn op"]];
    const end = { je: "e", tu: "es", il: "e", elle: "e", on: "e", nous: "ons", vous: "ez", ils: "ent", elles: "ent" };
    for (let i = 0; i < 20; i++) {
      const [inf] = pick(ER, r), pr = pick(P, r), st = inf.slice(0, -2), goed = st + end[pr];
      const fout = shuffle(["e", "es", "ons", "ez", "ent"].map(e => st + e).filter(x => x !== goed), r).slice(0, 3);
      Q.push(M(inf + ": " + pr + " …", vorm(pr, goed), fout.map(f => vorm(pr, f)), "Stam (" + st + "-) + uitgang: -e, -es, -e, -ons, -ez, -ent."));
    }
    shuffle(ER, r).slice(0, 8).forEach(([inf, nl]) => Q.push(M("Wat betekent '" + inf + "'?", nl, others(ER.map(x => x[1]), nl, 3, r))));
    const N = [["livre", "m"], ["maison", "f"], ["école", "fv"], ["ami", "mv"], ["chat", "m"], ["famille", "f"], ["frère", "m"], ["sœur", "f"], ["enfants", "p"], ["parents", "p"], ["vélo", "m"], ["guitare", "f"], ["oncle", "mv"], ["amie", "fv"]];
    const def = g => g === "p" ? "les" : g.endsWith("v") ? "l'" : g === "m" ? "le" : "la";
    const ind = g => g === "p" ? "des" : g[0] === "m" ? "un" : "une";
    shuffle(N, r).slice(0, 12).forEach(([w, g]) => Q.push(cat("Welk bepaald lidwoord? ___ " + w, def(g), ["le", "la", "l'", "les"], "le (m), la (v), l' voor een klinker, les (meervoud).", r)));
    shuffle(N, r).slice(0, 8).forEach(([w, g]) => Q.push(cat("Welk onbepaald lidwoord? ___ " + w, ind(g), ["un", "une", "des"], "un (m), une (v), des (meervoud).", r)));
    const PERS = { mijn: ["mon", "ma", "mes"], jouw: ["ton", "ta", "tes"], "zijn/haar": ["son", "sa", "ses"], ons: ["notre", "notre", "nos"], "jullie": ["votre", "votre", "vos"], hun: ["leur", "leur", "leurs"] };
    const PN = [["vader", "père", "m"], ["moeder", "mère", "f"], ["broers", "frères", "p"], ["vriendin", "amie", "fv"], ["school", "école", "fv"], ["kat", "chat", "m"], ["zus", "sœur", "f"], ["ouders", "parents", "p"], ["neef", "cousin", "m"], ["familie", "famille", "f"], ["fiets", "vélo", "m"], ["grootouders", "grands-parents", "p"]];
    for (let i = 0; i < 15; i++) {
      const who = pick(Object.keys(PERS), r), [nl, fr, g] = pick(PN, r), f = PERS[who];
      const goed = g === "p" ? f[2] : (g === "m" || g === "fv") ? f[0] : f[1];
      const opts = [...new Set([...f, pick(PERS[pick(Object.keys(PERS).filter(k => k !== who), r)], r)])].filter(x => x !== goed).slice(0, 3);
      Q.push(M(who + " " + nl + " = ___ " + fr, goed, opts, g === "fv" ? "Vrouwelijk woord met een klinker: mon/ton/son in plaats van ma/ta/sa." : "mon ma mes, ton ta tes, son sa ses, notre nos, votre vos, leur leurs."));
    }
    const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
    const T = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };
    const fr = x => {
      if (x <= 16) return U[x]; if (x < 20) return "dix-" + U[x - 10]; if (x === 100) return "cent";
      if (x < 70) { const t = T[Math.floor(x / 10)], e = x % 10; return e === 0 ? t : e === 1 ? t + " et un" : t + "-" + U[e]; }
      if (x < 80) return x === 71 ? "soixante et onze" : "soixante-" + fr(x - 60);
      if (x === 80) return "quatre-vingts"; return "quatre-vingt-" + fr(x - 80);
    };
    const nums = new Set(); while (nums.size < 15) nums.add(r() < .35 ? int(11, 19, r) : int(20, 99, r));
    [...nums].forEach(x => {
      const goed = fr(x), f = [...new Set([fr(Math.min(100, x + 1)), fr(Math.max(0, x - 1)), fr(Math.min(100, x + 10)), goed.replace(" et ", "-"), goed.replace("quatre-vingts", "quatre-vingt")])].filter(o => o !== goed);
      Q.push(M("Hoe schrijf je " + x + " in het Frans?", goed, shuffle(f, r).slice(0, 3), x >= 70 && x < 80 ? "70 = soixante-dix (in België ook septante)." : x >= 90 ? "90 = quatre-vingt-dix (in België ook nonante)." : ""));
    });
    [[1, "premier", ["unëme", "unième", "premième"]], [2, "deuxième", ["deuxme", "secondeème", "deuxiëme"]], [3, "troisième", ["troisme", "troisiéme", "trième"]], [4, "quatrième", ["quatreième", "quatreme", "quatriéme"]], [5, "cinquième", ["cinqième", "cinqème", "cinkuième"]], [9, "neuvième", ["neufième", "neufème", "nevième"]], [11, "onzième", ["onzeième", "onzme", "onziéme"]], [20, "vingtième", ["vingième", "vingtme", "vingteme"]]].forEach(([x, g, f]) =>
      Q.push(M("Rangtelwoord van " + x + ":", g, f, "getal + -ième. 1 = premier/première, bij cinq komt er een u bij, neuf wordt neuv-, een e op het einde valt weg.")));
    const VOC = [["de vader", "le père"], ["de moeder", "la mère"], ["de broer", "le frère"], ["de zus", "la sœur"], ["de grootvader", "le grand-père"], ["de grootmoeder", "la grand-mère"], ["de oom", "l'oncle"], ["de tante", "la tante"], ["de neef (zoon van oom/tante)", "le cousin"], ["de nicht (dochter van oom/tante)", "la cousine"], ["de ouders", "les parents"], ["de zoon", "le fils"]];
    VOC.forEach(([nl, f]) => Q.push(M("Hoe zeg je '" + nl + "' in het Frans?", f, others(VOC.map(x => x[1]), f, 3, r))));
    const HOB = [["fietsen", "faire du vélo"], ["zwemmen", "nager"], ["lezen", "lire"], ["tekenen", "dessiner"], ["voetballen", "jouer au foot"], ["gitaar spelen", "jouer de la guitare"], ["tv kijken", "regarder la télé"], ["zingen", "chanter"]];
    HOB.forEach(([nl, f]) => Q.push(M("Hoe zeg je '" + nl + "' in het Frans?", f, others(HOB.map(x => x[1]), f, 3, r))));
    const DP = [["de familienaam", "le nom"], ["de voornaam", "le prénom"], ["de leeftijd", "l'âge"], ["het adres", "l'adresse"], ["de geboortedatum", "la date de naissance"], ["de nationaliteit", "la nationalité"]];
    DP.forEach(([nl, f]) => Q.push(M("Hoe zeg je '" + nl + "' in het Frans?", f, others(DP.map(x => x[1]), f, 3, r))));
    Q.push(
      M("Hoe heet het teken op de e in 'café'?", "accent aigu", ["accent grave", "accent circonflexe", "tréma"]),
      M("Hoe heet het teken op de e in 'mère'?", "accent grave", ["accent aigu", "accent circonflexe", "cédille"]),
      M("Hoe heet het teken op de e in 'être'?", "accent circonflexe", ["accent aigu", "tréma", "accent grave"]),
      M("Hoe heet het teken onder de c in 'français'?", "cédille", ["tréma", "accent aigu", "apostrophe"], "Met een cédille klinkt de c als een s."),
      M("Hoe heet het teken op de e in 'Noël'?", "tréma", ["accent grave", "cédille", "accent circonflexe"]),
      M("Ik ben twaalf jaar.", "J'ai douze ans.", ["Je suis douze ans.", "J'ai douze.", "Je suis douze."], "Leeftijd zeg je met avoir."),
      M("Hoe stel je je voor?", "Je m'appelle Sara.", ["Je suis appelle Sara.", "Mon nom est appelle Sara.", "J'appelle Sara."])
    );
    return Q;
  }

  /* ---------------- NEDERLANDS ---------------- */
  function nederlands(r) {
    const Q = [];
    const WS = [["huis", "grondwoord"], ["boom", "grondwoord"], ["kat", "grondwoord"], ["school", "grondwoord"], ["tafel", "grondwoord"], ["fiets", "grondwoord"], ["boek", "grondwoord"], ["stoel", "grondwoord"],
      ["voetbal", "samenstelling"], ["schooltas", "samenstelling"], ["boomhut", "samenstelling"], ["fietspad", "samenstelling"], ["zonnebril", "samenstelling"], ["boekenkast", "samenstelling"], ["regenjas", "samenstelling"], ["handschoen", "samenstelling"],
      ["vriendschap", "afleiding"], ["onaardig", "afleiding"], ["leerling", "afleiding"], ["gezondheid", "afleiding"], ["ongeluk", "afleiding"], ["schoonheid", "afleiding"], ["lezer", "afleiding"], ["vriendelijk", "afleiding"]];
    WS.forEach(([w, a]) => Q.push(cat("Is '" + w + "' een grondwoord, samenstelling of afleiding?", a, ["grondwoord", "samenstelling", "afleiding"],
      a === "samenstelling" ? "Twee grondwoorden samen." : a === "afleiding" ? "Grondwoord + voor- of achtervoegsel (on-, -schap, -heid, -ling, -er, -lijk)." : "Je kan het niet kleiner maken.", r)));
    const D = ["informeren", "overtuigen", "activeren", "amuseren", "gevoelens uiten"];
    [["Het weerbericht op de radio", "informeren"], ["Een reclame voor nieuwe sneakers", "overtuigen"], ["Een affiche: 'Schrijf je nu in voor het schooltoneel!'", "activeren"], ["Een mopje in de klasgroep", "amuseren"], ["Een dagboek waarin je schrijft dat je verdrietig bent", "gevoelens uiten"], ["Het nieuws op tv", "informeren"], ["Een verkiezingsfolder: 'Stem op ons!'", "overtuigen"], ["Een grappig stripverhaal", "amuseren"], ["Een brief van de school met de examendata", "informeren"], ["Een bord: 'Gooi je afval in de vuilbak'", "activeren"], ["Een gedicht over je verliefdheid", "gevoelens uiten"], ["Een poster: 'Kom naar de schoolfuif!'", "activeren"], ["Een lezersbrief: 'Waarom er meer fietspaden moeten komen'", "overtuigen"], ["Een kaartje: 'Gecondoleerd, ik leef met je mee'", "gevoelens uiten"]].forEach(([s, a]) =>
      Q.push(cat("Wat is het hoofddoel van de zender? " + s, a, D, "Vraag je af: wat wil de zender vooral bereiken?", r)));
    [["Wat vond je van de film?", "open"], ["Vond je de film leuk?", "gesloten"], ["Hoe ga je naar school?", "open"], ["Ga je met de fiets?", "gesloten"], ["Waarom ben je te laat?", "open"], ["Ben je twaalf?", "gesloten"], ["Welke hobby's heb je?", "open"], ["Heb je een hond?", "gesloten"], ["Wat ga je doen in de vakantie?", "open"], ["Kom je morgen naar de fuif?", "gesloten"], ["Hoe was je weekend?", "open"], ["Heb je je huiswerk gemaakt?", "gesloten"]].forEach(([v, a]) =>
      Q.push(cat("Is dit een open of een gesloten vraag? '" + v + "'", a + " vraag", ["open vraag", "gesloten vraag"], "Gesloten: je kan antwoorden met ja/nee of één woord. Open: dat kan niet.", r)));
    [["Goeiedag mevrouw, kan ik u iets vragen?", "formeel"], ["Hey, alles goed met je?", "informeel"], ["Geachte directeur", "formeel"], ["Yo, kom je straks?", "informeel"], ["Zou u mij kunnen helpen, alstublieft?", "formeel"], ["Thx voor je hulp!", "informeel"], ["Met vriendelijke groeten", "formeel"], ["Ciao, tot morgen!", "informeel"], ["Mag ik u bedanken voor uw tijd?", "formeel"], ["Leuk dat je er was, dikke merci!", "informeel"]].forEach(([z, a]) =>
      Q.push(cat("Is dit formele of informele taal? '" + z + "'", a, ["formeel", "informeel"], "Formeel: u, beleefd, volledige zinnen. Informeel: je, los, tegen vrienden.", r)));
    const L = ["oriënterend lezen", "globaal lezen", "intensief lezen"];
    [["Je wil snel weten waarover een folder gaat.", 0], ["Je leert een tekst voor een toets tot in de details.", 2], ["Je zoekt de hoofdzaken van een artikel.", 1], ["Je bekijkt de titel en foto's van een tijdschrift in de winkel.", 0], ["Je zoekt de kernzin van elke alinea.", 1], ["Je leest een recept nauwkeurig om te kunnen koken.", 2], ["Je wil weten welk teksttype het is.", 0], ["Je zoekt wat er in de inleiding, het midden en het slot staat.", 1]].forEach(([s, i]) =>
      Q.push(cat("Welke leesmanier past? " + s, L[i], L, "Oriënterend = snel verkennen. Globaal = hoofdzaken. Intensief = alles nauwkeurig.", r)));
    const C = ["zender", "ontvanger", "boodschap", "kanaal", "ruis"];
    [["Juf Ann stuurt via Smartschool een bericht naar de ouders. Wie is de zender?", "zender", "Juf Ann"], ["Juf Ann stuurt via Smartschool een bericht naar de ouders. Wat is het kanaal?", "kanaal", "Smartschool"], ["Juf Ann stuurt via Smartschool een bericht naar de ouders. Wie zijn de ontvangers?", "ontvanger", "de ouders"], ["Tijdens een telefoongesprek kraakt de lijn. Wat is dat?", "ruis", "ruis"], ["Mo zegt tegen Lina: 'De les begint om 9 uur.' Wat is de boodschap?", "boodschap", "De les begint om 9 uur."]].forEach(([v, rol, ans]) => {
      const opts = { zender: ["Juf Ann", "de ouders", "Smartschool", "het bericht"], kanaal: ["Smartschool", "Juf Ann", "de ouders", "het bericht"], ontvanger: ["de ouders", "Juf Ann", "Smartschool", "de school"], ruis: ["ruis", "zender", "kanaal", "boodschap"], boodschap: ["De les begint om 9 uur.", "Mo", "Lina", "praten"] }[rol];
      Q.push(M(v, ans, opts.filter(o => o !== ans).slice(0, 3)));
    });
    C.forEach(c => Q.push(M("Wat is de " + c + " in het communicatiemodel?", { zender: "wie de boodschap stuurt", ontvanger: "wie de boodschap krijgt", boodschap: "wat er gezegd of geschreven wordt", kanaal: "de manier waarop de boodschap gaat", ruis: "alles wat de communicatie stoort" }[c],
      others(["wie de boodschap stuurt", "wie de boodschap krijgt", "wat er gezegd of geschreven wordt", "de manier waarop de boodschap gaat", "alles wat de communicatie stoort"], { zender: "wie de boodschap stuurt", ontvanger: "wie de boodschap krijgt", boodschap: "wat er gezegd of geschreven wordt", kanaal: "de manier waarop de boodschap gaat", ruis: "alles wat de communicatie stoort" }[c], 3, r))));
    const TW = [["liep", "lopen"], ["boeken", "boek"], ["mooiere", "mooi"], ["kinderen", "kind"], ["zwom", "zwemmen"], ["gegeten", "eten"], ["steden", "stad"], ["grootste", "groot"], ["schreef", "schrijven"], ["huizen", "huis"]];
    TW.forEach(([w, t]) => Q.push(M("Onder welk trefwoord zoek je '" + w + "' op in het woordenboek?", t, [w, w + "en", t + "s"].filter(x => x !== t).slice(0, 3), "Het trefwoord is de grondvorm: enkelvoud, gewone vorm of infinitief.")));
    const AB = [["schaap", "schaar", "schaal", "schaduw"], ["boom", "boot", "boog", "boord"], ["kers", "kerk", "kern", "kerst"], ["water", "wagen", "walvis", "wapen"], ["fiets", "fier", "fijn", "figuur"], ["school", "schoen", "schoon", "schol"]];
    AB.forEach(ws => { const s = ws.slice().sort((a, b) => a.localeCompare(b, "nl")); Q.push(M("Welk woord komt eerst in het woordenboek?", s[0], s.slice(1), "Vergelijk letter per letter tot je een verschil vindt.")); });
    [["Op maandag gaan we naar Antwerpen.", ["Op Maandag gaan we naar Antwerpen.", "Op maandag gaan we naar antwerpen.", "op maandag gaan we naar Antwerpen."]], ["In december vieren we Kerstmis.", ["In December vieren we kerstmis.", "In december vieren we kerstmis.", "In December vieren we Kerstmis."]], ["Mijn buurman is een Fransman.", ["Mijn buurman is een fransman.", "mijn buurman is een Fransman.", "Mijn Buurman is een Fransman."]], ["We spreken Nederlands en Engels.", ["We spreken nederlands en engels.", "We spreken Nederlands en engels.", "we spreken nederlands en Engels."]], ["De Schelde stroomt door België.", ["De schelde stroomt door België.", "De Schelde stroomt door belgië.", "de schelde stroomt door belgië."]], ["Lisa woont in de Kerkstraat in Boom.", ["Lisa woont in de kerkstraat in Boom.", "lisa woont in de Kerkstraat in boom.", "Lisa woont in de Kerkstraat in boom."]], ["Op woensdag eten we frietjes.", ["Op Woensdag eten we frietjes.", "op woensdag eten we Frietjes.", "Op Woensdag eten we Frietjes."]], ["Mijn hond heet Max.", ["Mijn hond heet max.", "mijn hond heet Max.", "Mijn Hond heet max."]]].forEach(([g, f]) =>
      Q.push(M("Welke zin is juist geschreven?", g, f, "Hoofdletter: begin van de zin, namen, straten, steden, landen, rivieren, talen, inwoners en feestdagen. Geen hoofdletter: dagen en maanden.")));
    Q.push(
      M("Wat is een kernzin?", "de zin met de belangrijkste informatie van een alinea", ["de laatste zin van een tekst", "de titel", "een zin met een moeilijk woord"]),
      M("Wat is het onderwerp van een tekst?", "waarover de tekst gaat, in een paar woorden", ["de belangrijkste boodschap in één zin", "de schrijver", "het teksttype"]),
      M("Wat is de hoofdgedachte?", "de belangrijkste boodschap in één zin", ["de titel", "waarover de tekst gaat in één woord", "de eerste zin"]),
      M("Wat zijn topische vragen?", "wie, wat, waar, wanneer, waarom, hoe", ["vragen met ja of nee", "vragen over het weer", "vragen van de leerkracht op het examen"]),
      M("Wat zijn verwijswoorden?", "woorden die verwijzen naar iets wat al genoemd is (hij, die, daar)", ["woorden uit het woordenboek", "woorden met een hoofdletter", "moeilijke schooltaalwoorden"]),
      M("Wat is context?", "de zin of tekst rond een woord", ["de uitleg in het woordenboek", "de titel van de tekst", "een synoniem"]),
      M("Wat doe je bij actief luisteren?", "aankijken, knikken, doorvragen en samenvatten", ["ondertussen je gsm checken", "niets zeggen en wegkijken", "de ander onderbreken"]),
      M("Wat staat in een inleiding?", "het onderwerp wordt voorgesteld", ["de conclusie", "alle details", "de bronnen"]),
      M("Wat is lay-out?", "hoe een tekst eruitziet: titels, kopjes, vet, foto's", ["de inhoud van de tekst", "de schrijver", "de hoofdgedachte"]),
      M("Een goed bericht is …", "duidelijk, volledig en gepast", ["lang en moeilijk", "zonder leestekens", "altijd informeel"])
    );
    return Q;
  }

  /* ---------------- WETENSCHAPPEN ---------------- */
  function wetenschappen(r) {
    const Q = [];
    const LDL = ["levend", "dood", "levenloos"];
    [["een kat", 0], ["een eik", 0], ["een paddenstoel in het bos", 0], ["een regenworm", 0], ["een bacterie", 0], ["een grasspriet", 0], ["een vis in de vijver", 0],
      ["een houten tafel", 1], ["een leren schoen", 1], ["een dood blad", 1], ["een wollen trui", 1], ["een katoenen T-shirt", 1], ["een papieren krant", 1],
      ["een steen", 2], ["water", 2], ["een plastic fles", 2], ["een ijzeren spijker", 2], ["glas", 2], ["zand", 2], ["lucht", 2]].forEach(([w, i]) =>
      Q.push(cat("Is " + w + " levend, dood of levenloos?", LDL[i], LDL, i === 1 ? "Het heeft ooit geleefd (of komt van iets dat leefde)." : i === 2 ? "Het heeft nooit geleefd." : "Het vertoont nu levensverschijnselen.", r)));
    [["licht", "abiotisch"], ["temperatuur", "abiotisch"], ["regen", "abiotisch"], ["de bodem", "abiotisch"], ["wind", "abiotisch"], ["lucht", "abiotisch"], ["stenen", "abiotisch"], ["een vos", "biotisch"], ["bomen", "biotisch"], ["schimmels", "biotisch"], ["de mens", "biotisch"], ["bacteriën", "biotisch"], ["insecten", "biotisch"], ["mos", "biotisch"]].forEach(([w, a]) =>
      Q.push(cat("Is " + w + " een abiotische of biotische factor?", a + "e factor", ["abiotische factor", "biotische factor"], "Biotisch = levend. Abiotisch = niet-levend.", r)));
    const V = ["herbivoor", "carnivoor", "omnivoor"];
    [["een konijn", 0], ["een koe", 0], ["een paard", 0], ["een rups", 0], ["een giraf", 0], ["een leeuw", 1], ["een vos", 1], ["een uil", 1], ["een haai", 1], ["een spin", 1], ["de mens", 2], ["een varken", 2], ["een bruine beer", 2], ["een kip", 2]].forEach(([w, i]) =>
      Q.push(cat("Is " + w + " een herbivoor, carnivoor of omnivoor?", V[i], V, "Herbivoor eet planten, carnivoor eet dieren, omnivoor eet allebei.", r)));
    const R = ["producent", "consument", "detritivoor", "reducent"];
    [["gras", 0], ["een eik", 0], ["algen", 0], ["een zonnebloem", 0], ["een konijn", 1], ["een vos", 1], ["een mus", 1], ["een regenworm", 2], ["een pissebed", 2], ["schimmels", 3], ["bacteriën", 3], ["een paddenstoel", 3]].forEach(([w, i]) =>
      Q.push(cat("Welke rol heeft " + w + " in een biotoop?", R[i], R, "Producent maakt voedsel met zonlicht, consument eet anderen, detritivoor eet dode resten, reducent breekt resten af tot mineralen.", r)));
    [["temperatuur", "graden Celsius (°C)", "thermometer"], ["lengte", "meter (m)", "meetlat"], ["massa", "kilogram (kg)", "weegschaal"], ["tijd", "seconde (s)", "chronometer"], ["volume", "liter (L)", "maatcilinder"]].forEach(([g, e, t], _, all) => {
      Q.push(M("Wat is de eenheid van " + g + "?", e, others(all.map(x => x[1]), e, 3, r)));
      Q.push(M("Welk meettoestel gebruik je voor " + g + "?", t, others(all.map(x => x[2]), t, 3, r)));
    });
    const WI = ["waarneming", "interpretatie"];
    [["Het water is 100 °C.", 0], ["Het water gaat zo koken.", 1], ["De bladeren zijn geel.", 0], ["De plant heeft te weinig water gekregen.", 1], ["De hond blaft.", 0], ["De hond heeft honger.", 1], ["De vijver is groen.", 0], ["Er zitten veel algen in de vijver.", 1], ["De lucht is donker.", 0], ["Het gaat regenen.", 1], ["De slak beweegt 5 cm in 1 minuut.", 0], ["Slakken houden niet van zon.", 1]].forEach(([z, i]) =>
      Q.push(cat("Waarneming of interpretatie? '" + z + "'", WI[i], WI, "Waarneming: wat je echt ziet of meet. Interpretatie: wat je erover denkt of besluit.", r)));
    const LV = ["voeding", "ademhaling", "groei", "voortplanting", "beweging", "reageren op prikkels", "uitscheiding"];
    [["Een plant groeit naar het licht toe.", "reageren op prikkels"], ["Een kip legt eieren.", "voortplanting"], ["Een baby wordt groter.", "groei"], ["Je ademt in en uit.", "ademhaling"], ["Een koe eet gras.", "voeding"], ["Een vogel vliegt weg.", "beweging"], ["Je zweet als je sport.", "uitscheiding"], ["Een kat trekt haar poot terug van iets heets.", "reageren op prikkels"]].forEach(([z, a]) =>
      Q.push(cat("Welk levensverschijnsel? " + z, a, LV, "", r)));
    const ketens = [["gras", "sprinkhaan", "kikker", "reiger"], ["algen", "watervlo", "vis", "fuut"], ["eikels", "muis", "uil"], ["bladeren", "rups", "mees", "sperwer"], ["sla", "slak", "egel", "vos"]];
    const ordes = ["producent", "consument 1ste orde", "consument 2de orde", "consument 3de orde"];
    for (let i = 0; i < 6; i++) {
      const k = pick(ketens, r), j = int(0, k.length - 1, r);
      Q.push(cat("Voedselketen: " + k.join(" → ") + ". Wat is de/het " + k[j] + "?", ordes[j], ordes, "De eerste is de producent, wie de producent eet is consument van de 1ste orde, enzovoort.", r));
    }
    [["ijsbeer", "dikke vacht en vetlaag tegen de kou"], ["cactus", "dikke stengel die water opslaat"], ["eend", "zwemvliezen om te zwemmen"], ["sneeuwhaas", "witte vacht als schutkleur in de winter"], ["kameel", "kan lang zonder water"], ["specht", "sterke snavel om in hout te hakken"], ["vleermuis", "hoort met echo's in het donker"], ["vis", "kieuwen om onder water te ademen"]].forEach(([d, a], _, all) =>
      Q.push(M("Hoe is de " + d + " aangepast aan zijn biotoop?", a, others(all.map(x => x[1]), a, 3, r))));
    Q.push(
      M("Welke stap komt meteen na de onderzoeksvraag?", "hypothese", ["besluit", "werkwijze", "reflectie"]),
      M("Wat is een hypothese?", "een voorspelling van het antwoord op de onderzoeksvraag", ["het antwoord na het onderzoek", "de lijst met benodigdheden", "wat je anders zou doen"]),
      M("Wat schrijf je in het besluit?", "het antwoord op de onderzoeksvraag en of je hypothese klopte", ["wat je nodig hebt", "de stappen van de proef", "een nieuwe onderzoeksvraag"]),
      M("Wat doe je bij de reflectie?", "nadenken over wat goed of fout liep en wat je anders zou doen", ["de proef opnieuw uitvoeren", "de hypothese opschrijven", "materiaal opruimen"]),
      M("Welke onderzoeksvraag is goed?", "Hoe snel lost suiker op in warm en in koud water?", ["Suiker is lekker.", "Is suiker cool", "Wat vind jij van suiker?"], "Een onderzoeksvraag is een echte vraag die je kan onderzoeken."),
      M("Welke meting is correct genoteerd?", "15 cm", ["15", "cm 15", "vijftien"], "Een meting = getal + eenheid."),
      M("Wat is een biotoop?", "een leefgebied met eigen kenmerken", ["een soort dier", "een meettoestel", "een voedselketen"]),
      M("Wat betekent de pijl in een voedselketen?", "wordt gegeten door", ["eet", "is groter dan", "leeft naast"]),
      M("Wanneer is er een ecologisch evenwicht?", "als de aantallen planten en dieren ongeveer gelijk blijven", ["als er geen carnivoren zijn", "als er alleen planten zijn", "als er geen reducenten zijn"]),
      M("Waarom moeten organismen aangepast zijn aan hun biotoop?", "om te overleven en zich voort te planten", ["om mooi te zijn", "om sneller te groeien dan de mens", "dat moet niet"]),
      M("Wat is determineren?", "met een tabel of zoekkaart stap voor stap een organisme benoemen", ["een proef doen", "een dier tekenen", "de temperatuur meten"]),
      M("Wat doen reducenten in de voedselkringloop?", "ze maken van dode resten mineralen voor de planten", ["ze maken voedsel met zonlicht", "ze eten levende dieren", "ze zorgen voor zuurstof"])
    );
    return Q;
  }

  /* ---------------- HISTORISCH BEWUSTZIJN ---------------- */
  function historisch(r) {
    const Q = [];
    const jr = y => y < 0 ? -y + " v.Chr." : String(y);
    for (let i = 0; i < 18; i++) {
      const y = int(101, 2026, r), e = Math.ceil(y / 100);
      Q.push(NM("In welke eeuw ligt het jaar " + y + "?", e, [e - 1, e + 1, Math.floor(y / 100) === e ? e + 2 : Math.floor(y / 100)], "Eeuw " + e + " loopt van " + ((e - 1) * 100 + 1) + " tot " + e * 100 + ".", r));
    }
    const PER = ["Prehistorie", "Oudheid", "Middeleeuwen", "Nieuwe Tijd", "Nieuwste Tijd"];
    const per = y => y < -3000 ? 0 : y < 500 ? 1 : y < 1500 ? 2 : y < 1800 ? 3 : 4;
    const rng = [[-12000, -3300], [-2800, 450], [550, 1450], [1550, 1750], [1850, 2026]];
    for (let i = 0; i < 15; i++) { const k = i % 5; let y = int(rng[k][0], rng[k][1], r); if (y === 0) y = 1; Q.push(cat("In welke periode ligt het jaar " + jr(y) + "?", PER[per(y)], PER, "Prehistorie tot ca. 3000 v.Chr., Oudheid tot 500, Middeleeuwen tot 1500, Nieuwe Tijd tot 1800, daarna Nieuwste Tijd. Controleer de jaartallen met je Histokit.", r)); }
    const B = ["geschreven bron", "materiële bron", "beeldbron", "mondelinge bron"];
    [["een dagboek", 0], ["een oude krant", 0], ["een brief", 0], ["een wet", 0], ["de koperen bijl van Ötzi", 1], ["een skelet", 1], ["een Romeinse munt", 1], ["een kasteel", 1], ["een potscherf", 1], ["een oude foto", 2], ["een schilderij", 2], ["een tekening in een grot", 2], ["een interview met je grootmoeder", 3], ["een volksverhaal dat al eeuwen verteld wordt", 3], ["een opname van een getuige die vertelt", 3]].forEach(([w, i]) =>
      Q.push(cat("Wat voor bron is " + w + "?", B[i], B, "", r)));
    const DM = ["sociaal", "economisch", "politiek", "cultureel"];
    [["Ötzi at graan dat in zijn dorp verbouwd werd.", 1], ["Ötzi had tatoeages, misschien tegen pijn.", 3], ["Een leider bepaalde de regels in het dorp.", 2], ["Mensen leefden samen in families en groepen.", 0], ["Jagers ruilden vellen voor vuursteen.", 1], ["Mensen begroeven hun doden met geschenken.", 3], ["Twee groepen vochten om een stuk land.", 2], ["Kinderen hielpen hun ouders bij het werk.", 0], ["Mensen maakten grotschilderingen.", 3], ["Boeren hielden koeien en geiten.", 1], ["De oudste van de groep nam de beslissingen.", 2], ["Mannen en vrouwen hadden elk hun eigen taken.", 0], ["Mensen geloofden in geesten en goden.", 3], ["Er werd handel gedreven in koper.", 1], ["Er werden afspraken en straffen gemaakt.", 2]].forEach(([z, i]) =>
      Q.push(cat("Bij welk maatschappelijk domein hoort dit? '" + z + "'", DM[i], DM, "Sociaal = samenleven, economisch = voedsel en spullen, politiek = leiding en regels, cultureel = geloof, kunst en gewoonten.", r)));
    for (let i = 0; i < 8; i++) { const a = int(1000, 1900, r), b = int(a + 10, 2026, r); Q.push(NM("Hoeveel jaar zit er tussen " + a + " en " + b + "?", b - a, [b - a + 1, b - a - 10, b - a + 100], b + " − " + a + " = " + (b - a) + ".", r)); }
    for (let i = 0; i < 5; i++) { const ys = new Set(); while (ys.size < 4) ys.add(int(-5000, 1500, r) || 1); const s = [...ys].sort((a, b) => a - b); Q.push(M("Welk jaar is het oudst?", jr(s[0]), s.slice(1).map(jr), "Bij v.Chr.: hoe groter het getal, hoe langer geleden.")); }
    Q.push(
      M("Wanneer werd Ötzi gevonden?", "in 1991", ["in 1891", "in 2001", "in 1961"]),
      M("Waar werd Ötzi gevonden?", "in de Alpen, op de grens van Oostenrijk en Italië", ["in een grot in Frankrijk", "in een moeras in België", "in de woestijn van Egypte"]),
      M("Hoe lang geleden leefde Ötzi ongeveer?", "5300 jaar", ["530 jaar", "53 000 jaar", "300 000 jaar"]),
      M("In welke tijd leefde Ötzi?", "de kopertijd, op het einde van de steentijd", ["de Middeleeuwen", "de Romeinse tijd", "de oude steentijd bij de neanderthalers"]),
      M("Waarom bleef Ötzi zo goed bewaard?", "door het ijs: hij is een natuurlijke mummie", ["hij werd gebalsemd zoals een farao", "hij lag in een stenen kist", "hij werd bewaard in zout"]),
      M("Hoe stierf Ötzi waarschijnlijk?", "door een pijl in zijn schouder", ["door honger", "hij viel van een rots", "door een ziekte"]),
      M("Welk bijzonder werktuig had Ötzi bij zich?", "een koperen bijl", ["een ijzeren zwaard", "een geweer", "een gouden kroon"]),
      M("Hoe weten we wat Ötzi at?", "door onderzoek van zijn maaginhoud", ["hij schreef het op", "uit een oud verhaal", "dat weten we niet"]),
      M("Waar ligt Ötzi nu?", "in een museum in Bolzano (Italië)", ["in het Louvre in Parijs", "in Brussel", "nog altijd in het ijs"]),
      M("Wat is een mummie?", "een lichaam dat bewaard is gebleven en niet vergaan is", ["een soort grafsteen", "een oud werktuig", "een prehistorische tekening"]),
      M("Waar ontstond Homo sapiens?", "in Afrika", ["in Europa", "in Azië", "in Amerika"]),
      M("Hoe lang geleden ontstond Homo sapiens ongeveer?", "300 000 jaar geleden", ["3000 jaar geleden", "30 miljoen jaar geleden", "5300 jaar geleden"]),
      M("Welk werelddeel bereikte Homo sapiens als laatste?", "Amerika", ["Europa", "Azië", "Afrika"], "Via de Beringstraat, tijdens de ijstijd."),
      M("Met welke andere mensensoort leefde Homo sapiens samen in Europa?", "de neanderthaler", ["de dinosaurus", "de Romein", "de farao"]),
      M("Hoe leefden mensen in de oude steentijd?", "als jagers-verzamelaars die rondtrokken", ["als boeren in steden", "als ridders in kastelen", "als handelaars met schepen"]),
      M("Wat veranderde er in de nieuwe steentijd?", "mensen gingen aan landbouw doen en op één plaats wonen", ["mensen gingen weer jagen", "het schrift werd uitgevonden", "de eerste auto's"]),
      M("Wat betekent 'sedentair'?", "op één vaste plaats wonen", ["rondtrekken", "jagen", "in een grot schilderen"]),
      M("Wat is een nomade?", "iemand die rondtrekt zonder vaste woonplaats", ["een boer", "een koning", "een archeoloog"]),
      M("Wat is historisch bewustzijn?", "besef dat het verleden invloed heeft op het heden", ["jaartallen vanbuiten kennen", "oude spullen verzamelen", "een museum bezoeken"]),
      M("Wat doet een historicus als eerste?", "een onderzoeksvraag stellen", ["het besluit schrijven", "bronnen weggooien", "een film maken"]),
      M("Wat is een historische bron?", "alles wat informatie geeft over het verleden", ["alleen boeken", "alleen dingen uit een museum", "het internet"]),
      M("Welke vraag stel je om een bron te controleren?", "Wie maakte ze, wanneer en waarom?", ["Hoe duur is ze?", "Is ze mooi?", "Hoe groot is ze?"]),
      M("Wat markeert het einde van de prehistorie?", "de uitvinding van het schrift", ["de uitvinding van het vuur", "het ontstaan van de landbouw", "de val van Rome"]),
      M("Wat betekent v.Chr.?", "voor Christus", ["volgens Christus", "vroeger Christus", "verleden christelijk"]),
      M("Hoeveel jaar is een eeuw?", "100 jaar", ["10 jaar", "1000 jaar", "50 jaar"]),
      M("Hoeveel jaar is een millennium?", "1000 jaar", ["100 jaar", "10 000 jaar", "500 jaar"]),
      M("Welke periode komt na de Middeleeuwen?", "de Nieuwe Tijd", ["de Oudheid", "de Prehistorie", "de Nieuwste Tijd"])
    );
    return Q;
  }

  window.BANK = { "Wiskunde": wiskunde, "Nederlands": nederlands, "Wetenschappen": wetenschappen, "Engels": engels, "Frans": frans, "Historisch bewustzijn": historisch };
})();
