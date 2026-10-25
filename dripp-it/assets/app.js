/* Dripp It — gedeelde code voor alle pagina's.
   Elke pagina heeft een <main data-page="..."> en laadt dit bestand onderaan.

   FOTO'S TOEVOEGEN
   Zet je foto's in assets/img/ en geef een product een lijst `images`, bijvoorbeeld:
     images: ['assets/img/aurum-1.jpg', 'assets/img/aurum-2.jpg']
   De eerste foto verschijnt op de productkaart, alle foto's in de galerij op de
   productpagina. Zonder `images` toont de site een getekende illustratie.
   Categorieën krijgen een foto via CATS.<categorie>.img. Beste formaat: staand 4:5. */
(() => {
  'use strict';

  /* ---------- Merkgegevens (pas hier aan) ---------- */
  const BRAND = {
    name: 'Dripp It',
    email: 'hallo@drippit.nl',
    city: 'België',
    /* Wettelijk verplicht op een Belgische webshop: vul in zodra je ze hebt. */
    legal: {
      company: 'Dripp It',
      enterpriseNumber: '',   /* bijvoorbeeld 'BE 0123.456.789' */
      address: ''             /* straat, nummer, postcode en gemeente */
    },
    vatNote: 'Btw niet van toepassing – bijzondere vrijstellingsregeling kleine ondernemingen'
  };
  const PAY_METHODS = ['Bancontact', 'Visa', 'Mastercard', 'Apple Pay', 'Google Pay'];
  const payChips = () => PAY_METHODS.map(m => `<span>${m}</span>`).join('');

  /* ---------- Catalogus (uit assets/catalog.js) ---------- */
  const { SHOP, CATS, PRODUCTS } = window.DRIPP_CATALOG;
  const CAT_KEYS = Object.keys(CATS);
  const byId = id => PRODUCTS.find(p => p.id === id);
  const inCat = key => PRODUCTS.filter(p => p.cat === key);

  const LOOKS = [
    { name: 'Avondgoud', main: 'aurum', acc: 'droplet', with: ['aurum', 'droplet', 'aurelia'] },
    { name: 'Onyx op onyx', main: 'molten', acc: 'halo', with: ['molten', 'pour', 'halo'] },
    { name: 'Nocturne', main: 'nocturne', acc: 'aurelia', with: ['nocturne', 'lumen', 'aurelia'] },
    { name: 'Wijnrood', main: 'bordeaux', acc: 'halo-anc', with: ['bordeaux', 'drop', 'halo-anc'] }
  ];

  /* ---------- Hulpjes ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = (n, dec) => new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: dec ?? (Number.isInteger(n) ? 0 : 2),
    maximumFractionDigits: dec ?? 2
  }).format(n);
  const pad = n => String(n).padStart(3, '0');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const isClothing = p => p.cat === 'dames' || p.cat === 'heren';

  /* ---------- SVG: gedeelde definities en logo ---------- */
  const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F3E1B0"/><stop offset=".45" stop-color="#CFAE6E"/>
      <stop offset=".75" stop-color="#8A6A35"/><stop offset="1" stop-color="#D9BC80"/>
    </linearGradient>
    <linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6E6BA"/><stop offset=".55" stop-color="#CFAE6E"/><stop offset="1" stop-color="#7E6030"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".3"/>
    </linearGradient>
    <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>
      <stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/>
    </linearGradient>
    <radialGradient id="dropShine" cx=".35" cy=".35" r=".6">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <symbol id="mark" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#gold)" stroke-width="1.6"/>
      <path d="M50 14 C50 14 27 44 27 60 A23 23 0 0 0 73 60 C73 44 50 14 50 14 Z" fill="url(#gold)"/>
      <path d="M42 50 H50.5 C58 50 62.5 55 62.5 62 C62.5 69 58 74 50.5 74 H42 Z M46.5 53.6 V70.4 H50 C55.3 70.4 57.9 67 57.9 62 C57.9 57 55.3 53.6 50 53.6 Z" fill="#140F0A" fill-rule="evenodd"/>
    </symbol>
    <symbol id="drop" viewBox="0 0 20 30">
      <path d="M10 0 C10 0 2 12 2 20 A8 8 0 0 0 18 20 C18 12 10 0 10 0 Z" fill="url(#goldV)"/>
      <ellipse cx="7.4" cy="19" rx="2" ry="3.2" fill="#fff" fill-opacity=".35"/>
    </symbol>
  </defs>
</svg>`;

  const markSvg = size => `<svg aria-hidden="true" style="width:${size}px;height:${size}px"><use href="#mark"/></svg>`;
  const dropSvg = cls => `<svg class="${cls || ''}" viewBox="0 0 20 30" aria-hidden="true"><use href="#drop"/></svg>`;
  const ICONS = {
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M4.5 8.5h15l-1.2 12h-12.6z"/><path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 12h15M14 6l6 6-6 6"/></svg>'
  };

  /* Zegel: logo in een ring met tekst eromheen */
  const seal = () => `
<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs><path id="sealRing" d="M100 100 m-79 0 a79 79 0 1 1 158 0 a79 79 0 1 1 -158 0"/></defs>
  <circle cx="100" cy="100" r="97" fill="none" stroke="url(#gold)" stroke-width=".8"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#gold)" stroke-width=".4" stroke-dasharray="1 3"/>
  <circle cx="100" cy="100" r="64" fill="none" stroke="url(#gold)" stroke-width=".6"/>
  <g class="spin">
    <text font-family="DM Mono, ui-monospace, monospace" font-size="10.4" letter-spacing="5.4" fill="url(#gold)">
      <textPath href="#sealRing">DRIPP IT · MAISON · ${BRAND.city.toUpperCase()} · EST. 2026 · </textPath>
    </text>
  </g>
  <use href="#mark" x="50" y="50" width="100" height="100"/>
</svg>`;

  /* ---------- SVG: illustraties van de producten (tot er foto's zijn) ---------- */
  const drip = (x, y, s) =>
    `<path d="M${x} ${y} C${x} ${y} ${x - 4 * s} ${y + 8 * s} ${x - 4 * s} ${y + 12 * s} A${4 * s} ${4 * s} 0 0 0 ${x + 4 * s} ${y + 12 * s} C${x + 4 * s} ${y + 8 * s} ${x} ${y} ${x} ${y} Z" fill="url(#goldV)"/>` +
    `<ellipse cx="${x - 1.4 * s}" cy="${y + 11 * s}" rx="${1 * s}" ry="${1.6 * s}" fill="#fff" fill-opacity=".35"/>`;
  const bigDrop = (x, y, s) =>
    `<path d="M${x} ${y} C${x} ${y} ${x - 10 * s} ${y + 14 * s} ${x - 10 * s} ${y + 22 * s} A${10 * s} ${10 * s} 0 0 0 ${x + 10 * s} ${y + 22 * s} C${x + 10 * s} ${y + 14 * s} ${x} ${y} ${x} ${y} Z" fill="url(#goldV)"/>` +
    `<ellipse cx="${x - 3.5 * s}" cy="${y + 20 * s}" rx="${2.4 * s}" ry="${4 * s}" fill="#fff" fill-opacity=".3"/>`;
  const SEAM = 'stroke="rgba(255,255,255,.13)" stroke-width="1" fill="none"';
  const DARK = 'rgba(0,0,0,.32)';
  const INK = '#141012';
  /* Een vlak in de productkleur met licht en schaduw erover */
  const solid = (tag, attrs, c) =>
    `<${tag} ${attrs} fill="${c}"/><${tag} ${attrs} fill="url(#side)"/><${tag} ${attrs} fill="url(#shade)"/>`;

  const SHAPES = {
    hoodie: {
      d: 'M68 44 Q74 16 100 14 Q126 16 132 44 L170 62 L182 176 L158 180 L148 92 L146 206 L54 206 L52 92 L42 180 L18 176 L30 62 Z',
      extra: () => `
        <path d="M82 40 Q100 68 118 40 Q112 24 100 24 Q88 24 82 40 Z" fill="${DARK}"/>
        <path d="M72 148 H128 L122 182 H78 Z" ${SEAM}/>
        <path d="M54 196 H146 M20 168 L42 170 M158 170 L180 168" stroke="${DARK}" stroke-width="6"/>
        <path d="M94 54 L92 88 M106 54 L108 88" stroke="url(#goldV)" stroke-width="1.6"/>
        <circle cx="92" cy="90" r="2.2" fill="url(#gold)"/><circle cx="108" cy="90" r="2.2" fill="url(#gold)"/>`,
      drips: [[78, 1], [100, 1.5], [124, .9]], y: 206, zoom: '50 150 100 112'
    },
    tee: {
      d: 'M62 26 L86 18 Q100 32 114 18 L138 26 L174 56 L154 82 L140 72 L140 200 L60 200 L60 72 L46 82 L26 56 Z',
      extra: () => `
        <path d="M86 18 Q100 32 114 18" stroke="${DARK}" stroke-width="5" fill="none"/>
        <path d="M60 72 L60 200 M140 72 L140 200" ${SEAM}/>
        ${bigDrop(100, 92, .8)}`,
      drips: [[84, 1.1], [116, .8]], y: 200, zoom: '64 74 72 81'
    },
    jacket: {
      d: 'M64 24 L88 16 L100 30 L112 16 L136 24 L170 50 L184 182 L160 186 L146 84 L144 196 L56 196 L54 84 L40 186 L16 182 L30 50 Z',
      extra: () => `
        <path d="M88 16 L100 30 L112 16" fill="none" stroke="${DARK}" stroke-width="7"/>
        <path d="M100 30 V196" stroke="url(#goldV)" stroke-width="2.4"/>
        <rect x="97" y="58" width="6" height="12" rx="1.5" fill="url(#gold)"/>
        <path d="M56 188 H144 M18 176 L40 178 M160 178 L182 176" stroke="${DARK}" stroke-width="10"/>
        <path d="M66 112 L80 136 M134 112 L120 136" ${SEAM}/>`,
      drips: [[70, .9], [130, 1.3]], y: 196, zoom: '58 140 100 112'
    },
    pants: {
      d: 'M64 16 H136 L150 204 H112 L100 76 L88 204 H50 Z',
      extra: () => `
        <path d="M64 16 H136 V30 H64 Z" fill="${DARK}"/>
        <path d="M96 30 L94 46 M104 30 L106 46" stroke="url(#goldV)" stroke-width="1.4"/>
        <path d="M58 104 H82 V138 H60 Z M142 104 H118 V138 H140 Z M58 112 H82 M142 112 H118" ${SEAM}/>
        <path d="M52 196 H88 M112 196 H148" stroke="${DARK}" stroke-width="5"/>`,
      drips: [[68, 1.2], [132, 1]], y: 204, zoom: '44 150 112 125'
    },
    shirt: {
      d: 'M64 26 L88 18 L100 26 L112 18 L136 26 L170 50 L182 178 L158 182 L148 86 L146 204 L54 204 L52 86 L42 182 L18 178 L30 50 Z',
      extra: () => `
        <path d="M88 18 L100 26 L95 46 Z M112 18 L100 26 L105 46 Z" fill="${DARK}"/>
        <path d="M100 30 V204" ${SEAM}/>
        ${[52, 82, 112, 142, 172].map(y => `<circle cx="100" cy="${y}" r="3" fill="url(#gold)"/>`).join('')}
        <path d="M64 70 H90 V98 H64 Z M110 70 H136 V98 H110 Z" ${SEAM}/>
        <path d="M64 70 H90 V78 H64 Z M110 70 H136 V78 H110 Z" fill="${DARK}"/>`,
      drips: [[76, 1], [124, 1.2]], y: 204, zoom: '50 40 100 112'
    },
    dress: {
      d: 'M80 72 Q100 84 120 72 L126 80 Q132 132 160 208 Q100 220 40 208 Q68 132 74 80 Z',
      extra: c => `
        <path d="M84 20 L84 74 M116 20 L116 74" stroke="${c}" stroke-width="2.6"/>
        <path d="M84 20 L84 74 M116 20 L116 74" stroke="rgba(0,0,0,.2)" stroke-width="2.6"/>
        <path d="M80 72 Q100 84 120 72" stroke="url(#gold)" stroke-width="1.2" fill="none"/>
        <path d="M92 104 Q86 150 72 206 M108 104 Q114 150 128 206 M100 112 V214" ${SEAM}/>
        ${bigDrop(100, 82, .42)}`,
      drips: [[70, .9], [128, 1.2]], y: 211, zoom: '60 52 80 92'
    },
    blazer: {
      d: 'M62 26 L86 18 L100 62 L114 18 L138 26 L170 50 L182 182 L158 186 L148 86 L148 206 L52 206 L52 86 L42 186 L18 182 L30 50 Z',
      extra: () => `
        <path d="M86 18 Q100 26 114 18 L100 62 Z" fill="${INK}"/>
        <path d="M86 18 L100 62 L82 56 L74 30 Z M114 18 L100 62 L118 56 L126 30 Z" fill="${DARK}"/>
        <path d="M100 62 V206" ${SEAM}/>
        <circle cx="104" cy="122" r="3.4" fill="url(#gold)"/><circle cx="104" cy="148" r="3.4" fill="url(#gold)"/>
        <path d="M60 152 H86 M114 152 H140" stroke="${DARK}" stroke-width="3"/>
        <path d="M20 174 L42 176 M158 176 L180 174" ${SEAM}/>`,
      drips: [[66, 1], [134, .8]], y: 206, zoom: '56 20 88 101'
    },
    top: {
      d: 'M70 42 L80 42 Q100 70 120 42 L130 42 Q142 60 144 80 L148 178 Q100 190 52 178 L56 80 Q58 60 70 42 Z',
      extra: c => `
        <path d="M80 16 L80 42 M120 16 L120 42" stroke="${c}" stroke-width="2.4"/>
        <path d="M80 16 L80 42 M120 16 L120 42" stroke="rgba(0,0,0,.2)" stroke-width="2.4"/>
        <path d="M80 42 Q100 70 120 42" stroke="url(#gold)" stroke-width="1.4" fill="none"/>
        <path d="M84 96 Q80 140 70 182 M116 96 Q120 140 130 182" ${SEAM}/>
        ${bigDrop(100, 70, .38)}`,
      drips: [[76, .9], [120, 1.1]], y: 182, zoom: '60 30 80 92'
    },
    skirt: {
      d: 'M66 46 H134 L164 200 Q100 212 36 200 Z',
      extra: c => `
        <rect x="64" y="30" width="72" height="17" fill="${c}"/><rect x="64" y="30" width="72" height="17" fill="${DARK}"/>
        ${Array.from({ length: 7 }, (_, i) => { const k = i + 1; return `<path d="M${66 + k * 8.5} 47 L${36 + k * 16} ${201 + (k > 3 && k < 5 ? 4 : 2)}" stroke="rgba(0,0,0,.22)" stroke-width="1.2"/>`; }).join('')}
        <use href="#drop" x="95" y="32" width="9" height="13.5"/>`,
      drips: [[60, 1], [140, 1.2]], y: 203, zoom: '40 100 120 138'
    },
    cap: {
      d: 'M38 128 Q36 62 100 58 Q162 62 162 128 Z',
      extra: c => `
        <path d="M38 128 Q110 116 188 134 Q160 152 40 140 Z" fill="${c}"/>
        <path d="M38 128 Q110 116 188 134 Q160 152 40 140 Z" fill="${DARK}"/>
        <path d="M100 58 V128 M70 64 Q60 92 62 128 M130 64 Q140 92 138 128" ${SEAM}/>
        <circle cx="100" cy="60" r="4.5" fill="url(#gold)"/>
        ${bigDrop(100, 80, .85)}`,
      drips: [[124, 1.1]], y: 142, zoom: '64 62 72 81'
    },
    bag: {
      d: 'M44 70 H156 L166 196 H34 Z',
      extra: () => `
        <path d="M72 72 Q72 28 100 28 Q128 28 128 72" fill="none" stroke="url(#goldV)" stroke-width="5"/>
        <path d="M44 70 H156 L151 104 H49 Z" fill="${DARK}"/>
        <rect x="91" y="98" width="18" height="13" rx="2" fill="url(#gold)"/>
        <path d="M48 74 H152 L161 192 H39 Z" stroke="rgba(255,255,255,.14)" stroke-width="1" stroke-dasharray="2 3" fill="none"/>`,
      drips: [[64, 1], [100, 1.4], [138, .8]], y: 196, zoom: '60 70 80 92'
    },
    pendant: {
      d: '',
      extra: () => `
        <path d="M34 20 Q100 160 166 20" fill="none" stroke="url(#goldV)" stroke-width="2.2" stroke-dasharray="3.5 1.6"/>
        <circle cx="100" cy="91" r="5" fill="none" stroke="url(#gold)" stroke-width="2.4"/>
        <path d="M100 98 C100 98 74 134 74 152 A26 26 0 0 0 126 152 C126 134 100 98 100 98 Z" fill="url(#goldV)"/>
        <path d="M100 98 C100 98 74 134 74 152 A26 26 0 0 0 126 152 C126 134 100 98 100 98 Z" fill="url(#dropShine)"/>
        <ellipse cx="90" cy="148" rx="4" ry="8" fill="#fff" fill-opacity=".35"/>`,
      drips: [], y: 0, zoom: '64 84 72 83'
    },
    sneaker: {
      d: 'M34 150 L36 120 Q38 104 56 102 L84 100 Q96 98 104 88 Q112 80 124 82 L134 86 Q142 106 160 116 L176 124 Q190 132 188 150 Z',
      extra: () => `
        <path d="M150 113 Q182 120 188 150 H150 Z" fill="rgba(0,0,0,.06)"/>
        <path d="M36 116 Q40 100 58 100 Q80 98 102 90" stroke="rgba(0,0,0,.28)" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M104 92 L140 116" stroke="rgba(0,0,0,.14)" stroke-width="10" stroke-linecap="round"/>
        ${[0, 1, 2, 3].map(i => `<path d="M${104 + i * 9} ${88 + i * 6} l7 9" stroke="#F6F1E8" stroke-width="2.4" stroke-linecap="round"/><path d="M${104 + i * 9} ${88 + i * 6} l7 9" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`).join('')}
        <path d="M28 148 H192 Q194 166 176 168 H38 Q26 166 28 148 Z" fill="#E2D9CA"/>
        <path d="M28 148 H192 Q194 166 176 168 H38 Q26 166 28 148 Z" fill="url(#shade)"/>
        <path d="M30 156 H192" stroke="url(#gold)" stroke-width="1.2"/>
        <path d="M34 150 L36 118 Q36 110 44 108 L48 150 Z" fill="url(#gold)"/>
        <g transform="rotate(-78 96 130)">${bigDrop(96, 114, .7)}</g>`,
      drips: [[66, .8], [156, 1]], y: 168, zoom: '20 80 100 115'
    },
    loafer: {
      d: 'M32 150 Q30 124 58 120 L100 116 Q132 112 160 126 Q188 138 188 152 Z',
      extra: () => `
        <path d="M58 120 Q90 130 122 118" stroke="rgba(0,0,0,.4)" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M112 122 Q128 110 146 124" stroke="url(#gold)" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="112" cy="123" r="3.4" fill="url(#gold)"/><circle cx="146" cy="125" r="3.4" fill="url(#gold)"/>
        <path d="M120 126 Q150 128 182 146" ${SEAM}/>
        <path d="M26 150 H192 Q193 162 180 164 H36 Q26 162 26 150 Z" fill="#0E0A0C"/>
        <path d="M30 151 H190" stroke="url(#gold)" stroke-width="1"/>
        <path d="M30 162 H62 V172 H32 Z" fill="#0E0A0C"/>`,
      drips: [[160, .9]], y: 164, zoom: '90 80 100 115'
    },
    sandal: {
      d: 'M30 160 Q30 150 50 150 H170 Q188 150 188 160 Q188 168 172 168 H44 Q30 168 30 160 Z',
      extra: () => `
        <path d="M30 160 Q30 150 50 150 H170 Q188 150 188 160" stroke="url(#gold)" stroke-width="1.2" fill="none"/>
        <path d="M118 151 Q126 112 152 112 Q170 116 170 151" fill="none" stroke="url(#goldV)" stroke-width="4"/>
        <path d="M100 151 Q110 124 140 120" fill="none" stroke="url(#goldV)" stroke-width="3"/>
        <path d="M46 151 Q42 112 60 104 Q78 100 86 112" fill="none" stroke="url(#goldV)" stroke-width="3"/>
        <path d="M56 106 Q92 124 108 150" fill="none" stroke="url(#goldV)" stroke-width="3"/>
        <circle cx="86" cy="112" r="3" fill="url(#gold)"/>
        <use href="#drop" x="144" y="100" width="12" height="18"/>`,
      drips: [[80, .9], [130, 1.1]], y: 168, zoom: '40 80 100 115'
    },
    charger: {
      d: '',
      extra: c => `
        <path d="M168 150 Q194 168 186 214" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M30 136 V150 A70 22 0 0 0 170 150 V136 Z" fill="${c}"/>
        <path d="M30 136 V150 A70 22 0 0 0 170 150 V136 Z" fill="rgba(0,0,0,.35)"/>
        <path d="M30 143 A70 22 0 0 0 170 143" stroke="url(#gold)" stroke-width="1.4" fill="none"/>
        ${solid('ellipse', 'cx="100" cy="136" rx="70" ry="22"', c)}
        <ellipse cx="100" cy="136" rx="52" ry="15" fill="none" stroke="url(#gold)" stroke-width="1.2"/>
        <g transform="translate(100 136) scale(1 .32)"><use href="#mark" x="-26" y="-26" width="52" height="52"/></g>
        <circle cx="152" cy="147" r="1.8" fill="#F0DCA8"/>`,
      drips: [[78, 1], [124, .8]], y: 168, zoom: '40 90 120 138'
    },
    boot: {
      d: 'M62 34 H118 L122 128 Q152 132 172 144 Q188 152 186 168 H54 Q48 168 52 148 Z',
      extra: () => `
        <path d="M96 52 Q104 96 120 126 L118 52 Z" fill="${DARK}"/>
        ${[62, 74, 86, 98, 110].map(y => `<path d="M${98 + (y - 52) * .35} ${y} H118" stroke="rgba(255,255,255,.08)"/>`).join('')}
        <path d="M108 34 Q110 18 120 18 Q128 22 120 34" fill="none" stroke="url(#goldV)" stroke-width="2.6"/>
        <path d="M50 168 H188 V180 Q120 184 50 180 Z" fill="#0E0A0C"/>
        <path d="M52 168 H186" stroke="url(#gold)" stroke-width="1.2"/>
        <path d="M54 180 H88 V190 H56 Z" fill="#0E0A0C"/>`,
      drips: [[150, .9]], y: 182, zoom: '40 10 100 115'
    },
    heel: {
      d: 'M44 100 Q54 104 62 116 Q84 142 124 148 L174 156 Q186 160 176 166 L112 166 Q76 160 52 136 Q44 124 44 100 Z',
      extra: () => `
        <path d="M46 120 L62 138 L56 202 H49 Z" fill="url(#goldV)"/>
        <path d="M48 104 Q66 128 118 142 L170 152" stroke="rgba(0,0,0,.35)" stroke-width="3" fill="none"/>
        <path d="M52 136 Q76 160 112 166 L176 166" stroke="url(#gold)" stroke-width="1"/>
        <rect x="46" y="200" width="12" height="4" rx="1" fill="#0E0A0C"/>`,
      drips: [[150, .9]], y: 166, zoom: '30 80 100 115'
    },
    slide: {
      d: 'M64 150 Q70 100 118 96 Q152 98 160 150 Z',
      extra: () => `
        <path d="M28 162 Q28 148 58 148 H162 Q186 148 186 162 Q186 176 162 176 H58 Q28 176 28 162 Z" fill="${INK}"/>
        <path d="M28 162 Q28 148 58 148 H162 Q186 148 186 162" stroke="url(#gold)" stroke-width="1.2" fill="none"/>
        <path d="M78 140 Q84 112 118 108 Q144 110 148 140" ${SEAM}/>
        <path d="M70 124 Q100 116 152 124" ${SEAM}/>
        ${bigDrop(112, 104, .7)}`,
      drips: [[80, .9], [140, 1.1]], y: 176, zoom: '50 80 100 115'
    },
    headphones: {
      d: '',
      extra: c => `
        <path d="M48 124 Q46 36 100 34 Q154 36 152 124" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round"/>
        <path d="M48 124 Q46 36 100 34 Q154 36 152 124" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="14" stroke-linecap="round"/>
        <path d="M58 116 Q58 48 100 46 Q142 48 142 116" fill="none" stroke="url(#goldV)" stroke-width="1.6"/>
        <rect x="42" y="102" width="12" height="24" rx="3" fill="url(#gold)"/><rect x="146" y="102" width="12" height="24" rx="3" fill="url(#gold)"/>
        ${solid('rect', 'x="24" y="118" width="46" height="76" rx="21"', c)}
        ${solid('rect', 'x="130" y="118" width="46" height="76" rx="21"', c)}
        <rect x="62" y="124" width="12" height="64" rx="6" fill="${INK}"/><rect x="126" y="124" width="12" height="64" rx="6" fill="${INK}"/>
        <rect x="31" y="125" width="32" height="62" rx="15" fill="none" stroke="url(#gold)" stroke-width="1.2"/>
        <rect x="137" y="125" width="32" height="62" rx="15" fill="none" stroke="url(#gold)" stroke-width="1.2"/>
        <use href="#drop" x="40" y="145" width="14" height="21"/><use href="#drop" x="146" y="145" width="14" height="21"/>`,
      drips: [[153, .9]], y: 194, zoom: '14 100 90 104'
    },
    buds: {
      d: '',
      extra: c => `
        ${solid('rect', 'x="52" y="104" width="96" height="78" rx="32"', c)}
        <path d="M54 132 H146" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
        <rect x="90" y="128" width="20" height="7" rx="2" fill="url(#gold)"/>
        <circle cx="100" cy="162" r="2.2" fill="url(#gold)"/>
        ${[74, 126].map((x, i) => `
          <g transform="rotate(${i ? 14 : -14} ${x} 70)">
            ${solid('rect', `x="${x - 5}" y="66" width="10" height="34" rx="5"`, c)}
            ${solid('circle', `cx="${x}" cy="62" r="14"`, c)}
            <circle cx="${x}" cy="62" r="14" fill="none" stroke="url(#gold)" stroke-width="1.2"/>
            <circle cx="${x}" cy="62" r="6" fill="${INK}"/>
            <rect x="${x - 5}" y="94" width="10" height="5" rx="2" fill="url(#gold)"/>
          </g>`).join('')}`,
      drips: [[100, 1.2]], y: 182, zoom: '50 36 100 115'
    },
    watch: {
      d: '',
      extra: c => `
        ${solid('rect', 'x="78" y="10" width="44" height="210" rx="10"', c)}
        ${[176, 188, 200].map(y => `<circle cx="100" cy="${y}" r="2.2" fill="${INK}"/>`).join('')}
        <rect x="80" y="160" width="40" height="8" rx="2" fill="none" stroke="url(#gold)" stroke-width="1.6"/>
        <rect x="60" y="70" width="80" height="90" rx="24" fill="url(#gold)"/>
        <rect x="139" y="104" width="7" height="18" rx="2.5" fill="url(#goldV)"/>
        <rect x="68" y="78" width="64" height="74" rx="18" fill="#0B0809"/>
        <text x="100" y="114" text-anchor="middle" font-family="DM Mono, ui-monospace, monospace" font-size="17" fill="#F0DCA8">10:08</text>
        <text x="100" y="126" text-anchor="middle" font-family="DM Mono, ui-monospace, monospace" font-size="5.5" letter-spacing="1" fill="#A3959C">DO 14 OKT</text>
        <use href="#drop" x="95" y="131" width="10" height="15"/>`,
      drips: [], y: 0, zoom: '56 62 88 101'
    },
    speaker: {
      d: '',
      extra: c => `
        <path d="M84 50 Q84 26 100 26 Q116 26 116 50" fill="none" stroke="url(#goldV)" stroke-width="4"/>
        ${solid('rect', 'x="50" y="46" width="100" height="158" rx="30"', c)}
        ${Array.from({ length: 11 }, (_, r) => Array.from({ length: 9 }, (_, k) => `<circle cx="${68 + k * 8}" cy="${72 + r * 8}" r="1.6" fill="rgba(0,0,0,.35)"/>`).join('')).join('')}
        <rect x="50" y="164" width="100" height="5" fill="url(#gold)"/>
        <circle cx="100" cy="112" r="17" fill="${INK}"/><circle cx="100" cy="112" r="17" fill="none" stroke="url(#gold)" stroke-width="1.2"/>
        <use href="#drop" x="93" y="101" width="14" height="21"/>`,
      drips: [[80, 1], [122, .8]], y: 202, zoom: '50 70 100 115'
    },
    phonecase: {
      d: '',
      extra: c => `
        ${solid('rect', 'x="62" y="22" width="76" height="186" rx="18"', c)}
        <rect x="67" y="27" width="66" height="176" rx="14" fill="none" stroke="rgba(255,255,255,.2)" stroke-dasharray="2 3"/>
        <rect x="70" y="30" width="38" height="40" rx="11" fill="${INK}"/>
        ${[[80, 41], [98, 41], [89, 59]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#050405" stroke="url(#gold)" stroke-width="1"/>`).join('')}
        <circle cx="100" cy="59" r="2" fill="#F0DCA8"/>
        <use href="#mark" x="78" y="108" width="44" height="44"/>`,
      drips: [[100, 1.2]], y: 207, zoom: '58 16 88 101'
    }
  };

  function garment(p) {
    const s = SHAPES[p.shape];
    const body = s.d
      ? `<path d="${s.d}" fill="${p.color}"/><path d="${s.d}" fill="url(#side)"/><path d="${s.d}" fill="url(#shade)"/><path d="${s.d}" ${SEAM}/>`
      : '';
    return body + s.extra(p.color) + s.drips.map(([x, sc]) => drip(x, s.y, sc)).join('');
  }

  function labelArt(p) {
    return `
      <rect x="38" y="44" width="124" height="142" fill="#141012"/>
      <rect x="44" y="50" width="112" height="130" fill="none" stroke="url(#gold)" stroke-width=".8" stroke-dasharray="2 2"/>
      <use href="#mark" x="84" y="60" width="32" height="32"/>
      <text x="100" y="114" text-anchor="middle" font-family="Bodoni Moda, Didot, Georgia, serif" font-size="17" letter-spacing="3" fill="url(#gold)">DRIPP <tspan font-style="italic" letter-spacing="1">It</tspan></text>
      <path d="M70 124 H130" stroke="url(#gold)" stroke-width=".6"/>
      <text x="100" y="142" text-anchor="middle" font-family="DM Mono, ui-monospace, monospace" font-size="9" letter-spacing="1.6" fill="#EADBB8">Nº ${pad(p.ed)} / ${p.edMax}</text>
      <text x="100" y="158" text-anchor="middle" font-family="DM Mono, ui-monospace, monospace" font-size="5.6" letter-spacing="1.6" fill="#A3959C">COLLECTIE 01 · LIQUID GOLD</text>
      <text x="100" y="168" text-anchor="middle" font-family="DM Mono, ui-monospace, monospace" font-size="5.6" letter-spacing="1.6" fill="#A3959C">MAISON ${BRAND.city.toUpperCase()}</text>`;
  }

  /* view: 'front' | 'detail' | 'label' */
  function art(p, view = 'front', cls = '') {
    const s = SHAPES[p.shape];
    const vb = view === 'detail' ? s.zoom : '0 0 200 230';
    const inner = view === 'label' ? labelArt(p) : garment(p);
    const label = view === 'label' ? `Binnenlabel ${p.name}, nummer ${pad(p.ed)}` : view === 'detail' ? `Detail van ${p.name}` : `${p.name} in ${p.colorName}`;
    return `<svg class="${cls}" viewBox="${vb}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
  }

  /* Foto als die er is, anders de illustratie */
  const visual = (p, i = 0) => p.images?.[i]
    ? `<img src="${esc(p.images[i])}" alt="${esc(p.name)} in ${esc(p.colorName)}" loading="lazy" decoding="async">`
    : art(p);

  /* ---------- Winkeltas ---------- */
  const KEY = 'drippit-bag-v2';
  let memoryBag = [];
  const bag = {
    read() {
      try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(l => byId(l.id)) : []; }
      catch { return memoryBag; }
    },
    write(lines) {
      memoryBag = lines;
      try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* opslag geblokkeerd: tas leeft alleen op deze pagina */ }
      updateCount(true);
    },
    add(id, size) {
      const lines = bag.read();
      const hit = lines.find(l => l.id === id && l.size === size);
      if (hit) hit.qty = Math.min(hit.qty + 1, 5); else lines.push({ id, size, qty: 1 });
      bag.write(lines);
    },
    count: () => bag.read().reduce((n, l) => n + l.qty, 0),
    subtotal: () => bag.read().reduce((n, l) => n + byId(l.id).price * l.qty, 0)
  };
  function updateCount(bump) {
    const n = bag.count();
    $$('.bag-count').forEach(el => {
      el.textContent = n;
      el.hidden = n === 0 && el.classList.contains('badge');
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    $$('.bag-btn').forEach(el => el.setAttribute('aria-label', `Winkeltas, ${plural(n, 'stuk', 'stukken')}`));
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, withLink) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(msg)}</span>${withLink ? '<a href="tas.html">Bekijk je tas</a>' : ''}`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  }

  /* ---------- Kop, menu en voet ---------- */
  const MAISON = [['atelier.html', 'Atelier', 'atelier'], ['service.html', 'Service', 'service'], ['contact.html', 'Contact', 'contact']];

  function header() {
    return `
<header class="site-header" id="site-header">
  <div class="announce"><div class="wrap">
    <span class="ann-long">Gratis verzending in België vanaf <b>${eur(SHOP.freeShipFrom)}</b> · Retour binnen 30 dagen · 2 jaar garantie op elektronica</span>
    <span class="ann-short">Gratis verzending vanaf <b>${eur(SHOP.freeShipFrom)}</b></span>
  </div></div>
  <div class="nav"><div class="wrap">
    <div class="nav-left">
      <button class="icon-btn menu-btn" type="button" aria-label="Menu openen" aria-expanded="false" aria-controls="drawer"><span class="burger" aria-hidden="true"><i></i><i></i></span></button>
      <nav class="nav-links" aria-label="Categorieën">
        ${CAT_KEYS.map(k => `<a href="collectie.html#${k}" data-nav="${k}">${CATS[k].name}</a>`).join('')}
      </nav>
    </div>
    <a class="brand" href="index.html" aria-label="${BRAND.name}, naar de homepage">${markSvg(38)}<span class="brand-word">DRIPP <em>It</em></span></a>
    <div class="nav-right">
      <nav class="nav-links nav-secondary" aria-label="Maison">
        ${MAISON.map(([h, t, k]) => `<a href="${h}" data-nav="${k}">${t}</a>`).join('')}
      </nav>
      <a class="icon-btn bag-btn" href="tas.html" data-nav="tas" aria-label="Winkeltas">${ICONS.bag}<span class="bag-count badge" hidden>0</span></a>
    </div>
  </div></div>
</header>
<div class="header-space" aria-hidden="true"></div>
<div class="drawer" id="drawer">
  <button class="drawer-backdrop" type="button" tabindex="-1" aria-label="Menu sluiten"></button>
  <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="drawer-head">
      <a class="brand" href="index.html">${markSvg(32)}<span class="brand-word">DRIPP <em>It</em></span></a>
      <button class="icon-btn drawer-close" type="button" aria-label="Menu sluiten"><span class="x" aria-hidden="true"></span></button>
    </div>
    <nav class="drawer-section" aria-label="Shop">
      <span class="eyebrow">Shop</span>
      ${CAT_KEYS.map((k, i) => `<a class="drawer-cat" style="--i:${i}" href="collectie.html#${k}" data-nav="${k}"><span>${CATS[k].name}</span><small>${inCat(k).length} stuks</small></a>`).join('')}
      <a class="drawer-cat" style="--i:4" href="collectie.html" data-nav="alles"><span>Alles bekijken</span><small>${PRODUCTS.length} stuks</small></a>
    </nav>
    <nav class="drawer-section" aria-label="Maison">
      <span class="eyebrow">Maison</span>
      <div class="drawer-links">
        <a href="index.html" data-nav="home">Home</a>
        ${MAISON.map(([h, t, k]) => `<a href="${h}" data-nav="${k}">${t}</a>`).join('')}
      </div>
    </nav>
    <div class="drawer-foot">
      <a class="btn btn-gold btn-block" href="tas.html">${ICONS.bag}<span>Bekijk je tas (<span class="bag-count">0</span>)</span></a>
      <p>Gratis verzending vanaf ${eur(SHOP.freeShipFrom)} · Retour binnen 30 dagen</p>
    </div>
  </div>
</div>`;
  }

  function setCurrent(key) {
    $$('[data-nav]').forEach(a => {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function footer() {
    return `
<footer class="site-footer">
  <div class="wrap">
    <div class="foot">
      <div class="foot-brand">
        <a class="brand" href="index.html">${markSvg(52)}<span class="brand-word">DRIPP <em>It</em></span></a>
        <p>Luxe mode, schoenen en elektronica met gouden details. Ontworpen in ${BRAND.city}.</p>
      </div>
      <div><h4>Shop</h4><ul>
        ${CAT_KEYS.map(k => `<li><a href="collectie.html#${k}">${CATS[k].name}</a></li>`).join('')}
        <li><a href="collectie.html">Alles bekijken</a></li>
      </ul></div>
      <div><h4>Service</h4><ul>
        <li><a href="service.html#verzending">Verzending</a></li>
        <li><a href="service.html#retour">Retourneren</a></li>
        <li><a href="service.html#maten">Maattabel</a></li>
        <li><a href="service.html#vragen">Veelgestelde vragen</a></li>
      </ul></div>
      <div><h4>Maison</h4><ul>
        <li><a href="atelier.html">Het atelier</a></li>
        <li><a href="index.html#private">Private list</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="contact.html#showroom">Showroom</a></li>
      </ul></div>
    </div>
    <div class="foot-note">
      <span>© ${new Date().getFullYear()} ${esc([BRAND.legal.company, BRAND.legal.enterpriseNumber && `Ondernemingsnr. ${BRAND.legal.enterpriseNumber}`, BRAND.legal.address].filter(Boolean).join(' · '))}<br>${BRAND.vatNote}</span>
      <span class="pay" aria-label="Betaalmethoden">${payChips()}</span>
    </div>
  </div>
</footer>`;
  }

  /* Vaste kop: krimpt bij scrollen, menu schuift open */
  function wireHeader() {
    const head = $('#site-header');
    const ann = $('.announce .wrap', head);
    const root = document.documentElement;
    const NAV_H = 72;
    const measure = () => {
      const padTop = parseFloat(getComputedStyle(head).paddingTop) || 0;
      root.style.setProperty('--header-full', `${padTop + ann.offsetHeight + 1 + NAV_H + 1}px`);
      root.style.setProperty('--header-h', `${head.getBoundingClientRect().height}px`);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        head.classList.toggle('is-scrolled', window.scrollY > 24);
        ticking = false;
      });
    };
    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(head);
    head.addEventListener('transitionend', measure);

    const drawer = $('#drawer');
    const openBtn = $('.menu-btn', head);
    const closeBtn = $('.drawer-close', drawer);
    drawer.inert = true;
    const open = () => {
      drawer.inert = false;
      drawer.classList.add('open');
      root.classList.add('drawer-open');
      openBtn.setAttribute('aria-expanded', 'true');
      setTimeout(() => closeBtn.focus({ preventScroll: true }), 60);
    };
    const close = (restoreFocus = true) => {
      drawer.classList.remove('open');
      root.classList.remove('drawer-open');
      openBtn.setAttribute('aria-expanded', 'false');
      drawer.inert = true;
      if (restoreFocus) openBtn.focus({ preventScroll: true });
    };
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', () => close());
    $('.drawer-backdrop', drawer).addEventListener('click', () => close());
    $$('a', drawer).forEach(a => a.addEventListener('click', () => close(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });
    window.matchMedia('(min-width: 1101px)').addEventListener?.('change', e => { if (e.matches) close(false); });
  }

  /* ---------- Productkaart ---------- */
  function card(p) {
    return `
<a class="card" href="product.html#${p.id}">
  <div class="art${p.images?.length ? ' has-img' : ''}">
    <span class="tag${p.hot ? ' hot' : ''}">${esc(p.tag)}</span>
    ${visual(p)}
    ${p.ed ? `<span class="edition">Nº ${pad(p.ed)} / ${p.edMax}</span>` : ''}
    <span class="view">Bekijk</span>
  </div>
  <div class="card-body">
    <span class="card-cat">${CATS[p.cat].name}</span>
    <div class="card-row"><h3 class="card-name">${esc(p.name)}</h3><span class="card-price">${eur(p.price)}</span></div>
    <p class="card-meta"><span class="swatch" style="background:${p.color}"></span>${esc(p.colorName)}</p>
  </div>
</a>`;
  }

  const stockText = p => p.edMax
    ? { low: p.left <= 20, text: `Nog ${p.left} van ${p.edMax} beschikbaar` }
    : p.left <= 10 ? { low: true, text: `Nog ${p.left} op voorraad` } : { low: false, text: 'Op voorraad' };

  const careText = p => ({
    dames: 'Handwas of fijnwas op 30 °C. Niet in de droger. Strijk niet over het borduursel of goud.',
    heren: 'Binnenstebuiten wassen op 30 °C, niet in de droger. Strijk niet over het borduursel.',
    schoenen: 'Veeg schoon met een zachte doek en voed het leer eens per maand met lederbalsem. Laat natte schoenen langzaam drogen, niet op de verwarming.',
    elektronica: 'Laad op met de meegeleverde USB-C-kabel. Houd uit de felle zon en reinig met een droge doek. Je krijgt 2 jaar garantie.'
  }[p.cat]);

  /* ---------- Formulieren (Netlify Forms) ---------- */
  function wireForms() {
    $$('form[data-form]').forEach(form => {
      const msg = $('.form-msg', form);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        msg.className = 'form-msg';
        let ok = true;
        $$('[required]', form).forEach(input => {
          const field = input.closest('.field');
          const bad = input.type === 'email'
            ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())
            : !input.value.trim();
          field?.classList.toggle('invalid', bad);
          if (bad) ok = false;
        });
        if (!ok) {
          msg.textContent = form.dataset.form === 'contact'
            ? 'Vul je naam, een geldig e-mailadres en je bericht in.'
            : 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.';
          msg.classList.add('err');
          return;
        }
        const btn = $('button[type="submit"]', form);
        btn.disabled = true;
        msg.textContent = 'Bezig met versturen…';
        try {
          const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
          });
          if (!res.ok) throw new Error(res.status);
          const name = form.elements.naam?.value.trim().split(' ')[0];
          msg.textContent = form.dataset.form === 'contact'
            ? `Dank je${name ? ', ' + name : ''}. We antwoorden binnen één werkdag.`
            : 'Je staat op de lijst. We mailen je 48 uur voor de volgende drop.';
          msg.classList.add('ok');
          form.reset();
        } catch {
          msg.textContent = 'Versturen is niet gelukt. Dit formulier werkt zodra de site live staat op Netlify.';
          msg.classList.add('err');
        } finally {
          btn.disabled = false;
        }
      });
      $$('input, textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('invalid')));
    });
  }


  /* ---------- Afrekenen (Stripe) ---------- */
  const CO_KEY = 'drippit-checkout-v1';
  const LAST_KEY = 'drippit-last-order';
  const LOCK = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';

  const loadScript = src => new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.onload = resolve; el.onerror = reject;
    document.head.appendChild(el);
  });

  /* Stripe-betaalvelden in de Dripp It-stijl, in licht en donker */
  function stripeAppearance() {
    const cs = getComputedStyle(document.documentElement);
    const t = n => cs.getPropertyValue(n).trim();
    const dark = cs.colorScheme.includes('dark');
    return {
      theme: dark ? 'night' : 'stripe',
      labels: 'above',
      variables: {
        colorPrimary: t('--gold'),
        colorBackground: t('--bg'),
        colorText: t('--fg'),
        colorTextSecondary: t('--muted'),
        colorTextPlaceholder: t('--muted'),
        colorDanger: t('--warn'),
        fontFamily: '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif',
        fontSizeBase: '16px',
        borderRadius: '0px',
        spacingUnit: '4px',
        focusBoxShadow: 'none',
        focusOutline: 'none'
      },
      rules: {
        '.AccordionItem': { border: `1px solid ${t('--line')}`, boxShadow: 'none', backgroundColor: t('--bg-2'), padding: '18px 20px' },
        '.AccordionItem--selected': { borderColor: t('--gold') },
        '.Input': { border: `1px solid ${t('--line-strong')}`, boxShadow: 'none', padding: '13px 14px' },
        '.Input:focus': { borderColor: t('--gold'), boxShadow: `0 0 0 1px ${t('--gold')}` },
        '.Input--invalid': { borderColor: t('--warn'), boxShadow: 'none' },
        '.Label': { fontFamily: '"DM Mono", ui-monospace, monospace', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: t('--muted') },
        '.Tab, .Block': { border: `1px solid ${t('--line')}`, boxShadow: 'none' },
        '.Tab--selected': { borderColor: t('--gold'), boxShadow: `0 0 0 1px ${t('--gold')}` }
      }
    };
  }

  /* Voorbeeld van het betaalscherm zolang Stripe nog niet gekoppeld is.
     De velden zijn uitgeschakeld: hier kan niemand echte kaartgegevens invullen. */
  const payMock = () => `
<p class="mock-note">${dropSvg()}<span><b>Voorbeeld van het betaalscherm.</b> De echte, beveiligde betaalvelden van Stripe verschijnen hier zodra de Stripe-sleutels in Netlify staan.</span></p>
<div class="pm-list" role="radiogroup" aria-label="Betaalmethode (voorbeeld)">
  ${[
    ['bancontact', 'Bancontact', ['Bancontact'], '<p>Je gaat naar Bancontact en betaalt daar met de app of met je kaart. Daarna kom je vanzelf terug op deze site.</p>'],
    ['card', 'Kaart', ['Visa', 'Mastercard', 'Amex'], `
      <div class="mock-fields">
        <div class="field full"><span class="label">Kaartnummer</span><input class="input" disabled placeholder="1234 1234 1234 1234" aria-label="Kaartnummer (voorbeeld)"></div>
        <div class="field"><span class="label">Vervaldatum</span><input class="input" disabled placeholder="MM / JJ" aria-label="Vervaldatum (voorbeeld)"></div>
        <div class="field"><span class="label">CVC</span><input class="input" disabled placeholder="123" aria-label="CVC (voorbeeld)"></div>
      </div>`],
    ['wallet', 'Apple Pay of Google Pay', ['Apple Pay', 'Google Pay'], '<p>Betaal met Face ID, Touch ID of je vingerafdruk. Je ziet deze optie alleen op een toestel dat het ondersteunt.</p>']
  ].map(([k, name, badges, body], i) => `
  <div class="pm${i === 0 ? ' on' : ''}" data-pm="${k}" role="radio" tabindex="0" aria-checked="${i === 0}">
    <div class="pm-head"><span class="pm-radio" aria-hidden="true"></span><span class="pm-name">${name}</span><span class="pm-badges">${badges.map(b => `<span>${b}</span>`).join('')}</span></div>
    <div class="pm-body">${body}</div>
  </div>`).join('')}
</div>`;

  const orderLines = (lines, compact) => lines.map(l => {
    const p = byId(l.id);
    return `
    <div class="co-line${compact ? ' compact' : ''}">
      <div class="co-thumb art${p.images?.length ? ' has-img' : ''}">${visual(p)}<span class="co-qty">${l.qty}</span></div>
      <div class="co-line-info"><b>${esc(p.name)}</b><span>${esc(p.colorName)}${l.size ? ` · ${esc(l.size)}` : ''}</span></div>
      <span class="co-line-price">${eur(p.price * l.qty)}</span>
    </div>`;
  }).join('');

  const totalsFor = lines => {
    const sub = lines.reduce((n, l) => n + byId(l.id).price * l.qty, 0);
    const ship = sub >= SHOP.freeShipFrom ? 0 : SHOP.shipping;
    return { sub, ship, total: sub + ship };
  };
  const sumRows = ({ sub, ship, total }) => `
    <dl class="sum-rows">
      <div><dt>Subtotaal</dt><dd>${eur(sub, 2)}</dd></div>
      <div><dt>Verzending</dt><dd>${ship ? eur(ship, 2) : 'Gratis'}</dd></div>
      <div class="total"><dt>Totaal</dt><dd>${eur(total, 2)}</dd></div>
    </dl>`;

  /* ---------- Pagina's ---------- */
  const pages = {
    home() {
      setCurrent('home');
      const hero = $('#hero-art');
      if (hero) hero.innerHTML = visual(byId('molten'));
      const cats = $('#cats');
      if (cats) cats.innerHTML = CAT_KEYS.map(k => {
        const c = CATS[k];
        return `
<a class="cat" href="collectie.html#${k}">
  ${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : art(byId(c.art))}
  <span class="cat-label"><b>${c.name}</b><span>${inCat(k).length} stuks ${ICONS.arrow}</span></span>
</a>`;
      }).join('');
      const feat = $('#featured');
      if (feat) feat.innerHTML = PRODUCTS.filter(p => p.featured).sort((a, b) => a.featured - b.featured).map(card).join('');
      const looks = $('#looks');
      if (looks) looks.innerHTML = LOOKS.map((l, i) => {
        const m = byId(l.main), a = byId(l.acc);
        return `
<a class="look" href="product.html#${m.id}">
  <div class="look-stage">
    <span class="num">${['I', 'II', 'III', 'IV'][i]}</span>
    ${art(m, 'front', 'main')}
    ${art(a, 'front', 'acc')}
  </div>
  <div class="look-cap"><b>${esc(l.name)}</b><span>${l.with.map(id => byId(id).name).join(' · ')}</span></div>
</a>`;
      }).join('');
    },

    collectie() {
      const grid = $('#grid');
      const count = $('#count');
      const sort = $('#sort');
      const chipsEl = $('#chips');
      chipsEl.innerHTML = [['alles', 'Alles', PRODUCTS.length], ...CAT_KEYS.map(k => [k, CATS[k].name, inCat(k).length])]
        .map(([k, t, n]) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="false">${t}<sup>${n}</sup></button>`).join('');
      const chips = $$('.chip', chipsEl);
      const fromHash = () => (CATS[location.hash.slice(1)] ? location.hash.slice(1) : 'alles');
      const state = { filter: fromHash(), sort: 'uitgelicht' };
      const render = () => {
        const c = CATS[state.filter];
        $('#cat-title').innerHTML = c ? `<em>${c.name}</em>` : 'De <em>collectie</em>';
        $('#cat-intro').textContent = c ? c.intro : 'Dames- en herenmode, schoenen en elektronica. Alles met de gouden druppel als signatuur.';
        $('#cat-crumb').textContent = c ? c.name : 'Collectie';
        document.title = `${c ? c.name : 'Collectie'} · ${BRAND.name}`;
        setCurrent(state.filter);
        let list = PRODUCTS.filter(p => !c || p.cat === state.filter);
        if (state.sort === 'laag') list = [...list].sort((a, b) => a.price - b.price);
        if (state.sort === 'hoog') list = [...list].sort((a, b) => b.price - a.price);
        if (state.sort === 'schaars') list = [...list].sort((a, b) => a.left - b.left);
        grid.innerHTML = list.map(card).join('');
        count.textContent = plural(list.length, 'stuk', 'stukken');
        chips.forEach(ch => ch.setAttribute('aria-pressed', String(ch.dataset.filter === state.filter)));
        $('[aria-pressed="true"]', chipsEl)?.scrollIntoView({ block: 'nearest', inline: 'center' });
      };
      chips.forEach(ch => ch.addEventListener('click', () => {
        state.filter = ch.dataset.filter;
        try { history.replaceState(null, '', state.filter === 'alles' ? location.pathname : '#' + state.filter); } catch { /* niet toegestaan */ }
        render();
      }));
      sort.addEventListener('change', () => { state.sort = sort.value; render(); });
      window.addEventListener('hashchange', () => { state.filter = fromHash(); render(); window.scrollTo({ top: 0 }); });
      render();
    },

    product() {
      const root = $('#pdp');
      const related = $('#related');
      const render = () => {
        const p = byId(location.hash.slice(1)) || PRODUCTS[0];
        const cat = CATS[p.cat];
        document.title = `${p.name} · ${BRAND.name}`;
        setCurrent(p.cat);
        const sold = p.soldOut || [];
        const sizes = p.sizes || [];
        const free = sizes.filter(s => !sold.includes(s));
        const defSize = sizes.length ? (free.includes('M') ? 'M' : free[Math.floor(free.length / 2)] ?? '') : '';
        const stock = stockText(p);
        const views = p.images?.length
          ? p.images.map((src, i) => ({ html: visual(p, i), thumb: visual(p, i), label: `Foto ${i + 1}` }))
          : [
            { html: art(p), thumb: art(p), label: 'Vooraanzicht' },
            { html: art(p, 'detail'), thumb: art(p, 'detail'), label: 'Detail' },
            ...(p.ed ? [{ html: art(p, 'label'), thumb: art(p, 'label'), label: 'Genummerd label' }] : [])
          ];
        root.innerHTML = `
<div class="gallery">
  <div class="stage${p.images?.length ? ' has-img' : ''}" id="stage">
    <span class="view-label" id="view-label">${views[0].label}</span>
    <div class="stage-media" id="stage-media">${views[0].html}</div>
    ${p.ed ? `<span class="edition">Nº ${pad(p.ed)} / ${p.edMax}</span>` : ''}
  </div>
  ${views.length > 1 ? `<div class="thumbs" role="group" aria-label="Weergaven" style="--n:${views.length}">
    ${views.map((v, i) => `<button class="thumb" type="button" data-i="${i}" aria-label="${v.label}" aria-pressed="${i === 0}">${v.thumb}</button>`).join('')}
  </div>` : ''}
</div>
<div class="buybox">
  <nav class="crumbs" aria-label="Kruimelpad"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="collectie.html#${p.cat}">${cat.name}</a><span aria-hidden="true">/</span><span>${esc(p.name)}</span></nav>
  <div class="buy-head">
    <span class="eyebrow">${esc(p.tag)} · ${cat.name}</span>
    <h1>${esc(p.name)}</h1>
    <div class="price-line">
      <span class="price-big">${eur(p.price)}</span>
      <span class="stock${stock.low ? ' low' : ''}">${stock.text}</span>
    </div>
  </div>
  <p class="pdp-desc">${esc(p.desc)}</p>
  <div class="opt">
    <div class="opt-head"><span class="label">Kleur</span><span class="opt-value">${esc(p.colorName)}</span></div>
    <span class="swatch swatch-lg" style="background:${p.color}"></span>
  </div>
  ${sizes.length ? `
  <div class="opt">
    <div class="opt-head"><span class="label">${p.sizeLabel || 'Maat'}</span>${isClothing(p) || p.cat === 'schoenen' ? '<a href="service.html#maten">Maattabel</a>' : ''}</div>
    <div class="size-row" role="group" aria-label="Kies ${(p.sizeLabel || 'maat').toLowerCase()}">
      ${sizes.map(s => `<button class="size" type="button" data-size="${esc(s)}" aria-pressed="${s === defSize}"${sold.includes(s) ? ' disabled title="Uitverkocht"' : ''}>${esc(s)}</button>`).join('')}
    </div>
    <p class="opt-note">${esc(p.note)}</p>
  </div>` : `<p class="opt-note">${esc(p.note)}</p>`}
  <button class="btn btn-gold btn-block" type="button" id="add">In je tas · ${eur(p.price)}</button>
  <ul class="perks">
    <li>${dropSvg()}Gratis verzending in België vanaf ${eur(SHOP.freeShipFrom)}</li>
    <li>${dropSvg()}Binnen 30 dagen gratis retour</li>
    <li>${dropSvg()}${p.cat === 'elektronica' ? '2 jaar garantie' : 'Geleverd in een linnen doos'}</li>
  </ul>
  <div class="acc">
    <details open><summary>${p.cat === 'elektronica' ? 'Specificaties' : 'Details'}</summary><div class="acc-body"><ul>${p.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div></details>
    <details><summary>${p.cat === 'elektronica' ? 'Garantie en onderhoud' : 'Materiaal en verzorging'}</summary><div class="acc-body"><p>${esc(p.material)}.</p><p>${esc(careText(p))}</p><p><a href="service.html#verzorging">Alle verzorgingstips</a></p></div></details>
    <details><summary>Verzending en retour</summary><div class="acc-body"><p>Besteld voor 15:00 op een werkdag, dan versturen we dezelfde dag. In België bezorgen we binnen 1 tot 2 werkdagen.</p><p>Niet goed? Stuur het binnen 30 dagen ongebruikt terug. <a href="service.html#retour">Zo werkt retourneren</a>.</p></div></details>
  </div>
</div>`;
        let size = defSize;
        $$('.size', root).forEach(b => b.addEventListener('click', () => {
          size = b.dataset.size;
          $$('.size', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        }));
        $$('.thumb', root).forEach(b => b.addEventListener('click', () => {
          $$('.thumb', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          const v = views[+b.dataset.i];
          $('#stage-media').innerHTML = v.html;
          $('#view-label').textContent = v.label;
        }));
        $('#add').addEventListener('click', () => {
          bag.add(p.id, size);
          toast(`${p.name}${size ? ` (${size})` : ''} ligt in je tas`, true);
        });
        related.innerHTML = PRODUCTS.filter(x => x.id !== p.id)
          .sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat) || (a.featured || 99) - (b.featured || 99))
          .slice(0, 4).map(card).join('');
      };
      window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      render();
    },

    tas() {
      setCurrent('tas');
      const root = $('#bag-root');
      const render = () => {
        const lines = bag.read();
        if (!lines.length) {
          root.innerHTML = `
<div class="bag-empty">
  <div class="empty">
    ${dropSvg()}
    <h2>Je tas is nog <em>leeg</em></h2>
    <p>Kies iets uit de collectie. Onze signatuurstukken hebben een kleine, genummerde oplage, dus wacht niet te lang.</p>
    <div class="hero-actions">${CAT_KEYS.map(k => `<a class="btn btn-ghost" href="collectie.html#${k}">${CATS[k].name}</a>`).join('')}</div>
  </div>
  <div class="head"><div><span class="eyebrow">Misschien iets voor jou</span><h2>Bijna <em>uitverkocht</em></h2></div></div>
  <div class="grid grid-4">${[...PRODUCTS].sort((a, b) => a.left - b.left).slice(0, 4).map(card).join('')}</div>
</div>`;
          return;
        }
        const sub = bag.subtotal();
        const ship = sub >= SHOP.freeShipFrom ? 0 : SHOP.shipping;
        const toGo = Math.max(0, SHOP.freeShipFrom - sub);
        root.innerHTML = `
<div class="bag-layout">
  <div>
    <div class="head bag-head"><div><h2>${plural(bag.count(), 'stuk', 'stukken')}</h2></div><a class="link" href="collectie.html">Verder winkelen <span class="arrow">→</span></a></div>
    <div class="lines">
      ${lines.map((l, i) => {
        const p = byId(l.id);
        return `
      <div class="line" data-i="${i}">
        <a class="art${p.images?.length ? ' has-img' : ''}" href="product.html#${p.id}" aria-label="${esc(p.name)}">${visual(p)}</a>
        <div class="line-info">
          <a href="product.html#${p.id}">${esc(p.name)}</a>
          <span class="muted">${esc(p.colorName)}${l.size ? ` · ${p.sizeLabel || 'Maat'} ${esc(l.size)}` : ''}</span>
          <span class="muted">${eur(p.price)} per stuk</span>
        </div>
        <div class="line-end">
          <span class="card-price">${eur(p.price * l.qty)}</span>
          <div class="qty" role="group" aria-label="Aantal">
            <button type="button" data-act="min" aria-label="Eén minder">−</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-act="plus" aria-label="Eén meer"${l.qty >= 5 ? ' disabled' : ''}>+</button>
          </div>
          <button class="remove" type="button" data-act="del">Verwijderen</button>
        </div>
      </div>`;
      }).join('')}
    </div>
  </div>
  <aside class="summary" aria-label="Overzicht">
    <h2>Overzicht</h2>
    <div class="free-ship">
      <span>${toGo ? `Nog ${eur(toGo)} tot gratis verzending` : 'Je bestelling wordt gratis verzonden'}</span>
      <div class="bar"><i style="width:${Math.min(100, sub / SHOP.freeShipFrom * 100)}%"></i></div>
    </div>
    <dl class="sum-rows">
      <div><dt>Subtotaal</dt><dd>${eur(sub, 2)}</dd></div>
      <div><dt>Verzending</dt><dd>${ship ? eur(ship, 2) : 'Gratis'}</dd></div>
      <div class="total"><dt>Totaal</dt><dd>${eur(sub + ship, 2)}</dd></div>
    </dl>
    <p class="muted small">${BRAND.vatNote}. We verzenden voorlopig alleen binnen ${SHOP.countryName}.</p>
    <a class="btn btn-gold btn-block" href="afrekenen.html">Afrekenen</a>
    <div class="pay">${payChips()}</div>
  </aside>
</div>`;
        $$('.line', root).forEach(row => row.addEventListener('click', e => {
          const act = e.target.closest('[data-act]')?.dataset.act;
          if (!act) return;
          const all = bag.read();
          const l = all[+row.dataset.i];
          if (act === 'plus') l.qty = Math.min(5, l.qty + 1);
          if (act === 'min') l.qty -= 1;
          if (act === 'del' || l.qty < 1) all.splice(+row.dataset.i, 1);
          bag.write(all);
          render();
        }));
      };
      render();
    },

    service() {
      setCurrent('service');
      const tables = $$('[data-table]');
      $$('[data-show]').forEach(chip => chip.addEventListener('click', () => {
        $$('[data-show]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
        tables.forEach(t => { t.hidden = t.dataset.table !== chip.dataset.show; });
      }));
    },

    contact() {
      setCurrent('contact');
      $$('.copy-btn').forEach(b => b.addEventListener('click', async () => {
        const text = b.dataset.copy;
        try { await navigator.clipboard.writeText(text); b.textContent = 'Gekopieerd'; }
        catch {
          const code = b.previousElementSibling;
          const r = document.createRange(); r.selectNodeContents(code);
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
          b.textContent = 'Geselecteerd';
        }
        setTimeout(() => { b.textContent = 'Kopieer'; }, 2000);
      }));
    },


    afrekenen() {
      setCurrent('tas');
      const root = $('#checkout-root');
      const lines = bag.read();
      if (!lines.length) {
        root.innerHTML = `
<div class="bag-empty"><div class="empty">
  ${dropSvg()}
  <h2>Er valt nog niets <em>af te rekenen</em></h2>
  <p>Je tas is leeg. Kies eerst iets uit de collectie.</p>
  <a class="btn btn-gold" href="collectie.html">Naar de collectie</a>
</div></div>`;
        return;
      }
      const totals = totalsFor(lines);
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(CO_KEY) || '{}') || {}; } catch { saved = {}; }
      const v = k => esc(saved[k] || '');
      root.innerHTML = `
<form class="checkout" id="co-form" novalidate>
  <div class="co-main">
    <section class="co-step" aria-labelledby="co-h1">
      <h2 id="co-h1"><span class="co-num">1</span>Contact</h2>
      <div class="field-row">
        <div class="field"><label for="co-email">E-mailadres</label><input id="co-email" name="email" type="email" autocomplete="email" inputmode="email" required value="${v('email')}" placeholder="naam@voorbeeld.be"></div>
        <div class="field"><label for="co-tel">Telefoon</label><input id="co-tel" name="tel" type="tel" autocomplete="tel" inputmode="tel" required value="${v('tel')}" placeholder="0470 12 34 56"></div>
      </div>
      <p class="opt-note">Hier sturen we je bevestiging en de track-and-trace naartoe.</p>
    </section>

    <section class="co-step" aria-labelledby="co-h2">
      <h2 id="co-h2"><span class="co-num">2</span>Bezorging</h2>
      <div class="field-row">
        <div class="field"><label for="co-first">Voornaam</label><input id="co-first" name="first" autocomplete="given-name" required value="${v('first')}"></div>
        <div class="field"><label for="co-last">Achternaam</label><input id="co-last" name="last" autocomplete="family-name" required value="${v('last')}"></div>
      </div>
      <div class="field"><label for="co-street">Straat en huisnummer</label><input id="co-street" name="street" autocomplete="address-line1" required value="${v('street')}" placeholder="Meirstraat 12, bus 3"></div>
      <div class="field-row co-postal">
        <div class="field"><label for="co-zip">Postcode</label><input id="co-zip" name="zip" autocomplete="postal-code" inputmode="numeric" maxlength="4" required value="${v('zip')}" placeholder="2000"></div>
        <div class="field"><label for="co-city">Gemeente</label><input id="co-city" name="city" autocomplete="address-level2" required value="${v('city')}" placeholder="Antwerpen"></div>
      </div>
      <div class="field"><span class="label">Land</span><div class="co-static">${SHOP.countryName}<small>We verzenden voorlopig alleen binnen ${SHOP.countryName}.</small></div></div>
      <div class="ship-opt">
        <span class="pm-radio on" aria-hidden="true"></span>
        <div><b>Thuislevering</b><span>1 tot 2 werkdagen · besteld voor 15:00, dezelfde dag verstuurd</span></div>
        <strong>${totals.ship ? eur(totals.ship, 2) : 'Gratis'}</strong>
      </div>
    </section>

    <section class="co-step" aria-labelledby="co-h3">
      <h2 id="co-h3"><span class="co-num">3</span>Betaling</h2>
      <div id="payment-element" class="pay-element" hidden></div>
      <div id="pay-mock">${payMock()}</div>
      <label class="check" for="co-terms"><input type="checkbox" id="co-terms" name="terms" required><span>Ik ga akkoord met de <a href="service.html#retour">verzend- en retourvoorwaarden</a> en weet dat ik 30 dagen bedenktijd heb.</span></label>
      <button class="btn btn-gold btn-block btn-pay" type="submit" id="pay-btn"><span class="pay-label">${LOCK}Betaal ${eur(totals.total, 2)}</span><span class="spinner" aria-hidden="true"></span></button>
      <p class="form-msg" id="co-msg" role="status" aria-live="polite"></p>
      <p class="co-secure">${LOCK}<span>Beveiligde verbinding. Je betaalgegevens gaan rechtstreeks naar Stripe en komen nooit bij ons terecht.</span></p>
    </section>
  </div>

  <aside class="co-summary" aria-label="Je bestelling">
    <div class="co-summary-head"><h2>Je bestelling</h2><a href="tas.html">Aanpassen</a></div>
    <div class="co-lines">${orderLines(lines)}</div>
    ${sumRows(totals)}
    <p class="muted small">${BRAND.vatNote}.</p>
    <ul class="perks">
      <li>${dropSvg()}Binnen 30 dagen gratis retour</li>
      <li>${dropSvg()}Geleverd in een linnen doos</li>
    </ul>
    <div class="pay">${payChips()}</div>
  </aside>
</form>`;

      const form = $('#co-form');
      const msg = $('#co-msg');
      const payBtn = $('#pay-btn');
      const setMsg = (html, cls) => { msg.className = 'form-msg' + (cls ? ' ' + cls : ''); msg.innerHTML = html; };
      const setLoading = on => { payBtn.disabled = on; payBtn.classList.toggle('loading', on); };

      /* voorbeeld-betaalmethoden aanklikbaar maken */
      $$('.pm', root).forEach(pm => {
        const pick = () => $$('.pm', root).forEach(x => { x.classList.toggle('on', x === pm); x.setAttribute('aria-checked', String(x === pm)); });
        pm.addEventListener('click', pick);
        pm.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(); } });
      });

      /* gegevens onthouden in deze browser, voor de volgende keer */
      const remember = () => {
        const data = Object.fromEntries(['email', 'tel', 'first', 'last', 'street', 'zip', 'city'].map(k => [k, form.elements[k].value.trim()]));
        try { localStorage.setItem(CO_KEY, JSON.stringify(data)); } catch { /* geen opslag beschikbaar */ }
        return data;
      };
      form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('invalid'));

      const validate = () => {
        const checks = {
          email: x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
          tel: x => x.replace(/\D/g, '').length >= 8,
          first: x => x.length > 0, last: x => x.length > 0, street: x => /\d/.test(x) && x.length > 3,
          zip: x => /^\d{4}$/.test(x), city: x => x.length > 1
        };
        const bad = Object.keys(checks).filter(k => !checks[k](form.elements[k].value.trim()));
        Object.keys(checks).forEach(k => form.elements[k].closest('.field').classList.toggle('invalid', bad.includes(k)));
        if (bad.length) {
          const names = { email: 'je e-mailadres', tel: 'je telefoonnummer', first: 'je voornaam', last: 'je achternaam', street: 'je straat en huisnummer', zip: 'een Belgische postcode van 4 cijfers', city: 'je gemeente' };
          setMsg(`Vul ${bad.map(k => names[k]).join(', ').replace(/, ([^,]*)$/, ' en $1')} in.`, 'err');
          form.elements[bad[0]].focus();
          return false;
        }
        if (!form.elements.terms.checked) {
          setMsg('Vink aan dat je akkoord gaat met de verzend- en retourvoorwaarden.', 'err');
          form.elements.terms.focus();
          return false;
        }
        return true;
      };

      /* Stripe koppelen als de betaalfunctie op Netlify klaarstaat */
      let live = null;
      (async () => {
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 9000);
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: lines.map(l => ({ id: l.id, size: l.size || '', qty: l.qty })) }),
            signal: ctrl.signal
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 400 && data.error) { setMsg(esc(data.error) + ' <a href="tas.html">Naar je tas</a>', 'err'); payBtn.disabled = true; return; }
          if (!res.ok || !data.clientSecret) return;
          await loadScript('https://js.stripe.com/v3/');
          const stripe = window.Stripe(data.publishableKey, { locale: 'nl' });
          const elements = stripe.elements({
            clientSecret: data.clientSecret,
            appearance: stripeAppearance(),
            fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=DM+Mono&display=swap' }]
          });
          const el = $('#payment-element');
          el.hidden = false;
          $('#pay-mock').hidden = true;
          const payment = elements.create('payment', {
            layout: { type: 'accordion', defaultCollapsed: false, radios: true, spacedAccordionItems: true },
            paymentMethodOrder: ['bancontact', 'card', 'apple_pay', 'google_pay'],
            fields: { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } }
          });
          payment.on('loaderror', () => { el.hidden = true; $('#pay-mock').hidden = false; live = null; });
          payment.mount(el);
          live = { stripe, elements, data };
          if (data.amount && Math.abs(data.amount / 100 - totals.total) > 0.001) {
            $('.pay-label', payBtn).innerHTML = `${LOCK}Betaal ${eur(data.amount / 100, 2)}`;
          }
        } catch { /* geen betaalfunctie bereikbaar: het voorbeeld blijft staan */ }
      })();

      form.addEventListener('submit', async e => {
        e.preventDefault();
        setMsg('');
        if (!validate()) return;
        const c = remember();
        if (!live) {
          setMsg('Dit is nog een voorbeeld: betalen werkt zodra de Stripe-sleutels in Netlify staan. <a href="bedankt.html#voorbeeld">Bekijk hoe de bevestiging eruitziet</a>.', 'err');
          return;
        }
        setLoading(true);
        const name = `${c.first} ${c.last}`;
        const address = { line1: c.street, line2: '', city: c.city, postal_code: c.zip, state: '', country: SHOP.country };
        try {
          sessionStorage.setItem(LAST_KEY, JSON.stringify({ order: live.data.order, lines, totals, first: c.first, email: c.email }));
        } catch { /* niet erg: de bedankpagina toont dan een korte versie */ }
        const { error } = await live.stripe.confirmPayment({
          elements: live.elements,
          confirmParams: {
            return_url: new URL('bedankt.html', location.href).href,
            receipt_email: c.email,
            shipping: { name, phone: c.tel, address },
            payment_method_data: { billing_details: { name, email: c.email, phone: c.tel, address } }
          }
        });
        /* Hier kom je alleen bij een fout; anders stuurt Stripe door naar bedankt.html */
        setLoading(false);
        setMsg(esc(error?.message || 'Betalen is niet gelukt. Probeer het opnieuw of kies een andere betaalmethode.'), 'err');
      });
    },

    bedankt() {
      setCurrent('');
      const root = $('#thanks-root');
      const params = new URLSearchParams(location.search);
      const status = params.get('redirect_status');
      const preview = location.hash === '#voorbeeld' && !status;
      let info = null;
      try { info = JSON.parse(sessionStorage.getItem(LAST_KEY) || 'null'); } catch { info = null; }

      if (status === 'succeeded') bag.write([]);

      if (status === 'failed' || status === 'requires_payment_method') {
        root.innerHTML = `
<div class="thanks thanks-fail">
  ${dropSvg('thanks-drop')}
  <span class="eyebrow">Betaling niet gelukt</span>
  <h1>Er is <em>niets</em> afgeschreven</h1>
  <p>De betaling is afgebroken of geweigerd. Je tas staat nog klaar, dus je kunt het meteen opnieuw proberen, eventueel met een andere betaalmethode.</p>
  <div class="hero-actions"><a class="btn btn-gold" href="afrekenen.html">Probeer opnieuw</a><a class="btn btn-ghost" href="tas.html">Naar je tas</a></div>
</div>`;
        return;
      }
      if (status === 'processing') {
        root.innerHTML = `
<div class="thanks">
  ${dropSvg('thanks-drop')}
  <span class="eyebrow">Bijna klaar</span>
  <h1>Je betaling wordt <em>verwerkt</em></h1>
  <p>Je bank bevestigt de betaling nog. Zodra dat gebeurt, krijg je een bevestiging per e-mail${info?.email ? ` op <b>${esc(info.email)}</b>` : ''}. Je hoeft niets meer te doen.</p>
  ${info?.order ? `<p class="order-no"><span>Bestelnummer</span>${esc(info.order)}</p>` : ''}
  <a class="btn btn-ghost" href="index.html">Terug naar de homepage</a>
</div>`;
        return;
      }
      if (status !== 'succeeded' && !preview) {
        root.innerHTML = `
<div class="thanks">
  ${dropSvg('thanks-drop')}
  <h1>Geen bestelling <em>gevonden</em></h1>
  <p>Deze pagina toont je bevestiging direct na het betalen. Heb je net besteld, kijk dan in je mailbox voor de bevestiging.</p>
  <div class="hero-actions"><a class="btn btn-gold" href="collectie.html">Naar de collectie</a><a class="btn btn-ghost" href="contact.html">Contact</a></div>
</div>`;
        return;
      }

      if (preview) {
        const lines = bag.read().length ? bag.read() : [{ id: 'molten', size: 'M', qty: 1 }, { id: 'gild-runner', size: '43', qty: 1 }];
        info = { order: 'DI-VOORBEELD', lines, totals: totalsFor(lines), first: 'Sarah', email: 'sarah@voorbeeld.be' };
      }
      const lines = (info?.lines || []).filter(l => byId(l.id));
      root.innerHTML = `
<div class="thanks">
  ${preview ? '<span class="preview-tag">Voorbeeld</span>' : ''}
  ${dropSvg('thanks-drop')}
  <span class="eyebrow">Bestelling geplaatst</span>
  <h1>Bedankt${info?.first ? `, <em>${esc(info.first)}</em>` : ''}</h1>
  <p>Je betaling is gelukt. We sturen een bevestiging${info?.email ? ` naar <b>${esc(info.email)}</b>` : ' per e-mail'} en laten weten zodra je pakket onderweg is.</p>
  ${info?.order ? `<p class="order-no"><span>Bestelnummer</span>${esc(info.order)}</p>` : ''}
</div>
${lines.length ? `
<div class="thanks-grid">
  <section class="co-summary">
    <div class="co-summary-head"><h2>Je bestelling</h2></div>
    <div class="co-lines">${orderLines(lines)}</div>
    ${sumRows(info.totals || totalsFor(lines))}
    <p class="muted small">${BRAND.vatNote}.</p>
  </section>
  <section class="next">
    <h2>Wat gebeurt er nu?</h2>
    <ol>
      <li><b>Bevestiging</b><span>Je krijgt binnen een paar minuten een e-mail met je bestelling.</span></li>
      <li><b>Inpakken</b><span>We pakken alles in een linnen doos, op werkdagen dezelfde dag als je voor 15:00 bestelde.</span></li>
      <li><b>Onderweg</b><span>Je ontvangt een track-and-tracecode zodra het pakket vertrekt.</span></li>
      <li><b>Bezorgd</b><span>Binnen 1 tot 2 werkdagen bij jou thuis.</span></li>
    </ol>
    <div class="hero-actions"><a class="btn btn-gold" href="collectie.html">Verder winkelen</a><a class="btn btn-ghost" href="contact.html">Vraag over je bestelling</a></div>
  </section>
</div>` : `<div class="thanks"><a class="btn btn-gold" href="collectie.html">Verder winkelen</a></div>`}`;
    },

    atelier() { setCurrent('atelier'); }
  };

  /* ---------- Opstarten ---------- */
  const main = $('[data-page]');
  const page = main?.dataset.page || 'home';
  document.body.insertAdjacentHTML('afterbegin', DEFS + header());
  document.body.insertAdjacentHTML('beforeend', footer());
  $$('[data-seal]').forEach(el => { el.innerHTML = seal(); });
  $$('[data-email]').forEach(el => { el.textContent = BRAND.email; });
  $$('[data-copy-email]').forEach(el => { el.dataset.copy = BRAND.email; });

  /* Tekeningen en logo ook beschikbaar voor andere pagina's (zoals de marketingstudio) */
  window.DrippArt = { art, seal, markSvg, dropSvg, byId, PRODUCTS, CATS };

  wireHeader();
  updateCount(false);
  window.addEventListener('storage', e => { if (e.key === KEY) updateCount(false); });
  wireForms();
  pages[page]?.();
})();
