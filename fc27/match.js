/* Arena FC 27 — wedstrijdsimulatie. Wereldeenheid = 0,1 meter, dus het veld
   is 1050 x 680 (105 bij 68 meter). De simulatie draait op vaste stappen van 1/60s. */

const PITCH = {
  L: 1050, W: 680,
  GOAL_W: 73, GOAL_H: 24,          // 7,32 m breed, 2,44 m hoog
  PEN_D: 165, PEN_W: 403,
  SIX_D: 55, SIX_W: 183,
  CIRCLE: 91.5, SPOT: 110
};
const STEP = 1 / 60;
const GRAV = 0.55;
const ROLL_DECEL = 0.0056;   // rolwrijving op gras, ongeveer 2 m/s^2
const AIR_DRAG = 0.9994;

const Match = (function () {
  "use strict";

  const S = {
    phase: "idle",          // walkout, anthem, kickoff, play, restart, goal, replay, halftime, fulltime
    teams: [null, null], sides: [null, null],
    players: [], ball: null, owner: null, lastTouch: null, loose: 0,
    score: [0, 0], half: 1, clock: 0, halfLen: 150, added: 0,
    userTeam: 0, userControls: true, difficulty: 1,
    stats: null, events: [], replay: [], recording: [],
    restart: null, celebrate: null, message: "", flowTimer: 0
  };

  const DIFF = [
    { speed: 0.90, react: 0.5, shoot: 0.7, spread: 1.9 },
    { speed: 0.98, react: 0.8, shoot: 1.0, spread: 1.1 },
    { speed: 1.06, react: 1.1, shoot: 1.25, spread: 0.7 }
  ];

  /* Eén plek waar de bal beweegt, zodat voorspelling en werkelijkheid niet uiteenlopen. */
  function integrate(o) {
    o.x += o.vx; o.y += o.vy;
    o.z += o.vz; o.vz -= GRAV * 0.1;
    if (o.z <= 0) { o.z = 0; o.vz = o.vz < -0.15 ? -o.vz * 0.45 : 0; }
    const sp = Math.hypot(o.vx, o.vy);
    if (sp <= 0) return;
    if (o.z > 1) { o.vx *= AIR_DRAG; o.vy *= AIR_DRAG; }
    else {
      const ns = Math.max(0, sp - ROLL_DECEL);
      o.vx = (o.vx / sp) * ns; o.vy = (o.vy / sp) * ns;
    }
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const attackDir = (team) => (team === 0 ? 1 : -1);
  const goalX = (team) => (team === 0 ? PITCH.L : 0);
  const ownGoalX = (team) => (team === 0 ? 0 : PITCH.L);

  /* ---------------- Opzetten ---------------- */
  function makePlayers(team, side, squad, lineup) {
    /* Een zelfgemaakte opstelling is een lijst met elf namen in formatievolgorde. */
    let chosen = null;
    if (lineup && lineup.length === 11) {
      chosen = lineup.map((n) => squad.filter((p) => p.name === n)[0]);
      if (chosen.some((p) => !p) || new Set(chosen).size !== 11) chosen = null;
    }
    if (!chosen) chosen = squad.filter((p) => p.starter);
    return chosen.map((p, i) => {
      const f = FORMATION[i];
      const st = p.stats;
      const fx = side === 0 ? f.x : 1 - f.x;
      const fy = side === 0 ? f.y : 1 - f.y;
      return {
        team: side, src: p, name: p.name, number: p.number, role: f.role,
        isGK: f.role === "GK" || p.pos === "GK",
        maxSpeed: (p.isGK ? 0.95 : 0.98) + (st.pac / 100) * 0.52,
        accel: 0.16 + (st.dri / 100) * 0.10,
        power: 2.4 + (st.sho / 100) * 2.3,
        passSkill: st.pas / 100,
        tackleSkill: st.def / 100,
        control: st.dri / 100,
        reflex: st.def / 100,
        homeX: fx * PITCH.L, homeY: fy * PITCH.W,
        x: fx * PITCH.L, y: fy * PITCH.W, vx: 0, vy: 0,
        dir: side === 0 ? 0 : Math.PI, phase: 0, speed: 0,
        stamina: 1, stun: 0, hold: 0, card: 0,
        goals: 0, assists: 0, tackles: 0, passes: 0,
        target: null, walkT: 0
      };
    });
  }

  function init(teamA, teamB, opts) {
    S.teams = [teamA, teamB];
    S.sides = [buildSquad(teamA), buildSquad(teamB)];
    const lu = (opts && opts.lineups) || {};
    S.players = makePlayers(teamA, 0, S.sides[0], lu[0]).concat(makePlayers(teamB, 1, S.sides[1], lu[1]));
    S.score = [0, 0];
    S.half = 1;
    S.halfLen = (opts && opts.halfLen) || 150;
    S.clock = 0;
    S.added = 0;
    S.difficulty = (opts && opts.difficulty) != null ? opts.difficulty : 1;
    S.userTeam = (opts && opts.userTeam) || 0;
    S.userControls = !(opts && opts.demo);
    S.events = [];
    S.replay = [];
    S.recording = [];
    S.stats = {
      poss: [0, 0], shots: [0, 0], onTarget: [0, 0], passes: [0, 0],
      tackles: [0, 0], corners: [0, 0], fouls: [0, 0], cards: [0, 0], reds: [0, 0], pens: [0, 0], offsides: [0, 0]
    };
    S.ball = { x: PITCH.L / 2, y: PITCH.W / 2, z: 0, vx: 0, vy: 0, vz: 0 };
    S.owner = null; S.lastTouch = null; S.loose = 0; S.passTo = null;
    S.restart = null; S.celebrate = null; S.message = "";
    S.pen = null; S.offside = null; S.added = 0; S.addedShown = false; S.addedMin = 0;
    S.subs = [0, 0];
    return S;
  }

  /* ---------------- Opkomst en opstelling ---------------- */
  function setupWalkout() {
    S.phase = "walkout";
    S.players.forEach((p, i) => {
      const n = i % 11;
      /* Uit de tunnel op de middenstip, in twee rijen. */
      p.x = PITCH.L / 2 + (p.team === 0 ? -18 : 18);
      p.y = -18 - n * 7;
      p.walkT = n * 0.11 + (p.team === 1 ? 0.4 : 0);
      p.target = {
        x: PITCH.L / 2 + (p.team === 0 ? -34 : 34),
        y: 70 + n * 54
      };
      p.vx = 0; p.vy = 0;
    });
    S.ball.x = PITCH.L / 2; S.ball.y = PITCH.W / 2; S.ball.z = 0;
    S.owner = null;
    S.flowTimer = 0;
  }

  function lineupReady() {
    return S.players.every((p) => !p.target || dist(p, p.target) < 12);
  }

  function setKickoff(team) {
    S.players.forEach((p, i) => {
      const n = i % 11;
      const f = FORMATION[n];
      const side = p.team;
      p.x = (side === 0 ? f.x : 1 - f.x) * PITCH.L;
      p.y = (side === 0 ? f.y : 1 - f.y) * PITCH.W;
      /* Bij een aftrap blijft iedereen op eigen helft. */
      if (side === 0) p.x = Math.min(p.x, PITCH.L / 2 - 12);
      else p.x = Math.max(p.x, PITCH.L / 2 + 12);
      p.vx = 0; p.vy = 0; p.stun = 0; p.hold = 0; p.target = null;
      p.dir = attackDir(side) > 0 ? 0 : Math.PI;
    });
    const taker = S.players.filter((p) => p.team === team && p.role === "ST")[0] ||
                  S.players.filter((p) => p.team === team)[10];
    taker.x = PITCH.L / 2 - attackDir(team) * 8;
    taker.y = PITCH.W / 2;
    const helper = S.players.filter((p) => p.team === team && p.role === "CAM" || p.role === "CM")
      .filter((p) => p.team === team)[0];
    if (helper) { helper.x = PITCH.L / 2 - attackDir(team) * 22; helper.y = PITCH.W / 2 + 30; }
    S.ball = { x: PITCH.L / 2, y: PITCH.W / 2, z: 0, vx: 0, vy: 0, vz: 0 };
    S.owner = taker; S.lastTouch = taker; S.loose = 0;
    S.phase = "kickoff";
    S.flowTimer = 1.2;
  }

  /* ---------------- Bal ---------------- */
  function releaseBall() { S.owner = null; S.loose = 10; S.looseFrom = S.lastTouch; }

  function shootBall(p, speed, angle, loft) {
    S.ball.x = p.x + Math.cos(angle) * 12;
    S.ball.y = p.y + Math.sin(angle) * 12;
    S.ball.vx = Math.cos(angle) * speed;
    S.ball.vy = Math.sin(angle) * speed;
    S.ball.vz = loft || 0;
    S.lastTouch = p;
    releaseBall();
    Sound.kick(speed / 4.5);
  }

  function aimGoal(p, spread) {
    const gx = goalX(p.team);
    const gy = PITCH.W / 2 + rnd(-1, 1) * (PITCH.GOAL_W / 2 + 6) * (spread == null ? 1 : spread);
    return Math.atan2(gy - p.y, gx - p.x);
  }

  function tryShot(p, quality) {
    const d = Math.abs(p.x - goalX(p.team));
    const acc = (0.45 + p.src.stats.sho / 180) * (quality || 1);
    const spread = clamp(1.9 - acc, 0.35, 1.9) * (p.team === S.userTeam ? 1 : DIFF[S.difficulty].spread);
    S.stats.shots[p.team]++;
    logEvent(p.team, p.name + " haalt uit");
    shootBall(p, p.power * rnd(0.85, 1.05), aimGoal(p, spread), d > 300 ? rnd(0.3, 0.9) : rnd(0, 0.35));
  }

  function passBall(p, mate, lofted) {
    const d0 = dist(p, mate);
    let speed, vz = 0, T;
    if (lofted) {
      /* Hoge bal: vluchttijd bepaalt de boog, daarna de horizontale snelheid. */
      T = clamp(Math.sqrt(d0) * 2.4, 40, 110);
      vz = GRAV * 0.1 * T / 2;
      speed = clamp(d0 / T, 0.8, 4.0);
    } else {
      /* Strakke pass: ongeveer 16 m/s gemiddeld, dus 20 meter in ruim een seconde. */
      T = clamp(d0 / 2.6, 16, 140);
      speed = clamp(d0 / T + 0.5 * ROLL_DECEL * T, 0.9, 4.3);
    }
    /* Mikken op waar de medespeler naartoe loopt, niet waar hij nu staat. */
    const tx = mate.x + mate.vx * T * 0.55, ty = mate.y + mate.vy * T * 0.55;
    const a = Math.atan2(ty - p.y, tx - p.x);
    const err = (1 - p.passSkill) * 0.14;
    p.passes++; S.stats.passes[p.team]++;
    S.lastPasser = p;
    S.passTo = { player: mate, ttl: 200 };
    S.offside = (mate.team === p.team && offsideAt(p, mate)) ? { player: mate, team: p.team } : null;
    shootBall(p, speed, a + rnd(-err, err), vz);
  }

  /* ---------------- Spelershulp ---------------- */
  function nearest(pt, team, skip) {
    const skips = skip == null ? [] : (Array.isArray(skip) ? skip : [skip]);
    let best = null, bd = 1e9;
    S.players.forEach((p) => {
      if (p.team !== team || p.off || skips.indexOf(p) !== -1) return;
      const d = dist(p, pt);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  /* Hoeveel tegenstanders staan er in de lijn van A naar B? */
  function laneBlocked(from, to, team, radius) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return 0;
    let n = 0;
    S.players.forEach((o) => {
      if (o.team === team) return;
      const t = ((o.x - from.x) * dx + (o.y - from.y) * dy) / len2;
      if (t <= 0.02 || t >= 1) return;
      if (Math.hypot(o.x - (from.x + dx * t), o.y - (from.y + dy * t)) < radius) n++;
    });
    return n;
  }

  /* Steekpass in de ruimte achter de verdediging, niet in de voeten. */
  function passToSpace(p, mate) {
    const ahead = {
      x: clamp(mate.x + attackDir(p.team) * 95, 30, PITCH.L - 30),
      y: clamp(mate.y + rnd(-30, 30), 30, PITCH.W - 30),
      vx: 0, vy: 0
    };
    passBall(p, ahead, false);
    S.passTo = { player: mate, ttl: 200 };
  }

  /* Buitenspel op het moment van de pass: voorbij de voorlaatste verdediger,
     op de helft van de tegenstander en voor de bal uit. */
  function offsideAt(passer, receiver) {
    if (!receiver || receiver.team !== passer.team || receiver.isGK) return false;
    const dir = attackDir(passer.team);
    if ((receiver.x - PITCH.L / 2) * dir <= 0) return false;
    if ((receiver.x - passer.x) * dir <= 6) return false;
    const line = S.players
      .filter((o) => o.team !== passer.team && !o.off)
      .map((o) => o.x)
      .sort((a, b) => (dir > 0 ? b - a : a - b));
    const tweede = line[1];
    return tweede != null && (receiver.x - tweede) * dir > 6;
  }

  function bestPassOption(p) {
    let best = null, bs = -1e9;
    S.players.forEach((m) => {
      if (m.team !== p.team || m === p || m.off) return;
      const d = dist(p, m);
      if (d < 40 || d > 480) return;
      const fwd = (m.x - p.x) * attackDir(p.team);
      const marker = nearest(m, 1 - p.team);
      const space = marker ? dist(marker, m) : 200;
      /* Straf passes die dwars door een tegenstander heen gaan. */
      let blocked = 0;
      S.players.forEach((o) => {
        if (o.team === p.team) return;
        const t = ((o.x - p.x) * (m.x - p.x) + (o.y - p.y) * (m.y - p.y)) / (d * d);
        if (t <= 0 || t >= 1) return;
        const px = p.x + (m.x - p.x) * t, py = p.y + (m.y - p.y) * t;
        if (Math.hypot(o.x - px, o.y - py) < 18) blocked++;
      });
      /* Terreinwinst weegt zwaarder dan vrije ruimte, anders tikt het team eindeloos
         terug naar de vrijstaande verdediger en komt de bal nooit vooruit. */
      const third = (m.x - PITCH.L / 2) * attackDir(p.team) > PITCH.L * 0.16 ? 150 : 0;
      const s = fwd * 1.7 + space * 0.85 - d * 0.12 - blocked * 120 - (m.isGK ? 420 : 0) + third;
      if (s > bs) { bs = s; best = m; }
    });
    return best;
  }

  /* Waar kan deze speler de bal het eerst bereiken? */
  function interceptPoint(p) {
    const b = S.ball;
    const o = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz };
    const sp = p.maxSpeed * 0.95;
    for (let f = 1; f <= 110; f++) {
      integrate(o);
      if (Math.hypot(o.x - p.x, o.y - p.y) <= sp * f + 12) break;
    }
    return { x: clamp(o.x, 0, PITCH.L), y: clamp(o.y, 0, PITCH.W) };
  }

  function steer(p, tx, ty, boost) {
    const a = Math.atan2(ty - p.y, tx - p.x);
    const cpu = p.team !== S.userTeam ? DIFF[S.difficulty].speed : 1;
    const max = p.maxSpeed * (boost || 1) * cpu * (0.75 + p.stamina * 0.25);
    p.vx += (Math.cos(a) * max - p.vx) * p.accel;
    p.vy += (Math.sin(a) * max - p.vy) * p.accel;
  }

  /* ---------------- Keeper ---------------- */
  function goalkeeper(p) {
    const line = ownGoalX(p.team);
    const dirIn = p.team === 0 ? 1 : -1;
    const b = S.ball;
    const threat = Math.abs(b.x - line) < 300;
    const ty = clamp(b.y + b.vy * 4, PITCH.W / 2 - PITCH.GOAL_W / 2 - 14, PITCH.W / 2 + PITCH.GOAL_W / 2 + 14);
    const out = threat ? clamp((300 - Math.abs(b.x - line)) / 300, 0, 1) * 55 : 12;
    steer(p, line + dirIn * (8 + out), ty, threat ? 1.25 : 0.9);

    if (S.owner === p) {
      if (p.hold > 0) { p.hold -= STEP; return; }
      const mate = bestPassOption(p) || nearest(p, p.team, p);
      if (mate) passBall(p, mate, dist(p, mate) > 260);
    }
  }

  /* ---------------- Veldspelers ---------------- */
  function withBall(p) {
    const gx = goalX(p.team), d = Math.abs(p.x - gx);
    const marker = nearest(p, 1 - p.team);
    const pressed = marker && dist(marker, p) < 32;
    const df = DIFF[S.difficulty];
    const inBox = d < PITCH.PEN_D + 40 && Math.abs(p.y - PITCH.W / 2) < PITCH.PEN_W / 2;

    if (inBox && Math.random() < 0.07 * df.shoot) { tryShot(p, 1.1); return; }
    /* Van afstand alleen schieten als de weg vrij is; anders wordt het altijd geblokt. */
    if (d < 330 && !pressed && Math.random() < 0.035 * df.shoot &&
        laneBlocked(p, { x: gx, y: PITCH.W / 2 }, p.team, 11) === 0) { tryShot(p, 0.9); return; }

    /* Steekpass op een aanvaller die diepte kan maken. */
    if (Math.random() < 0.035) {
      const runners = S.players.filter((m2) => m2.team === p.team && m2 !== p && !m2.isGK &&
        (m2.x - p.x) * attackDir(p.team) > 30 &&
        Math.abs(m2.x - gx) < PITCH.L * 0.42 &&
        laneBlocked(p, m2, p.team, 14) === 0 && dist(p, m2) < 430);
      if (runners.length) {
        passToSpace(p, runners[Math.floor(Math.random() * runners.length)]);
        return;
      }
    }

    if (pressed && Math.random() < 0.16) {
      const mate = bestPassOption(p);
      if (mate) { passBall(p, mate, dist(p, mate) > 300); return; }
    }
    if (!pressed && Math.random() < 0.028) {
      const mate = bestPassOption(p);
      if (mate && (mate.x - p.x) * attackDir(p.team) > 60) { passBall(p, mate, dist(p, mate) > 300); return; }
    }

    let ty = PITCH.W / 2;
    if (marker && dist(marker, p) < 70) ty = p.y + (p.y < marker.y ? -90 : 90);
    steer(p, gx, clamp(ty, 40, PITCH.W - 40), 1.10);
  }

  function offBall(p, chaser, press2) {
    const b = S.ball;
    const weHave = S.owner && S.owner.team === p.team;

    /* Aangespeeld: naar de bal toe, niet naar je positie. */
    if (S.passTo && S.passTo.player === p && !S.owner) {
      const t = interceptPoint(p);
      steer(p, t.x, t.y, 1.2);
      return;
    }
    if (p === chaser) {
      const t = S.owner ? { x: b.x, y: b.y } : interceptPoint(p);
      steer(p, t.x, t.y, 1.15);
      return;
    }
    if (p === press2 && !weHave) {
      const t = S.owner || b;
      steer(p, t.x - attackDir(p.team) * 25, t.y, 1.05);
      return;
    }

    /* Blokvorming: het team schuift mee met de bal, maar niet iedereen even ver.
       Spitsen blijven hoog staan, anders staat de hele ploeg in de eigen zestien
       en wordt elk schot geblokt. */
    const line = { ST: -10, LW: -10, RW: -10, CAM: -45, CM: -55, CDM: -65 }[p.role];
    const push = weHave ? 130 : (line == null ? -85 : line);
    const shift = (b.x - PITCH.L / 2) * 0.55;
    let tx = p.homeX + shift + attackDir(p.team) * push;
    let ty = p.homeY + (b.y - PITCH.W / 2) * 0.38;

    if (weHave && (p.role === "ST" || p.role === "LW" || p.role === "RW")) {
      tx += attackDir(p.team) * 70;                        // diepte zoeken
      ty += Math.sin(S.clock * 0.7 + p.number) * 40;
    }
    if (!weHave && (p.role === "CB" || p.role === "LB" || p.role === "RB")) {
      const mark = nearest(p, 1 - p.team, null);
      if (mark && dist(mark, p) < 220) { tx = mark.x - attackDir(p.team) * 18; ty = mark.y; }
    }
    steer(p, clamp(tx, 20, PITCH.L - 20), clamp(ty, 25, PITCH.W - 25), weHave ? 0.95 : 1.0);
  }

  /* ---------------- Duels ---------------- */
  function duels() {
    const o = S.owner;
    if (!o || o.hold > 0) return;
    S.players.forEach((d) => {
      if (d.team === o.team || d.stun > 0 || d.isGK || d.off) return;
      if (dist(d, o) > 20) return;
      const df = d.team !== S.userTeam ? DIFF[S.difficulty].react : 1;
      /* Was 2% per frame: dan raakt elke balbezitter hem binnen een seconde kwijt.
         Nu houdt een goede dribbelaar het twee tot drie seconden vol. */
      const odds = (0.004 + d.tackleSkill * 0.011) * df * (1 - o.control * 0.45);
      if (Math.random() > odds) return;

      if (Math.random() < 0.14) {                           // overtreding
        foul(d, o);
        return;
      }
      d.tackles++; S.stats.tackles[d.team]++;
      o.stun = 0.45;
      S.owner = d; S.lastTouch = d;
      Sound.blip(140, 0.07, "sawtooth", 0.05);
    });
  }

  function foul(offender, victim) {
    S.stats.fouls[offender.team]++;
    offender.stun = 0.9;
    Sound.whistle("short");

    const hard = Math.random() < 0.22;
    let kaart = "";
    if (hard) {
      offender.card++;
      S.stats.cards[offender.team]++;
      if (offender.card >= 2) {
        /* Tweede geel is rood: de ploeg speelt verder met tien man. */
        offender.off = true;
        offender.x = -80; offender.y = -80;
        offender.vx = 0; offender.vy = 0;
        S.stats.reds[offender.team]++;
        kaart = " — ROOD";
        S.message = "Rode kaart — " + offender.name;
      } else {
        kaart = " — geel";
        S.message = "Gele kaart — " + offender.name;
      }
    } else {
      S.message = "Vrije trap";
    }
    logEvent(offender.team, "Overtreding van " + offender.name + kaart);

    /* In het eigen strafschopgebied is het een penalty. */
    const eigen = ownGoalX(offender.team);
    const inBox = Math.abs(victim.x - eigen) < PITCH.PEN_D &&
                  Math.abs(victim.y - PITCH.W / 2) < PITCH.PEN_W / 2;
    if (inBox) { beginPenalty(victim.team); return; }

    beginRestart("free", victim.team, victim.x, victim.y, victim);
  }

  /* ---------------- Wissels ---------------- */
  /* Vervangt een speler op het veld door iemand van de bank; positie en rol blijven. */
  function substitute(team, opVeld, invaller) {
    if (!opVeld || !invaller || opVeld.team !== team) return false;
    if (S.subs[team] >= 3) return false;
    if (S.players.some((p) => p.src === invaller)) return false;

    const st = invaller.stats;
    opVeld.src = invaller;
    opVeld.name = invaller.name;
    opVeld.number = invaller.number;
    opVeld.isGK = invaller.pos === "GK";
    opVeld.maxSpeed = (invaller.isGK ? 0.95 : 0.98) + (st.pac / 100) * 0.52;
    opVeld.accel = 0.16 + (st.dri / 100) * 0.10;
    opVeld.power = 2.4 + (st.sho / 100) * 2.3;
    opVeld.passSkill = st.pas / 100;
    opVeld.tackleSkill = st.def / 100;
    opVeld.control = st.dri / 100;
    opVeld.reflex = st.def / 100;
    opVeld.stamina = 1;
    opVeld.card = 0;
    opVeld.off = false;
    S.subs[team]++;
    logEvent(team, "Wissel: " + invaller.name + " erin");
    return true;
  }

  function benchOf(team) {
    const opVeld = S.players.filter((p) => p.team === team).map((p) => p.src);
    return S.sides[team].filter((p) => opVeld.indexOf(p) === -1);
  }

  /* ---------------- Strafschop ---------------- */
  function beginPenalty(team) {
    const tegen = 1 - team;
    const gx = goalX(team);
    const dir = attackDir(team);
    const spot = { x: gx - dir * PITCH.SPOT, y: PITCH.W / 2 };

    const taker = S.players
      .filter((p) => p.team === team && !p.isGK && !p.off)
      .sort((a, b) => b.src.stats.sho - a.src.stats.sho)[0];
    const keeper = S.players.filter((p) => p.team === tegen && p.isGK && !p.off)[0];

    S.players.forEach((p) => {
      if (p.off) return;
      p.vx = 0; p.vy = 0; p.stun = 0;
      if (p === taker) { p.x = spot.x - dir * 26; p.y = spot.y; p.dir = dir > 0 ? 0 : Math.PI; return; }
      if (p === keeper) { p.x = gx - dir * 8; p.y = PITCH.W / 2; return; }
      /* De rest wacht buiten het strafschopgebied. */
      p.x = gx - dir * (PITCH.PEN_D + 60 + (p.number % 6) * 22);
      p.y = 90 + (p.number % 9) * 55;
    });

    S.ball = { x: spot.x, y: spot.y, z: 0, vx: 0, vy: 0, vz: 0 };
    S.owner = null; S.passTo = null; S.offside = null; S.loose = 0;
    S.stats.pens[team]++;
    S.phase = "penalty";
    S.message = "Strafschop";
    Sound.whistle("short");
    logEvent(team, "Strafschop voor " + S.teams[team].name);

    S.pen = {
      team: team, taker: taker, keeper: keeper, gx: gx, dir: dir,
      stage: "richten", aim: 0.5, sweep: 0.016, hoogte: 0.1, hsweep: 0.022,
      wacht: 0, ty: 0, tz: 0, duik: 0, uitslag: "", timer: 0,
      auto: taker ? taker.team !== S.userTeam : true
    };
  }

  /* Eén stap van de strafschop. `druk` is true als de speler op schieten drukt. */
  function stepPenalty(druk) {
    const pen = S.pen;
    if (!pen) return;
    pen.timer += STEP;

    if (pen.stage === "richten") {
      pen.aim += pen.sweep;
      if (pen.aim > 1 || pen.aim < 0) { pen.sweep *= -1; pen.aim = clamp(pen.aim, 0, 1); }
      /* De computer kiest zelf een moment, met een hoek die past bij zijn schot. */
      const wilNu = pen.auto ? (pen.timer > 1.2 && Math.random() < 0.06) : druk;
      if (wilNu) {
        if (pen.auto) {
          const nauw = pen.taker.src.stats.sho / 100;
          /* Een goede nemer kiest een hoek net binnen de paal; zo nu en dan mist er een. */
          const kant = Math.random() < 0.5 ? -1 : 1;
          pen.aim = 0.5 + kant * (0.16 + nauw * 0.20) + rnd(-0.12, 0.12);
          if (Math.random() < 0.07) pen.aim += kant * 0.45;      // een echte misser
          pen.aim = clamp(pen.aim, -0.12, 1.12);
        }
        pen.stage = "hoogte";
        pen.timer = 0;
      }
      return;
    }

    if (pen.stage === "hoogte") {
      pen.hoogte += pen.hsweep;
      if (pen.hoogte > 1 || pen.hoogte < 0) { pen.hsweep *= -1; pen.hoogte = clamp(pen.hoogte, 0, 1); }
      const wilNu = pen.auto ? (pen.timer > 0.7 && Math.random() < 0.08) : druk;
      if (wilNu) {
        if (pen.auto) pen.hoogte = clamp(rnd(0.12, 0.72), 0, 1);
        schietPenalty();
      }
      return;
    }

    if (pen.stage === "vlucht") {
      integrate(S.ball);
      const k = pen.keeper;
      if (k) {
        /* De keeper duikt naar de gekozen kant en strekt zich uit. */
        const doelY = PITCH.W / 2 + pen.duik * (PITCH.GOAL_W / 2 + 10);
        k.y += (doelY - k.y) * 0.16;
        k.dir = pen.duik > 0 ? Math.PI / 2 : pen.duik < 0 ? -Math.PI / 2 : 0;
      }
      const overLijn = pen.dir > 0 ? S.ball.x >= pen.gx : S.ball.x <= pen.gx;
      if (overLijn) {
        const binnen = Math.abs(S.ball.y - PITCH.W / 2) < PITCH.GOAL_W / 2 && S.ball.z < PITCH.GOAL_H;
        /* Reikwijdte van een uitgestrekte keeper is ruim een meter, niet de halve goal. */
        const bereik = k ? Math.abs(S.ball.y - k.y) < 11 + k.reflex * 7 && S.ball.z < 26 : false;
        if (binnen && !bereik) {
          pen.uitslag = "goal";
          S.lastTouch = pen.taker;
          S.lastAssist = null;
          scoreGoal(pen.team);
          S.pen = null;
          return;
        }
        pen.uitslag = binnen ? "gered" : "naast";
        if (binnen) { S.stats.onTarget[pen.team]++; Sound.save(); logEvent(1 - pen.team, "Gestopt door " + (k ? k.name : "de keeper")); }
        else logEvent(pen.team, "Strafschop gemist");
        S.message = binnen ? "Gestopt!" : "Naast!";
        pen.stage = "klaar";
        pen.timer = 0;
      }
      return;
    }

    if (pen.stage === "klaar" && pen.timer > 1.6) {
      const verdedigt = 1 - pen.team;
      S.pen = null;
      beginRestart("goalkick", verdedigt, goalX(pen.team) - pen.dir * 60, PITCH.W / 2);
    }
  }

  function schietPenalty() {
    const pen = S.pen;
    const y1 = PITCH.W / 2 - PITCH.GOAL_W / 2;
    const nauw = pen.taker ? pen.taker.src.stats.sho / 100 : 0.7;
    const fout = (1 - nauw) * 0.12;
    pen.ty = y1 + clamp(pen.aim + rnd(-fout, fout), -0.04, 1.04) * PITCH.GOAL_W;
    pen.tz = clamp(pen.hoogte + rnd(-fout, fout), 0, 1.12) * (PITCH.GOAL_H + 6);

    /* De keeper gokt een kant; bij een hoekje redt hij het bijna nooit. */
    const r = Math.random();
    pen.duik = r < 0.42 ? -1 : r < 0.84 ? 1 : 0;
    if (pen.keeper && Math.random() < pen.keeper.reflex * 0.35) {
      pen.duik = pen.ty < PITCH.W / 2 - 8 ? -1 : pen.ty > PITCH.W / 2 + 8 ? 1 : 0;
    }

    /* Vlucht van 26 frames; de opwaartse snelheid moet de val compenseren. */
    const t = 26, g = GRAV * 0.1;
    S.ball.vx = (pen.gx - S.ball.x) / t;
    S.ball.vy = (pen.ty - S.ball.y) / t;
    S.ball.vz = pen.tz / t + 0.5 * g * t;
    S.lastTouch = pen.taker;
    pen.stage = "vlucht";
    pen.timer = 0;
    Sound.kick(0.9);
  }

  /* ---------------- Spelhervattingen ---------------- */
  function beginRestart(type, team, x, y, preferred) {
    S.phase = "restart";
    S.restart = { type: type, team: team, x: clamp(x, 6, PITCH.L - 6), y: clamp(y, 6, PITCH.W - 6), timer: 1.5, taker: null };
    S.ball.vx = 0; S.ball.vy = 0; S.ball.vz = 0; S.ball.z = 0;
    S.ball.x = S.restart.x; S.ball.y = S.restart.y;
    S.owner = null; S.passTo = null; S.offside = null;
    const taker = type === "goalkick"
      ? S.players.filter((p) => p.team === team && p.isGK)[0]
      : (preferred && preferred.team === team && !preferred.isGK ? preferred
         : nearest(S.restart, team, S.players.filter((p) => p.team === team && p.isGK)));
    S.restart.taker = taker;
  }

  function updateRestart() {
    const r = S.restart;
    r.timer -= STEP;
    const spot = { x: r.x, y: r.y };
    S.ball.x = r.x; S.ball.y = r.y; S.ball.z = 0;

    S.players.forEach((p) => {
      if (p === r.taker) { steer(p, r.x - attackDir(p.team) * 14, r.y, 1.1); return; }
      /* Tegenstanders houden afstand, medespelers zoeken een aanspeelpunt. */
      let tx = p.homeX + (r.x - PITCH.L / 2) * 0.5;
      let ty = p.homeY + (r.y - PITCH.W / 2) * 0.35;
      if (p.team !== r.team && Math.hypot(p.x - r.x, p.y - r.y) < 92) {
        const a = Math.atan2(p.y - r.y, p.x - r.x);
        tx = r.x + Math.cos(a) * 100; ty = r.y + Math.sin(a) * 100;
      }
      if (r.type === "corner" && p.team === r.team) { tx = goalX(p.team) - attackDir(p.team) * 90; ty = PITCH.W / 2 + (p.number % 5 - 2) * 38; }
      if (r.type === "corner" && p.team !== r.team) { tx = ownGoalX(p.team) + attackDir(p.team) * 60; ty = PITCH.W / 2 + (p.number % 5 - 2) * 32; }
      steer(p, clamp(tx, 15, PITCH.L - 15), clamp(ty, 20, PITCH.W - 20), 0.9);
    });

    if (r.timer <= 0 && r.taker) {
      S.phase = "play";
      S.owner = r.taker; S.lastTouch = r.taker;
      r.taker.x = r.x - attackDir(r.taker.team) * 10;
      r.taker.y = r.y;
      if (r.type === "corner") {
        const mate = S.players.filter((p) => p.team === r.team && !p.isGK)
          .sort((a, b) => Math.abs(a.x - goalX(r.team)) - Math.abs(b.x - goalX(r.team)))[0];
        if (mate) passBall(r.taker, mate, true);
      } else if (r.type === "goalkick") {
        const mate = bestPassOption(r.taker);
        if (mate) passBall(r.taker, mate, true);
      }
      S.restart = null;
      S.message = "";
    }
  }

  /* ---------------- Balfysica en regels ---------------- */
  function ballStep() {
    const b = S.ball;
    if (S.loose > 0) S.loose--;

    if (S.owner) {
      const o = S.owner;
      if (o.hold > 0) o.hold -= STEP;
      b.x = o.x + Math.cos(o.dir) * 12;
      b.y = o.y + Math.sin(o.dir) * 12;
      b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0;
      return;
    }

    integrate(b);
    if (Math.abs(b.vx) < 0.01) b.vx = 0;
    if (Math.abs(b.vy) < 0.01) b.vy = 0;

    /* Doelpunt of uitbal */
    const inGoalMouth = Math.abs(b.y - PITCH.W / 2) < PITCH.GOAL_W / 2 && b.z < PITCH.GOAL_H;
    if (b.x <= 0) {
      if (inGoalMouth) { scoreGoal(1); return; }
      outOfPlay("goalline", 0);
      return;
    }
    if (b.x >= PITCH.L) {
      if (inGoalMouth) { scoreGoal(0); return; }
      outOfPlay("goalline", 1);
      return;
    }
    if (b.y <= 0 || b.y >= PITCH.W) { outOfPlay("side", null); return; }

    /* Balcontrole. Een hard geraakte bal is niet zomaar aan te nemen: die vliegt
       langs je heen of wordt hooguit afgeketst. Anders is elk schot meteen buit
       voor de dichtstbijzijnde verdediger. */
    const bSpeed = Math.hypot(b.vx, b.vy);
    let taker = null, td = 1e9, deflect = null, dd = 1e9;
    S.players.forEach((p) => {
      if (p.stun > 0 || p.off) return;
      if (S.loose > 0 && p === S.looseFrom) return;   // niet meteen terugpakken na eigen trap
      /* Hoe harder de bal, hoe minder tijd om te reageren: de actieradius krimpt. */
      const base = p.isGK ? 14 + p.reflex * 12 : 17;
      const reach = p.isGK ? base * clamp(1.25 - bSpeed / 8, 0.5, 1.1) : base;
      if (b.z > (p.isGK ? 30 : 17)) return;
      const d = dist(p, b);
      if (d > reach) return;
      const clean = p.isGK ? 1.8 + p.reflex * 1.2 : 1.5 + p.control * 1.3;
      if (bSpeed <= clean) { if (d < td) { td = d; taker = p; } }
      else if (d < (p.isGK ? reach : 9) && d < dd) { dd = d; deflect = p; }
    });

    if (!taker && deflect) {
      const away = Math.atan2(deflect.y - PITCH.W / 2, deflect.x - ownGoalX(deflect.team)) ;
      const ang = deflect.isGK ? away + rnd(-0.5, 0.5) : Math.atan2(b.vy, b.vx) + rnd(-1.1, 1.1);
      const keep = deflect.isGK ? 0.30 : 0.45;
      b.vx = Math.cos(ang) * bSpeed * keep;
      b.vy = Math.sin(ang) * bSpeed * keep;
      b.vz = deflect.isGK ? 0.6 : 0.3;
      if (deflect.isGK && S.lastTouch && S.lastTouch.team !== deflect.team) {
        S.stats.onTarget[1 - deflect.team]++;
        logEvent(deflect.team, "Redding van " + deflect.name);
        Sound.save();
      }
      S.lastTouch = deflect;
      S.loose = 6; S.looseFrom = deflect;
      return;
    }

    if (taker && S.offside && taker === S.offside.player) {
      Sound.whistle("short");
      S.stats.offsides[taker.team]++;
      logEvent(taker.team, "Buitenspel — " + taker.name);
      S.message = "Buitenspel";
      S.offside = null;
      beginRestart("free", 1 - taker.team, taker.x, taker.y);
      return;
    }
    if (taker && S.offside && taker.team !== S.offside.team) S.offside = null;

    if (taker) {
      const wasShot = S.lastTouch && S.lastTouch.team !== taker.team && bSpeed > 2.4;
      if (taker.isGK && wasShot) { S.stats.onTarget[1 - taker.team]++; Sound.save(); logEvent(taker.team, "Redding van " + taker.name); }
      if (S.lastTouch && S.lastTouch.team === taker.team && S.lastTouch !== taker) {
        S.lastAssist = S.lastTouch;
      }
      S.owner = taker; S.lastTouch = taker;
      if (Math.hypot(taker.vx, taker.vy) < 0.25) {
        taker.dir = Math.atan2(PITCH.W / 2 - taker.y, goalX(taker.team) - taker.x);
      }
      if (taker.isGK) taker.hold = 1.4;
    }
  }

  function outOfPlay(where, sideIdx) {
    const last = S.lastTouch;
    const lastTeam = last ? last.team : 0;
    Sound.whistle("short");
    if (where === "side") {
      const to = 1 - lastTeam;
      beginRestart("throw", to, S.ball.x, S.ball.y <= 0 ? 4 : PITCH.W - 4);
      S.message = "Inworp";
    } else {
      const defending = sideIdx;           // team dat dit doel verdedigt
      if (lastTeam === defending) {
        S.stats.corners[1 - defending]++;
        const cy = S.ball.y < PITCH.W / 2 ? 4 : PITCH.W - 4;
        beginRestart("corner", 1 - defending, defending === 0 ? 6 : PITCH.L - 6, cy);
        S.message = "Hoekschop";
      } else {
        beginRestart("goalkick", defending, defending === 0 ? 60 : PITCH.L - 60, PITCH.W / 2);
        S.message = "Doeltrap";
      }
    }
  }

  function scoreGoal(team) {
    S.score[team]++;
    const scorer = S.lastTouch && S.lastTouch.team === team ? S.lastTouch : null;
    const assist = S.lastAssist && S.lastAssist.team === team && S.lastAssist !== scorer ? S.lastAssist : null;
    if (scorer) scorer.goals++;
    if (assist) assist.assists++;
    S.stats.onTarget[team]++;
    S.celebrate = {
      team: team, scorer: scorer, assist: assist,
      minute: matchMinute(), timer: 0
    };
    logEvent(team, (scorer ? scorer.name : "Eigen doelpunt") + " " + matchMinute() + "'");
    S.replay = S.recording.slice(-150);   /* ongeveer vijf seconden op halve snelheid */
    S.phase = "goal";
    S.flowTimer = 0;
    Sound.roar(1);
    Sound.whistle("short");
  }

  function logEvent(team, text) {
    S.events.push({ minute: matchMinute(), team: team, text: text });
    if (S.events.length > 60) S.events.shift();
  }

  function matchMinute() {
    const perHalf = 45;
    const t = (S.half - 1) * perHalf + (S.clock / S.halfLen) * perHalf;
    return Math.max(1, Math.min(90, Math.floor(t) + 1));
  }

  /* ---------------- Herhalingen ---------------- */
  function record() {
    S.recording.push({
      b: [S.ball.x, S.ball.y, S.ball.z],
      p: S.players.map((p) => [p.x, p.y, p.dir, p.speed])
    });
    if (S.recording.length > 400) S.recording.shift();
  }

  /* ---------------- Hoofdstap ---------------- */
  function step(input) {
    if (S.phase === "walkout") {
      S.flowTimer += STEP;
      S.players.forEach((p) => {
        p.walkT -= STEP;
        if (p.walkT > 0 || !p.target) return;
        if (dist(p, p.target) > 8) steer(p, p.target.x, p.target.y, 0.8);
        move(p);
      });
      return;
    }
    if (S.phase === "anthem") {
      S.players.forEach((p) => { p.vx *= 0.8; p.vy *= 0.8; move(p); });
      return;
    }
    if (S.phase === "goal") {
      S.flowTimer += STEP;
      S.players.forEach((p) => {
        if (S.celebrate && p.team === S.celebrate.team) {
          steer(p, S.celebrate.scorer ? S.celebrate.scorer.x : PITCH.L / 2,
                   S.celebrate.scorer ? S.celebrate.scorer.y : PITCH.W / 2, 0.8);
        } else { p.vx *= 0.9; p.vy *= 0.9; }
        move(p);
      });
      return;
    }
    if (S.phase === "halftime" || S.phase === "fulltime" || S.phase === "replay") return;

    if (S.phase === "penalty") {
      S.clock += STEP;
      stepPenalty(input && input.penaltyPress);
      S.players.forEach(move);
      record();
      return;
    }

    /* Klok loopt tijdens spel en hervattingen. */
    S.clock += STEP;
    if (S.clock >= S.halfLen && !S.addedShown) {
      /* Blessuretijd: iets langer bij veel overtredingen, kaarten en doelpunten. */
      const extra = 1 + (S.stats.fouls[0] + S.stats.fouls[1]) / 4 +
                    (S.stats.cards[0] + S.stats.cards[1]) * 0.5 + (S.score[0] + S.score[1]) * 0.6;
      S.addedMin = Math.max(1, Math.min(6, Math.round(extra)));
      S.added = (S.addedMin / 45) * S.halfLen;
      S.addedShown = true;
      S.message = "+" + S.addedMin;
    }
    if (S.clock >= S.halfLen + S.added) { endHalf(); return; }

    if (S.phase === "kickoff") {
      S.flowTimer -= STEP;
      if (S.flowTimer <= 0) { S.phase = "play"; }
    }

    if (S.phase === "restart") { updateRestart(); S.players.forEach(move); record(); return; }

    const gk0 = S.players.filter((p) => p.team === 0 && p.isGK)[0];
    const gk1 = S.players.filter((p) => p.team === 1 && p.isGK)[0];
    const acts = (input && input.actives) || [];
    const act = acts[0] || null;
    const human0 = acts.filter((a) => a && a.team === 0);
    const human1 = acts.filter((a) => a && a.team === 1);
    const chase0 = nearest(S.ball, 0, [gk0].concat(human0));
    const chase1 = nearest(S.ball, 1, [gk1].concat(human1));
    const press0 = nearest(S.ball, 0, [gk0, chase0].concat(human0).filter(Boolean));
    const press1 = nearest(S.ball, 1, [gk1, chase1].concat(human1).filter(Boolean));

    if (S.owner) { S.stats.poss[S.owner.team]++; S.passTo = null; }
    else if (S.passTo && --S.passTo.ttl <= 0) S.passTo = null;

    S.players.forEach((p) => {
      if (p.off) return;
      if (p.stun > 0) { p.stun -= STEP; p.vx *= 0.86; p.vy *= 0.86; }
      else if (acts.indexOf(p) !== -1) { /* aangestuurd door een mens, gebeurt in game.js */ }
      else if (p.isGK) goalkeeper(p);
      else if (S.owner === p) withBall(p);
      else offBall(p, p.team === 0 ? chase0 : chase1, p.team === 0 ? press0 : press1);
      move(p);
    });

    separate();
    duels();
    ballStep();
    record();
  }

  function move(p) {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.90; p.vy *= 0.90;
    p.speed = Math.hypot(p.vx, p.vy);
    p.phase += p.speed * 0.42;
    if (p.speed > 0.18) p.dir = Math.atan2(p.vy, p.vx);
    p.x = clamp(p.x, -60, PITCH.L + 60);
    p.y = clamp(p.y, -60, PITCH.W + 60);
    if (S.phase === "play" || S.phase === "restart") {
      p.x = clamp(p.x, 2, PITCH.L - 2);
      p.y = clamp(p.y, 2, PITCH.W - 2);
      p.stamina = clamp(p.stamina - (p.speed > 1.2 ? 0.00022 : -0.00016), 0.35, 1);
    }
  }

  function separate() {
    for (let i = 0; i < S.players.length; i++) {
      for (let j = i + 1; j < S.players.length; j++) {
        const a = S.players[i], b = S.players[j];
        const d = dist(a, b);
        if (d > 0 && d < 13) {
          const push = (13 - d) / 2, an = Math.atan2(b.y - a.y, b.x - a.x);
          a.x -= Math.cos(an) * push; a.y -= Math.sin(an) * push;
          b.x += Math.cos(an) * push; b.y += Math.sin(an) * push;
        }
      }
    }
  }

  function endHalf() {
    Sound.whistle(S.half === 1 ? "double" : "triple");
    if (S.half === 1) { S.phase = "halftime"; }
    else { S.phase = "fulltime"; }
  }

  function startSecondHalf() {
    S.half = 2; S.clock = 0; S.added = 0; S.addedShown = false; S.addedMin = 0;
    setKickoff(1);
  }

  function manOfTheMatch() {
    let best = null, bs = -1e9;
    S.players.forEach((p) => {
      const s = p.goals * 3 + p.assists * 1.8 + p.tackles * 0.35 + p.passes * 0.02 + p.src.rating / 40;
      if (s > bs) { bs = s; best = p; }
    });
    return best;
  }

  return {
    S: S, PITCH: PITCH, init: init, step: step,
    setupWalkout: setupWalkout, lineupReady: lineupReady, setKickoff: setKickoff,
    startSecondHalf: startSecondHalf, manOfTheMatch: manOfTheMatch,
    matchMinute: matchMinute, nearest: nearest, bestPassOption: bestPassOption,
    beginPenalty: beginPenalty, offsideAt: offsideAt, foul: foul,
    substitute: substitute, benchOf: benchOf,
    passBall: passBall, shootBall: shootBall, tryShot: tryShot, steer: steer,
    aimGoal: aimGoal, attackDir: attackDir, goalX: goalX, dist: dist, clamp: clamp
  };
})();
