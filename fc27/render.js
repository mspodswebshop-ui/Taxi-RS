/* Arena FC 27 — beeld. De simulatie is plat 2D; hier wordt die geprojecteerd
   naar een cameraperspectief zoals een tv-opstelling: veraf smal, dichtbij breed. */
const View = (function () {
  "use strict";

  const CW = 1000, CH = 620;
  const HORIZON = 168, BOTTOM = 596;
  const FAR = 0.62, NEAR = 1.10, ZOOM = 1.72;

  let ctx = null, canvas = null;
  const cam = { x: PITCH.L / 2, zoom: 1, targetX: PITCH.L / 2, targetZoom: 1, shake: 0 };
  let crowdSeed = [], spin = 0;

  function attach(el) {
    canvas = el;
    canvas.width = CW; canvas.height = CH;
    ctx = canvas.getContext("2d");
    for (let i = 0; i < 900; i++) {
      crowdSeed.push([Math.random(), Math.random(), Math.random()]);
    }
  }

  const depthOf = (wy) => FAR + (NEAR - FAR) * (wy / PITCH.W);
  function project(wx, wy, wz) {
    const t = wy / PITCH.W;
    const d = FAR + (NEAR - FAR) * t;
    const sy = HORIZON + Math.pow(Math.max(0, t), 1.14) * (BOTTOM - HORIZON);
    const sx = CW / 2 + (wx - cam.x) * d * ZOOM * cam.zoom;
    return { x: sx, y: sy - (wz || 0) * d * ZOOM * cam.zoom * 0.78, d: d * cam.zoom };
  }

  function setCamera(x, zoom, snap) {
    cam.targetX = Match.clamp(x, 170, PITCH.L - 170);
    cam.targetZoom = zoom || 1;
    if (snap) { cam.x = cam.targetX; cam.zoom = cam.targetZoom; }
  }

  function updateCamera() {
    cam.x += (cam.targetX - cam.x) * 0.075;
    cam.zoom += (cam.targetZoom - cam.zoom) * 0.05;
    if (cam.shake > 0) cam.shake *= 0.88;
  }

  /* ---------------- Stadion ---------------- */
  function drawStands() {
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, CW, HORIZON + 2);

    /* Drie ringen publiek, dichterbij groter en lichter. */
    const tiers = [
      { y0: 46, y1: 96, size: 2, dim: 0.55 },
      { y0: 96, y1: 136, size: 3, dim: 0.78 },
      { y0: 136, y1: HORIZON - 14, size: 4, dim: 1.0 }
    ];
    const t = Date.now() * 0.001;
    tiers.forEach((tier, ti) => {
      const rows = Math.floor((tier.y1 - tier.y0) / tier.size);
      for (let ry = 0; ry < rows; ry++) {
        const y = tier.y0 + ry * tier.size;
        const cols = Math.ceil(CW / tier.size) + 2;
        for (let cx = 0; cx < cols; cx++) {
          const idx = (ti * 977 + ry * 131 + cx * 17) % crowdSeed.length;
          const s = crowdSeed[idx];
          const x = ((cx * tier.size) - (cam.x * 0.07 * (ti + 1)) % CW + CW) % (CW + tier.size) - tier.size;
          const shade = Math.floor((34 + s[2] * 105) * tier.dim);
          if (s[0] > 0.94) ctx.fillStyle = "rgba(255,140,30," + (0.5 * tier.dim) + ")";
          else if (s[0] > 0.88) ctx.fillStyle = "rgba(90,140,255," + (0.45 * tier.dim) + ")";
          else ctx.fillStyle = "rgb(" + shade + "," + (shade + 6) + "," + (shade + 18) + ")";
          ctx.fillRect(x, y, tier.size - 0.6, tier.size - 0.6);
          if (s[1] > 0.997 && Math.sin(t * 9 + idx) > 0.9) {
            ctx.fillStyle = "rgba(255,255,255,.9)";
            ctx.fillRect(x - 1, y - 1, tier.size + 1, tier.size + 1);
          }
        }
      }
    });

    /* Lichtmasten boven de tribune */
    [0.16, 0.84].forEach((f) => {
      const x = CW * f;
      ctx.fillStyle = "#0a0f1c";
      ctx.fillRect(x - 3, 8, 6, 46);
      ctx.fillStyle = "#141d33";
      ctx.fillRect(x - 30, 2, 60, 16);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = "#fdfbe8";
          ctx.fillRect(x - 26 + i * 11, 4 + j * 7, 8, 5);
        }
      }
      const glow = ctx.createRadialGradient(x, 12, 4, x, 12, 150);
      glow.addColorStop(0, "rgba(255,252,220,.30)");
      glow.addColorStop(1, "rgba(255,252,220,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 150, -40, 300, 200);
    });

    /* Dak met steunbalken */
    ctx.fillStyle = "#05080f";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(CW, 0); ctx.lineTo(CW, 40); ctx.lineTo(0, 48); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,160,255,.10)"; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const x = (CW / 9) * i;
      ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 46); ctx.stroke();
    }

    /* Reclameborden net boven de verre zijlijn */
    const left = project(-320, 0, 0), right = project(PITCH.L + 320, 0, 0);
    ctx.fillStyle = "#0c1730";
    ctx.fillRect(left.x, HORIZON - 20, right.x - left.x, 20);
    ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 1;
    ctx.strokeRect(left.x, HORIZON - 20, right.x - left.x, 20);
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const span = (right.x - left.x) / 22;
    for (let i = 0; i < 22; i++) {
      const bx = left.x + span * (i + 0.5);
      if (bx < -60 || bx > CW + 60) continue;
      ctx.fillStyle = i % 2 ? "rgba(0,255,178,.62)" : "rgba(120,160,255,.55)";
      ctx.fillText(i % 2 ? "ARENA FC 27" : "SPEEL MEE", bx, HORIZON - 10);
    }
  }

  /* ---------------- Veld ---------------- */
  function fillQuad(p1, p2, p3, p4, style) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  function line(x1, y1, x2, y2, w, style) {
    const a = project(x1, y1, 0), b = project(x2, y2, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineWidth = (w || 2) * ((a.d + b.d) / 2);
    ctx.strokeStyle = style || "rgba(255,255,255,.72)";
    ctx.stroke();
  }

  function rect(x, y, w, h) {
    line(x, y, x + w, y); line(x + w, y, x + w, y + h);
    line(x + w, y + h, x, y + h); line(x, y + h, x, y);
  }

  function drawPitch() {
    /* Egale mat rondom het veld, eerst, zodat de tribune erboven blijft staan. */
    ctx.fillStyle = "#0b3a20";
    ctx.fillRect(0, HORIZON, CW, CH - HORIZON);

    /* Maaibanen in de lengte */
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const x0 = (PITCH.L / bands) * i, x1 = (PITCH.L / bands) * (i + 1);
      fillQuad(project(x0, 0, 0), project(x1, 0, 0), project(x1, PITCH.W, 0), project(x0, PITCH.W, 0),
        i % 2 ? "#186b3a" : "#146032");
    }
    /* Lichtbundels van de masten over het gras */
    [0.30, 0.70].forEach((f) => {
      const cxs = CW * f;
      const g2 = ctx.createRadialGradient(cxs, HORIZON + 40, 20, cxs, HORIZON + 120, 420);
      g2.addColorStop(0, "rgba(255,250,220,.10)");
      g2.addColorStop(1, "rgba(255,250,220,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, HORIZON, CW, CH - HORIZON);
    });

    rect(0, 0, PITCH.L, PITCH.W);
    line(PITCH.L / 2, 0, PITCH.L / 2, PITCH.W);

    /* Middencirkel */
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const p = project(PITCH.L / 2 + Math.cos(ang) * PITCH.CIRCLE, PITCH.W / 2 + Math.sin(ang) * PITCH.CIRCLE, 0);
      a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.72)"; ctx.stroke();

    [0, 1].forEach((side) => {
      const x0 = side ? PITCH.L - PITCH.PEN_D : 0;
      rect(x0, (PITCH.W - PITCH.PEN_W) / 2, PITCH.PEN_D, PITCH.PEN_W);
      const s0 = side ? PITCH.L - PITCH.SIX_D : 0;
      rect(s0, (PITCH.W - PITCH.SIX_W) / 2, PITCH.SIX_D, PITCH.SIX_W);
      const sp = project(side ? PITCH.L - PITCH.SPOT : PITCH.SPOT, PITCH.W / 2, 0);
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.2 * sp.d, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fill();
    });
  }

  function drawGoals(front) {
    [0, 1].forEach((side) => {
      const gx = side ? PITCH.L : 0;
      const y1 = PITCH.W / 2 - PITCH.GOAL_W / 2, y2 = PITCH.W / 2 + PITCH.GOAL_W / 2;
      const near = (y1 + y2) / 2;
      /* Verre paal eerst, nabije paal ná de spelers, zodat het net klopt. */
      const isFront = front === true;
      const posts = [[y1, false], [y2, true]];
      posts.forEach(([y, isNear]) => {
        if (isNear !== isFront) return;
        const b = project(gx, y, 0), t = project(gx, y, PITCH.GOAL_H);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y);
        ctx.lineWidth = 3.4 * b.d; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      });
      if (isFront) return;
      const t1 = project(gx, y1, PITCH.GOAL_H), t2 = project(gx, y2, PITCH.GOAL_H);
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y);
      ctx.lineWidth = 3.2 * t1.d; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      /* Net */
      ctx.strokeStyle = "rgba(255,255,255,.20)"; ctx.lineWidth = 1;
      const back = side ? gx + 22 : gx - 22;
      for (let i = 0; i <= 8; i++) {
        const y = y1 + ((y2 - y1) / 8) * i;
        const a = project(gx, y, PITCH.GOAL_H), b = project(back, y, PITCH.GOAL_H - 6);
        const c = project(gx, y, 0), d = project(back, y, 0);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      }
    });
  }

  /* ---------------- Spelers ---------------- */
  function drawPlayer(p, kit, marker) {
    const g = project(p.x, p.y, 0);
    if (g.x < -80 || g.x > CW + 80) return;
    const s = g.d * ZOOM * 0.62;
    const run = Math.sin(p.phase) * Math.min(1, p.speed * 1.3);
    const lean = Math.cos(p.dir) * 1.6;

    ctx.save();
    ctx.translate(g.x, g.y);

    /* Schaduw */
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.4 * s, 2.6 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.34)"; ctx.fill();

    if (marker) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * s, 3.8 * s, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.3 * s; ctx.strokeStyle = marker.color; ctx.stroke();
    }

    /* Benen */
    ctx.strokeStyle = "#e8c9a4"; ctx.lineWidth = 2.1 * s; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-1.4 * s, -7 * s); ctx.lineTo(-1.4 * s + run * 3 * s, -0.6 * s);
    ctx.moveTo(1.4 * s, -7 * s); ctx.lineTo(1.4 * s - run * 3 * s, -0.6 * s);
    ctx.stroke();
    /* Sokken */
    ctx.strokeStyle = kit.sock; ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(-1.4 * s + run * 2.2 * s, -2.6 * s); ctx.lineTo(-1.4 * s + run * 3 * s, -0.4 * s);
    ctx.moveTo(1.4 * s - run * 2.2 * s, -2.6 * s); ctx.lineTo(1.4 * s - run * 3 * s, -0.4 * s);
    ctx.stroke();
    /* Broek */
    ctx.fillStyle = kit.short;
    ctx.fillRect(-3.1 * s, -10.5 * s, 6.2 * s, 4.2 * s);
    /* Shirt, met mouwen in de tweede kleur en eventueel strepen */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-3.4 * s + lean * s * 0.2, -10.5 * s);
    ctx.lineTo(-3.9 * s + lean * s * 0.3, -17.5 * s);
    ctx.lineTo(3.9 * s + lean * s * 0.3, -17.5 * s);
    ctx.lineTo(3.4 * s + lean * s * 0.2, -10.5 * s);
    ctx.closePath();
    ctx.fillStyle = kit.shirt; ctx.fill();
    ctx.clip();
    if (kit.streep) {
      ctx.fillStyle = kit.sock;
      for (let i = -2; i <= 2; i += 2) ctx.fillRect(i * 1.55 * s, -18 * s, 1.45 * s, 9 * s);
    }
    ctx.fillStyle = kit.short;
    ctx.fillRect(-4.2 * s, -17.6 * s, 1.5 * s, 8 * s);
    ctx.fillRect(2.7 * s, -17.6 * s, 1.5 * s, 8 * s);
    ctx.restore();
    /* Armen */
    ctx.strokeStyle = "#e8c9a4"; ctx.lineWidth = 1.7 * s;
    ctx.beginPath();
    ctx.moveTo(-3.7 * s, -16.6 * s); ctx.lineTo(-5.2 * s - run * 1.6 * s, -11.6 * s);
    ctx.moveTo(3.7 * s, -16.6 * s); ctx.lineTo(5.2 * s + run * 1.6 * s, -11.6 * s);
    ctx.stroke();
    /* Rugnummer, alleen groot genoeg om leesbaar te zijn */
    if (s > 0.95) {
      ctx.fillStyle = kit.num;
      ctx.font = "bold " + (4.6 * s).toFixed(1) + "px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(p.number), 0, -14 * s);
    }
    /* Hoofd */
    ctx.beginPath();
    ctx.arc(lean * s * 0.4, -20 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#e8c9a4"; ctx.fill();
    ctx.beginPath();
    ctx.arc(lean * s * 0.4, -21.2 * s, 2.6 * s, Math.PI, Math.PI * 2);
    ctx.fillStyle = "#2b1c12"; ctx.fill();

    if (p.card === 1) { ctx.fillStyle = "#ffd400"; ctx.fillRect(5.5 * s, -20 * s, 2.4 * s, 3.4 * s); }

    ctx.restore();

    if (marker) {
      /* Driehoek boven het hoofd, met de naam er klein boven. */
      /* De tweede speler krijgt zijn naam hoger, anders lopen ze over elkaar heen. */
      const lift = (marker.lift || 0) * Math.max(11, 13 * s);
      const tipY = g.y - 25 * s - lift, size = Math.max(6.5, 4.8 * s);
      ctx.beginPath();
      ctx.moveTo(g.x, tipY);
      ctx.lineTo(g.x - size, tipY - size * 1.35);
      ctx.lineTo(g.x + size, tipY - size * 1.35);
      ctx.closePath();
      ctx.fillStyle = marker.color;
      ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.stroke();

      const fs = Math.max(9, Math.min(13, 10.5 * g.d));
      ctx.font = "bold " + fs.toFixed(1) + "px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(0,0,0,.75)";
      ctx.strokeText(marker.label, g.x, tipY - size * 1.35 - 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(marker.label, g.x, tipY - size * 1.35 - 3);
    }
  }

  function drawBall(b) {
    const shadow = project(b.x, b.y, 0);
    const p = project(b.x, b.y, b.z);
    const s = p.d * ZOOM;
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, 2.6 * s, 1.2 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0," + (0.34 - Math.min(0.2, b.z / 160)) + ")";
    ctx.fill();
    const rr = 2.6 * s;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.lineWidth = 0.8 * s; ctx.strokeStyle = "#20242c"; ctx.stroke();
    /* De bal draait mee met de afgelegde weg. */
    spin += Math.hypot(b.vx || 0, b.vy || 0) * 0.09;
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#23272f";
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * rr * 0.62, p.y + Math.sin(a) * rr * 0.62, rr * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* Richtkruis bij een strafschop, geprojecteerd op de doelmond. */
  function drawPenaltyAim(pen) {
    if (!pen || (pen.stage !== "richten" && pen.stage !== "hoogte")) return;
    const y1 = PITCH.W / 2 - PITCH.GOAL_W / 2;
    const ty = y1 + pen.aim * PITCH.GOAL_W;
    const tz = pen.hoogte * (PITCH.GOAL_H + 6);
    const p = project(pen.gx, ty, tz);

    /* Doelmond aftekenen */
    const a = project(pen.gx, y1, 0), b = project(pen.gx, y1 + PITCH.GOAL_W, 0);
    const at = project(pen.gx, y1, PITCH.GOAL_H), bt = project(pen.gx, y1 + PITCH.GOAL_W, PITCH.GOAL_H);
    ctx.strokeStyle = "rgba(0,255,178,.35)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(at.x, at.y); ctx.lineTo(bt.x, bt.y); ctx.lineTo(b.x, b.y);
    ctx.stroke();

    const r = 13;
    ctx.strokeStyle = pen.stage === "hoogte" ? "#ffd400" : "#00ffb2";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - r - 7, p.y); ctx.lineTo(p.x - 4, p.y);
    ctx.moveTo(p.x + 4, p.y); ctx.lineTo(p.x + r + 7, p.y);
    ctx.moveTo(p.x, p.y - r - 7); ctx.lineTo(p.x, p.y - 4);
    ctx.moveTo(p.x, p.y + 4); ctx.lineTo(p.x, p.y + r + 7);
    ctx.stroke();

    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 3;
    const tekst = pen.stage === "richten" ? "richting — druk op schieten" : "hoogte — druk op schieten";
    ctx.strokeText(tekst, p.x, p.y - r - 14);
    ctx.fillText(tekst, p.x, p.y - r - 14);
  }

  /* ---------------- Frame ---------------- */
  function frame(S, opts) {
    updateCamera();
    ctx.clearRect(0, 0, CW, CH);
    ctx.save();
    if (cam.shake > 0.2) ctx.translate((Math.random() - 0.5) * cam.shake, (Math.random() - 0.5) * cam.shake);

    drawStands();
    drawPitch();
    drawGoals(false);

    const marks = (opts && opts.markers) || [];
    const order = S.players.slice().sort((a, b) => a.y - b.y);
    order.forEach((p) => {
      if (p.off) return;                     // rode kaart: van het veld
      const team = S.teams[p.team];
      const kit = p.isGK ? team.gkKit : team.kit;
      const m = marks.filter((x) => x && x.player === p)[0];
      drawPlayer(p, kit, m || null);
    });

    drawBall(S.ball);
    drawGoals(true);
    if (S.phase === "penalty") drawPenaltyAim(S.pen);

    ctx.restore();
  }

  /* Herhaling: dezelfde tekenroutine, maar met opgenomen posities. */
  function replayFrame(S, snap, activeIdx) {
    updateCamera();
    ctx.clearRect(0, 0, CW, CH);
    drawStands();
    drawPitch();
    drawGoals(false);
    const list = S.players.map((p, i) => ({
      p: p, x: snap.p[i][0], y: snap.p[i][1], dir: snap.p[i][2], speed: snap.p[i][3]
    })).sort((a, b) => a.y - b.y);
    list.forEach((e) => {
      const ghost = Object.assign({}, e.p, { x: e.x, y: e.y, dir: e.dir, speed: e.speed, phase: e.p.phase });
      const team = S.teams[e.p.team];
      drawPlayer(ghost, e.p.isGK ? team.gkKit : team.kit, null);
    });
    drawBall({ x: snap.b[0], y: snap.b[1], z: snap.b[2] });
    drawGoals(true);
  }

  return {
    attach: attach, frame: frame, replayFrame: replayFrame,
    setCamera: setCamera, cam: cam, project: project, size: { w: CW, h: CH },
    shake: (v) => { cam.shake = v; }
  };
})();
