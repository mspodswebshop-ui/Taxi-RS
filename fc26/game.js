/* Arena FC 26 — 5-tegen-5 arcadewedstrijd op canvas. */
(function () {
  "use strict";

  /* ---------------- Afmetingen ---------------- */
  const W = 940, H = 580, M = 26;          // canvas + marge rond het speelveld
  const PL = M, PR = W - M, PT = M, PB = H - M;
  const GOAL_H = 168;
  const MOUTH_T = (H - GOAL_H) / 2, MOUTH_B = (H + GOAL_H) / 2;
  const BALL_R = 7, PLR_R = 13;
  const CONTROL = 19;                       // afstand waarop een speler de bal pakt
  const DRIBBLE = 17;                       // afstand bal voor de speler uit
  const STEP = 1000 / 60;

  const KIT = [
    { body: "#00ffb2", trim: "#04241a", text: "#04241a" },   // thuis (jij)
    { body: "#ff5a5f", trim: "#2a0708", text: "#2a0708" }    // uit (cpu)
  ];

  const FORM = [
    { role: "GK",  x: 0.05, y: 0.50 },
    { role: "LV",  x: 0.24, y: 0.28 },
    { role: "RV",  x: 0.24, y: 0.72 },
    { role: "MID", x: 0.45, y: 0.50 },
    { role: "SPI", x: 0.66, y: 0.50 }
  ];

  const DIFF = [
    { name: "Makkelijk", speed: 0.80, react: 0.40, shoot: 0.65, spread: 2.1 },
    { name: "Normaal",   speed: 0.95, react: 0.80, shoot: 1.00, spread: 1.0 },
    { name: "Moeilijk",  speed: 1.10, react: 1.10, shoot: 1.25, spread: 0.6 }
  ];

  /* ---------------- Toestand ---------------- */
  const canvas = document.getElementById("pitch-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;

  let players = [], ball = null, owner = null, lockBall = 0;
  let score = [0, 0], state = "ready", clock = 0, matchLen = 180;
  let diff = 1, demo = false, powerCharge = 0, flashTimer = 0;
  let raf = 0, lastTs = 0, acc = 0;
  let homeName = "Jouw XI", awayName = "Rivalen FC";

  const keys = Object.create(null);
  const tapped = Object.create(null);   // korte aanslagen, blijven één simulatiestap staan
  const touch = { active: false, dx: 0, dy: 0, fire: false };

  const $ = (s) => document.querySelector(s);

  /* ---------------- Geluid ---------------- */
  let actx = null;
  function beep(freq, dur, type, vol) {
    if (!$("#opt-sound").checked) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.value = vol || 0.05;
      o.connect(g); g.connect(actx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.stop(actx.currentTime + dur);
    } catch (e) { /* geluid is optioneel */ }
  }

  /* ---------------- Teams samenstellen ---------------- */
  function lineOf(p) {
    if (p.p === "GK") return "GK";
    if (["CB", "LB", "RB", "LWB", "RWB"].indexOf(p.p) !== -1) return "DEF";
    if (["CDM", "CM", "CAM", "LM", "RM"].indexOf(p.p) !== -1) return "MID";
    return "ATT";
  }

  /* Kies GK + 2 verdedigers + middenvelder + spits uit een lijst. */
  function pickFive(pool) {
    const used = [], take = (test) => {
      const cand = pool
        .filter((p) => used.indexOf(p) === -1 && test(p))
        .sort((a, b) => b.r - a.r)[0];
      if (cand) used.push(cand);
      return cand;
    };
    take((p) => lineOf(p) === "GK");
    take((p) => lineOf(p) === "DEF");
    take((p) => lineOf(p) === "DEF");
    take((p) => lineOf(p) === "MID");
    take((p) => lineOf(p) === "ATT");
    while (used.length < 5) {
      const filler = pool.filter((p) => used.indexOf(p) === -1).sort((a, b) => b.r - a.r)[0];
      if (!filler) break;
      used.push(filler);
    }
    return used;
  }

  function savedSquad() {
    try {
      const raw = localStorage.getItem("fc26.squad.v1");
      if (!raw) return null;
      const data = JSON.parse(raw);
      const ids = (data.squad || []).filter((id) => typeof id === "number" && PLAYERS[id]);
      const list = ids.map((id) => PLAYERS[id]);
      return list.length >= 5 ? list : null;
    } catch (e) { return null; }
  }

  function makePlayer(src, team, slot) {
    const spd = src.k ? 58 : src.s[0];
    const sho = src.k ? 40 : src.s[1];
    const def = src.k ? 50 : src.s[4];
    const dri = src.k ? 40 : src.s[3];
    const f = FORM[slot];
    const hx = team === 0 ? f.x : 1 - f.x;
    return {
      src: src, team: team, slot: slot, role: f.role, isGK: slot === 0,
      name: src.n, rating: src.r,
      maxSpeed: 2.05 + ((spd - 55) / 45) * 1.25,
      power: 8.5 + (sho / 100) * 5.5,
      tackle: 0.010 + (def / 100) * 0.030,
      control: 0.35 + (dri / 100) * 0.5,
      reflex: src.k ? src.s[3] : 60,
      homeX: PL + hx * (PR - PL),
      homeY: PT + f.y * (PB - PT),
      x: 0, y: 0, vx: 0, vy: 0, dir: team === 0 ? 0 : Math.PI,
      stun: 0, hold: 0, stamina: 1
    };
  }

  function buildTeams() {
    const mine = savedSquad();
    const homeSrc = pickFive(mine || PLAYERS);
    const rest = PLAYERS.filter((p) => homeSrc.indexOf(p) === -1);
    const awaySrc = pickFive(rest);
    homeName = mine ? "Jouw XI" : "Arena United";
    players = homeSrc.map((p, i) => makePlayer(p, 0, i))
      .concat(awaySrc.map((p, i) => makePlayer(p, 1, i)));
    renderLineups(homeSrc, awaySrc);
  }

  function renderLineups(home, away) {
    const row = (p, i) => "<li><span>" + FORM[i].role + "</span> " + p.n + " <b>" + p.r + "</b></li>";
    $("#lineup-home").innerHTML = home.map(row).join("");
    $("#lineup-away").innerHTML = away.map(row).join("");
    $("#name-home").lastChild.textContent = " " + homeName;
    $("#name-away").firstChild.textContent = awayName + " ";
  }

  /* ---------------- Opstellen ---------------- */
  function kickoff(toTeam) {
    players.forEach((p) => {
      p.x = p.homeX; p.y = p.homeY;
      p.vx = 0; p.vy = 0; p.stun = 0; p.hold = 0;
      /* Aanvallers van het niet-aftrappende team blijven achter de middenlijn. */
      if (p.team !== toTeam && !p.isGK) {
        p.x = p.team === 0 ? Math.min(p.x, W / 2 - 60) : Math.max(p.x, W / 2 + 60);
      }
    });
    const taker = players.filter((p) => p.team === toTeam && p.slot === 3)[0];
    taker.x = W / 2 - (toTeam === 0 ? 26 : -26);
    taker.y = H / 2;
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    owner = taker;
    lockBall = 0;
    powerCharge = 0;
  }

  /* ---------------- Hulpfuncties ---------------- */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const inMouth = (y) => y > MOUTH_T && y < MOUTH_B;
  const goalX = (team) => (team === 0 ? PR : PL);   // doel waar dit team op schiet

  function nearestTo(pt, team, skip) {
    const skips = skip == null ? [] : (Array.isArray(skip) ? skip : [skip]);
    let best = null, bd = 1e9;
    players.forEach((p) => {
      if (p.team !== team || skips.indexOf(p) !== -1) return;
      const d = dist(p, pt);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  function activePlayer() {
    if (owner && owner.team === 0) return owner;
    const out = players.filter((p) => p.team === 0 && !p.isGK);
    let best = out[0], bd = 1e9;
    out.forEach((p) => { const d = dist(p, ball); if (d < bd) { bd = d; best = p; } });
    return best;
  }

  function shoot(p, powerScale, aimAngle) {
    const speed = p.power * clamp(powerScale, 0.35, 1);
    ball.vx = Math.cos(aimAngle) * speed;
    ball.vy = Math.sin(aimAngle) * speed;
    ball.x = p.x + Math.cos(aimAngle) * (DRIBBLE + 2);
    ball.y = p.y + Math.sin(aimAngle) * (DRIBBLE + 2);
    owner = null;
    lockBall = 10;
    beep(240 + speed * 12, 0.07, "square", 0.05);
  }

  /* Richting naar het doel, met wat spreiding op de paal af. */
  function aimAtGoal(p) {
    const gx = goalX(p.team);
    const spread = (GOAL_H - 40) * (p.team === 1 ? DIFF[diff].spread : 1);
    const gy = H / 2 + (Math.random() - 0.5) * spread;
    return Math.atan2(gy - p.y, gx - p.x);
  }

  function passTo(p, mate) {
    const a = Math.atan2(mate.y - p.y, mate.x - p.x);
    const d = dist(p, mate);
    const speed = clamp(d / 26, 4.5, 11);
    ball.vx = Math.cos(a) * speed;
    ball.vy = Math.sin(a) * speed;
    ball.x = p.x + Math.cos(a) * (DRIBBLE + 2);
    ball.y = p.y + Math.sin(a) * (DRIBBLE + 2);
    owner = null;
    lockBall = 8;
    beep(320, 0.05, "sine", 0.04);
  }

  function bestPass(p) {
    let best = null, bs = -1e9;
    players.forEach((m) => {
      if (m.team !== p.team || m === p || m.isGK) return;
      const forward = (p.team === 0 ? m.x - p.x : p.x - m.x);
      const marker = nearestTo(m, 1 - p.team);
      const space = marker ? dist(marker, m) : 200;
      const d = dist(p, m);
      if (d > 420) return;
      const s = forward * 0.6 + space * 1.4 - d * 0.2;
      if (s > bs) { bs = s; best = m; }
    });
    return best;
  }

  /* ---------------- Besturing ---------------- */
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

  /* ---------------- Speler-AI ---------------- */
  function steer(p, tx, ty, boost) {
    const a = Math.atan2(ty - p.y, tx - p.x);
    const max = p.maxSpeed * (boost || 1) * (p.team === 1 ? DIFF[diff].speed : 1);
    p.vx += (Math.cos(a) * max - p.vx) * 0.22;
    p.vy += (Math.sin(a) * max - p.vy) * 0.22;
  }

  function aiGoalkeeper(p) {
    const line = p.team === 0 ? PL + 16 : PR - 16;
    const towards = ball.y + ball.vy * 6;
    const ty = clamp(towards, MOUTH_T + 10, MOUTH_B - 10);
    const threat = p.team === 0 ? ball.x < PL + 190 : ball.x > PR - 190;
    steer(p, threat ? line + (p.team === 0 ? 26 : -26) : line, ty, threat ? 1.35 : 1);
  }

  function aiOutfield(p, chaser) {
    if (owner === p) {
      const gx = goalX(p.team), gy = H / 2;
      const toGoal = Math.abs(p.x - gx);
      const marker = nearestTo(p, 1 - p.team);
      const pressed = marker && dist(marker, p) < 46;
      const shootRange = 250 + DIFF[diff].shoot * 60;

      if (toGoal < shootRange && Math.random() < 0.05 * DIFF[diff].shoot) {
        shoot(p, 0.75 + Math.random() * 0.25, aimAtGoal(p));
        return;
      }
      if (pressed) {
        const mate = bestPass(p);
        if (mate && Math.random() < 0.09) { passTo(p, mate); return; }
      }
      /* Dribbelen richting doel, met een boog om de dichtstbijzijnde verdediger heen. */
      let ty = gy;
      if (marker && dist(marker, p) < 110) ty = p.y + (p.y < marker.y ? -80 : 80);
      steer(p, gx, clamp(ty, PT + 40, PB - 40), 1);
      return;
    }

    const mineHasBall = owner && owner.team === p.team;
    if (p === chaser && !mineHasBall) {
      const lead = lockBall > 0 || !owner ? 8 : 2;
      steer(p, ball.x + ball.vx * lead, ball.y + ball.vy * lead, 1.12);
      return;
    }

    /* Positiespel: schuif mee met de bal, aanvallend hoger, verdedigend lager. */
    const push = mineHasBall ? 1 : -1;
    const tx = clamp(p.homeX + (ball.x - W / 2) * 0.45 + push * (p.team === 0 ? 70 : -70), PL + 20, PR - 20);
    const ty = clamp(p.homeY + (ball.y - H / 2) * 0.42, PT + 24, PB - 24);
    steer(p, tx, ty, 0.92);
  }

  /* ---------------- Simulatiestap ---------------- */
  function step() {
    if (state !== "playing") return;

    clock -= STEP / 1000;
    if (clock <= 0) { clock = 0; finish(); return; }

    const act = activePlayer();
    const gk0 = players.filter((p) => p.team === 0 && p.isGK)[0];
    const gk1 = players.filter((p) => p.team === 1 && p.isGK)[0];
    /* Jij bestuurt de speler bij de bal, dus laat een medespeler de jacht overnemen. */
    const chaser0 = nearestTo(ball, 0, demo ? gk0 : [gk0, act]);
    const chaser1 = nearestTo(ball, 1, gk1);

    players.forEach((p) => {
      if (p.stun > 0) { p.stun -= STEP; p.vx *= 0.85; p.vy *= 0.85; }
      else if (p.isGK) aiGoalkeeper(p);
      else if (p.team === 0 && p === act && !demo) userControl(p);
      else aiOutfield(p, p.team === 0 ? chaser0 : chaser1);

      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.90; p.vy *= 0.90;
      p.x = clamp(p.x, PL + 6, PR - 6);
      p.y = clamp(p.y, PT + 6, PB - 6);
      if (Math.hypot(p.vx, p.vy) > 0.35) p.dir = Math.atan2(p.vy, p.vx);
    });

    separate();
    tackles();
    ballStep();
    for (const k in tapped) tapped[k] = false;
  }

  /* Schotrichting: stuur je zelf, anders op de goal. Richthulp trekt het schot
     naar het doel toe, sterker naarmate je dichterbij staat. */
  function userAim(p, v) {
    const toGoal = aimAtGoal(p);
    const base = (v.x || v.y) ? Math.atan2(v.y, v.x) : toGoal;
    const delta = Math.atan2(Math.sin(toGoal - base), Math.cos(toGoal - base));
    if (Math.abs(delta) > 1.25) return base;          // bewust weg van het doel: geen hulp
    const d = Math.abs(p.x - goalX(p.team));
    const help = clamp(1 - d / 760, 0.3, 0.8);
    return base + delta * help;
  }

  function userControl(p) {
    const v = inputVector();
    const sprint = (keys.ShiftLeft || keys.ShiftRight) && p.stamina > 0.05;
    if (sprint && (v.x || v.y)) p.stamina = Math.max(0, p.stamina - 0.006);
    else p.stamina = Math.min(1, p.stamina + 0.0035);

    if (v.x || v.y) {
      const max = p.maxSpeed * (sprint ? 1.32 : 1);
      p.vx += (v.x * max - p.vx) * 0.28;
      p.vy += (v.y * max - p.vy) * 0.28;
    }

    const firing = keys.Space || touch.fire;
    if (owner === p) {
      if (firing) powerCharge = Math.min(1, powerCharge + 0.035);
      else if (powerCharge > 0 || tapped.SpaceUp) {
        shoot(p, 0.45 + powerCharge * 0.55, userAim(p, v));
        powerCharge = 0;
      }
      if (keys.KeyE || tapped.KeyE) {
        const mate = bestPass(p);
        if (mate) { passTo(p, mate); keys.KeyE = false; tapped.KeyE = false; }
      }
    } else {
      powerCharge = 0;
      if (firing) steer(p, ball.x, ball.y, 1.3);   // sprint naar de bal / tackle
    }
  }

  function separate() {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j];
        const d = dist(a, b), min = PLR_R * 2 - 3;
        if (d > 0 && d < min) {
          const push = (min - d) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x);
          a.x -= Math.cos(ang) * push; a.y -= Math.sin(ang) * push;
          b.x += Math.cos(ang) * push; b.y += Math.sin(ang) * push;
        }
      }
    }
  }

  function tackles() {
    if (!owner || owner.hold > 0) return;
    players.forEach((d) => {
      if (d.team === owner.team || d.stun > 0) return;
      if (dist(d, owner) > PLR_R * 2 + 6) return;
      const pressing = (d.team === 0 && (keys.Space || touch.fire)) || d.team === 1;
      const odds = d.tackle * (pressing ? 1.6 : 0.7) * (d.team === 1 ? DIFF[diff].react : 1);
      if (Math.random() < odds * (1 - owner.control * 0.45)) {
        const loser = owner;
        loser.stun = 420;
        owner = d;
        lockBall = 0;
        beep(150, 0.06, "sawtooth", 0.05);
      }
    });
  }

  function ballStep() {
    if (lockBall > 0) lockBall--;

    if (owner) {
      if (owner.hold > 0) owner.hold -= STEP;
      ball.x = owner.x + Math.cos(owner.dir) * DRIBBLE;
      ball.y = owner.y + Math.sin(owner.dir) * DRIBBLE;
      ball.vx = 0; ball.vy = 0;
      /* Keeper houdt de bal even vast en trapt hem dan naar voren. */
      if (owner.isGK && owner.hold <= 0) {
        const mate = bestPass(owner) || nearestTo(owner, owner.team, owner);
        if (mate) passTo(owner, mate);
      }
      return;
    }

    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= 0.986; ball.vy *= 0.986;
    if (Math.abs(ball.vx) < 0.02) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.02) ball.vy = 0;

    if (ball.y < PT + BALL_R) { ball.y = PT + BALL_R; ball.vy = -ball.vy * 0.72; }
    if (ball.y > PB - BALL_R) { ball.y = PB - BALL_R; ball.vy = -ball.vy * 0.72; }

    if (ball.x > PR - BALL_R) {
      if (inMouth(ball.y)) { goal(0); return; }
      ball.x = PR - BALL_R; ball.vx = -ball.vx * 0.72;
    }
    if (ball.x < PL + BALL_R) {
      if (inMouth(ball.y)) { goal(1); return; }
      ball.x = PL + BALL_R; ball.vx = -ball.vx * 0.72;
    }

    if (lockBall > 0) return;

    /* Balcontrole pakken — keepers hebben een grotere actieradius. */
    let taker = null, td = 1e9;
    players.forEach((p) => {
      const reach = CONTROL + (p.isGK ? 10 + p.reflex / 12 : 0);
      const d = dist(p, ball);
      if (p.stun <= 0 && d < reach && d < td) { td = d; taker = p; }
    });
    if (taker) {
      owner = taker;
      if (Math.hypot(taker.vx, taker.vy) < 0.4) {
        taker.dir = Math.atan2(H / 2 - taker.y, goalX(taker.team) - taker.x);
      }
      if (taker.isGK) { taker.hold = 900; beep(420, 0.05, "sine", 0.04); }
    }
  }

  /* ---------------- Wedstrijdverloop ---------------- */
  function goal(team) {
    score[team]++;
    updateHud();
    beep(660, 0.16, "square", 0.06);
    setTimeout(() => beep(880, 0.22, "square", 0.06), 150);
    state = "goal";
    flash(team === 0 ? "GOAL!" : "TEGENDOELPUNT");
    setTimeout(() => {
      if (state !== "goal") return;
      kickoff(1 - team);
      state = "playing";
    }, 1600);
  }

  function flash(text) {
    const el = $("#flash");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.hidden = true; }, 1500);
  }

  function finish() {
    state = "fulltime";
    beep(300, 0.5, "sine", 0.05);
    const mine = score[0], theirs = score[1];
    const verdict = mine > theirs ? "Gewonnen!" : mine === theirs ? "Gelijkspel" : "Verloren";
    $("#ov-title").innerHTML = "<em>" + verdict + "</em>";
    $("#ov-text").textContent = "Eindstand " + homeName + " " + mine + " – " + theirs + " " + awayName + ".";
    $("#ov-keys").hidden = true;
    $("#ov-start").textContent = "Opnieuw spelen";
    $("#overlay").hidden = false;
  }

  function updateHud() {
    $("#score").textContent = score[0] + " – " + score[1];
    const t = Math.max(0, clock);
    $("#clock").textContent =
      String(Math.floor(t / 60)) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
    $("#power-bar").style.width = Math.round(powerCharge * 100) + "%";
    const act = players.length ? activePlayer() : null;
    $("#stamina-bar").style.width = Math.round((act ? act.stamina : 1) * 100) + "%";
  }

  /* ---------------- Tekenen ---------------- */
  function drawPitch() {
    ctx.fillStyle = "#0a2d1c";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? "#12432a" : "#0f3b25";
      ctx.fillRect(PL + (i * (PR - PL)) / 10, PT, (PR - PL) / 10 + 1, PB - PT);
    }
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(PL, PT, PR - PL, PB - PT);
    ctx.beginPath(); ctx.moveTo(W / 2, PT); ctx.lineTo(W / 2, PB); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 66, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fill();
    [PL, PR].forEach((x, i) => {
      const w = 110, dir = i === 0 ? 1 : -1;
      ctx.strokeRect(x, MOUTH_T - 46, w * dir, GOAL_H + 92);
      ctx.strokeRect(x, MOUTH_T - 6, 42 * dir, GOAL_H + 12);
      /* Doel met net */
      ctx.fillStyle = "rgba(255,255,255,.14)";
      ctx.fillRect(i === 0 ? PL - 20 : PR, MOUTH_T, 20, GOAL_H);
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.strokeRect(i === 0 ? PL - 20 : PR, MOUTH_T, 20, GOAL_H);
      ctx.strokeStyle = "rgba(255,255,255,.22)";
    });
  }

  function drawPlayer(p, isActive) {
    const kit = KIT[p.team];
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, PLR_R * 0.9, PLR_R * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fill();

    if (isActive) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLR_R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLR_R, 0, Math.PI * 2);
    ctx.fillStyle = p.isGK ? "#ffd54a" : kit.body;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.stun > 0 ? "#ff2d2d" : kit.trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.dir) * (PLR_R + 5), p.y + Math.sin(p.dir) * (PLR_R + 5));
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = p.isGK ? "#3a2c00" : kit.text;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(p.rating), p.x, p.y);

    if (isActive) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(p.name, p.x, p.y - PLR_R - 10);
    }
  }

  function draw() {
    drawPitch();
    const act = state === "ready" || demo ? null : activePlayer();
    players.forEach((p) => drawPlayer(p, p === act));

    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + 7, 6, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fill();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#1b1b1b"; ctx.stroke();
  }

  /* ---------------- Lus ---------------- */
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    acc += Math.min(100, ts - lastTs);
    lastTs = ts;
    while (acc >= STEP) { step(); acc -= STEP; }
    draw();
    updateHud();
  }

  /* ---------------- Invoer ---------------- */
  const BLOCK = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  document.addEventListener("keydown", (e) => {
    if (BLOCK.indexOf(e.code) !== -1) e.preventDefault();
    if (!keys[e.code]) tapped[e.code] = true;
    keys[e.code] = true;
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
  });
  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    if (e.code === "Space") tapped.SpaceUp = true;
  });
  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
    for (const k in tapped) tapped[k] = false;
  });

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      $("#ov-title").innerHTML = "<em>Pauze</em>";
      $("#ov-text").textContent = "De wedstrijd staat stil.";
      $("#ov-keys").hidden = false;
      $("#ov-start").textContent = "Verder spelen";
      $("#overlay").hidden = false;
    } else if (state === "paused") {
      $("#overlay").hidden = true;
      state = "playing";
    }
  }

  /* Touchbediening: linkerstick om te lopen, knop rechts om te schieten. */
  function setupTouch() {
    const pad = $("#touch"), stick = $("#stick"), knob = $("#knob"), fire = $("#fire");
    if (!("ontouchstart" in window)) return;
    pad.classList.add("on");
    let id = null, cx = 0, cy = 0;

    stick.addEventListener("touchstart", (e) => {
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      id = e.changedTouches[0].identifier;
      touch.active = true;
      e.preventDefault();
    }, { passive: false });

    stick.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== id) continue;
        const dx = t.clientX - cx, dy = t.clientY - cy, len = Math.hypot(dx, dy) || 1;
        const cl = Math.min(len, 46) / 46;
        touch.dx = (dx / len) * cl; touch.dy = (dy / len) * cl;
        knob.style.transform = "translate(" + (touch.dx * 30) + "px," + (touch.dy * 30) + "px)";
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      id = null; touch.active = false; touch.dx = 0; touch.dy = 0;
      knob.style.transform = "";
      e.preventDefault();
    };
    stick.addEventListener("touchend", end, { passive: false });
    stick.addEventListener("touchcancel", end, { passive: false });

    fire.addEventListener("touchstart", (e) => { touch.fire = true; e.preventDefault(); }, { passive: false });
    fire.addEventListener("touchend", (e) => { touch.fire = false; e.preventDefault(); }, { passive: false });
  }

  /* ---------------- Start ---------------- */
  function startMatch() {
    matchLen = Number($("#opt-length").value);
    diff = Number($("#opt-diff").value);
    score = [0, 0];
    clock = matchLen;
    buildTeams();
    kickoff(0);
    updateHud();
    $("#overlay").hidden = true;
    state = "playing";
    beep(520, 0.12, "sine", 0.05);
  }

  function init() {
    const params = new URLSearchParams(location.search);
    demo = params.get("demo") === "1";
    /* Opt-in inspectiehaak voor handmatig testen: game.html?debug */
    if (params.has("debug")) {
      window.__arena = {
        players: () => players, ball: () => ball, owner: () => owner,
        active: () => activePlayer(), state: () => state, score: () => score
      };
    }
    buildTeams();
    kickoff(0);
    clock = Number($("#opt-length").value);
    updateHud();
    setupTouch();

    $("#ov-start").addEventListener("click", () => {
      if (state === "paused") togglePause(); else startMatch();
    });
    $("#btn-pause").addEventListener("click", togglePause);
    $("#btn-restart").addEventListener("click", startMatch);
    $("#opt-diff").addEventListener("change", () => { diff = Number($("#opt-diff").value); });

    if (demo) { startMatch(); }
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
