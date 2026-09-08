/* Arena FC 27 — opstelling maken met spelerskaarten. */
const Squad = (function () {
  "use strict";

  const KEY = "fc27.lineup.";
  const $ = (s) => document.querySelector(s);
  let teamIdx = 0, slots = [], pickIdx = null, onDone = null;

  /* Welke natuurlijke posities passen op een plek in de 4-3-3. */
  const FITS = {
    GK: ["GK"],
    RB: ["RB", "CB", "RM", "RW"],
    LB: ["LB", "CB", "LM", "LW"],
    CB: ["CB", "RB", "LB", "CDM"],
    CDM: ["CDM", "CM", "CB"],
    CM: ["CM", "CDM", "CAM"],
    CAM: ["CAM", "CM", "ST"],
    RW: ["RW", "RM", "ST", "CAM", "LW"],
    LW: ["LW", "LM", "ST", "CAM", "RW"],
    ST: ["ST", "CAM", "LW", "RW"]
  };

  const fits = (p, role) => (FITS[role] || []).indexOf(p.pos) !== -1;
  const natural = (p, role) => (FITS[role] || [])[0] === p.pos;

  function load(teamId) {
    try {
      const raw = localStorage.getItem(KEY + teamId);
      if (!raw) return null;
      const names = JSON.parse(raw);
      return Array.isArray(names) && names.length === 11 ? names : null;
    } catch (e) { return null; }
  }

  function save(teamId, names) {
    try { localStorage.setItem(KEY + teamId, JSON.stringify(names)); } catch (e) {}
  }

  function cardClass(p) {
    if (p.rating >= 87) return "elite";
    if (p.rating >= 82) return "goud";
    return "zilver";
  }

  /* Bouwt één spelerskaart met portret en statistieken. */
  function cardEl(p, team, opts) {
    const el = document.createElement("article");
    el.className = "kaart " + cardClass(p) + (opts && opts.klein ? " klein" : "");
    const kit = p.isGK ? team.gkKit : team.kit;

    const top = document.createElement("div");
    top.className = "kop";
    top.innerHTML = "<div><b>" + p.rating + "</b><span>" + p.pos + "</span></div>";
    const face = Faces.get(p.name + team.id, 128, kit).cloneNode(true);
    face.getContext("2d").drawImage(Faces.get(p.name + team.id, 128, kit), 0, 0);
    face.className = "kop-foto";
    top.appendChild(face);
    el.appendChild(top);

    const nm = document.createElement("div");
    nm.className = "naam";
    nm.textContent = p.name;
    el.appendChild(nm);

    const s = p.stats;
    const labels = p.isGK ? ["DIV", "HAN", "TRA", "REF", "SNL", "POS"] : ["SNL", "SCH", "PAS", "DRI", "VER", "FYS"];
    /* Keeperwaarden hangen aan de rating zelf; de veldstatistieken zeggen weinig over een doelman. */
    const r = p.rating, j = (n) => Math.round((s.pac % 7) - 3 + n);
    const vals = p.isGK ? [j(r - 1), j(r - 4), j(r - 7), j(r + 1), j(r - 24), j(r - 3)]
                        : [s.pac, s.sho, s.pas, s.dri, s.def, s.phy];
    const st = document.createElement("div");
    st.className = "stats";
    st.innerHTML = labels.map((l, i) =>
      "<div><span>" + l + "</span><b>" + Math.min(99, vals[i]) + "</b></div>").join("");
    el.appendChild(st);
    return el;
  }

  /* ---------------- Scherm ---------------- */
  function open(idx, done) {
    teamIdx = idx;
    onDone = done || null;
    const team = TEAMS[teamIdx];
    const squad = buildSquad(team);
    const saved = load(team.id);
    slots = FORMATION.map((f, i) => {
      if (saved) {
        const found = squad.filter((p) => p.name === saved[i])[0];
        if (found) return found;
      }
      return squad.filter((p) => p.starter)[i];
    });
    /* Dubbele spelers eruit halen als de opslag niet meer klopt. */
    slots.forEach((p, i) => {
      if (slots.indexOf(p) !== i) {
        slots[i] = squad.filter((q) => slots.indexOf(q) === -1 && fits(q, FORMATION[i].role))[0] ||
                   squad.filter((q) => slots.indexOf(q) === -1)[0];
      }
    });
    render();
  }

  function render() {
    const team = TEAMS[teamIdx];
    const squad = buildSquad(team);
    $("#squad-team").textContent = team.name;
    $("#squad-badge").style.background = team.kit.shirt;
    $("#squad-badge").style.color = team.kit.num;
    $("#squad-badge").textContent = team.abbr;

    const gem = Math.round(slots.reduce((a, p) => a + (p ? p.rating : 0), 0) / 11);
    $("#squad-rating").textContent = gem;

    const grid = $("#squad-slots");
    grid.innerHTML = "";
    FORMATION.forEach((f, i) => {
      const wrap = document.createElement("div");
      wrap.className = "slot-kaart";
      const rol = document.createElement("div");
      rol.className = "rol";
      rol.textContent = f.role;
      wrap.appendChild(rol);
      const p = slots[i];
      if (p) {
        const c = cardEl(p, team, { klein: true });
        if (!natural(p, f.role)) c.classList.add("uit-positie");
        wrap.appendChild(c);
      }
      wrap.addEventListener("click", () => openPicker(i));
      grid.appendChild(wrap);
    });

    const bank = $("#squad-bench");
    bank.innerHTML = "";
    squad.filter((p) => slots.every((s) => !s || s.name !== p.name)).forEach((p) => {
      const c = cardEl(p, team, { klein: true });
      c.addEventListener("click", () => {
        /* Zet een bankspeler op de eerste plek waar hij past. */
        let i = FORMATION.findIndex((f) => fits(p, f.role) && natural(p, f.role));
        if (i === -1) i = FORMATION.findIndex((f) => fits(p, f.role));
        if (i === -1) return;
        slots[i] = p;
        persist();
        render();
      });
      bank.appendChild(c);
    });
  }

  function openPicker(i) {
    pickIdx = i;
    const team = TEAMS[teamIdx];
    const role = FORMATION[i].role;
    const squad = buildSquad(team);
    $("#picker-title").textContent = "Kies een speler voor " + role;
    const list = squad
      .filter((p) => fits(p, role))
      .sort((a, b) => (natural(b, role) - natural(a, role)) || (b.rating - a.rating));
    const box = $("#picker-list");
    box.innerHTML = "";
    list.forEach((p) => {
      const c = cardEl(p, team, { klein: true });
      if (slots.some((s) => s && s.name === p.name)) c.classList.add("bezet");
      c.addEventListener("click", () => {
        const was = slots.findIndex((s) => s && s.name === p.name);
        if (was !== -1) slots[was] = slots[pickIdx];      // wisselen
        slots[pickIdx] = p;
        persist();
        $("#picker").hidden = true;
        render();
      });
      box.appendChild(c);
    });
    $("#picker").hidden = false;
  }

  function persist() {
    save(TEAMS[teamIdx].id, slots.map((p) => (p ? p.name : "")));
  }

  function autoBest() {
    const team = TEAMS[teamIdx];
    const squad = buildSquad(team);
    slots = FORMATION.map(() => null);
    FORMATION.forEach((f, i) => {
      const best = squad
        .filter((p) => slots.indexOf(p) === -1 && natural(p, f.role))
        .sort((a, b) => b.rating - a.rating)[0] ||
        squad.filter((p) => slots.indexOf(p) === -1 && fits(p, f.role))
          .sort((a, b) => b.rating - a.rating)[0];
      slots[i] = best || null;
    });
    persist();
    render();
  }

  return { open: open, render: render, load: load, autoBest: autoBest, cardEl: cardEl,
           setTeam: (i) => { teamIdx = i; }, teamIndex: () => teamIdx,
           close: () => { if (onDone) onDone(); } };
})();
