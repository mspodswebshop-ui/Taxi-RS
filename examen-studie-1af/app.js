/* Examen studie 1Af — app. Alle voortgang blijft op dit toestel (localStorage). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) { if (c == null || c === false) continue; n.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return n;
  };
  const DATA = window.LEERSTOF, BANK = window.BANK;
  const VAKKEN = ["Wiskunde", "Nederlands", "Wetenschappen", "Engels", "Frans", "Historisch bewustzijn"];
  const KLEUR = { "Wiskunde": "#2348c8", "Nederlands": "#7b3fc4", "Wetenschappen": "#14804a", "Engels": "#c0362c", "Frans": "#0b7f93", "Historisch bewustzijn": "#b8670a" };
  const DAGQUIZ = 20;

  /* ---------- opslag ---------- */
  const KEY = "es1af:v1";
  const fresh = () => ({ momoj: 0, xp: 0, streak: 0, lastStudy: "", days: {}, wrong: [], leitner: {}, buddy: "kuiken", acc: "", owned: ["kuiken"], badges: [], notif: { on: false, time: "16:30", last: "" }, correct: 0, answered: 0, cards: 0, quests: {} });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} syncSwState(); };

  /* ---------- datum & random ---------- */
  const pad = x => String(x).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => iso(new Date());
  const parseDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysUntil = s => Math.round((parseDate(s) - parseDate(today())) / 864e5);
  const fmtDate = d => d.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "short" });
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const shuffle = (arr, r) => { r = r || Math.random; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const nl1 = x => x.toFixed(1).replace(".", ",");
  const cijfer = (g, t) => t ? Math.max(1, Math.min(10, 1 + 9 * g / t)) : 0;

  /* ---------- vragen van de dag ---------- */
  const bankCache = {};
  function bank(vak) {
    const k = vak + "|" + today();
    if (!bankCache[k]) { const r = rng(hash(k)); bankCache[k] = BANK[vak](r).map((q, i) => ({ ...q, vak, id: vak + ":" + i })); }
    return bankCache[k];
  }
  const dagSet = vak => shuffle(bank(vak), rng(hash("dag|" + vak + "|" + today()))).slice(0, DAGQUIZ);

  /* ---------- motivatie ---------- */
  const MOTIVATIE = [
    "Elke vraag die je vandaag oefent, hoef je op het examen niet meer te raden.",
    "Kleine stapjes elke dag brengen je verder dan één grote sprint de avond ervoor.",
    "Fout is goed: van een fout leer je meer dan van een gok die toevallig juist is.",
    "Twintig minuten nu is beter dan twee uur paniek straks.",
    "Je hoeft niet perfect te zijn. Je moet gewoon vandaag beginnen.",
    "Je buddy rekent op je. Hou je reeks vol!",
    "Leg je gsm weg, zet een timer van 25 minuten en ga.",
    "Wat je drie keer herhaalt, blijft hangen. Herhaal op dag 1, dag 3 en dag 7.",
    "Je klasgenoten studeren ook. Samen slagen we allemaal.",
    "Moeilijk betekent niet onmogelijk. Het betekent: nog even oefenen.",
    "Een 5,5 is een voldoende. Alles daarboven is bonus.",
    "Begin met het vak waar je het minst zin in hebt. Daarna gaat de rest vanzelf.",
    "Slapen is ook studeren: je hersenen slaan alles op terwijl je slaapt.",
    "Leg het uit aan iemand anders. Dan weet je meteen of je het snapt.",
    "Je bent verder dan gisteren. Dat is winst.",
    "Drink water, eet iets gezonds en ga ervoor.",
    "Nog even doorzetten: na de examens is het bijna kerstvakantie!",
    "De beste manier om iets te leren: jezelf overhoren.",
    "Zet je momoj in iets moois in de winkel. Je hebt ze verdiend.",
    "Eén dagquiz per dag houdt de stress weg.",
    "Wie elke dag een beetje doet, staat op het examen rustig.",
    "Twijfel je? Kijk in de leerstof en probeer de vraag opnieuw.",
    "Je kan dit. Je hebt het al vaker gekund.",
    "Focus op wat je nog niet kent, niet op wat je al weet.",
    "Een pauze is geen tijdverlies. Na 45 minuten ben je toe aan 10 minuten rust.",
    "Studeer slim: eerst oefenen, dan pas de fouten nalezen.",
    "Vandaag is een goede dag om een badge te halen.",
    "Je reeks is je superkracht. Laat hem niet vallen!",
    "Elke juiste vraag levert momoj op. Hoeveel haal jij vandaag?",
    "Trots op jezelf zijn mag. Elke dag."
  ];
  const motivatie = (offset) => MOTIVATIE[(hash(today()) + (offset || 0)) % MOTIVATIE.length];

  /* ---------- winkel & badges ---------- */
  const BUDDIES = [
    { id: "kuiken", em: "🐣", naam: "Kuiken", prijs: 0 }, { id: "vos", em: "🦊", naam: "Vos", prijs: 100 }, { id: "panda", em: "🐼", naam: "Panda", prijs: 150 },
    { id: "kikker", em: "🐸", naam: "Kikker", prijs: 150 }, { id: "uil", em: "🦉", naam: "Uil", prijs: 250 }, { id: "octopus", em: "🐙", naam: "Octopus", prijs: 300 },
    { id: "tijger", em: "🐯", naam: "Tijger", prijs: 400 }, { id: "dino", em: "🦖", naam: "Dino", prijs: 500 }, { id: "eenhoorn", em: "🦄", naam: "Eenhoorn", prijs: 800 }
  ];
  const ACCS = [
    { id: "", em: "", naam: "Niets", prijs: 0 }, { id: "pet", em: "🧢", naam: "Pet", prijs: 80 }, { id: "bril", em: "🕶️", naam: "Zonnebril", prijs: 120 },
    { id: "strik", em: "🎀", naam: "Strik", prijs: 120 }, { id: "hoed", em: "🎩", naam: "Hoge hoed", prijs: 200 }, { id: "afstudeer", em: "🎓", naam: "Afstudeerhoed", prijs: 300 },
    { id: "kerst", em: "🎅", naam: "Kerstmuts", prijs: 350 }, { id: "kroon", em: "👑", naam: "Kroon", prijs: 600 }
  ];
  const BADGES = [
    { id: "eerste", ic: "🎯", naam: "Eerste quiz", tekst: "Maak je eerste dagquiz." },
    { id: "perfect", ic: "💯", naam: "Foutloos", tekst: "Alles juist in een dagquiz." },
    { id: "voldoende", ic: "✅", naam: "Geslaagd", tekst: "Haal een 5,5 of meer in een dagquiz." },
    { id: "reeks3", ic: "🔥", naam: "3 dagen op rij", tekst: "Studeer 3 dagen na elkaar." },
    { id: "reeks7", ic: "⚡", naam: "Week vol", tekst: "Studeer 7 dagen na elkaar." },
    { id: "allevakken", ic: "🌈", naam: "Alle vakken", tekst: "Maak een dagquiz in alle 6 vakken." },
    { id: "honderd", ic: "🧠", naam: "100 juist", tekst: "Beantwoord 100 vragen juist." },
    { id: "vijfhonderd", ic: "🚀", naam: "500 juist", tekst: "Beantwoord 500 vragen juist." },
    { id: "kaarten", ic: "🃏", naam: "Kaartenkenner", tekst: "Oefen 100 flashcards." },
    { id: "rijk", ic: "💰", naam: "Momoj-miljonair", tekst: "Verdien in totaal 1000 momoj." }
  ];
  const level = () => Math.floor(Math.sqrt(S.xp / 60)) + 1;
  const lvlStart = l => 60 * (l - 1) * (l - 1);

  /* ---------- belonen ---------- */
  function addMomoj(n, silent) {
    if (n <= 0) return; S.momoj += n; S.xp += n;
    if (!silent) { const p = el("div", { class: "plus", "aria-hidden": "true" }, coinSvg(), "+" + n); document.body.append(p); setTimeout(() => p.remove(), 1000); }
    checkBadges(); renderStats();
  }
  function studied() {
    const t = today(); if (S.lastStudy === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.streak = S.lastStudy === iso(y) ? S.streak + 1 : 1; S.lastStudy = t;
    const bonus = Math.min(50, S.streak * 5);
    toast("Reeks: " + S.streak + (S.streak === 1 ? " dag" : " dagen op rij") + "! +" + bonus + " momoj");
    addMomoj(bonus, true); save();
  }
  function badge(id) {
    if (S.badges.includes(id)) return; S.badges.push(id);
    const b = BADGES.find(x => x.id === id); toast("Nieuwe badge: " + b.ic + " " + b.naam); save();
  }
  function checkBadges() {
    const d = S.days[today()] || {};
    if (S.streak >= 3) badge("reeks3"); if (S.streak >= 7) badge("reeks7");
    if (S.correct >= 100) badge("honderd"); if (S.correct >= 500) badge("vijfhonderd");
    if (S.cards >= 100) badge("kaarten"); if (S.xp >= 1000) badge("rijk");
    const alle = new Set(); for (const k in S.days) for (const v in S.days[k]) alle.add(v);
    if (VAKKEN.every(v => alle.has(v))) badge("allevakken");
  }
  let toastT;
  function toast(msg) { const old = $(".toast"); if (old) old.remove(); const t = el("div", { class: "toast", role: "status", text: msg }); document.body.append(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800); }
  function coinSvg() {
    const ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "coin"); s.setAttribute("aria-hidden", "true");
    s.innerHTML = '<circle cx="12" cy="12" r="11" fill="var(--coin)"/><circle cx="12" cy="12" r="8.2" fill="none" stroke="var(--coin-dark)" stroke-width="1.4"/><text x="12" y="16.2" text-anchor="middle" font-family="Bricolage Grotesque,system-ui,sans-serif" font-weight="800" font-size="11.5" fill="var(--coin-dark)">m</text>';
    return s;
  }
  const buddyEl = big => {
    const b = BUDDIES.find(x => x.id === S.buddy) || BUDDIES[0], a = ACCS.find(x => x.id === S.acc);
    return el("div", { class: "buddy" + (big ? " big" : ""), role: "img", "aria-label": "Jouw buddy: " + b.naam }, b.em, a && a.em ? el("span", { class: "acc", text: a.em }) : null);
  };
  function renderStats() {
    $("#sMomoj").textContent = S.momoj; $("#sStreak").textContent = S.streak;
    $("#sLvl").textContent = level(); $("#sXp").textContent = S.xp + " xp";
  }

  /* ---------- routing ---------- */
  const VIEWS = ["vandaag", "oefenen", "flashcards", "leerstof", "planning", "winkel"];
  let view = "vandaag";
  function route() {
    let v = (location.hash || "").slice(1); if (!VIEWS.includes(v)) v = "vandaag"; view = v;
    for (const n of VIEWS) $("#v-" + n).hidden = n !== v;
    document.querySelectorAll("nav.tabs a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + v ? "page" : "false"));
    render(); window.scrollTo(0, 0);
  }
  function render() { renderStats(); ({ vandaag: rVandaag, oefenen: rOefenen, flashcards: rFlash, leerstof: rLeerstof, planning: rPlanning, winkel: rWinkel })[view](); }
  window.addEventListener("hashchange", route);
  const go = h => { if (location.hash === "#" + h) route(); else location.hash = h; };

  /* ---------- planning ---------- */
  const exams = () => DATA.exams.slice().sort((a, b) => a.datum.localeCompare(b.datum));
  const upcoming = () => exams().filter(e => daysUntil(e.datum) >= 0);
  function planDays(per, nDays) {
    const up = upcoming(); if (!up.length) return [];
    const last = Math.min(nDays, daysUntil(up[up.length - 1].datum)); const done = {}; const out = [];
    for (let i = 0; i <= last; i++) {
      const day = parseDate(today()); day.setDate(day.getDate() + i); const d = iso(day);
      const todays = up.filter(e => e.datum === d), active = up.filter(e => e.datum > d);
      const tomorrow = active.filter(e => daysUntil(e.datum) - i === 1);
      let pick = [];
      if (tomorrow.length) for (let b = 0; b < per; b++) pick.push(tomorrow[b % tomorrow.length].vak);
      else if (active.length) {
        const w = active.map(e => ({ vak: e.vak, w: 1 / Math.max(1, daysUntil(e.datum) - i) }));
        for (let b = 0; b < per; b++) { w.forEach(x => x.s = x.w / (1 + (done[x.vak] || 0) * .15)); w.sort((a, b2) => b2.s - a.s); pick.push(w[0].vak); done[w[0].vak] = (done[w[0].vak] || 0) + 1; w[0].w *= .55; }
      }
      if (todays.length && pick.length) pick = pick.slice(0, Math.max(1, per - 1));
      const vrij = todays.length || day.getDay() === 0 || day.getDay() === 6;
      out.push({ d, day, todays, pick, herhaal: tomorrow.length > 0, slots: vrij ? ["13:30", "14:25", "15:20", "16:30", "17:25"] : ["16:00", "16:55", "17:50", "19:30", "20:25"] });
    }
    return out;
  }
  const perDay = () => Number(localStorage.getItem("es1af:per") || 3);

  /* ---------- VANDAAG ---------- */
  function rVandaag() {
    const v = $("#v-vandaag"); v.textContent = "";
    const t = today(), d = S.days[t] || {};
    const up = upcoming();
    const naam = S.lastStudy === t ? "Goed bezig vandaag!" : "Hoi! Klaar om te studeren?";
    v.append(el("div", { class: "sheet hero" }, buddyEl(true), el("div", { class: "bubble" }, el("b", { text: naam }), el("p", { style: "margin:.3em 0 0", text: motivatie() }))));

    if (S.teller && S.teller.totaal) {
      v.append(el("div", { class: "sheet row between" },
        el("div", null, el("b", { style: "font-size:1.1rem", text: "Samen studeren" }), el("div", { class: "small muted", text: "Zoveel toestellen gebruiken deze app" })),
        el("div", { class: "row", style: "gap:18px" },
          el("div", { style: "text-align:center" }, el("div", { class: "countdown", style: "font-size:1.9rem", text: S.teller.vandaag }), el("div", { class: "small muted", text: "vandaag" })),
          el("div", { style: "text-align:center" }, el("div", { class: "countdown", style: "font-size:1.9rem", text: S.teller.totaal }), el("div", { class: "small muted", text: "in totaal" })))));
    }
    if (up.length) {
      const e = up[0], n = daysUntil(e.datum);
      v.append(el("div", { class: "sheet row between" },
        el("div", null, el("div", { class: "small muted", text: "Eerstvolgend examen" }), el("b", { style: "font-size:1.15rem", text: e.vak }), el("div", { class: "small muted", text: fmtDate(parseDate(e.datum)) + " · " + (e.tijd || "") })),
        el("div", { style: "text-align:right" }, el("div", { class: "countdown", text: n === 0 ? "vandaag" : n }), n === 0 ? null : el("div", { class: "small muted", text: n === 1 ? "dag" : "dagen" }))));
    }

    const plan = planDays(perDay(), 0)[0];
    const vandaagVakken = plan ? [...new Set(plan.pick)] : [];
    const box = el("div", { class: "sheet stack" }, el("h2", { text: "Op je plan vandaag" }));
    if (!vandaagVakken.length) box.append(el("p", { class: "muted", style: "margin:0", text: "Vandaag staat er niets op je plan. Oefen gerust een vak naar keuze!" }));
    const grid = el("div", { class: "grid3" });
    (vandaagVakken.length ? vandaagVakken : VAKKEN.slice(0, 3)).forEach(vak => grid.append(vakCard(vak)));
    box.append(grid, el("p", { class: "small muted", style: "margin:0", text: "Elke dag krijg je per vak " + DAGQUIZ + " nieuwe vragen. Morgen zijn ze weer anders." }));
    v.append(box);

    const q = questsVoor(t);
    const qb = el("div", { class: "sheet" }, el("h2", { style: "margin-bottom:6px", text: "Dagopdrachten" }));
    q.forEach(x => qb.append(el("div", { class: "quest" }, el("span", { class: "check" + (x.done ? " done" : ""), "aria-hidden": "true", text: x.done ? "✓" : "" }), el("div", null, el("b", { text: x.naam }), el("div", { class: "small muted", text: x.voortgang })), el("span", { class: "reward" }, coinSvg(), "+" + x.beloning))));
    v.append(qb);

    v.append(el("div", { class: "sheet stack" }, el("h2", { text: "App en meldingen" }),
      el("p", { class: "muted", style: "margin:0", text: "Zet deze site als app op je gsm. Dan open je hem met één tik, werkt hij ook zonder internet en kan hij je herinneren om te studeren." }),
      el("div", { class: "row" }, el("button", { class: "blue", type: "button", onclick: installeer, id: "installBtn" }, "Installeer als app"), el("button", { class: "ghost", type: "button", onclick: meldingenDialog }, S.notif.on ? "Meldingen: aan (" + S.notif.time + ")" : "Meldingen instellen"))));
    if (isStandalone()) $("#installBtn").hidden = true;

    v.append(el("div", { class: "sheet small muted", text: "Je momoj, reeks en badges worden bewaard op dit toestel. Wis je je browsergegevens, dan begin je opnieuw." }));
  }
  function vakCard(vak) {
    const d = (S.days[today()] || {})[vak];
    return el("button", { class: "vak", type: "button", onclick: () => startQuiz("dag", vak) },
      el("span", { class: "row", style: "gap:8px" }, el("span", { class: "dot", style: "background:" + KLEUR[vak] }), el("b", { text: vak })),
      d != null ? el("span", { class: "done", text: "Dagquiz gedaan: " + nl1(d) + "/10" }) : el("span", { class: "small muted", text: "Dagquiz · " + DAGQUIZ + " vragen" }));
  }
  function questsVoor(t) {
    const d = S.days[t] || {}, n = Object.keys(d).length, c = (S.quests[t] || {}).cards || 0, goed = (S.quests[t] || {}).goed || 0;
    const q = [
      { id: "q1", naam: "Maak 1 dagquiz", voortgang: Math.min(n, 1) + " / 1", done: n >= 1, beloning: 20 },
      { id: "q2", naam: "Oefen 15 flashcards", voortgang: Math.min(c, 15) + " / 15", done: c >= 15, beloning: 25 },
      { id: "q3", naam: "Maak 3 dagquizzen", voortgang: Math.min(n, 3) + " / 3", done: n >= 3, beloning: 50 },
      { id: "q4", naam: "Beantwoord 40 vragen juist", voortgang: Math.min(goed, 40) + " / 40", done: goed >= 40, beloning: 40 }
    ];
    return q;
  }
  function checkQuests() {
    const t = today(); S.quests[t] = S.quests[t] || {}; const got = S.quests[t].got || (S.quests[t].got = []);
    questsVoor(t).forEach(q => { if (q.done && !got.includes(q.id)) { got.push(q.id); addMomoj(q.beloning, true); toast("Dagopdracht voltooid: " + q.naam + " (+" + q.beloning + " momoj)"); } });
    save();
  }
  const bump = (k, n) => { const t = today(); S.quests[t] = S.quests[t] || {}; S.quests[t][k] = (S.quests[t][k] || 0) + n; };

  /* ---------- OEFENEN ---------- */
  let quiz = null;
  function rOefenen() {
    const v = $("#v-oefenen"); v.textContent = "";
    if (quiz) return rQuiz(v);
    v.append(el("div", { class: "sheet stack" }, el("h2", { text: "Oefenen" }),
      el("p", { class: "muted", style: "margin:0", text: "Kies een vak. De dagquiz heeft elke dag " + DAGQUIZ + " andere vragen. Bij 'Alles oefenen' doe je de hele vragenbank van vandaag." })));
    const g = el("div", { class: "grid2" });
    VAKKEN.forEach(vak => {
      const d = (S.days[today()] || {})[vak], n = bank(vak).length, fout = S.wrong.filter(w => w.vak === vak).length;
      g.append(el("div", { class: "sheet stack", style: "border-top:5px solid " + KLEUR[vak] },
        el("div", { class: "row between" }, el("h3", { text: vak }), el("span", { class: "small muted mono", text: n + " vragen" })),
        d != null ? el("div", { class: "small", style: "color:var(--ok);font-weight:700", text: "Dagquiz vandaag: " + nl1(d) + "/10" }) : el("div", { class: "small muted", text: "Dagquiz nog niet gedaan" }),
        el("div", { class: "row" },
          el("button", { type: "button", onclick: () => startQuiz("dag", vak) }, d != null ? "Opnieuw" : "Dagquiz"),
          el("button", { class: "ghost", type: "button", onclick: () => startQuiz("alles", vak) }, "Alles oefenen"),
          fout ? el("button", { class: "ghost", type: "button", onclick: () => startQuiz("fout", vak) }, "Fouten (" + fout + ")") : null)));
    });
    v.append(g);
  }
  function startQuiz(mode, vak) {
    let qs;
    if (mode === "dag") qs = dagSet(vak);
    else if (mode === "alles") qs = shuffle(bank(vak));
    else qs = shuffle(S.wrong.filter(w => w.vak === vak)).slice(0, 20);
    if (!qs.length) { toast("Geen vragen gevonden."); return; }
    const first = mode === "dag" && (S.days[today()] || {})[vak] == null;
    quiz = { mode, vak, qs: qs.map(q => ({ ...q, order: shuffle(q.opties.map((_, i) => i)) })), i: 0, good: 0, answered: null, wrongs: [], first, earned: 0 };
    go("oefenen");
  }
  function rQuiz(v) {
    const q = quiz.qs[quiz.i], L = "ABCD";
    const top = el("div", { class: "row between" }, el("button", { class: "link", type: "button", onclick: () => { quiz = null; rOefenen(); } }, "← Stoppen"),
      el("span", { class: "small muted mono", text: (quiz.mode === "dag" ? "Dagquiz" : quiz.mode === "alles" ? "Alles oefenen" : "Foutenbox") + " · " + (quiz.i + (quiz.done ? 0 : 1)) + "/" + quiz.qs.length }));
    if (quiz.done) return rResult(v, top);
    const s = el("div", { class: "sheet stack", style: "border-top:5px solid " + KLEUR[quiz.vak] }, top,
      el("div", { class: "bar" }, el("span", { style: "width:" + (100 * quiz.i / quiz.qs.length) + "%" })),
      el("span", { class: "tag", style: "align-self:flex-start", text: quiz.vak }), el("p", { class: "qtext", text: q.vraag }));
    const opts = el("div");
    q.order.forEach((oi, k) => {
      const b = el("button", { class: "opt", type: "button", text: L[k] + ".  " + q.opties[oi] });
      if (quiz.answered != null) { b.disabled = true; if (oi === q.juist) b.classList.add("right"); else if (oi === quiz.answered) b.classList.add("wrong"); }
      b.addEventListener("click", () => antwoord(oi)); opts.append(b);
    });
    s.append(opts);
    if (quiz.answered != null) {
      const ok = quiz.answered === q.juist;
      s.append(el("div", { class: "explain" }, el("b", { text: ok ? "Juist! " : "Niet juist. " }), ok ? (q.uitleg || "") : "Het juiste antwoord is: " + q.opties[q.juist] + ". " + (q.uitleg || "")),
        el("div", null, el("button", { type: "button", id: "nextBtn", onclick: volgende }, quiz.i + 1 < quiz.qs.length ? "Volgende vraag" : "Bekijk je cijfer")));
    }
    v.append(s);
    const nb = $("#nextBtn"); if (nb) nb.focus();
  }
  function antwoord(oi) {
    if (quiz.answered != null) return; const q = quiz.qs[quiz.i]; quiz.answered = oi; S.answered++;
    if (oi === q.juist) {
      quiz.good++; S.correct++; bump("goed", 1);
      const m = quiz.mode === "dag" ? (quiz.first ? 10 : 2) : 5; quiz.earned += m; addMomoj(m);
      if (quiz.mode === "fout") S.wrong = S.wrong.filter(w => !(w.vraag === q.vraag && w.vak === q.vak));
    } else {
      quiz.wrongs.push(q);
      if (!S.wrong.some(w => w.vraag === q.vraag && w.vak === q.vak)) { S.wrong.push({ vak: q.vak, vraag: q.vraag, opties: q.opties, juist: q.juist, uitleg: q.uitleg || "" }); if (S.wrong.length > 120) S.wrong.shift(); }
    }
    studied(); checkQuests(); save(); rOefenen();
  }
  function volgende() { quiz.i++; quiz.answered = null; if (quiz.i >= quiz.qs.length) finish(); rOefenen(); }
  function finish() {
    quiz.done = true; quiz.i = quiz.qs.length;
    const c = cijfer(quiz.good, quiz.qs.length);
    if (quiz.mode === "dag") {
      const t = today(); S.days[t] = S.days[t] || {}; const prev = S.days[t][quiz.vak];
      S.days[t][quiz.vak] = prev == null ? c : Math.max(prev, c);
      badge("eerste"); if (c >= 5.5) badge("voldoende");
      if (quiz.first) { const bonus = quiz.good === quiz.qs.length ? 80 : 30; quiz.earned += bonus; addMomoj(bonus, true); if (quiz.good === quiz.qs.length) badge("perfect"); }
    }
    checkBadges(); checkQuests(); save();
  }
  function rResult(v, top) {
    const c = cijfer(quiz.good, quiz.qs.length);
    const s = el("div", { class: "sheet stack", style: "border-top:5px solid " + KLEUR[quiz.vak] }, top,
      el("div", { class: "row", style: "gap:20px" }, el("div", { class: "cijfer " + (c >= 5.5 ? "pass" : "fail"), text: nl1(c) }),
        el("div", null, el("b", { style: "font-size:1.2rem", text: c >= 8 ? "Super gedaan!" : c >= 5.5 ? "Voldoende, goed zo!" : "Nog even oefenen, je kan het!" }),
          el("div", { class: "muted", text: quiz.good + " van " + quiz.qs.length + " juist" }),
          el("div", { class: "reward", style: "margin-top:4px" }, coinSvg(), "+" + quiz.earned + " momoj verdiend"))),
      buddyEl(false));
    if (quiz.wrongs.length) {
      s.append(el("h3", { text: "Dit had je fout (staat nu in je foutenbox)" }));
      const l = el("div", { class: "stack" });
      quiz.wrongs.forEach(q => l.append(el("div", { class: "item" }, el("b", { text: q.vraag }), el("div", { class: "small", text: "Juist antwoord: " + q.opties[q.juist] }), q.uitleg ? el("div", { class: "explain small", text: q.uitleg }) : null)));
      s.append(l);
    }
    const vak = quiz.vak, mode = quiz.mode;
    s.append(el("div", { class: "row" }, el("button", { type: "button", onclick: () => startQuiz(mode === "fout" ? "fout" : "alles", vak) }, mode === "fout" ? "Nog eens" : "Meer oefenen"), el("button", { class: "ghost", type: "button", onclick: () => { quiz = null; go("vandaag"); } }, "Naar vandaag")));
    v.append(s);
  }

  /* ---------- FLASHCARDS ---------- */
  let fcVak = "", fc = null;
  const box = id => S.leitner[id] || 1;
  function rFlash() {
    const v = $("#v-flashcards"); v.textContent = "";
    v.append(chipRow(fcVak, x => { fcVak = x; fc = null; rFlash(); }));
    const list = DATA.cards.filter(c => !fcVak || c.vak === fcVak);
    const s = el("div", { class: "sheet stack" });
    s.append(el("div", { class: "row between" }, el("h2", { text: "Flashcards" }), el("div", { class: "row small mono", style: "gap:6px" }, [1, 2, 3, 4, 5].map(b => el("span", { class: "chip", title: "Leitner-vak " + b, text: "vak " + b + ": " + list.filter(c => box(c.id) === b).length })))));
    if (!fc) { const r = shuffle(list).sort((a, b) => box(a.id) - box(b.id)); fc = { deck: r.slice(0, 15), i: 0, flipped: false, known: 0 }; }
    if (fc.i >= fc.deck.length) {
      s.append(el("div", { class: "empty" }, el("h3", { text: "Ronde klaar!" }), el("p", { text: "Je wist " + fc.known + " van de " + fc.deck.length + " kaarten." }), el("button", { type: "button", onclick: () => { fc = null; rFlash(); } }, "Nieuwe ronde")));
      v.append(s); return;
    }
    const c = fc.deck[fc.i];
    const ans = el("div", { class: "row", style: "justify-content:center" },
      el("button", { class: "dont", type: "button", onclick: () => kaart(c, false) }, "Nog niet"),
      el("button", { class: "know", type: "button", onclick: () => kaart(c, true) }, "Wist ik!"));
    ans.hidden = !fc.flipped;
    const card = el("button", { class: "fcard" + (fc.flipped ? " flipped" : ""), type: "button", "aria-label": "Draai de kaart om" },
      el("div", { class: "face" }, el("small", { text: c.vak }), el("span", { text: c.voor })),
      el("div", { class: "face back" }, el("small", { text: "antwoord" }), el("span", { text: c.achter })));
    card.addEventListener("click", () => { fc.flipped = !fc.flipped; card.classList.toggle("flipped", fc.flipped); ans.hidden = !fc.flipped; });
    s.append(el("div", { class: "bar" }, el("span", { style: "width:" + (100 * fc.i / fc.deck.length) + "%" })),
      el("p", { class: "small muted", style: "margin:0", text: "Kaart " + (fc.i + 1) + " van " + fc.deck.length + " · tik om te draaien · kaarten die je kent komen later terug" }),
      el("div", { class: "card-stage" }, card), ans);
    v.append(s);
  }
  function kaart(c, ok) {
    S.leitner[c.id] = ok ? Math.min(5, box(c.id) + 1) : 1; S.cards++; bump("cards", 1);
    if (ok) { fc.known++; addMomoj(3); }
    fc.i++; fc.flipped = false; studied(); checkBadges(); checkQuests(); save(); rFlash();
  }
  function chipRow(cur, onPick) {
    const r = el("div", { class: "chips", role: "group", "aria-label": "Kies een vak" });
    r.append(el("button", { class: "chip", type: "button", "aria-pressed": String(!cur), onclick: () => onPick("") }, "Alle vakken"));
    VAKKEN.forEach(v => r.append(el("button", { class: "chip", type: "button", "aria-pressed": String(cur === v), onclick: () => onPick(v) }, v)));
    return r;
  }

  /* ---------- LEERSTOF ---------- */
  let lsVak = localStorage.getItem("es1af:lsvak") || "";
  function noteBody(text) {
    const w = el("div", { class: "note-body" }); let ul = null;
    for (const raw of String(text).split("\n")) {
      const line = raw.trimEnd();
      if (/^\s*[-*•]\s+/.test(line)) { if (!ul) { ul = el("ul"); w.append(ul); } ul.append(el("li", { text: line.replace(/^\s*[-*•]\s+/, "") })); continue; }
      ul = null; if (!line.trim()) continue;
      w.append(/^#+\s/.test(line) ? el("h4", { text: line.replace(/^#+\s/, "") }) : el("p", { text: line }));
    }
    return w;
  }
  function rLeerstof() {
    const v = $("#v-leerstof"); v.textContent = "";
    v.append(chipRow(lsVak, x => { lsVak = x; try { localStorage.setItem("es1af:lsvak", x); } catch (e) {} rLeerstof(); }));
    const list = DATA.notes.filter(n => !lsVak || n.vak === lsVak).sort((a, b) => VAKKEN.indexOf(a.vak) - VAKKEN.indexOf(b.vak) || a.titel.localeCompare(b.titel, "nl", { numeric: true }));
    const s = el("div", { class: "sheet stack" }, el("h2", { text: "Leerstof" }),
      el("p", { class: "small muted", style: "margin:0", text: "Samenvattingen op basis van jullie studiewijzers. Je cursus en de kaders van je leerkracht blijven de echte leerstof: vergelijk altijd." }));
    list.forEach(n => s.append(el("details", { class: "item" }, el("summary", null, el("div", { class: "row", style: "gap:8px" }, el("span", { class: "dot", style: "background:" + KLEUR[n.vak] }), el("span", { class: "tag", text: n.vak }), el("b", { text: n.titel }))), el("div", { style: "margin-top:8px" }, noteBody(n.tekst)))));
    v.append(s);
    v.append(el("div", { class: "sheet stack" }, el("h2", { text: "Studietips" }), el("div", { class: "grid2" },
      [["Overhoor jezelf", "Doe eerst de dagquiz en de flashcards. Lees daarna pas na wat je fout had."], ["Spreid je herhaling", "Herhaal op dag 1, dag 3 en dag 7. Zo staat het ook in je studiewijzers."], ["Werk in blokken", "45 minuten echt leren, gsm in een andere kamer, dan 10 minuten pauze."], ["Slaap genoeg", "Je hersenen slaan alles op terwijl je slaapt. Doorhalen kost punten."]].map(([h, p]) => el("div", { class: "item" }, el("h3", { text: h }), el("p", { class: "small", style: "margin:.3em 0 0", text: p }))))));
  }

  /* ---------- PLANNING ---------- */
  function rPlanning() {
    const v = $("#v-planning"); v.textContent = "";
    const r = el("div", { class: "sheet stack" }, el("h2", { text: "Examenrooster" }));
    exams().forEach(e => { const n = daysUntil(e.datum); r.append(el("div", { class: "item exam", style: n < 0 ? "opacity:.5" : null }, el("span", { class: "days" + (n >= 0 && n <= 3 ? " soon" : ""), text: n < 0 ? "✓" : n }), el("div", null, el("b", { text: e.vak }), el("div", { class: "small muted", text: fmtDate(parseDate(e.datum)) + " · " + (e.tijd || "") + (n < 0 ? " · geweest" : n === 0 ? " · vandaag!" : " · nog " + n + (n === 1 ? " dag" : " dagen")) })))); });
    r.append(el("p", { class: "small muted", style: "margin:0", text: "Maandag 14 december: inhaalexamens. Vrijdag 18 december: rapport." }));
    v.append(r);
    const sel = el("select", { id: "per", "aria-label": "Blokken per dag" }, [2, 3, 4, 5].map(n => el("option", { value: n, selected: n === perDay() }, n)));
    sel.addEventListener("change", () => { try { localStorage.setItem("es1af:per", sel.value); } catch (e) {} rPlanning(); });
    const p = el("div", { class: "sheet stack" }, el("div", { class: "row between" }, el("h2", { text: "Jouw studieplan" }), el("label", { class: "row small", style: "gap:6px" }, "Blokken per dag", sel)),
      el("p", { class: "small muted", style: "margin:0", text: "Elk blok is 45 minuten leren + 10 minuten pauze. De dag voor een examen herhaal je alleen dat vak." }));
    const g = el("div", { class: "plan" });
    const days = planDays(perDay(), 21);
    if (!days.length) g.append(el("div", { class: "empty", text: "Alle examens zijn voorbij. Goed gedaan!" }));
    days.forEach((x, i) => {
      const c = el("div", { class: "day" + (i === 0 ? " today" : "") }, el("h4", { text: i === 0 ? "Vandaag" : i === 1 ? "Morgen" : fmtDate(x.day) }));
      x.todays.forEach(e => c.append(el("div", { class: "block exam-day" }, el("span", { text: "Examen " + e.vak }), el("span", { class: "t", text: (e.tijd || "").split(" ·")[0] }))));
      x.pick.forEach((vk, b) => c.append(el("div", { class: "block" }, el("span", null, el("span", { class: "dot", style: "background:" + KLEUR[vk] + ";margin-right:6px" }), vk + (x.herhaal ? " – herhalen" : "")), el("span", { class: "t", text: x.slots[b] || "" }))));
      if (!x.pick.length && !x.todays.length) c.append(el("div", { class: "block muted", text: "Vrij" }));
      g.append(c);
    });
    p.append(g); v.append(p);
  }

  /* ---------- WINKEL ---------- */
  function rWinkel() {
    const v = $("#v-winkel"); v.textContent = "";
    const l = level(), start = lvlStart(l), next = lvlStart(l + 1);
    v.append(el("div", { class: "sheet hero" }, buddyEl(true), el("div", { class: "stack", style: "gap:8px;min-width:0" },
      el("div", { class: "row", style: "gap:8px" }, el("span", { class: "reward", style: "font-size:1.3rem" }, coinSvg(), S.momoj + " momoj")),
      el("div", { class: "small muted", text: "Niveau " + l + " · nog " + (next - S.xp) + " xp tot niveau " + (l + 1) }),
      el("div", { class: "bar coin-bar" }, el("span", { style: "width:" + Math.round(100 * (S.xp - start) / (next - start)) + "%" })),
      el("div", { class: "small muted", text: "Verdien momoj met juiste antwoorden, flashcards, dagopdrachten en je reeks." }))));
    const shop = (titel, items, owned, cur, kies) => {
      const g = el("div", { class: "shop" });
      items.forEach(it => {
        const heb = it.prijs === 0 || S.owned.includes(it.id), aan = cur === it.id;
        g.append(el("div", { class: "ware" + (aan ? " on" : "") }, el("span", { class: "em", "aria-hidden": "true", text: it.em || "—" }), el("b", { text: it.naam }),
          aan ? el("span", { class: "small", style: "color:var(--blue);font-weight:700", text: "Gekozen" })
            : heb ? el("button", { class: "ghost", type: "button", onclick: () => { kies(it.id); save(); rWinkel(); } }, "Kies")
              : el("button", { type: "button", disabled: S.momoj < it.prijs, onclick: () => koop(it, kies) }, coinSvg(), it.prijs)));
      });
      return el("div", { class: "sheet stack" }, el("h2", { text: titel }), g);
    };
    v.append(shop("Buddy's", BUDDIES, S.owned, S.buddy, id => S.buddy = id));
    v.append(shop("Accessoires", ACCS, S.owned, S.acc, id => S.acc = id));
    const b = el("div", { class: "grid2" });
    BADGES.forEach(x => b.append(el("div", { class: "badge" + (S.badges.includes(x.id) ? " got" : "") }, el("span", { class: "ic", "aria-hidden": "true", text: x.ic }), el("div", null, el("b", { text: x.naam }), el("div", { class: "small muted", text: x.tekst })))));
    v.append(el("div", { class: "sheet stack" }, el("h2", { text: "Badges (" + S.badges.length + "/" + BADGES.length + ")" }), b));
  }
  function koop(it, kies) {
    if (S.momoj < it.prijs) return; S.momoj -= it.prijs; S.owned.push(it.id); kies(it.id); save();
    toast(it.naam + " gekocht!"); rWinkel();
  }

  /* ---------- APP INSTALLEREN ---------- */
  let deferred = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", () => { toast("De app staat op je toestel!"); deferred = null; const b = $("#installBtn"); if (b) b.hidden = true; });
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function installeer() {
    if (deferred) { deferred.prompt(); deferred.userChoice.finally(() => { deferred = null; }); return; }
    const stappen = isIOS()
      ? ["Open deze site in Safari.", "Tik onderaan op de Deel-knop (vierkantje met pijl omhoog).", "Kies 'Zet op beginscherm'.", "Tik op 'Voeg toe'. Klaar!"]
      : ["Open het menu van je browser (de drie puntjes).", "Kies 'App installeren' of 'Toevoegen aan startscherm'.", "Bevestig. De app staat nu bij je andere apps."];
    dialog("Installeer als app", el("ol", { style: "padding-left:1.2em;margin:0" }, stappen.map(s => el("li", { style: "margin:.3em 0", text: s }))));
  }
  function dialog(titel, ...body) {
    const close = () => ov.remove();
    const ov = el("div", { class: "overlay", onclick: e => { if (e.target === ov) close(); } },
      el("div", { class: "dialog stack", role: "dialog", "aria-modal": "true", "aria-label": titel }, el("h2", { text: titel }), ...body, el("div", null, el("button", { type: "button", onclick: close }, "Sluiten"))));
    $("#layer").append(ov); ov.querySelector("button").focus();
    return close;
  }

  /* ---------- MELDINGEN ---------- */
  function meldingenDialog() {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    const chk = el("input", { type: "checkbox", id: "notifOn" }); chk.checked = S.notif.on;
    const time = el("input", { type: "time", id: "notifTime", value: S.notif.time });
    const msg = el("p", { class: "small muted", style: "margin:0" });
    const body = el("div", { class: "stack" },
      el("p", { style: "margin:0", text: "Krijg elke dag een herinnering met een motivatie als je nog niet gestudeerd hebt." }),
      el("label", { class: "switch" }, chk, "Herinneringen aan"),
      el("label", { class: "row", style: "gap:8px;font-weight:700" }, "Om", time),
      el("div", { class: "row" }, el("button", { class: "ghost", type: "button", onclick: () => toon("Zo ziet een melding eruit!", motivatie(3)) }, "Test een melding")),
      msg,
      el("p", { class: "small muted", style: "margin:0", text: isIOS() ? "Op iPhone: zet de app eerst op je beginscherm (iOS 16.4 of nieuwer) en open hem vanaf daar." : "Werkt het best als je de site eerst als app installeert." }));
    if (!supported) { chk.disabled = true; msg.textContent = "Deze browser ondersteunt geen meldingen. Installeer de site als app of probeer een andere browser."; }
    chk.addEventListener("change", async () => {
      if (chk.checked) {
        const p = await Notification.requestPermission();
        if (p !== "granted") { chk.checked = false; msg.textContent = "Je hebt meldingen niet toegestaan. Je kan dit aanpassen in de instellingen van je browser."; return; }
        S.notif.on = true; await registerSync(); msg.textContent = "Top! Je krijgt een herinnering om " + S.notif.time + " als je nog niet gestudeerd hebt.";
      } else { S.notif.on = false; msg.textContent = "Herinneringen staan uit."; }
      save(); render();
    });
    time.addEventListener("change", () => { S.notif.time = time.value || "16:30"; save(); render(); });
    dialog("Meldingen", body);
  }
  async function toon(titel, tekst) {
    try {
      if (Notification.permission !== "granted") { const p = await Notification.requestPermission(); if (p !== "granted") { toast("Meldingen zijn niet toegestaan."); return; } }
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titel, { body: tekst, icon: "icon-192.png", badge: "icon-192.png", tag: "studie" });
    } catch (e) { toast("Melding tonen lukte niet op dit toestel."); }
  }
  async function registerSync() {
    try { const reg = await navigator.serviceWorker.ready; if (reg.periodicSync) await reg.periodicSync.register("studie-herinnering", { minInterval: 6 * 3600 * 1000 }); } catch (e) {}
  }
  async function syncSwState() {
    try { if (!("caches" in window)) return; const c = await caches.open("es1af-state"); await c.put("state.json", new Response(JSON.stringify({ on: S.notif.on, time: S.notif.time, lastStudy: S.lastStudy, last: S.notif.last, streak: S.streak, motivatie: MOTIVATIE }), { headers: { "content-type": "application/json" } })); } catch (e) {}
  }
  function herinnerCheck() {
    if (!S.notif.on || !("Notification" in window) || Notification.permission !== "granted") return;
    const t = today(), now = new Date(), [h, m] = S.notif.time.split(":").map(Number);
    if (S.lastStudy === t || S.notif.last === t) return;
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    S.notif.last = t; save();
    toon(S.streak > 0 ? "Hou je reeks van " + S.streak + " dagen vol!" : "Tijd om te studeren!", motivatie(7));
  }

  /* ---------- TELLER (anoniem) ---------- */
  const TELLER = "https://examen-studie-teller.onrender.com";
  function toestelId() {
    try {
      let id = localStorage.getItem("es1af:id");
      if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => (Math.random() * 16 | 0).toString(16))); localStorage.setItem("es1af:id", id); }
      return id;
    } catch (e) { return null; }
  }
  async function tel() {
    const id = toestelId(); if (!id || !navigator.onLine) return;
    try {
      const r = await fetch(TELLER + "/hit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) return; const d = await r.json();
      S.teller = { totaal: d.totaal, vandaag: d.vandaag }; save(); if (view === "vandaag") rVandaag();
    } catch (e) {}
  }

  /* ---------- start ---------- */
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  route(); syncSwState(); tel();
  setInterval(herinnerCheck, 60000); setTimeout(herinnerCheck, 4000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); herinnerCheck(); } });
})();
