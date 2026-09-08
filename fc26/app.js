/* Squad builder — formaties, chemie en teamrating. */

const FORMATIONS = {
  "4-3-3": [
    { p: "GK", x: 50, y: 91 },
    { p: "LB", x: 12, y: 72 }, { p: "CB", x: 34, y: 77 }, { p: "CB", x: 66, y: 77 }, { p: "RB", x: 88, y: 72 },
    { p: "CM", x: 25, y: 50 }, { p: "CM", x: 50, y: 55 }, { p: "CM", x: 75, y: 50 },
    { p: "LW", x: 16, y: 22 }, { p: "ST", x: 50, y: 15 }, { p: "RW", x: 84, y: 22 }
  ],
  "4-4-2": [
    { p: "GK", x: 50, y: 91 },
    { p: "LB", x: 12, y: 72 }, { p: "CB", x: 34, y: 77 }, { p: "CB", x: 66, y: 77 }, { p: "RB", x: 88, y: 72 },
    { p: "LM", x: 12, y: 47 }, { p: "CM", x: 38, y: 53 }, { p: "CM", x: 62, y: 53 }, { p: "RM", x: 88, y: 47 },
    { p: "ST", x: 36, y: 17 }, { p: "ST", x: 64, y: 17 }
  ],
  "3-5-2": [
    { p: "GK", x: 50, y: 91 },
    { p: "CB", x: 24, y: 77 }, { p: "CB", x: 50, y: 79 }, { p: "CB", x: 76, y: 77 },
    { p: "LM", x: 10, y: 49 }, { p: "CM", x: 32, y: 55 }, { p: "CDM", x: 50, y: 62 }, { p: "CM", x: 68, y: 55 }, { p: "RM", x: 90, y: 49 },
    { p: "ST", x: 36, y: 17 }, { p: "ST", x: 64, y: 17 }
  ],
  "4-2-3-1": [
    { p: "GK", x: 50, y: 91 },
    { p: "LB", x: 12, y: 72 }, { p: "CB", x: 34, y: 77 }, { p: "CB", x: 66, y: 77 }, { p: "RB", x: 88, y: 72 },
    { p: "CDM", x: 36, y: 58 }, { p: "CDM", x: 64, y: 58 },
    { p: "LW", x: 16, y: 36 }, { p: "CAM", x: 50, y: 34 }, { p: "RW", x: 84, y: 36 },
    { p: "ST", x: 50, y: 13 }
  ]
};

/* Welke natuurlijke posities passen op een slot. Eerste is de ideale. */
const FITS = {
  GK: ["GK"],
  CB: ["CB", "LB", "RB"],
  LB: ["LB", "CB", "LW", "LM"],
  RB: ["RB", "CB", "RW", "RM"],
  CDM: ["CDM", "CM", "CB"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM", "ST"],
  LM: ["LM", "LW", "CM", "LB"],
  RM: ["RM", "RW", "CM", "RB"],
  LW: ["LW", "LM", "ST", "CAM"],
  RW: ["RW", "RM", "ST", "CAM"],
  ST: ["ST", "LW", "RW", "CAM"]
};

const OUTFIELD_LABELS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const GK_LABELS = ["DIV", "HAN", "KIC", "REF", "SPD", "POS"];
const STORAGE_KEY = "fc26.squad.v1";

let formation = "4-3-3";
let squad = [];          // squad[slotIndex] = spelerId of null
let pickingSlot = null;  // actief slot in de modal

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------------- Helpers ---------------- */

function cardClass(p) {
  if (p.i) return "icon";
  if (p.r < 85) return "silver";
  return "";
}

function initials(name) {
  const parts = name.replace(/\./g, "").split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return ((parts[0] || "")[0] + (last[0] || "")).toUpperCase();
}

function fitsSlot(player, slotPos) {
  return (FITS[slotPos] || []).indexOf(player.p) !== -1;
}

function inPosition(player, slotPos) {
  return (FITS[slotPos] || [])[0] === player.p;
}

function squadPlayers() {
  return squad.map((id) => (id === null || id === undefined ? null : PLAYERS[id]));
}

/* Chemie: max 3 per speler (club + land), teamtotaal max 33. */
function chemistryOf(index) {
  const players = squadPlayers();
  const me = players[index];
  if (!me) return 0;
  let club = 0, nation = 0;
  players.forEach((other, i) => {
    if (!other || i === index) return;
    if (other.c === me.c) club++;
    if (other.t === me.t) nation++;
  });
  const pts = (n) => (n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0);
  let chem = pts(club) + pts(nation);
  if (!inPosition(me, FORMATIONS[formation][index].p)) chem -= 1;
  return Math.max(0, Math.min(3, chem));
}

function teamStats() {
  const players = squadPlayers().filter(Boolean);
  const filled = players.length;
  const rating = filled ? Math.round(players.reduce((a, p) => a + p.r, 0) / filled) : 0;
  let chem = 0;
  squad.forEach((id, i) => { if (id !== null && id !== undefined) chem += chemistryOf(i); });
  return { filled, rating, chem: Math.min(33, chem) };
}

/* ---------------- Rendering ---------------- */

function renderPitch() {
  const slots = FORMATIONS[formation];
  const pitch = $("#pitch");
  pitch.querySelectorAll(".slot").forEach((el) => el.remove());

  slots.forEach((slot, i) => {
    const el = document.createElement("div");
    el.className = "slot";
    el.style.left = slot.x + "%";
    el.style.top = slot.y + "%";
    el.dataset.slot = i;

    const id = squad[i];
    if (id === null || id === undefined) {
      el.innerHTML = '<div class="empty">+</div><div class="lbl">' + slot.p + "</div>";
    } else {
      const p = PLAYERS[id];
      if (!inPosition(p, slot.p)) el.classList.add("off");
      el.innerHTML =
        '<div class="mini ' + cardClass(p) + '">' +
          '<div class="rt">' + p.r + "</div>" +
          '<div class="nm">' + p.n + "</div>" +
          '<div class="ch">' + "◆".repeat(chemistryOf(i)) + "</div>" +
        "</div>" +
        '<div class="lbl">' + slot.p + " · " + p.p + "</div>";
    }

    el.addEventListener("click", () => openPicker(i));
    pitch.appendChild(el);
  });
}

function renderSummary() {
  const { filled, rating, chem } = teamStats();
  $("#stat-rating").textContent = rating || "–";
  $("#stat-chem").textContent = chem;
  $("#stat-filled").textContent = filled + "/11";
  $("#bar-chem").style.width = Math.round((chem / 33) * 100) + "%";

  const players = squadPlayers().filter(Boolean);
  const count = (key) => {
    const map = {};
    players.forEach((p) => { map[p[key]] = (map[p[key]] || 0) + 1; });
    return Object.keys(map)
      .map((k) => ({ k: k, v: map[k] }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 3);
  };

  const list = $("#chem-list");
  if (!players.length) {
    list.innerHTML = '<li><span>Nog geen spelers gekozen</span></li>';
    return;
  }
  const clubs = count("c").map((x) => "<li><span>" + x.k + "</span><b>" + x.v + "</b></li>").join("");
  const nations = count("t").map((x) => "<li><span>" + x.k + "</span><b>" + x.v + "</b></li>").join("");
  list.innerHTML =
    '<li><span style="color:var(--accent)">Clubs</span><b></b></li>' + clubs +
    '<li><span style="color:var(--accent)">Landen</span><b></b></li>' + nations;
}

function cardHTML(p, used) {
  const labels = p.k ? GK_LABELS : OUTFIELD_LABELS;
  const stats = p.s.map((v, i) => "<div><span>" + labels[i] + "</span><b>" + v + "</b></div>").join("");
  return '<article class="card ' + cardClass(p) + (used ? " used" : "") + '" data-id="' + p.id + '">' +
      '<div class="top">' +
        "<div><div class=\"rating\">" + p.r + '</div><div class="meta">' + p.p + "</div></div>" +
        '<div class="avatar">' + initials(p.n) + "</div>" +
      "</div>" +
      '<div class="name">' + p.n + "</div>" +
      '<div class="stats">' + stats + "</div>" +
      '<div class="club">' + p.c + " · " + p.t + "</div>" +
    "</article>";
}

function filteredPlayers() {
  const q = $("#f-search").value.trim().toLowerCase();
  const line = $("#f-line").value;
  const club = $("#f-club").value;
  const sort = $("#f-sort").value;

  const lineOf = (p) => {
    if (p.p === "GK") return "GK";
    if (["CB", "LB", "RB", "LWB", "RWB"].indexOf(p.p) !== -1) return "DEF";
    if (["CDM", "CM", "CAM", "LM", "RM"].indexOf(p.p) !== -1) return "MID";
    return "ATT";
  };

  let list = PLAYERS.filter((p) => {
    if (q && (p.n + " " + p.c + " " + p.t).toLowerCase().indexOf(q) === -1) return false;
    if (line !== "all" && lineOf(p) !== line) return false;
    if (club !== "all" && p.c !== club) return false;
    return true;
  });

  const idx = { rating: -1, pac: 0, sho: 1, pas: 2, dri: 3, def: 4, phy: 5 }[sort];
  list.sort((a, b) => (idx === -1 ? b.r - a.r : b.s[idx] - a.s[idx]));
  return list;
}

function renderMarket() {
  const list = filteredPlayers();
  $("#market-count").textContent = list.length + " spelers";
  $("#market").innerHTML = list.map((p) => cardHTML(p, squad.indexOf(p.id) !== -1)).join("");
  $$("#market .card").forEach((el) => {
    el.addEventListener("click", () => addToFirstFreeSlot(Number(el.dataset.id)));
  });
}

function renderLeaderboard() {
  const top = PLAYERS.slice().sort((a, b) => b.r - a.r).slice(0, 10);
  $("#leaderboard").innerHTML = top.map((p, i) =>
    "<tr><td>" + (i + 1) + '</td><td>' + p.n + "</td><td>" + p.p + "</td><td>" + p.c +
    "</td><td>" + p.t + '</td><td class="r">' + p.r + "</td></tr>"
  ).join("");
}

function renderAll() {
  renderPitch();
  renderSummary();
  renderMarket();
  save();
}

/* ---------------- Acties ---------------- */

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

function assign(slotIndex, playerId) {
  const existing = squad.indexOf(playerId);
  if (existing !== -1) squad[existing] = null; // speler kan maar één keer in het team
  squad[slotIndex] = playerId;
  renderAll();
}

function addToFirstFreeSlot(playerId) {
  const p = PLAYERS[playerId];
  const slots = FORMATIONS[formation];
  let target = slots.findIndex((s, i) => (squad[i] === null || squad[i] === undefined) && inPosition(p, s.p));
  if (target === -1) {
    target = slots.findIndex((s, i) => (squad[i] === null || squad[i] === undefined) && fitsSlot(p, s.p));
  }
  if (target === -1) {
    toast("Geen vrije plek voor " + p.p + " in " + formation);
    return;
  }
  assign(target, playerId);
  toast(p.n + " → " + slots[target].p);
}

function openPicker(slotIndex) {
  pickingSlot = slotIndex;
  const slot = FORMATIONS[formation][slotIndex];
  $("#modal-title").textContent = "Kies een speler voor " + slot.p;
  $("#modal-search").value = "";
  renderPickerList();
  $("#modal").hidden = false;
  $("#modal-search").focus();
}

function renderPickerList() {
  const slot = FORMATIONS[formation][pickingSlot];
  const q = $("#modal-search").value.trim().toLowerCase();
  const list = PLAYERS
    .filter((p) => fitsSlot(p, slot.p))
    .filter((p) => !q || (p.n + " " + p.c + " " + p.t).toLowerCase().indexOf(q) !== -1)
    .sort((a, b) => (inPosition(b, slot.p) - inPosition(a, slot.p)) || (b.r - a.r));

  const current = squad[pickingSlot];
  const clear = (current === null || current === undefined) ? "" :
    '<button class="btn" id="modal-clear" style="margin-bottom:14px">Plek leegmaken</button>';

  $("#modal-list").innerHTML = clear +
    '<div class="grid">' + list.map((p) => cardHTML(p, squad.indexOf(p.id) !== -1)).join("") + "</div>";

  const clearBtn = $("#modal-clear");
  if (clearBtn) clearBtn.addEventListener("click", () => {
    squad[pickingSlot] = null;
    closeModal();
    renderAll();
  });

  $$("#modal-list .card").forEach((el) => {
    el.addEventListener("click", () => {
      assign(pickingSlot, Number(el.dataset.id));
      closeModal();
    });
  });
}

function closeModal() { $("#modal").hidden = true; pickingSlot = null; }

function resetSquad(keepPlayers) {
  const slots = FORMATIONS[formation];
  const old = keepPlayers ? squad.filter((id) => id !== null && id !== undefined) : [];
  squad = new Array(slots.length).fill(null);
  old.forEach((id) => {
    const p = PLAYERS[id];
    let t = slots.findIndex((s, i) => squad[i] === null && inPosition(p, s.p));
    if (t === -1) t = slots.findIndex((s, i) => squad[i] === null && fitsSlot(p, s.p));
    if (t !== -1) squad[t] = id;
  });
  renderAll();
}

function randomSquad() {
  const slots = FORMATIONS[formation];
  squad = new Array(slots.length).fill(null);
  slots.forEach((slot, i) => {
    const pool = PLAYERS
      .filter((p) => inPosition(p, slot.p) && squad.indexOf(p.id) === -1)
      .sort((a, b) => b.r - a.r)
      .slice(0, 6);
    const fallback = PLAYERS.filter((p) => fitsSlot(p, slot.p) && squad.indexOf(p.id) === -1);
    const pick = (pool.length ? pool : fallback)[Math.floor(Math.random() * (pool.length || fallback.length))];
    if (pick) squad[i] = pick.id;
  });
  renderAll();
  toast("Willekeurig elftal gegenereerd");
}

function bestSquad() {
  const slots = FORMATIONS[formation];
  squad = new Array(slots.length).fill(null);
  slots.forEach((slot, i) => {
    const best = PLAYERS
      .filter((p) => inPosition(p, slot.p) && squad.indexOf(p.id) === -1)
      .sort((a, b) => b.r - a.r)[0];
    if (best) squad[i] = best.id;
  });
  renderAll();
  toast("Sterkste elftal geladen");
}

/* ---------------- Opslag ---------------- */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formation: formation, squad: squad }));
  } catch (e) { /* privémodus: gewoon niet opslaan */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!FORMATIONS[data.formation] || !Array.isArray(data.squad)) return false;
    if (data.squad.length !== FORMATIONS[data.formation].length) return false;
    formation = data.formation;
    squad = data.squad.map((id) => (typeof id === "number" && PLAYERS[id] ? id : null));
    return true;
  } catch (e) { return false; }
}

/* ---------------- Init ---------------- */

function init() {
  const clubs = Array.from(new Set(PLAYERS.map((p) => p.c))).sort();
  $("#f-club").innerHTML = '<option value="all">Alle clubs</option>' +
    clubs.map((c) => '<option value="' + c + '">' + c + "</option>").join("");

  $("#f-formation").innerHTML = Object.keys(FORMATIONS)
    .map((f) => '<option value="' + f + '">' + f + "</option>").join("");

  if (!load()) squad = new Array(FORMATIONS[formation].length).fill(null);
  $("#f-formation").value = formation;

  $("#f-formation").addEventListener("change", (e) => {
    formation = e.target.value;
    resetSquad(true);
  });
  ["#f-search", "#f-line", "#f-club", "#f-sort"].forEach((sel) => {
    $(sel).addEventListener("input", renderMarket);
    $(sel).addEventListener("change", renderMarket);
  });
  $("#btn-best").addEventListener("click", bestSquad);
  $("#btn-random").addEventListener("click", randomSquad);
  $("#btn-clear").addEventListener("click", () => { resetSquad(false); toast("Team gewist"); });
  $("#modal-search").addEventListener("input", renderPickerList);
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

  renderLeaderboard();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
