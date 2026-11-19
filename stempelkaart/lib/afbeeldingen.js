/**
 * Tekent de plaatjes voor de kaart: het icoon, het logo en de strook met
 * stempels. Zonder tekenbibliotheek: elke vorm is een afstandsfunctie, en per
 * pixel wordt geteld hoeveel van een paar meetpunten binnen de vorm vallen.
 * Dat geeft zachte randen en werkt overal waar Node draait.
 */

import zlib from "node:zlib";

const GEEL = [255, 204, 0];
const ZWART = [17, 17, 16];
const GRIJS = [92, 88, 80];

/* ---------------------- Een heel klein tekenvlak ---------------------- */

function canvas(breedte, hoogte, achtergrond = null) {
  const data = Buffer.alloc(breedte * hoogte * 4);
  if (achtergrond) {
    for (let i = 0; i < breedte * hoogte; i++) {
      data[i * 4] = achtergrond[0];
      data[i * 4 + 1] = achtergrond[1];
      data[i * 4 + 2] = achtergrond[2];
      data[i * 4 + 3] = 255;
    }
  }
  return { breedte, hoogte, data };
}

/** Mengt een kleur over een pixel met dekking 0..1. */
function meng(c, x, y, kleur, dekking) {
  if (dekking <= 0) return;
  const i = (y * c.breedte + x) * 4;
  const a0 = c.data[i + 3] / 255;
  const a = dekking + a0 * (1 - dekking);
  for (let k = 0; k < 3; k++) {
    const oud = c.data[i + k] * a0 * (1 - dekking);
    c.data[i + k] = Math.round((kleur[k] * dekking + oud) / (a || 1));
  }
  c.data[i + 3] = Math.round(a * 255);
}

const MONSTERS = [0.17, 0.5, 0.83];

/**
 * Vult een vorm. `afstand(x, y)` is negatief binnen de vorm. Alleen het
 * gebied binnen het kader wordt doorlopen.
 */
function vul(c, kader, afstand, kleur) {
  const x0 = Math.max(0, Math.floor(kader[0]));
  const y0 = Math.max(0, Math.floor(kader[1]));
  const x1 = Math.min(c.breedte, Math.ceil(kader[2]));
  const y1 = Math.min(c.hoogte, Math.ceil(kader[3]));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let binnen = 0;
      for (const dy of MONSTERS)
        for (const dx of MONSTERS) if (afstand(x + dx, y + dy) <= 0) binnen++;
      meng(c, x, y, kleur, binnen / 9);
    }
  }
}

function cirkel(c, cx, cy, r, kleur) {
  vul(c, [cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], (x, y) => Math.hypot(x - cx, y - cy) - r, kleur);
}

function ring(c, cx, cy, r, dikte, kleur) {
  vul(
    c,
    [cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1],
    (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - (r - dikte / 2)) - dikte / 2,
    kleur,
  );
}

function afgerondeRechthoek(c, x0, y0, x1, y1, r, kleur) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2 - r;
  const hy = (y1 - y0) / 2 - r;
  vul(c, [x0, y0, x1, y1], (x, y) => {
    const qx = Math.abs(x - cx) - hx;
    const qy = Math.abs(y - cy) - hy;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }, kleur);
}

/** Een dikke lijn met ronde uiteinden, via een reeks punten. */
function lijn(c, punten, dikte, kleur) {
  const xs = punten.map((p) => p[0]);
  const ys = punten.map((p) => p[1]);
  const m = dikte;
  vul(c, [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m], (x, y) => {
    let d = Infinity;
    for (let i = 0; i < punten.length - 1; i++) {
      const [ax, ay] = punten[i];
      const [bx, by] = punten[i + 1];
      const vx = bx - ax, vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
      d = Math.min(d, Math.hypot(x - ax - t * vx, y - ay - t * vy));
    }
    return d - dikte / 2;
  }, kleur);
}

/** Een vinkje in een cirkel met middelpunt (cx, cy) en straal r. */
function vinkje(c, cx, cy, r, kleur) {
  lijn(
    c,
    [
      [cx - r * 0.42, cy + r * 0.02],
      [cx - r * 0.12, cy + r * 0.32],
      [cx + r * 0.44, cy - r * 0.3],
    ],
    r * 0.2,
    kleur,
  );
}

/** Een ster met vijf punten, voor het vakje van de beloning. */
function ster(c, cx, cy, r, kleur) {
  const punten = [];
  for (let i = 0; i < 10; i++) {
    const hoek = -Math.PI / 2 + (i * Math.PI) / 5;
    const straal = i % 2 === 0 ? r : r * 0.45;
    punten.push([cx + straal * Math.cos(hoek), cy + straal * Math.sin(hoek)]);
  }
  vul(c, [cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], (x, y) => {
    // Even-oneven-regel: binnen de veelhoek of niet.
    let binnen = false;
    for (let i = 0, j = punten.length - 1; i < punten.length; j = i++) {
      const [xi, yi] = punten[i];
      const [xj, yj] = punten[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
    }
    return binnen ? -1 : 1;
  }, kleur);
}

/** Het taxiblokjespatroon, als herkenbaar merkteken. */
function blokjes(c, x0, y0, grootte, rijen, kolommen, kleur) {
  for (let r = 0; r < rijen; r++)
    for (let k = 0; k < kolommen; k++)
      if ((r + k) % 2 === 0) {
        const x = x0 + k * grootte;
        const y = y0 + r * grootte;
        vul(c, [x, y, x + grootte, y + grootte], () => -1, kleur);
      }
}

/* ---------------------- PNG wegschrijven ---------------------- */

function stuk(type, inhoud) {
  const lengte = Buffer.alloc(4);
  lengte.writeUInt32BE(inhoud.length);
  const typeEnInhoud = Buffer.concat([Buffer.from(type, "ascii"), inhoud]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typeEnInhoud));
  return Buffer.concat([lengte, typeEnInhoud, crc]);
}

function naarPng(c) {
  const kop = Buffer.alloc(13);
  kop.writeUInt32BE(c.breedte, 0);
  kop.writeUInt32BE(c.hoogte, 4);
  kop[8] = 8; // bits per kanaal
  kop[9] = 6; // RGBA
  const regel = c.breedte * 4;
  const ruw = Buffer.alloc((regel + 1) * c.hoogte);
  for (let y = 0; y < c.hoogte; y++) {
    ruw[y * (regel + 1)] = 0; // geen filter
    c.data.copy(ruw, y * (regel + 1) + 1, y * regel, (y + 1) * regel);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    stuk("IHDR", kop),
    stuk("IDAT", zlib.deflateSync(ruw, { level: 9 })),
    stuk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------- De plaatjes zelf ---------------------- */

/** Vierkant icoon: zwart vlak met een geel stempel en vinkje. */
export function icoon(grootte) {
  const c = canvas(grootte, grootte);
  const s = grootte;
  afgerondeRechthoek(c, 0, 0, s, s, s * 0.22, ZWART);
  cirkel(c, s / 2, s / 2, s * 0.32, GEEL);
  vinkje(c, s / 2, s / 2, s * 0.32, ZWART);
  return naarPng(c);
}

/** Logo voor bovenaan de kaart: taxiblokjes. De naam staat er als tekst naast. */
export function logo(schaal = 1) {
  const h = 50 * schaal;
  const blok = Math.round(10 * schaal);
  const c = canvas(blok * 4, h);
  blokjes(c, 0, (h - blok * 3) / 2, blok, 3, 4, ZWART);
  return naarPng(c);
}

/** Rond logo voor Google Wallet: geel met zwarte blokjes. */
export function rondLogo(grootte = 660) {
  const c = canvas(grootte, grootte);
  const s = grootte;
  cirkel(c, s / 2, s / 2, s / 2, ZWART);
  cirkel(c, s / 2, s / 2, s * 0.47, GEEL);
  const blok = Math.round(s * 0.11);
  blokjes(c, s / 2 - blok * 2, s / 2 - blok * 1.5, blok, 3, 4, ZWART);
  return naarPng(c);
}

/**
 * De strook met stempels. Gevulde vakjes zijn geel met een vinkje, lege zijn
 * een open ring, het laatste vakje draagt een ster: daar zit de beloning.
 *
 * Standaardmaat is die van Apple voor een klantenkaart (375 x 123 punten).
 */
export function stempelStrook({ stempels, nodig, breedte = 375, hoogte = 123, schaal = 1 }) {
  const B = Math.round(breedte * schaal);
  const H = Math.round(hoogte * schaal);
  const c = canvas(B, H, ZWART);

  const rijen = nodig > 6 ? 2 : 1;
  const perRij = Math.ceil(nodig / rijen);
  const vakB = B / (perRij + 0.6);
  const vakH = H / (rijen + 0.35);
  const r = Math.min(vakB, vakH) * 0.38;
  const beginX = (B - vakB * perRij) / 2 + vakB / 2;
  const beginY = (H - vakH * rijen) / 2 + vakH / 2;

  for (let i = 0; i < nodig; i++) {
    const rij = Math.floor(i / perRij);
    const kolom = i % perRij;
    const cx = beginX + kolom * vakB;
    const cy = beginY + rij * vakH;
    const laatste = i === nodig - 1;

    if (i < stempels) {
      cirkel(c, cx, cy, r, GEEL);
      vinkje(c, cx, cy, r, ZWART);
    } else if (laatste) {
      ring(c, cx, cy, r, Math.max(2, r * 0.12), GEEL);
      ster(c, cx, cy, r * 0.55, GEEL);
    } else {
      ring(c, cx, cy, r, Math.max(2, r * 0.1), GRIJS);
    }
  }
  return naarPng(c);
}

/** Alle plaatjes die in een Apple-pas horen, in de drie schermdichtheden. */
export function applePlaatjes(stempels, nodig) {
  return {
    "icon.png": icoon(29),
    "icon@2x.png": icoon(58),
    "icon@3x.png": icoon(87),
    "logo.png": logo(1),
    "logo@2x.png": logo(2),
    "logo@3x.png": logo(3),
    "strip.png": stempelStrook({ stempels, nodig, schaal: 1 }),
    "strip@2x.png": stempelStrook({ stempels, nodig, schaal: 2 }),
    "strip@3x.png": stempelStrook({ stempels, nodig, schaal: 3 }),
  };
}

