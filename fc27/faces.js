/* Arena FC 27 — gezichten. Elke speler krijgt een eigen portret dat volledig uit
   zijn naam wordt afgeleid, dus dezelfde speler ziet er altijd hetzelfde uit.
   Het zijn getekende avatars, geen foto's. */
const Faces = (function () {
  "use strict";

  const cache = Object.create(null);

  const SKIN   = ["#f6d5b8", "#eec293", "#d9a271", "#b97c4e", "#8d5524", "#5e3618", "#facfb0", "#c68642"];
  const HAIR   = ["#1a1310", "#2b1d13", "#4a2f1b", "#6b4423", "#8d6742", "#c19a5b", "#e0c48a", "#3a3a3a", "#efefef"];
  const EYES   = ["#4a3520", "#3b2f2f", "#2f4f6f", "#3f6b4f", "#5a4632"];

  /* Stabiele pseudo-random reeks uit een tekst. */
  function rng(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h |= 0;
      return ((h >>> 0) % 100000) / 100000;
    };
  }

  function traits(key) {
    const r = rng(key);
    r(); r();
    const skin = SKIN[Math.floor(r() * SKIN.length)];
    const dark = SKIN.indexOf(skin) >= 3;
    return {
      skin: skin,
      /* Donkerder huid krijgt zwarter haar, dat oogt natuurlijker. */
      hair: dark ? HAIR[Math.floor(r() * 3)] : HAIR[Math.floor(r() * HAIR.length)],
      style: Math.floor(r() * 7),          // 0 kort 1 golvend 2 stekels 3 kaal 4 afro 5 lang 6 knot
      beard: Math.floor(r() * 4),          // 0 glad 1 stoppels 2 sik 3 vol
      eye: EYES[Math.floor(r() * EYES.length)],
      brow: r() * 0.5 + 0.75,
      jaw: r() * 0.24 + 0.88,
      nose: r() * 0.4 + 0.8,
      mouth: r() * 0.5 + 0.75,
      ear: r() * 0.3 + 0.9,
      band: r() > 0.88                     // haarband
    };
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
      Math.max(0, Math.min(255, Math.round(v + amt))));
    return "rgb(" + c.join(",") + ")";
  }

  /* Tekent een portret in een vierkant van S bij S, met de neus rond het midden. */
  function paint(ctx, S, t, kit) {
    const cx = S / 2, cy = S * 0.52, hw = S * 0.215 * t.jaw, hh = S * 0.27;

    /* Schouders en shirt */
    if (kit) {
      ctx.fillStyle = kit.shirt;
      ctx.beginPath();
      ctx.moveTo(S * 0.06, S);
      ctx.quadraticCurveTo(S * 0.30, S * 0.80, cx, S * 0.80);
      ctx.quadraticCurveTo(S * 0.70, S * 0.80, S * 0.94, S);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(kit.shirt, -28);
      ctx.fillRect(cx - S * 0.055, S * 0.79, S * 0.11, S * 0.09);
    }

    /* Nek */
    ctx.fillStyle = shade(t.skin, -26);
    ctx.fillRect(cx - S * 0.085, cy + hh * 0.55, S * 0.17, S * 0.22);

    /* Oren */
    ctx.fillStyle = t.skin;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(cx + s * hw * 1.02, cy + hh * 0.10, S * 0.032 * t.ear, S * 0.05 * t.ear, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    /* Hoofd */
    ctx.fillStyle = t.skin;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh * 0.30);
    ctx.quadraticCurveTo(cx - hw * 1.03, cy + hh * 0.52, cx, cy + hh * 0.92);
    ctx.quadraticCurveTo(cx + hw * 1.03, cy + hh * 0.52, cx + hw, cy - hh * 0.30);
    ctx.quadraticCurveTo(cx + hw * 0.92, cy - hh * 1.06, cx, cy - hh * 1.06);
    ctx.quadraticCurveTo(cx - hw * 0.92, cy - hh * 1.06, cx - hw, cy - hh * 0.30);
    ctx.closePath(); ctx.fill();

    /* Wenkbrauwen */
    ctx.strokeStyle = shade(t.hair, -14);
    ctx.lineWidth = S * 0.026; ctx.lineCap = "round";
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(cx + s * hw * 0.62, cy - hh * 0.30 * t.brow);
      ctx.lineTo(cx + s * hw * 0.20, cy - hh * 0.36 * t.brow);
      ctx.stroke();
    });

    /* Ogen */
    [-1, 1].forEach((s) => {
      ctx.fillStyle = "#fdfdfd";
      ctx.beginPath();
      ctx.ellipse(cx + s * hw * 0.42, cy - hh * 0.10, S * 0.040, S * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.eye;
      ctx.beginPath();
      ctx.arc(cx + s * hw * 0.42, cy - hh * 0.10, S * 0.019, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#10131a";
      ctx.beginPath();
      ctx.arc(cx + s * hw * 0.42, cy - hh * 0.10, S * 0.009, 0, Math.PI * 2);
      ctx.fill();
    });

    /* Neus */
    ctx.strokeStyle = shade(t.skin, -46);
    ctx.lineWidth = S * 0.017;
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.004, cy + hh * 0.02);
    ctx.lineTo(cx - S * 0.026 * t.nose, cy + hh * 0.26);
    ctx.lineTo(cx + S * 0.022 * t.nose, cy + hh * 0.26);
    ctx.stroke();

    /* Mond */
    ctx.strokeStyle = shade(t.skin, -78);
    ctx.lineWidth = S * 0.020;
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.055 * t.mouth, cy + hh * 0.50);
    ctx.quadraticCurveTo(cx, cy + hh * 0.58, cx + S * 0.055 * t.mouth, cy + hh * 0.50);
    ctx.stroke();

    /* Baard */
    if (t.beard > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy - hh * 0.30);
      ctx.quadraticCurveTo(cx - hw * 1.03, cy + hh * 0.52, cx, cy + hh * 0.92);
      ctx.quadraticCurveTo(cx + hw * 1.03, cy + hh * 0.52, cx + hw, cy - hh * 0.30);
      ctx.lineTo(cx + hw, cy + hh);
      ctx.lineTo(cx - hw, cy + hh);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = t.hair;
      ctx.globalAlpha = t.beard === 1 ? 0.28 : t.beard === 2 ? 0.85 : 0.92;
      if (t.beard === 2) {
        ctx.fillRect(cx - S * 0.045, cy + hh * 0.56, S * 0.09, hh * 0.42);
        ctx.fillRect(cx - S * 0.055, cy + hh * 0.36, S * 0.11, S * 0.022);
      } else {
        ctx.fillRect(cx - hw, cy + hh * 0.24, hw * 2, hh);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* Haar */
    ctx.fillStyle = t.hair;
    const top = cy - hh * 1.06;
    if (t.style === 3) {
      /* kaal: alleen een randje */
      ctx.beginPath();
      ctx.ellipse(cx, cy - hh * 0.34, hw * 1.0, hh * 0.62, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineWidth = S * 0.02; ctx.strokeStyle = t.hair; ctx.stroke();
    } else if (t.style === 4) {
      ctx.beginPath();
      ctx.arc(cx, cy - hh * 0.62, hw * 1.16, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy - hh * 0.52, hw * 1.16, hh * 0.62, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (t.style === 5) {
      ctx.beginPath();
      ctx.moveTo(cx - hw * 1.06, cy + hh * 0.42);
      ctx.lineTo(cx - hw * 1.06, cy - hh * 0.5);
      ctx.quadraticCurveTo(cx, top - hh * 0.16, cx + hw * 1.06, cy - hh * 0.5);
      ctx.lineTo(cx + hw * 1.06, cy + hh * 0.42);
      ctx.lineTo(cx + hw * 0.72, cy + hh * 0.42);
      ctx.lineTo(cx + hw * 0.80, cy - hh * 0.34);
      ctx.quadraticCurveTo(cx, cy - hh * 0.62, cx - hw * 0.80, cy - hh * 0.34);
      ctx.lineTo(cx - hw * 0.72, cy + hh * 0.42);
      ctx.closePath(); ctx.fill();
    } else if (t.style === 6) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - hh * 0.72, hw * 1.02, hh * 0.44, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - hh * 1.16, hw * 0.34, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.style === 2) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - hh * 0.70, hw * 1.02, hh * 0.40, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * hw * 0.28, cy - hh * 0.92);
        ctx.lineTo(cx + i * hw * 0.28 + hw * 0.06, cy - hh * 1.30);
        ctx.lineTo(cx + i * hw * 0.28 + hw * 0.16, cy - hh * 0.92);
        ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy - hh * 0.62, hw * 1.05, hh * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      if (t.style === 1) {
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(cx + i * hw * 0.42, cy - hh * 0.86, hw * 0.30, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* Inhammen */
      ctx.fillStyle = t.skin;
      ctx.beginPath();
      ctx.ellipse(cx - hw * 0.78, cy - hh * 0.60, hw * 0.22, hh * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + hw * 0.78, cy - hh * 0.60, hw * 0.22, hh * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t.band) {
      ctx.fillStyle = kit ? kit.short : "#ffffff";
      ctx.fillRect(cx - hw * 1.04, cy - hh * 0.72, hw * 2.08, S * 0.032);
    }
  }

  /* Levert een canvas met het portret; wordt gecachet per speler en formaat. */
  function get(key, size, kit) {
    const id = key + "|" + size + "|" + (kit ? kit.shirt : "-");
    if (cache[id]) return cache[id];
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    paint(ctx, size, traits(key), kit);
    cache[id] = c;
    return c;
  }

  function draw(ctx, key, x, y, size, kit) {
    ctx.drawImage(get(key, Math.max(48, Math.round(size)), kit), x, y, size, size);
  }

  return { get: get, draw: draw, traits: traits };
})();
