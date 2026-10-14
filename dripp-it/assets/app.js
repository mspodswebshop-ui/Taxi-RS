/* Dripp It — gedeelde code voor alle pagina's.
   Elke pagina heeft een <main data-page="..."> en laadt dit bestand onderaan. */
(() => {
  'use strict';

  /* ---------- Merkgegevens (pas hier aan) ---------- */
  const BRAND = {
    name: 'Dripp It',
    email: 'hallo@drippit.nl',
    city: 'Amsterdam',
    freeShipFrom: 250,
    shipping: { NL: 6.95, BE: 9.95, EU: 14.95 }
  };

  /* ---------- Producten ---------- */
  const CLOTHES = ['S', 'M', 'L', 'XL'];
  const PRODUCTS = [
    {
      id: 'molten', name: 'Molten Hoodie', cat: 'kleding', price: 289, shape: 'hoodie',
      color: '#2B2228', colorName: 'Onyx', ed: 37, edMax: 250, left: 41, tag: 'Signature', featured: 1,
      sizes: CLOTHES, fit: 'Oversized. Neem je normale maat voor een ruime val.',
      material: '480 g/m² loopback katoen, 100% biologisch',
      desc: 'Onze signatuur. Een zware, oversized hoodie met dubbellaagse capuchon, vergulde koordeinden en drie gouden druppels die van de zoom lijken te lekken.',
      details: ['Dubbellaagse capuchon', 'Koordeinden van verguld messing', 'Kangoeroezak met verborgen naden', 'Drie druppels, geborduurd met 24k verguld garen']
    },
    {
      id: 'drop', name: 'Drop Tee', cat: 'kleding', price: 129, shape: 'tee',
      color: '#D8C19A', colorName: 'Champagne', ed: 112, edMax: 250, left: 96, tag: 'Nieuw', featured: 2,
      sizes: CLOTHES, fit: 'Relaxed. Valt normaal op maat.',
      material: '260 g/m² gekamd jersey, 100% katoen',
      desc: 'Een stevig gebreid T-shirt met dichte ribkraag en één geborduurde druppel op de borst. Het basisstuk onder alles wat je draagt.',
      details: ['Ribkraag van 2 cm die zijn vorm houdt', 'Gouden druppel op de borst', 'Afgewerkt met zijsplitjes', 'Voorgekrompen, krimpt niet in de was']
    },
    {
      id: 'bordeaux', name: 'Bordeaux Bomber', cat: 'kleding', price: 549, shape: 'jacket',
      color: '#6B2236', colorName: 'Wijnrood', ed: 219, edMax: 250, left: 11, tag: 'Laatste stuks', hot: true, featured: 3,
      sizes: CLOTHES, soldOut: ['XL'], fit: 'Regular. Valt normaal op maat, iets kort in het lijf.',
      material: 'Zware duchesse-satijn met gewatteerde voering',
      desc: 'Een bomber in diep wijnrood satijn met een vergulde rits over de volle lengte. Binnenin een gewatteerde voering met het nummer van jouw exemplaar.',
      details: ['Vergulde rits van Riri', 'Gebreide boorden in onyx', 'Binnenzak met druppelvormige trekker', 'Voering met genummerd label']
    },
    {
      id: 'pour', name: 'Pour Cargo', cat: 'kleding', price: 239, shape: 'pants',
      color: '#3A3236', colorName: 'Antraciet', ed: 84, edMax: 250, left: 63, tag: 'Collectie 01',
      sizes: CLOTHES, fit: 'Wijd met een tapse enkel. Neem je normale maat.',
      material: '340 g/m² katoenen twill',
      desc: 'Een wijde cargobroek in zware twill met platte zakken en twee gouden druppels aan de enkels. Strak genoeg voor de avond, ruim genoeg voor de dag.',
      details: ['Elastische tailleband met koord', 'Platte opgestikte zakken', 'Verstelbare enkels', 'Druppels aan beide pijpen']
    },
    {
      id: 'gilded', name: 'Gilded Crewneck', cat: 'kleding', price: 249, shape: 'crew',
      color: '#E6DDCF', colorName: 'Ivoor', ed: 61, edMax: 250, left: 58, tag: 'Nieuw',
      sizes: CLOTHES, fit: 'Boxy. Neem een maat kleiner voor een nauwere pasvorm.',
      material: '420 g/m² French terry, 100% katoen',
      desc: 'Een ivoorkleurige sweater met het woordmerk in goud op de borst. Zacht aan de binnenkant, strak aan de buitenkant.',
      details: ['Woordmerk in verguld borduursel', 'Brede ribboorden', 'Verlaagde schoudernaad', 'Druppels langs de zoom']
    },
    {
      id: 'nectar', name: 'Nectar Overshirt', cat: 'kleding', price: 319, shape: 'shirt',
      color: '#7A4E2D', colorName: 'Cognac', ed: 145, edMax: 250, left: 27, tag: 'Collectie 01',
      sizes: CLOTHES, fit: 'Ruim. Draag hem open als jasje of dicht als overhemd.',
      material: 'Wol-kasjmier flanel, 80/20',
      desc: 'Een warm overshirt in cognac flanel met vergulde drukknopen en twee borstzakken. Het jasje voor tussen de seizoenen.',
      details: ['Vergulde drukknopen', 'Twee borstzakken met klep', 'Afgeronde zoom', 'Gevoerde kraag']
    },
    {
      id: 'halo', name: 'Halo Cap', cat: 'accessoires', price: 89, shape: 'cap',
      color: '#1F191D', colorName: 'Onyx', ed: 156, edMax: 250, left: 88, tag: 'Accessoire',
      sizes: ['One size'], fit: 'Verstelbaar met een leren bandje en gouden gesp.',
      material: 'Wolmix met vergulde knoop',
      desc: 'Een zespanelen cap in onyx wol met een gouden druppel op de voorkant en een vergulde knoop op de kruin.',
      details: ['Leren verstelbandje', 'Gesp van verguld messing', 'Gevoerd zweetbandje', 'Geborduurde druppel']
    },
    {
      id: 'vault', name: 'Vault Tote', cat: 'accessoires', price: 349, shape: 'bag',
      color: '#4A3A2C', colorName: 'Espresso', ed: 9, edMax: 100, left: 6, tag: 'Laatste stuks', hot: true,
      sizes: ['One size'], fit: '38 × 34 × 14 cm. Past een 15-inch laptop.',
      material: 'Volnerf Italiaans leer, plantaardig gelooid',
      desc: 'Een gestructureerde tas van volnerf leer met een vergulde sluiting. Het leer kleurt met de jaren donkerder en mooier.',
      details: ['Vergulde magneetsluiting', 'Binnenvak met rits', 'Handgeschilderde randen', 'Oplage van 100 stuks']
    },
    {
      id: 'still', name: 'Still Beanie', cat: 'accessoires', price: 79, shape: 'beanie',
      color: '#5E1F30', colorName: 'Bordeaux', ed: 201, edMax: 250, left: 120, tag: 'Accessoire',
      sizes: ['One size'], fit: 'Rekbaar, past de meeste hoofdomtrekken.',
      material: 'Merinowol, extra fijn',
      desc: 'Een fijngebreide muts in bordeaux merino met een omgeslagen boord en een kleine gouden druppel.',
      details: ['Extra fijne merinowol', 'Dubbele omslag', 'Kriebelt niet', 'Geborduurde druppel']
    },
    {
      id: 'droplet', name: 'Droplet Hanger', cat: 'accessoires', price: 159, shape: 'pendant',
      color: '#CFAE6E', colorName: 'Verguld zilver', ed: 23, edMax: 100, left: 17, tag: 'Sieraad',
      sizes: ['45 cm', '55 cm'], fit: 'Kies de lengte van de ketting.',
      material: '925 sterling zilver, 18k verguld',
      desc: 'De druppel uit ons logo als hanger. Massief zilver met een dikke laag 18 karaat goud, aan een fijne venetiaanse ketting.',
      details: ['925 sterling zilver', '3 micron 18k verguldsel', 'Gegraveerd met jouw nummer', 'Geleverd in een linnen etui']
    }
  ];
  const byId = id => PRODUCTS.find(p => p.id === id);

  const LOOKS = [
    { name: 'Onyx op onyx', main: 'molten', acc: 'halo', with: ['molten', 'pour', 'halo'] },
    { name: 'Wijnrood na middernacht', main: 'bordeaux', acc: 'droplet', with: ['bordeaux', 'drop', 'droplet'] },
    { name: 'Champagne', main: 'drop', acc: 'vault', with: ['drop', 'pour', 'vault'] },
    { name: 'Ivoor en cognac', main: 'nectar', acc: 'still', with: ['nectar', 'gilded', 'still'] }
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

  const markSvg = (size, label) =>
    `<svg ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} style="width:${size}px;height:${size}px"><use href="#mark"/></svg>`;
  const dropSvg = cls => `<svg class="${cls || ''}" viewBox="0 0 20 30" aria-hidden="true"><use href="#drop"/></svg>`;

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

  /* ---------- SVG: kledingstukken ---------- */
  const drip = (x, y, s) =>
    `<path d="M${x} ${y} C${x} ${y} ${x - 4 * s} ${y + 8 * s} ${x - 4 * s} ${y + 12 * s} A${4 * s} ${4 * s} 0 0 0 ${x + 4 * s} ${y + 12 * s} C${x + 4 * s} ${y + 8 * s} ${x} ${y} ${x} ${y} Z" fill="url(#goldV)"/>` +
    `<ellipse cx="${x - 1.4 * s}" cy="${y + 11 * s}" rx="${1 * s}" ry="${1.6 * s}" fill="#fff" fill-opacity=".35"/>`;
  const bigDrop = (x, y, s) =>
    `<path d="M${x} ${y} C${x} ${y} ${x - 10 * s} ${y + 14 * s} ${x - 10 * s} ${y + 22 * s} A${10 * s} ${10 * s} 0 0 0 ${x + 10 * s} ${y + 22 * s} C${x + 10 * s} ${y + 14 * s} ${x} ${y} ${x} ${y} Z" fill="url(#goldV)"/>` +
    `<ellipse cx="${x - 3.5 * s}" cy="${y + 20 * s}" rx="${2.4 * s}" ry="${4 * s}" fill="#fff" fill-opacity=".3"/>`;
  const SEAM = 'stroke="rgba(255,255,255,.13)" stroke-width="1" fill="none"';
  const DARK = 'rgba(0,0,0,.32)';

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
    crew: {
      d: 'M64 30 L86 22 Q100 34 114 22 L136 30 L170 52 L182 176 L158 180 L148 88 L146 204 L54 204 L52 88 L42 180 L18 176 L30 52 Z',
      extra: () => `
        <path d="M86 22 Q100 36 114 22" stroke="${DARK}" stroke-width="6" fill="none"/>
        <path d="M54 194 H146 M20 168 L42 170 M158 170 L180 168" stroke="${DARK}" stroke-width="7"/>
        <text x="100" y="84" text-anchor="middle" font-family="Bodoni Moda, Didot, Georgia, serif" font-size="15" letter-spacing="2.4" fill="url(#gold)">DRIPP <tspan font-style="italic">It</tspan></text>
        <path d="M84 92 H116" stroke="url(#gold)" stroke-width=".8"/>`,
      drips: [[74, .9], [96, 1.3], [126, 1]], y: 204, zoom: '58 58 84 94'
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
      drips: [[64, 1], [100, 1.4], [138, .8]], y: 196, zoom: '60 70 80 90'
    },
    beanie: {
      d: 'M50 150 Q46 58 100 54 Q154 58 150 150 Z',
      extra: c => `
        <rect x="42" y="128" width="116" height="46" rx="4" fill="${c}"/>
        <rect x="42" y="128" width="116" height="46" rx="4" fill="${DARK}"/>
        ${Array.from({ length: 13 }, (_, i) => `<path d="M${50 + i * 8.3} 132 V170" stroke="rgba(255,255,255,.1)"/>`).join('')}
        <path d="M70 62 Q62 100 64 128 M130 62 Q138 100 136 128 M100 54 V128" ${SEAM}/>
        <rect x="88" y="138" width="24" height="26" fill="#141012"/>
        <use href="#drop" x="94" y="141" width="12" height="18"/>`,
      drips: [[66, .9]], y: 174, zoom: '60 110 80 90'
    },
    pendant: {
      d: '',
      extra: () => `
        <path d="M34 20 Q100 160 166 20" fill="none" stroke="url(#goldV)" stroke-width="2.2" stroke-dasharray="3.5 1.6"/>
        <circle cx="100" cy="91" r="5" fill="none" stroke="url(#gold)" stroke-width="2.4"/>
        <path d="M100 98 C100 98 74 134 74 152 A26 26 0 0 0 126 152 C126 134 100 98 100 98 Z" fill="url(#goldV)"/>
        <path d="M100 98 C100 98 74 134 74 152 A26 26 0 0 0 126 152 C126 134 100 98 100 98 Z" fill="url(#dropShine)"/>
        <ellipse cx="90" cy="148" rx="4" ry="8" fill="#fff" fill-opacity=".35"/>`,
      drips: [], y: 0, zoom: '64 84 72 81'
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

  /* ---------- Winkeltas ---------- */
  const KEY = 'drippit-bag-v1';
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
    $$('.bag-count').forEach(el => {
      el.textContent = bag.count();
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
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

  /* ---------- Kop en voet ---------- */
  const NAV = [
    ['collectie.html', 'Collectie', 'collectie'],
    ['atelier.html', 'Atelier', 'atelier'],
    ['service.html', 'Service', 'service'],
    ['contact.html', 'Contact', 'contact']
  ];

  function header(page) {
    const cur = key => (key === page || (page === 'product' && key === 'collectie')) ? ' aria-current="page"' : '';
    return `
<div class="announce"><div class="wrap">Gratis verzending in Nederland vanaf <b>${eur(BRAND.freeShipFrom)}</b> · Retour binnen 30 dagen</div></div>
<header class="nav" id="nav">
  <div class="wrap">
    <nav class="nav-links" aria-label="Hoofdmenu">${NAV.map(([h, t, k]) => `<a href="${h}"${cur(k)}>${t}</a>`).join('')}</nav>
    <a class="brand" href="index.html" aria-label="${BRAND.name}, naar de homepage">${markSvg(38)}<span class="brand-word">DRIPP <em>It</em></span></a>
    <div class="nav-end">
      <a class="bag-link" href="tas.html"${page === 'tas' ? ' aria-current="page"' : ''} aria-label="Winkeltas"><span class="bag-label">Tas</span> <span class="bag-count">0</span></a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Menu openen"><span></span></button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    <nav class="wrap" aria-label="Mobiel menu">
      <a href="index.html"${page === 'home' ? ' aria-current="page"' : ''}>Home <small>00</small></a>
      ${NAV.map(([h, t, k], i) => `<a href="${h}"${cur(k)}>${t} <small>0${i + 1}</small></a>`).join('')}
      <a href="tas.html"${page === 'tas' ? ' aria-current="page"' : ''}>Tas <small class="bag-count">0</small></a>
    </nav>
  </div>
</header>`;
  }

  function footer() {
    return `
<footer class="site-footer">
  <div class="wrap">
    <div class="foot">
      <div class="foot-brand">
        <a class="brand" href="index.html">${markSvg(52)}<span class="brand-word">DRIPP <em>It</em></span></a>
        <p>Luxe streetwear in kleine, genummerde oplages. Ontworpen in ${BRAND.city}, gemaakt om jaren te dragen.</p>
      </div>
      <div><h4>Shop</h4><ul>
        <li><a href="collectie.html">Alle stukken</a></li>
        <li><a href="collectie.html#kleding">Kleding</a></li>
        <li><a href="collectie.html#accessoires">Accessoires</a></li>
        <li><a href="tas.html">Winkeltas</a></li>
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
      <span>© ${new Date().getFullYear()} ${BRAND.name} · Alle prijzen zijn inclusief btw</span>
      <span class="pay" aria-label="Betaalmethoden"><span>iDEAL</span><span>Bancontact</span><span>Visa</span><span>Mastercard</span><span>Apple Pay</span></span>
    </div>
  </div>
</footer>`;
  }

  /* ---------- Productkaart ---------- */
  function card(p) {
    return `
<a class="card" href="product.html#${p.id}">
  <div class="art">
    <span class="tag${p.hot ? ' hot' : ''}">${esc(p.tag)}</span>
    ${art(p)}
    <span class="edition">Nº ${pad(p.ed)} / ${p.edMax}</span>
    <span class="view">Bekijk stuk</span>
  </div>
  <div class="card-row"><h3 class="card-name">${esc(p.name)}</h3><span class="card-price">${eur(p.price)}</span></div>
  <p class="card-meta"><span class="swatch" style="background:${p.color}"></span>${esc(p.colorName)} · ${esc(p.material.split(',')[0])}</p>
</a>`;
  }

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

  /* ---------- Pagina's ---------- */
  const pages = {
    home() {
      const hero = $('#hero-art');
      if (hero) hero.innerHTML = art(byId('molten'));
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
      const chips = $$('.chip');
      const sort = $('#sort');
      $$('.chip sup').forEach(s => {
        const f = s.closest('.chip').dataset.filter;
        s.textContent = f === 'alles' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === f).length;
      });
      const state = { filter: ['kleding', 'accessoires'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'alles', sort: 'uitgelicht' };
      const render = () => {
        let list = PRODUCTS.filter(p => state.filter === 'alles' || p.cat === state.filter);
        if (state.sort === 'laag') list = [...list].sort((a, b) => a.price - b.price);
        if (state.sort === 'hoog') list = [...list].sort((a, b) => b.price - a.price);
        if (state.sort === 'schaars') list = [...list].sort((a, b) => a.left / a.edMax - b.left / b.edMax);
        grid.innerHTML = list.map(card).join('');
        count.textContent = `${list.length} ${list.length === 1 ? 'stuk' : 'stukken'}`;
        chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === state.filter)));
      };
      chips.forEach(c => c.addEventListener('click', () => {
        state.filter = c.dataset.filter;
        try { history.replaceState(null, '', state.filter === 'alles' ? location.pathname : '#' + state.filter); } catch { /* niet toegestaan */ }
        render();
      }));
      sort.addEventListener('change', () => { state.sort = sort.value; render(); });
      window.addEventListener('hashchange', () => {
        const h = location.hash.slice(1);
        state.filter = ['kleding', 'accessoires'].includes(h) ? h : 'alles';
        render();
      });
      render();
    },

    product() {
      const root = $('#pdp');
      const related = $('#related');
      const render = () => {
        const p = byId(location.hash.slice(1)) || PRODUCTS[0];
        document.title = `${p.name} · ${BRAND.name}`;
        const sold = p.soldOut || [];
        const firstFree = p.sizes.find(s => !sold.includes(s));
        const defSize = p.sizes.length > 1 ? (p.sizes.includes('M') && !sold.includes('M') ? 'M' : firstFree) : p.sizes[0];
        const low = p.left <= 20;
        root.innerHTML = `
<div class="gallery">
  <div class="stage" id="stage">
    <span class="view-label" id="view-label">Vooraanzicht</span>
    ${art(p)}
    <span class="edition">Nº ${pad(p.ed)} / ${p.edMax}</span>
  </div>
  <div class="thumbs" role="group" aria-label="Weergaven">
    <button class="thumb" type="button" data-view="front" data-label="Vooraanzicht" aria-pressed="true">${art(p)}</button>
    <button class="thumb" type="button" data-view="detail" data-label="Detail" aria-pressed="false">${art(p, 'detail')}</button>
    <button class="thumb" type="button" data-view="label" data-label="Genummerd label" aria-pressed="false">${art(p, 'label')}</button>
  </div>
</div>
<div class="buybox">
  <nav class="crumbs" aria-label="Kruimelpad"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="collectie.html#${p.cat}">${p.cat === 'kleding' ? 'Kleding' : 'Accessoires'}</a><span aria-hidden="true">/</span><span>${esc(p.name)}</span></nav>
  <div style="display:grid;gap:14px">
    <span class="eyebrow">${esc(p.tag)} · Collectie 01</span>
    <h1>${esc(p.name)}</h1>
    <div class="price-line">
      <span class="price-big">${eur(p.price)}</span>
      <span class="stock${low ? ' low' : ''}">Nog ${p.left} van ${p.edMax} beschikbaar</span>
    </div>
  </div>
  <p class="pdp-desc">${esc(p.desc)}</p>
  <div class="opt">
    <div class="opt-head"><span class="label">Kleur</span><span class="muted" style="font-size:.9rem">${esc(p.colorName)}</span></div>
    <div class="card-meta"><span class="swatch" style="background:${p.color};width:28px;height:28px"></span></div>
  </div>
  <div class="opt">
    <div class="opt-head"><span class="label">${p.shape === 'pendant' ? 'Lengte' : 'Maat'}</span>${p.cat === 'kleding' ? '<a href="service.html#maten">Maattabel</a>' : ''}</div>
    <div class="size-row" role="group" aria-label="Kies een maat">
      ${p.sizes.map(s => `<button class="size" type="button" data-size="${s}" aria-pressed="${s === defSize}"${sold.includes(s) ? ' disabled title="Uitverkocht" style="opacity:.35;text-decoration:line-through;cursor:not-allowed"' : ''}>${s}</button>`).join('')}
    </div>
    <p class="muted" style="font-size:.88rem">${esc(p.fit)}</p>
  </div>
  <div class="buy-actions">
    <button class="btn btn-gold btn-block" type="button" id="add">In je tas · ${eur(p.price)}</button>
  </div>
  <ul class="perks">
    <li>${dropSvg()}Gratis verzending in Nederland vanaf ${eur(BRAND.freeShipFrom)}</li>
    <li>${dropSvg()}Binnen 30 dagen gratis retour</li>
    <li>${dropSvg()}Geleverd in een linnen doos met certificaat</li>
  </ul>
  <div class="acc">
    <details open><summary>Details</summary><div class="acc-body"><ul>${p.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div></details>
    <details><summary>Materiaal en verzorging</summary><div class="acc-body"><p>${esc(p.material)}.</p><p>${p.cat === 'kleding' ? 'Binnenstebuiten wassen op 30 °C, niet in de droger. Strijk niet over het borduursel.' : p.shape === 'pendant' ? 'Doe de hanger af bij het sporten en zwemmen. Poets met een zachte, droge doek.' : 'Borstel of veeg schoon met een droge doek. Bewaar in de meegeleverde stofzak.'}</p><p><a href="service.html#verzorging">Alle verzorgingstips</a></p></div></details>
    <details><summary>Verzending en retour</summary><div class="acc-body"><p>Besteld voor 15:00 op een werkdag, dezelfde dag verstuurd. In Nederland bezorgen we binnen 1 tot 2 werkdagen.</p><p>Niet goed? Stuur het binnen 30 dagen ongedragen en met zegel terug. <a href="service.html#retour">Zo werkt retourneren</a>.</p></div></details>
  </div>
</div>`;
        let size = defSize;
        $$('.size', root).forEach(b => b.addEventListener('click', () => {
          size = b.dataset.size;
          $$('.size', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        }));
        $$('.thumb', root).forEach(b => b.addEventListener('click', () => {
          $$('.thumb', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          const stage = $('#stage');
          stage.querySelector('svg').outerHTML = art(p, b.dataset.view);
          $('#view-label').textContent = b.dataset.label;
        }));
        $('#add').addEventListener('click', () => {
          bag.add(p.id, size);
          toast(`${p.name} (${size}) ligt in je tas`, true);
        });
        related.innerHTML = PRODUCTS.filter(x => x.id !== p.id)
          .sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat) || a.ed - b.ed)
          .slice(0, 4).map(card).join('');
      };
      window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      render();
    },

    tas() {
      const root = $('#bag-root');
      const render = () => {
        const lines = bag.read();
        if (!lines.length) {
          root.innerHTML = `
<div style="padding-block:clamp(36px,5vw,64px) clamp(72px,9vw,120px)">
<div class="empty">
  ${dropSvg()}
  <h2>Je tas is nog <em>leeg</em></h2>
  <p>Kies een stuk uit Collectie 01. Elk ontwerp heeft een oplage van maximaal 250 stuks, dus wacht niet te lang.</p>
  <a class="btn btn-gold" href="collectie.html">Bekijk de collectie</a>
</div>
<div style="margin-top:64px">
  <div class="head"><div><span class="eyebrow">Misschien iets voor jou</span><h2>Bijna <em>uitverkocht</em></h2></div></div>
  <div class="grid grid-4">${[...PRODUCTS].sort((a, b) => a.left / a.edMax - b.left / b.edMax).slice(0, 4).map(card).join('')}</div>
</div>
</div>`;
          return;
        }
        const sub = bag.subtotal();
        const ship = sub >= BRAND.freeShipFrom ? 0 : BRAND.shipping.NL;
        const toGo = Math.max(0, BRAND.freeShipFrom - sub);
        root.innerHTML = `
<div class="bag-layout">
  <div>
    <div class="head" style="margin-bottom:24px"><div><h2>${bag.count()} ${bag.count() === 1 ? 'stuk' : 'stukken'}</h2></div><a class="link" href="collectie.html">Verder winkelen <span class="arrow">→</span></a></div>
    <div class="lines">
      ${lines.map((l, i) => {
        const p = byId(l.id);
        return `
      <div class="line" data-i="${i}">
        <a class="art" href="product.html#${p.id}" aria-label="${esc(p.name)}">${art(p)}</a>
        <div class="line-info">
          <a href="product.html#${p.id}">${esc(p.name)}</a>
          <span class="muted">${esc(p.colorName)} · ${p.shape === 'pendant' ? 'Lengte' : 'Maat'} ${esc(l.size)}</span>
          <span class="muted">Nº ${pad(p.ed)} / ${p.edMax} · ${eur(p.price)} per stuk</span>
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
      <div class="bar"><i style="width:${Math.min(100, sub / BRAND.freeShipFrom * 100)}%"></i></div>
    </div>
    <dl class="sum-rows">
      <div><dt>Subtotaal</dt><dd>${eur(sub, 2)}</dd></div>
      <div><dt>Verzending (NL)</dt><dd>${ship ? eur(ship, 2) : 'Gratis'}</dd></div>
      <div class="total"><dt>Totaal</dt><dd>${eur(sub + ship, 2)}</dd></div>
    </dl>
    <p class="muted" style="font-size:.84rem">Inclusief btw. Verzendkosten naar België ${eur(BRAND.shipping.BE, 2)}, rest van de EU ${eur(BRAND.shipping.EU, 2)}.</p>
    <button class="btn btn-gold btn-block" type="button" id="checkout">Afrekenen</button>
    <p class="form-msg" id="checkout-msg" role="status"></p>
    <div class="pay"><span>iDEAL</span><span>Bancontact</span><span>Visa</span><span>Mastercard</span><span>Apple Pay</span></div>
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
        $('#checkout').addEventListener('click', () => {
          const m = $('#checkout-msg');
          m.className = 'form-msg err';
          m.textContent = 'Betalen is nog niet gekoppeld. Koppel een betaalprovider zoals Stripe of Mollie om bestellingen te ontvangen.';
        });
      };
      render();
    },

    service() {
      const tables = $$('[data-table]');
      $$('[data-show]').forEach(chip => chip.addEventListener('click', () => {
        $$('[data-show]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
        tables.forEach(t => { t.hidden = t.dataset.table !== chip.dataset.show; });
      }));
    },

    contact() {
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

    atelier() {}
  };

  /* ---------- Opstarten ---------- */
  const main = $('[data-page]');
  const page = main?.dataset.page || 'home';
  document.body.insertAdjacentHTML('afterbegin', DEFS + header(page));
  document.body.insertAdjacentHTML('beforeend', footer());
  $$('[data-seal]').forEach(el => { el.innerHTML = seal(); });
  $$('[data-drop]').forEach(el => { el.innerHTML = dropSvg(); });
  $$('[data-email]').forEach(el => { el.textContent = BRAND.email; });
  $$('[data-copy-email]').forEach(el => { el.dataset.copy = BRAND.email; });

  const nav = $('#nav');
  const menuBtn = $('.menu-btn', nav);
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
  });

  updateCount(false);
  window.addEventListener('storage', e => { if (e.key === KEY) updateCount(false); });
  wireForms();
  pages[page]?.();
})();
