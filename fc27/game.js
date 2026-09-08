/* Arena FC 27 — regie: schermen, besturing, multiplayer en wedstrijdverloop. */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const S = Match.S;
  const keys = Object.create(null), tapped = Object.create(null);
  const touch = { active: false, dx: 0, dy: 0, fire: false };

  let screen = "screen-title";
  let flow = "menu";              // menu, walkout, anthem, match, replay, halftime, fulltime
  let mode = "cpu";               // cpu, local2, host, gast
  let lastTs = 0, acc = 0, bannerTimer = 0;
  let replayIdx = 0, replayHold = 0, anthemSkip = null;
  let netTick = 0, remoteInput = null, guestState = null;
  let meldingBlessure = false, meldingPen = false;

  /* Speler 1 stuurt het thuisteam, speler 2 de tegenstander. */
  const P = [
    { team: 0, color: "#ff2f2f", power: 0, manual: null, manualT: 0, keys: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD",
        shoot: "Space", pass: "KeyE", loft: "KeyQ", sprint: "ShiftLeft", wissel: "KeyC" } },
    { team: 1, color: "#3d8bff", power: 0, manual: null, manualT: 0, keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
        shoot: "Enter", pass: "Slash", loft: "Period", sprint: "ShiftRight", wissel: "Comma" } }
  ];

  /* ---------------- Schermen ---------------- */
  function show(id) {
    ["screen-title", "screen-match", "screen-squad", "screen-mp", "screen-help"].forEach((s) => {
      const el = $("#" + s);
      if (el) el.hidden = s !== id;
    });
    screen = id;
    if (id === "screen-squad") {
      $("#squad-pick-team").value = $("#pick-home").value;
      Squad.open(Number($("#pick-home").value) || 0);
    }
    /* Terug op het wedstrijdscherm: opnieuw inlezen, anders staat er een oude opstelling. */
    if (id === "screen-match") updateMatchScreen();
  }

  function banner(text, sub, seconds) {
    $("#banner-main").textContent = text;
    $("#banner-sub").textContent = sub || "";
    $("#banner").hidden = false;
    bannerTimer = seconds || 3;
  }

  function verslag(text) { $("#ticker").textContent = text; }

  /* ---------------- Teamkeuze ---------------- */
  function fillPickers() {
    const opts = TEAMS.map((t, i) => '<option value="' + i + '">' + t.name + "</option>").join("");
    $("#pick-home").innerHTML = opts;
    $("#pick-away").innerHTML = opts;
    $("#squad-pick-team").innerHTML = opts;
    $("#pick-home").value = "0";
    $("#pick-away").value = "1";
    $("#squad-pick-team").value = "0";
    updateMatchScreen();
  }

  function updateMatchScreen() {
    if ($("#pick-home").value === $("#pick-away").value) {
      const other = TEAMS.findIndex((t, i) => String(i) !== $("#pick-home").value);
      $("#pick-away").value = String(other);
    }
    const home = TEAMS[Number($("#pick-home").value)], away = TEAMS[Number($("#pick-away").value)];
    [["#badge-home", home], ["#badge-away", away]].forEach(([sel, t]) => {
      $(sel).style.background = t.kit.shirt;
      $(sel).style.color = t.kit.num;
      $(sel).textContent = t.abbr;
    });
    $("#anthem-note").textContent = "Volkslied bij de opkomst: " + home.anthemName;

    const eigen = Squad.load(home.id);
    $("#opstel-bron").textContent = eigen ? "(jouw opstelling)" : "";
    const rows = (t, lineup) => {
      const squad = buildSquad(t);
      const elf = lineup ? lineup.map((n) => squad.filter((p) => p.name === n)[0]).filter(Boolean)
                         : squad.filter((p) => p.starter);
      return elf.map((p, i) => "<li><span>" + FORMATION[i].role + "</span>" + p.name +
        "<b>" + p.rating + "</b></li>").join("");
    };
    $("#squad-home").innerHTML = rows(home, eigen);
    $("#squad-away").innerHTML = rows(away, Squad.load(away.id));
  }

  /* ---------------- Wedstrijd starten ---------------- */
  function lineups(home, away) {
    const l = {};
    const a = Squad.load(home.id), b = Squad.load(away.id);
    if (a) l[0] = a;
    if (b) l[1] = b;
    return l;
  }

  function startMatch(opts) {
    const home = TEAMS[Number($("#pick-home").value)];
    const away = TEAMS[Number($("#pick-away").value)];
    Sound.init(); Sound.resume();
    Sound.setMuted(!$("#opt-sound").checked);
    Sound.startCrowd();

    const settings = {
      halfLen: Number($("#opt-length").value),
      difficulty: Number($("#opt-diff").value),
      demo: $("#opt-demo").checked && mode === "cpu",
      lineups: lineups(home, away)
    };
    Match.init(home, away, settings);

    if (mode === "host") {
      Net.send({ t: "start", home: home.id, away: away.id,
                 halfLen: settings.halfLen, difficulty: settings.difficulty,
                 lineups: settings.lineups });
    }

    $("#hud-home").textContent = home.abbr;
    $("#hud-away").textContent = away.abbr;
    $("#hud-home").style.background = home.kit.shirt;
    $("#hud-home").style.color = home.kit.num;
    $("#hud-away").style.background = away.kit.shirt;
    $("#hud-away").style.color = away.kit.num;

    ["screen-title", "screen-match", "screen-squad", "screen-mp", "screen-help"].forEach((s) => { $("#" + s).hidden = true; });
    $("#hud").hidden = false;
    $("#meters").hidden = false;
    $("#p2-panel").hidden = (mode === "cpu");
    $("#ticker-wrap").hidden = false;
    $("#net-note").hidden = (mode === "cpu" || mode === "local2");

    Match.setupWalkout();
    flow = "walkout";
    View.setCamera(PITCH.L / 2, 0.9, true);
    verslag("De ploegen komen het veld op — " + home.name + " tegen " + away.name + ".");
    banner("OPKOMST", home.name + " – " + away.name, 4);
    Sound.crowdLevel(0.45);
  }

  function startAnthem() {
    flow = "anthem";
    S.phase = "anthem";
    const home = S.teams[0];
    banner("VOLKSLIED", home.anthemName + " — " + home.name, 6);
    verslag("De teams staan opgesteld voor het volkslied.");
    $("#skip").hidden = false;
    Sound.crowdLevel(0.15);
    const secs = Sound.anthem(home.anthem, () => { if (flow === "anthem") kickOff(); });
    anthemSkip = setTimeout(() => { if (flow === "anthem") kickOff(); }, (secs + 2) * 1000);
  }

  function kickOff() {
    clearTimeout(anthemSkip);
    Sound.stopAnthem();
    $("#skip").hidden = true;
    flow = "match";
    Match.setKickoff(0);
    Sound.whistle("short");
    Sound.crowdLevel(0.4);
    verslag("We zijn onderweg.");
    banner("AFTRAP", S.teams[0].name + " – " + S.teams[1].name, 2.5);
    if (mode === "host") Net.send({ t: "kick" });
  }

  /* ---------------- Besturing ---------------- */
  function cycleSwitch(t) {
    const lijst = S.players
      .filter((p) => p.team === t && !p.isGK && !p.off)
      .sort((a, b) => Match.dist(a, S.ball) - Match.dist(b, S.ball));
    if (!lijst.length) return;
    const nu = activeFor(t);
    P[t].manual = lijst[(lijst.indexOf(nu) + 1) % lijst.length];
    P[t].manualT = 4;
  }

  function activeFor(team) {
    const pl = P[team];
    /* Handmatig gekozen speler blijft even geselecteerd. */
    if (pl.manual && pl.manualT > 0 && !pl.manual.off) return pl.manual;
    if (S.owner && S.owner.team === team) return S.owner;
    const out = S.players.filter((p) => p.team === team && !p.isGK);
    let best = out[0], bd = 1e9;
    out.forEach((p) => { const d = Match.dist(p, S.ball); if (d < bd) { bd = d; best = p; } });
    return best;
  }

  function humanTeams() {
    if (mode === "cpu") return $("#opt-demo").checked ? [] : [0];
    if (mode === "local2") return [0, 1];
    if (mode === "host") return [0];
    return [];
  }

  function vectorFor(pl, ext) {
    let dx = 0, dy = 0;
    if (ext) { dx = ext.dx; dy = ext.dy; }
    else {
      const k = pl.keys;
      if (keys[k.left]) dx -= 1;
      if (keys[k.right]) dx += 1;
      if (keys[k.up]) dy -= 1;
      if (keys[k.down]) dy += 1;
      if (pl === P[0] && touch.active) { dx = touch.dx; dy = touch.dy; }
    }
    const len = Math.hypot(dx, dy);
    return len > 1 ? { x: dx / len, y: dy / len } : { x: dx, y: dy };
  }

  function userAim(p, v) {
    const toGoal = Match.aimGoal(p, 0.55);
    const base = (v.x || v.y) ? Math.atan2(v.y, v.x) : toGoal;
    const delta = Math.atan2(Math.sin(toGoal - base), Math.cos(toGoal - base));
    if (Math.abs(delta) > 1.2) return base;
    const d = Math.abs(p.x - Match.goalX(p.team));
    return base + delta * Match.clamp(1 - d / 900, 0.25, 0.75);
  }

  function control(pl, p, ext) {
    if (!p || p.stun > 0) return;
    const k = pl.keys;
    const v = vectorFor(pl, ext);
    const sprint = ext ? ext.sprint : keys[k.sprint];
    if (v.x || v.y) {
      const max = p.maxSpeed * (sprint && p.stamina > 0.4 ? 1.22 : 1) * (0.75 + p.stamina * 0.25);
      p.vx += (v.x * max - p.vx) * (p.accel + 0.06);
      p.vy += (v.y * max - p.vy) * (p.accel + 0.06);
      if (sprint) p.stamina = Match.clamp(p.stamina - 0.0006, 0.35, 1);
    }
    const firing = ext ? ext.fire : (keys[k.shoot] || (pl === P[0] && touch.fire));
    const release = ext ? ext.release : tapped[k.shoot + "Up"];
    const wantPass = ext ? ext.pass : (keys[k.pass] || tapped[k.pass]);
    const wantLoft = ext ? ext.loft : (keys[k.loft] || tapped[k.loft]);

    if (S.owner === p) {
      if (firing) pl.power = Math.min(1, pl.power + 0.030);
      else if (pl.power > 0 || release) {
        S.stats.shots[p.team]++;
        Match.shootBall(p, p.power * (0.55 + pl.power * 0.5), userAim(p, v), pl.power > 0.6 ? 0.5 : 0.12);
        verslag(p.name + " haalt uit!");
        pl.power = 0;
      }
      if (wantPass) {
        const mate = Match.bestPassOption(p);
        if (mate) { Match.passBall(p, mate, false); keys[k.pass] = false; tapped[k.pass] = false; }
      } else if (wantLoft) {
        const mate = Match.bestPassOption(p);
        if (mate) { Match.passBall(p, mate, true); keys[k.loft] = false; tapped[k.loft] = false; }
      }
    } else {
      pl.power = 0;
      if (firing) Match.steer(p, S.ball.x, S.ball.y, 1.25);
    }
  }

  /* ---------------- Multiplayer ---------------- */
  function netSnapshot() {
    const r1 = (n) => Math.round(n * 10) / 10;
    return {
      t: "s",
      b: [r1(S.ball.x), r1(S.ball.y), r1(S.ball.z)],
      p: S.players.map((p) => [r1(p.x), r1(p.y), r1(p.dir * 100) / 100, r1(p.speed)]),
      sc: S.score, ph: S.phase, ck: Math.round(S.clock), hf: S.half,
      a: [S.players.indexOf(activeFor(0)), S.players.indexOf(activeFor(1))],
      fl: flow, ms: S.message || ""
    };
  }

  function applySnapshot(m) {
    if (!S.players.length) return;
    guestState = m;
    S.ball.x = m.b[0]; S.ball.y = m.b[1]; S.ball.z = m.b[2];
    m.p.forEach((row, i) => {
      const p = S.players[i];
      if (!p) return;
      /* Zachtjes naar de doorgegeven positie toe, dat oogt vloeiender dan springen. */
      p.x += (row[0] - p.x) * 0.5;
      p.y += (row[1] - p.y) * 0.5;
      p.dir = row[2];
      p.speed = row[3];
      p.phase += row[3] * 0.42;
    });
    S.score = m.sc; S.phase = m.ph; S.clock = m.ck; S.half = m.hf;
    S.message = m.ms;
    flow = m.fl === "menu" ? flow : m.fl;
  }

  function guestInput() {
    const pl = P[1];
    const v = vectorFor(pl, null);
    return {
      t: "i", dx: +v.x.toFixed(2), dy: +v.y.toFixed(2),
      fire: !!keys[pl.keys.shoot], release: !!tapped[pl.keys.shoot + "Up"],
      pass: !!(keys[pl.keys.pass] || tapped[pl.keys.pass]),
      loft: !!(keys[pl.keys.loft] || tapped[pl.keys.loft]),
      sprint: !!keys[pl.keys.sprint]
    };
  }

  function setupNet() {
    Net.onStatus((s) => {
      $("#mp-status").textContent = "Verbinding: " + s;
      $("#net-note").textContent = "online · " + s;
    });
    Net.onMessage((m) => {
      if (m.t === "start") {
        mode = "gast";
        const hi = TEAMS.findIndex((t) => t.id === m.home);
        const ai = TEAMS.findIndex((t) => t.id === m.away);
        $("#pick-home").value = String(hi);
        $("#pick-away").value = String(ai);
        Sound.init(); Sound.resume(); Sound.startCrowd();
        Match.init(TEAMS[hi], TEAMS[ai], { halfLen: m.halfLen, difficulty: m.difficulty,
          lineups: m.lineups || {}, demo: true });
        $("#hud-home").textContent = TEAMS[hi].abbr;
        $("#hud-away").textContent = TEAMS[ai].abbr;
        $("#hud-home").style.background = TEAMS[hi].kit.shirt;
        $("#hud-away").style.background = TEAMS[ai].kit.shirt;
        ["screen-title", "screen-match", "screen-squad", "screen-mp", "screen-help"].forEach((s) => { $("#" + s).hidden = true; });
        $("#hud").hidden = false; $("#meters").hidden = false;
        $("#p2-panel").hidden = false; $("#ticker-wrap").hidden = false; $("#net-note").hidden = false;
        Match.setupWalkout();
        flow = "walkout";
        banner("OPKOMST", TEAMS[hi].name + " – " + TEAMS[ai].name, 4);
        verslag("Je speelt online. Jij bestuurt " + TEAMS[ai].name + ".");
      } else if (m.t === "s") {
        applySnapshot(m);
      } else if (m.t === "i") {
        remoteInput = m;
      } else if (m.t === "kick") {
        if (mode === "gast") { flow = "match"; $("#skip").hidden = true; }
      }
    });
  }

  /* ---------------- Beeldregie ---------------- */
  function updateCamera() {
    if (flow === "walkout") View.setCamera(PITCH.L / 2 + Math.sin(S.flowTimer * 0.35) * 130, 0.92);
    else if (flow === "anthem") View.setCamera(PITCH.L / 2 - 60 + Math.sin(Date.now() * 0.0004) * 110, 1.05);
    else if (S.phase === "penalty" && S.pen) View.setCamera(S.pen.gx - S.pen.dir * 150, 1.45);
    else if (S.phase === "goal" && S.celebrate && S.celebrate.scorer) View.setCamera(S.celebrate.scorer.x, 1.5);
    else View.setCamera(S.ball.x, S.owner ? 1.05 : 1.0);
  }

  function markers() {
    if (flow !== "match" && flow !== "replay") return [];
    const list = [];
    const teams = mode === "gast" ? [0, 1] : humanTeams();
    teams.forEach((t) => {
      /* Online krijgt de gast de aangestuurde spelers doorgegeven. */
      const p = (mode === "gast" && guestState && guestState.a)
        ? S.players[guestState.a[t]] : activeFor(t);
      if (p) list.push({ player: p, color: P[t].color, label: p.name, lift: t });
    });
    return list;
  }

  function faceInto(canvasId, player) {
    const c = $("#" + canvasId);
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    if (!player) return;
    const team = S.teams[player.team];
    ctx.drawImage(Faces.get(player.name + team.id, 128, player.isGK ? team.gkKit : team.kit),
                  0, 0, c.width, c.height);
  }

  let faceCache = [null, null];
  function updateHud() {
    $("#hud-score").textContent = S.score[0] + " – " + S.score[1];
    $("#hud-clock").textContent = Match.matchMinute() + "'";
    $("#hud-half").textContent = S.half === 1 ? "1e helft" : "2e helft";

    const useNet = mode === "gast" && guestState && guestState.a;
    const a0 = useNet ? S.players[guestState.a[0]] : activeFor(0);
    const a1 = useNet ? S.players[guestState.a[1]] : activeFor(1);
    const showP2 = mode !== "cpu";
    $("#hud-name").textContent = a0 ? a0.number + "  " + a0.name : "—";
    $("#power-bar").style.width = Math.round(P[0].power * 100) + "%";
    $("#stam-bar").style.width = Math.round((a0 ? a0.stamina : 1) * 100) + "%";
    if (a0 !== faceCache[0]) { faceInto("face-p1", a0); faceCache[0] = a0; }
    if (showP2) {
      $("#hud-name2").textContent = a1 ? a1.number + "  " + a1.name : "—";
      $("#power-bar2").style.width = Math.round(P[1].power * 100) + "%";
      $("#stam-bar2").style.width = Math.round((a1 ? a1.stamina : 1) * 100) + "%";
      if (a1 !== faceCache[1]) { faceInto("face-p2", a1); faceCache[1] = a1; }
    }
  }

  function statsTable() {
    const st = S.stats, total = st.poss[0] + st.poss[1] || 1;
    const rows = [
      ["Balbezit", Math.round((st.poss[0] / total) * 100) + "%", Math.round((st.poss[1] / total) * 100) + "%"],
      ["Schoten", st.shots[0], st.shots[1]],
      ["Op doel", st.onTarget[0], st.onTarget[1]],
      ["Passes", st.passes[0], st.passes[1]],
      ["Tackles", st.tackles[0], st.tackles[1]],
      ["Hoekschoppen", st.corners[0], st.corners[1]],
      ["Overtredingen", st.fouls[0], st.fouls[1]],
      ["Gele kaarten", st.cards[0], st.cards[1]],
      ["Buitenspel", st.offsides[0], st.offsides[1]],
      ["Rode kaarten", st.reds[0], st.reds[1]],
      ["Strafschoppen", st.pens[0], st.pens[1]]
    ];
    return "<table><thead><tr><th>" + S.teams[0].abbr + "</th><th></th><th>" + S.teams[1].abbr +
      "</th></tr></thead><tbody>" + rows.map((r) =>
        "<tr><td class='n'>" + r[1] + "</td><td class='l'>" + r[0] + "</td><td class='n'>" + r[2] + "</td></tr>"
      ).join("") + "</tbody></table>";
  }

  const telwoord = (n, enkel, meer) => n + " " + (n === 1 ? enkel : meer);

  function showOverlay(title, sub, body, label, onClick) {
    $("#ov-title").textContent = title;
    $("#ov-sub").textContent = sub || "";
    $("#ov-body").innerHTML = body || "";
    $("#ov-btn").textContent = label;
    $("#ov-btn").onclick = onClick;
    $("#overlay").hidden = false;
  }

  /* ---------------- Doelpunt en herhaling ---------------- */
  function handleGoal() {
    const c = S.celebrate;
    if (!c) return;
    if (!c.announced) {
      c.announced = true;
      View.shake(9);
      verslag("GOAL! " + (c.scorer ? c.scorer.name : "Eigen doelpunt") + " in de " + c.minute + "e minuut.");
      banner("GOAL", (c.scorer ? c.scorer.name : "Eigen doelpunt") + "  " + c.minute + "'" +
        (c.assist ? "   assist: " + c.assist.name : ""), 4);
    }
    c.timer += 1 / 60;
    if (c.timer > 3.2 && flow === "match" && mode !== "gast") {
      flow = "replay"; replayIdx = 0; replayHold = 0;
      S.phase = "replay";
      banner("HERHALING", "", 3.2);
    }
  }

  function stepReplay() {
    const frames = S.replay;
    if (!frames.length) { endReplay(); return; }
    if (++replayHold >= 2) { replayHold = 0; replayIdx++; }
    if (replayIdx >= frames.length) { endReplay(); return; }
    const f = frames[replayIdx];
    View.setCamera(f.b[0], 1.45);
    View.replayFrame(S, f);
  }

  function endReplay() {
    $("#banner").hidden = true;
    const c = S.celebrate;
    S.celebrate = null;
    flow = "match";
    Match.setKickoff(c ? 1 - c.team : 0);
    Sound.crowdLevel(0.4);
  }

  /* Wisselpaneel in het rustscherm: klik een speler, klik dan een invaller. */
  let subKeuze = null;
  function bouwWissels() {
    const team = S.userTeam;
    const wrap = document.createElement("div");
    wrap.className = "wissels";
    const titel = document.createElement("h4");
    titel.className = "kopje";
    titel.textContent = "Wissels — nog " + (3 - S.subs[team]) + " over";
    wrap.appendChild(titel);

    const rij = (lijst, isBank) => {
      const r = document.createElement("div");
      r.className = "bank";
      lijst.forEach((entry) => {
        const src = isBank ? entry : entry.src;
        const kaart = Squad.cardEl(src, S.teams[team], { klein: true });
        if (!isBank && subKeuze === entry) kaart.classList.add("gekozen");
        if (!isBank && entry.off) kaart.classList.add("bezet");
        kaart.addEventListener("click", () => {
          if (!isBank) { subKeuze = entry; toonWissels(); return; }
          if (!subKeuze) return;
          if (Match.substitute(team, subKeuze, entry)) { subKeuze = null; toonWissels(); }
        });
        r.appendChild(kaart);
      });
      return r;
    };

    const opVeld = S.players.filter((p) => p.team === team);
    const label1 = document.createElement("div");
    label1.className = "klein";
    label1.textContent = subKeuze ? "Gekozen: " + subKeuze.name + " — klik nu een invaller"
                                  : "Klik een speler die eruit mag";
    wrap.appendChild(label1);
    wrap.appendChild(rij(opVeld, false));
    const label2 = document.createElement("div");
    label2.className = "kopje";
    label2.textContent = "Reservebank";
    wrap.appendChild(label2);
    wrap.appendChild(rij(Match.benchOf(team), true));
    return wrap;
  }

  function toonWissels() {
    const oud = document.querySelector(".wissels");
    if (oud) oud.replaceWith(bouwWissels());
  }

  function handleHalfTime() {
    if (flow === "halftime") return;
    flow = "halftime";
    subKeuze = null;
    verslag("Rust.");
    showOverlay("Rust", S.teams[0].name + " " + S.score[0] + " – " + S.score[1] + " " + S.teams[1].name,
      statsTable(), "Tweede helft", () => {
        $("#overlay").hidden = true;
        flow = "match";
        Match.startSecondHalf();
        meldingBlessure = false;
        Sound.whistle("short");
        verslag("De tweede helft is begonnen.");
      });
    if (mode !== "gast" && humanTeams().length) $("#ov-body").appendChild(bouwWissels());
  }

  function handleFullTime() {
    if (flow === "fulltime") return;
    flow = "fulltime";
    Sound.roar(0.7);
    const mvp = Match.manOfTheMatch();
    const verdict = S.score[0] > S.score[1] ? S.teams[0].name + " wint"
      : S.score[0] < S.score[1] ? S.teams[1].name + " wint" : "Gelijkspel";
    verslag("Affluiten.");
    showOverlay("Eindstand " + S.score[0] + " – " + S.score[1], verdict,
      "<p class='mvp'>Man of the match: <b>" + mvp.name + "</b> — " +
      telwoord(mvp.goals, "goal", "goals") + ", " + telwoord(mvp.assists, "assist", "assists") +
      ", " + telwoord(mvp.tackles, "tackle", "tackles") + "</p>" + statsTable(),
      "Terug naar het begin", () => {
        $("#overlay").hidden = true;
        $("#hud").hidden = true; $("#meters").hidden = true;
        $("#ticker-wrap").hidden = true; $("#net-note").hidden = true;
        Sound.stopCrowd();
        flow = "menu";
        show("screen-title");
      });
  }

  /* ---------------- Lus ---------------- */
  function tick() {
    if (mode === "gast") {
      if (Net.open() && ++netTick % 2 === 0) Net.send(guestInput());
      for (const k in tapped) tapped[k] = false;
      return;                       // de host rekent, wij tekenen alleen
    }

    if (flow === "walkout") {
      Match.step(null);
      if (S.flowTimer > 9 || (S.flowTimer > 4 && Match.lineupReady())) startAnthem();
    } else if (flow === "anthem") {
      Match.step(null);
    } else if (flow === "match") {
      P.forEach((pl, t) => {
        if (pl.manualT > 0) {
          pl.manualT -= 1 / 60;
          if (S.owner && S.owner.team === t && S.owner !== pl.manual) pl.manualT = 0;
        }
        if (pl.manualT <= 0) pl.manual = null;
      });
      const actives = [];
      humanTeams().forEach((t) => {
        const p = activeFor(t);
        actives.push(p);
        if (S.phase === "play") control(P[t], p, null);
      });
      if (mode === "host") {
        /* De tegenstander zit aan de andere kant van de lijn. */
        const p1 = activeFor(1);
        actives.push(p1);
        if (S.phase === "play" && remoteInput) control(P[1], p1, remoteInput);
      }
      const penMens = S.pen && humanTeams().indexOf(S.pen.team) !== -1;
      /* Alleen het indrukken telt; anders geldt loslaten als een tweede druk. */
      const penDruk = penMens && tapped[P[S.pen.team].keys.shoot];
      Match.step({ actives: S.phase === "play" ? actives : [], penaltyPress: !!penDruk });
      if (S.addedShown && !meldingBlessure) {
        meldingBlessure = true;
        banner("BLESSURETIJD", "+" + S.addedMin + " minuten", 3);
        verslag("De vierde official geeft " + S.addedMin + " minuten bij.");
      }
      if (S.phase === "penalty" && !meldingPen) {
        meldingPen = true;
        banner("STRAFSCHOP", S.teams[S.pen.team].name + " — " + (S.pen.taker ? S.pen.taker.name : ""), 3);
        verslag("Strafschop! Richt met de schiettoets: eerst de hoek, dan de hoogte.");
      }
      if (S.phase !== "penalty") meldingPen = false;
      if (S.phase === "goal") handleGoal();
      if (S.phase === "halftime") handleHalfTime();
      if (S.phase === "fulltime") handleFullTime();
      const d = Math.min(Math.abs(S.ball.x), Math.abs(PITCH.L - S.ball.x));
      Sound.crowdLevel(Match.clamp(1 - d / 420, 0.12, 0.92));
    }

    if (mode === "host" && Net.open() && ++netTick % 3 === 0) Net.send(netSnapshot());
    for (const k in tapped) tapped[k] = false;
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    /* Ruimere inhaalmarge: een tabblad op de achtergrond wordt bevroren, en bij
       multiplayer mag de wedstrijd daar niet door stil komen te liggen. */
    acc += Math.min(600, ts - lastTs);
    lastTs = ts;
    while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; }

    updateCamera();
    if (flow === "replay") stepReplay();
    else View.frame(S, { markers: markers() });

    if (bannerTimer > 0 && (bannerTimer -= 1 / 60) <= 0) $("#banner").hidden = true;
    if (flow !== "menu") updateHud();
    $("#restart-note").hidden = !S.message;
    if (S.message) $("#restart-note").textContent = S.message;
  }

  /* ---------------- Invoer ---------------- */
  const BLOCK = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Slash"];
  document.addEventListener("keydown", (e) => {
    if (BLOCK.indexOf(e.code) !== -1 && flow !== "menu" && !isTyping(e)) e.preventDefault();
    if (!keys[e.code]) tapped[e.code] = true;
    keys[e.code] = true;
    if (e.code === "Escape" && flow === "anthem") kickOff();
    if (flow === "match" && (e.code === "Tab" || e.code === P[0].keys.wissel)) {
      e.preventDefault();
      if (humanTeams().indexOf(0) !== -1) cycleSwitch(0);
    }
    if (flow === "match" && e.code === P[1].keys.wissel && humanTeams().indexOf(1) !== -1) cycleSwitch(1);
  });
  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    tapped[e.code + "Up"] = true;
  });
  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
    for (const k in tapped) tapped[k] = false;
  });
  const isTyping = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

  function setupTouch() {
    if (!("ontouchstart" in window)) return;
    const pad = $("#touch"), stick = $("#stick"), knob = $("#knob"), fire = $("#fire"), pass = $("#pass");
    pad.classList.add("on");
    let id = null, cx = 0, cy = 0;
    stick.addEventListener("touchstart", (e) => {
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      id = e.changedTouches[0].identifier; touch.active = true; e.preventDefault();
    }, { passive: false });
    stick.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== id) continue;
        const dx = t.clientX - cx, dy = t.clientY - cy, len = Math.hypot(dx, dy) || 1;
        const cl = Math.min(len, 46) / 46;
        touch.dx = (dx / len) * cl; touch.dy = (dy / len) * cl;
        knob.style.transform = "translate(" + touch.dx * 28 + "px," + touch.dy * 28 + "px)";
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => { id = null; touch.active = false; touch.dx = 0; touch.dy = 0; knob.style.transform = ""; e.preventDefault(); };
    stick.addEventListener("touchend", end, { passive: false });
    stick.addEventListener("touchcancel", end, { passive: false });
    fire.addEventListener("touchstart", (e) => { touch.fire = true; e.preventDefault(); }, { passive: false });
    fire.addEventListener("touchend", (e) => { touch.fire = false; tapped.SpaceUp = true; e.preventDefault(); }, { passive: false });
    pass.addEventListener("touchstart", (e) => { tapped.KeyE = true; keys.KeyE = true; e.preventDefault(); }, { passive: false });
    pass.addEventListener("touchend", (e) => { keys.KeyE = false; e.preventDefault(); }, { passive: false });
  }

  /* ---------------- Opstarten ---------------- */
  function init() {
    View.attach($("#pitch"));
    fillPickers();
    setupTouch();
    setupNet();

    Match.init(TEAMS[0], TEAMS[1], { demo: true });
    Match.setKickoff(0);
    View.setCamera(PITCH.L / 2, 0.95, true);

    document.querySelectorAll("[data-ga]").forEach((b) => {
      b.addEventListener("click", () => show(b.getAttribute("data-ga")));
    });
    $("#pick-home").addEventListener("change", updateMatchScreen);
    $("#pick-away").addEventListener("change", updateMatchScreen);
    $("#start").addEventListener("click", () => { mode = "cpu"; startMatch(); });
    $("#skip").addEventListener("click", kickOff);
    $("#opt-sound").addEventListener("change", (e) => Sound.setMuted(!e.target.checked));
    $("#picker-close").addEventListener("click", () => { $("#picker").hidden = true; });
    $("#squad-best").addEventListener("click", () => Squad.autoBest());
    $("#squad-pick-team").addEventListener("change", (e) => Squad.open(Number(e.target.value)));

    $("#mp-local").addEventListener("click", () => { mode = "local2"; startMatch(); });
    $("#mp-host").addEventListener("click", async () => {
      $("#mp-host-box").hidden = false; $("#mp-join-box").hidden = true;
      $("#mp-code-out").value = "Code maken…";
      try { $("#mp-code-out").value = await Net.host(); }
      catch (e) { $("#mp-code-out").value = "Kon geen code maken: " + e.message; }
    });
    $("#mp-join").addEventListener("click", () => {
      $("#mp-join-box").hidden = false; $("#mp-host-box").hidden = true;
    });
    $("#mp-answer").addEventListener("click", async () => {
      $("#mp-code-answer").value = "Antwoord maken…";
      try { $("#mp-code-answer").value = await Net.join($("#mp-join-in").value); mode = "gast"; }
      catch (e) { $("#mp-code-answer").value = "Mislukt: " + e.message; }
    });
    $("#mp-accept").addEventListener("click", async () => {
      try {
        await Net.accept($("#mp-code-in").value);
        mode = "host";
        setTimeout(() => { if (Net.open()) startMatch(); }, 1200);
      } catch (e) { $("#mp-status").textContent = "Mislukt: " + e.message; }
    });
    const copy = (sel) => () => {
      const el = $(sel); el.select();
      try { document.execCommand("copy"); } catch (e) {}
      if (navigator.clipboard) navigator.clipboard.writeText(el.value).catch(() => {});
    };
    $("#mp-copy").addEventListener("click", copy("#mp-code-out"));
    $("#mp-copy2").addEventListener("click", copy("#mp-code-answer"));

    const params = new URLSearchParams(location.search);
    if (params.has("debug")) {
      window.__fc27 = { S: S, flow: () => flow, mode: () => mode, show: show, remote: () => remoteInput,
                        active: () => activeFor(0), active2: () => activeFor(1),
                        start: startMatch, kickOff: kickOff, setMode: (m) => { mode = m; } };
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
