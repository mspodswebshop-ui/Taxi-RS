/* Arena FC 27 — regie: menu, opkomst, volkslied, wedstrijd, herhaling en eindstand. */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const S = Match.S;
  const keys = Object.create(null), tapped = Object.create(null);
  const touch = { active: false, dx: 0, dy: 0, fire: false };

  let flow = "menu";          // menu, walkout, anthem, match, replay, halftime, fulltime
  let power = 0, lastTs = 0, acc = 0;
  let replayIdx = 0, replayHold = 0, bannerTimer = 0;
  let anthemSkip = null;

  /* ---------------- Commentaar ---------------- */
  const LINES = {
    kickoff: ["We zijn onderweg!", "De bal rolt.", "Daar gaan we, eerste balcontact."],
    shot: ["Die gaat richting doel!", "Uithalen!", "Hij probeert het van afstand."],
    save: ["Wat een redding!", "De keeper staat pal.", "Gered, schitterend."],
    goal: ["GOAL! Wat een treffer!", "Hij zit! Ongelooflijk!", "GOAL! Het stadion ontploft!"],
    corner: ["Hoekschop.", "De bal gaat over de achterlijn, corner."],
    foul: ["Overtreding, de scheidsrechter fluit.", "Dat was te laat."],
    half: ["Rust. Tijd om te herstellen.", "De eerste helft zit erop."],
    full: ["Het is voorbij!", "Affluiten, dit is de eindstand."]
  };
  const pick = (k) => LINES[k][Math.floor(Math.random() * LINES[k].length)];

  function banner(text, sub, seconds) {
    $("#banner-main").textContent = text;
    $("#banner-sub").textContent = sub || "";
    $("#banner").hidden = false;
    bannerTimer = seconds || 3;
  }

  function commentate(kind, extra, speakNow) {
    const text = extra || pick(kind);
    $("#ticker").textContent = text;
    Sound.say(text, !!speakNow);
  }

  /* ---------------- Menu ---------------- */
  function fillTeamPickers() {
    const opts = TEAMS.map((t, i) => '<option value="' + i + '">' + t.name + "</option>").join("");
    $("#pick-home").innerHTML = opts;
    $("#pick-away").innerHTML = opts;
    $("#pick-home").value = "0";
    $("#pick-away").value = "1";
    updateBadges();
  }

  function updateBadges() {
    const h = TEAMS[Number($("#pick-home").value)], a = TEAMS[Number($("#pick-away").value)];
    if (h === a) {
      const other = TEAMS.findIndex((t) => t !== h);
      $("#pick-away").value = String(other);
    }
    const home = TEAMS[Number($("#pick-home").value)], away = TEAMS[Number($("#pick-away").value)];
    $("#badge-home").style.background = home.kit.shirt;
    $("#badge-home").style.color = home.kit.num;
    $("#badge-home").textContent = home.abbr;
    $("#badge-away").style.background = away.kit.shirt;
    $("#badge-away").style.color = away.kit.num;
    $("#badge-away").textContent = away.abbr;
    $("#anthem-note").textContent = "Volkslied bij de opkomst: " + home.anthemName;
    renderSquadPreview(home, away);
  }

  function renderSquadPreview(home, away) {
    const rows = (t) => buildSquad(t).filter((p) => p.starter)
      .map((p, i) => '<li><span>' + FORMATION[i].role + "</span>" + p.name + "<b>" + p.rating + "</b></li>").join("");
    $("#squad-home").innerHTML = rows(home);
    $("#squad-away").innerHTML = rows(away);
  }

  /* ---------------- Wedstrijd starten ---------------- */
  function startMatch() {
    const home = TEAMS[Number($("#pick-home").value)];
    const away = TEAMS[Number($("#pick-away").value)];
    Sound.init(); Sound.resume();
    Sound.setMuted(!$("#opt-sound").checked);
    Sound.setSpeech($("#opt-speech").checked);
    Sound.startCrowd();

    Match.init(home, away, {
      halfLen: Number($("#opt-length").value),
      difficulty: Number($("#opt-diff").value),
      userTeam: 0,
      demo: $("#opt-demo") ? $("#opt-demo").checked : false
    });

    $("#hud-home").textContent = home.abbr;
    $("#hud-away").textContent = away.abbr;
    $("#hud-home").style.background = home.kit.shirt;
    $("#hud-home").style.color = home.kit.num;
    $("#hud-away").style.background = away.kit.shirt;
    $("#hud-away").style.color = away.kit.num;

    $("#menu").hidden = true;
    $("#hud").hidden = false;
    $("#ticker-wrap").hidden = false;

    Match.setupWalkout();
    flow = "walkout";
    View.setCamera(PITCH.L / 2, 0.9, true);
    commentate(null, "Welkom bij " + home.name + " tegen " + away.name + ". De ploegen komen het veld op.", true);
    banner("OPKOMST", home.name + " – " + away.name, 4);
    Sound.crowdLevel(0.45);
  }

  function startAnthem() {
    flow = "anthem";
    S.phase = "anthem";
    const home = S.teams[0];
    banner("VOLKSLIED", home.anthemName + " — " + home.name, 6);
    commentate(null, "De teams staan opgesteld voor het volkslied.", true);
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
    commentate("kickoff", null, true);
    banner("AFTRAP", S.teams[0].name + " – " + S.teams[1].name, 2.5);
  }

  /* ---------------- Besturing ---------------- */
  function activePlayer() {
    if (!S.userControls) return null;
    if (S.owner && S.owner.team === S.userTeam) return S.owner;
    const out = S.players.filter((p) => p.team === S.userTeam && !p.isGK);
    let best = out[0], bd = 1e9;
    out.forEach((p) => { const d = Match.dist(p, S.ball); if (d < bd) { bd = d; best = p; } });
    return best;
  }

  function inputVector() {
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;
    if (touch.active) { dx = touch.dx; dy = touch.dy; }
    const len = Math.hypot(dx, dy);
    return len > 1 ? { x: dx / len, y: dy / len } : { x: dx, y: dy };
  }

  function userAim(p, v) {
    const toGoal = Match.aimGoal(p, 0.55);
    const base = (v.x || v.y) ? Math.atan2(v.y, v.x) : toGoal;
    const delta = Math.atan2(Math.sin(toGoal - base), Math.cos(toGoal - base));
    if (Math.abs(delta) > 1.2) return base;
    const d = Math.abs(p.x - Match.goalX(p.team));
    const help = Match.clamp(1 - d / 900, 0.25, 0.75);
    return base + delta * help;
  }

  function controlUser(p) {
    if (!p || p.stun > 0) return;
    const v = inputVector();
    const sprint = (keys.ShiftLeft || keys.ShiftRight) && p.stamina > 0.4;
    if (v.x || v.y) {
      const max = p.maxSpeed * (sprint ? 1.22 : 1) * (0.75 + p.stamina * 0.25);
      p.vx += (v.x * max - p.vx) * (p.accel + 0.06);
      p.vy += (v.y * max - p.vy) * (p.accel + 0.06);
      if (sprint) p.stamina = Match.clamp(p.stamina - 0.0006, 0.35, 1);
    }
    const firing = keys.Space || touch.fire;
    if (S.owner === p) {
      if (firing) power = Math.min(1, power + 0.030);
      else if (power > 0 || tapped.SpaceUp) {
        S.stats.shots[p.team]++;
        Match.shootBall(p, p.power * (0.55 + power * 0.5), userAim(p, v), power > 0.6 ? 0.5 : 0.12);
        commentate("shot");
        power = 0;
      }
      if (keys.KeyE || tapped.KeyE) {
        const mate = Match.bestPassOption(p);
        if (mate) { Match.passBall(p, mate, false); keys.KeyE = false; tapped.KeyE = false; }
      }
      if (keys.KeyQ || tapped.KeyQ) {
        const mate = Match.bestPassOption(p);
        if (mate) { Match.passBall(p, mate, true); keys.KeyQ = false; tapped.KeyQ = false; }
      }
    } else {
      power = 0;
      if (firing) Match.steer(p, S.ball.x, S.ball.y, 1.25);
    }
  }

  /* ---------------- Beeldregie ---------------- */
  function updateCameraFor() {
    if (flow === "walkout") {
      View.setCamera(PITCH.L / 2 + Math.sin(S.flowTimer * 0.35) * 130, 0.92);
    } else if (flow === "anthem") {
      View.setCamera(PITCH.L / 2 - 60 + Math.sin(Date.now() * 0.0004) * 110, 1.05);
    } else if (S.phase === "goal" && S.celebrate && S.celebrate.scorer) {
      View.setCamera(S.celebrate.scorer.x, 1.5);
    } else {
      View.setCamera(S.ball.x, S.owner ? 1.05 : 1.0);
    }
  }

  function crowdMood() {
    if (flow !== "match") return;
    const d = Math.min(Math.abs(S.ball.x), Math.abs(PITCH.L - S.ball.x));
    Sound.crowdLevel(Match.clamp(1 - d / 420, 0.12, 0.92));
  }

  /* ---------------- HUD ---------------- */
  function updateHud() {
    $("#hud-score").textContent = S.score[0] + " – " + S.score[1];
    $("#hud-clock").textContent = Match.matchMinute() + "'";
    $("#hud-half").textContent = S.half === 1 ? "1e helft" : "2e helft";
    $("#power-bar").style.width = Math.round(power * 100) + "%";
    const act = activePlayer();
    $("#stam-bar").style.width = Math.round((act ? act.stamina : 1) * 100) + "%";
    $("#hud-name").textContent = act ? act.number + "  " + act.name : "";
  }

  function statsTable() {
    const st = S.stats;
    const total = st.poss[0] + st.poss[1] || 1;
    const rows = [
      ["Balbezit", Math.round((st.poss[0] / total) * 100) + "%", Math.round((st.poss[1] / total) * 100) + "%"],
      ["Schoten", st.shots[0], st.shots[1]],
      ["Op doel", st.onTarget[0], st.onTarget[1]],
      ["Passes", st.passes[0], st.passes[1]],
      ["Tackles", st.tackles[0], st.tackles[1]],
      ["Hoekschoppen", st.corners[0], st.corners[1]],
      ["Overtredingen", st.fouls[0], st.fouls[1]],
      ["Gele kaarten", st.cards[0], st.cards[1]]
    ];
    return "<table><thead><tr><th>" + S.teams[0].abbr + "</th><th></th><th>" + S.teams[1].abbr +
      "</th></tr></thead><tbody>" +
      rows.map((r) => "<tr><td class='n'>" + r[1] + "</td><td class='l'>" + r[0] + "</td><td class='n'>" + r[2] + "</td></tr>").join("") +
      "</tbody></table>";
  }

  function goalFeed() {
    const gs = S.events.filter((e) => /^\D+\d+'$/.test(e.text) === false && e.text.indexOf("'") > -1);
    return gs.length ? "<ul class='feed'>" + gs.map((e) =>
      "<li><i style='background:" + S.teams[e.team].kit.shirt + "'></i>" + e.text + "</li>").join("") + "</ul>" : "";
  }

  const telwoord = (n, enkel, meer) => n + " " + (n === 1 ? enkel : meer);

  function showOverlay(title, sub, body, buttonLabel, onClick) {
    $("#ov-title").textContent = title;
    $("#ov-sub").textContent = sub || "";
    $("#ov-body").innerHTML = body || "";
    const b = $("#ov-btn");
    b.textContent = buttonLabel;
    b.onclick = onClick;
    $("#overlay").hidden = false;
  }

  /* ---------------- Doelpunt, herhaling, rust ---------------- */
  function handleGoal() {
    const c = S.celebrate;
    if (!c) return;
    c.timer += 1 / 60;
    if (c.timer === 0) return;
    if (!c.announced) {
      c.announced = true;
      View.shake(9);
      commentate("goal", null, true);
      banner("GOAL", (c.scorer ? c.scorer.name : "Eigen doelpunt") + "  " + c.minute + "'" +
        (c.assist ? "   assist: " + c.assist.name : ""), 4);
    }
    if (c.timer > 3.2 && flow === "match") {
      flow = "replay"; replayIdx = 0; replayHold = 0;
      S.phase = "replay";
      banner("HERHALING", "", 3.2);
    }
  }

  function stepReplay() {
    const frames = S.replay;
    if (!frames.length) { endReplay(); return; }
    replayHold += 1;
    if (replayHold >= 2) { replayHold = 0; replayIdx++; }   // halve snelheid
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

  function handleHalfTime() {
    if (flow === "halftime") return;
    flow = "halftime";
    commentate("half", null, true);
    showOverlay("Rust", S.teams[0].name + " " + S.score[0] + " – " + S.score[1] + " " + S.teams[1].name,
      statsTable() + goalFeed(), "Tweede helft", () => {
        $("#overlay").hidden = true;
        flow = "match";
        Match.startSecondHalf();
        Sound.whistle("short");
        commentate(null, "We zijn weer onderweg voor de tweede helft.", true);
      });
  }

  function handleFullTime() {
    if (flow === "fulltime") return;
    flow = "fulltime";
    Sound.roar(0.7);
    commentate("full", null, true);
    const mvp = Match.manOfTheMatch();
    const verdict = S.score[0] > S.score[1] ? S.teams[0].name + " wint"
      : S.score[0] < S.score[1] ? S.teams[1].name + " wint" : "Gelijkspel";
    showOverlay("Eindstand " + S.score[0] + " – " + S.score[1], verdict,
      "<p class='mvp'>Man of the match: <b>" + mvp.name + "</b> — " + telwoord(mvp.goals, "goal", "goals") +
      ", " + telwoord(mvp.assists, "assist", "assists") + ", " + telwoord(mvp.tackles, "tackle", "tackles") +
      "</p>" + statsTable() + goalFeed(),
      "Terug naar het menu", () => {
        $("#overlay").hidden = true;
        $("#menu").hidden = false;
        $("#hud").hidden = true;
        $("#ticker-wrap").hidden = true;
        Sound.stopCrowd();
        flow = "menu";
      });
  }

  /* ---------------- Lus ---------------- */
  function tick() {
    if (flow === "walkout") {
      Match.step(null);
      if (S.flowTimer > 9 || (S.flowTimer > 4 && Match.lineupReady())) startAnthem();
      return;
    }
    if (flow === "anthem") { Match.step(null); return; }
    if (flow === "match") {
      const act = activePlayer();
      if (act && S.phase === "play") controlUser(act);
      Match.step({ active: S.phase === "play" ? act : null });
      if (S.phase === "goal") handleGoal();
      if (S.phase === "halftime") handleHalfTime();
      if (S.phase === "fulltime") handleFullTime();
      crowdMood();
    }
    for (const k in tapped) tapped[k] = false;
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    acc += Math.min(120, ts - lastTs);
    lastTs = ts;
    while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; }

    updateCameraFor();
    if (flow === "replay") stepReplay();
    else View.frame(S, { active: flow === "match" ? activePlayer() : null });

    if (bannerTimer > 0) {
      bannerTimer -= 1 / 60;
      if (bannerTimer <= 0) $("#banner").hidden = true;
    }
    if (flow !== "menu") updateHud();
    if (S.message) { $("#restart-note").textContent = S.message; $("#restart-note").hidden = false; }
    else $("#restart-note").hidden = true;
  }

  /* ---------------- Invoer ---------------- */
  const BLOCK = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  document.addEventListener("keydown", (e) => {
    if (BLOCK.indexOf(e.code) !== -1) e.preventDefault();
    if (!keys[e.code]) tapped[e.code] = true;
    keys[e.code] = true;
    if (e.code === "Escape" && flow === "anthem") kickOff();
  });
  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    if (e.code === "Space") tapped.SpaceUp = true;
  });
  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
    for (const k in tapped) tapped[k] = false;
  });

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
    fire.addEventListener("touchend", (e) => { touch.fire = false; e.preventDefault(); }, { passive: false });
    pass.addEventListener("touchstart", (e) => { tapped.KeyE = true; keys.KeyE = true; e.preventDefault(); }, { passive: false });
    pass.addEventListener("touchend", (e) => { keys.KeyE = false; e.preventDefault(); }, { passive: false });
  }

  /* ---------------- Start ---------------- */
  function init() {
    View.attach($("#pitch"));
    fillTeamPickers();
    /* Het veld draait al achter het menu, anders is er niets om te tekenen. */
    Match.init(TEAMS[0], TEAMS[1], { demo: true });
    Match.setKickoff(0);
    View.setCamera(PITCH.L / 2, 0.95, true);
    setupTouch();
    $("#pick-home").addEventListener("change", updateBadges);
    $("#pick-away").addEventListener("change", updateBadges);
    $("#start").addEventListener("click", startMatch);
    $("#skip").addEventListener("click", kickOff);
    $("#opt-sound").addEventListener("change", (e) => Sound.setMuted(!e.target.checked));
    $("#opt-speech").addEventListener("change", (e) => Sound.setSpeech(e.target.checked));

    const params = new URLSearchParams(location.search);
    if (params.has("debug")) {
      window.__fc27 = { S: S, flow: () => flow, active: activePlayer, start: startMatch, kickOff: kickOff,
                        setFlow: (f) => { flow = f; } };
    }
    if (params.get("demo") === "1") {
      $("#opt-demo").checked = true;
      setTimeout(startMatch, 200);
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
