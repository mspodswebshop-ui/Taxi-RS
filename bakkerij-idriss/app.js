// Idriss Bakkerij – gedeelde gegevens en logica voor alle pagina's.

// ===== Aan te passen gegevens (voorbeeldwaarden, nog te controleren) =====
const CONFIG = {
  name: 'Idriss Bakkerij',
  street: 'Blauwstraat 16',
  city: '2850 Boom',
  phoneDisplay: '+32 4xx xx xx xx',
  phoneLink: '+32400000000',
  whatsapp: '32400000000', // internationaal formaat, zonder + of spaties
  googleLink: 'https://maps.app.goo.gl/K7JoyZK6dnaqebdm9',
  googleRating: 4.5,
  googleCount: 59,
};

const HOURS = [ // 0 = zondag ... 6 = zaterdag; null = gesloten
  ['Zondag',    '07:00', '13:00'],
  ['Maandag',   '06:30', '19:00'],
  ['Dinsdag',   '06:30', '19:00'],
  ['Woensdag',  '06:30', '19:00'],
  ['Donderdag', '06:30', '19:00'],
  ['Vrijdag',   '06:30', '19:00'],
  ['Zaterdag',  '06:30', '19:00'],
];

const CATEGORIES = ['Alles', 'Brood', 'Marokkaans', 'Zoet', 'Op bestelling'];

const PRODUCTS = [
  { id: 'wit',       cat: 'Brood',         art: 'loaf',      bg: 'bg1', feat: true,  name: 'Wit brood',            desc: 'Krokante korst, luchtige kruim. De dagelijkse klassieker.', price: 2.60 },
  { id: 'bruin',     cat: 'Brood',         art: 'loaf',      bg: 'bg2',              name: 'Volkorenbrood',        desc: 'Stevig en voedzaam, met volkorenmeel.', price: 2.90 },
  { id: 'stokbrood', cat: 'Brood',         art: 'baguette',  bg: 'bg1',              name: 'Stokbrood',            desc: 'Lang gerezen, knapperig vers.', price: 1.50 },
  { id: 'khobz',     cat: 'Marokkaans',    art: 'round',     bg: 'bg3', feat: true,  name: 'Khobz',                desc: 'Rond Marokkaans brood, perfect bij tajine en soep.', price: 1.50 },
  { id: 'msemen',    cat: 'Marokkaans',    art: 'square',    bg: 'bg3', feat: true,  name: 'Msemen',               desc: 'Gelaagde pannenkoek, lekker met honing of kaas. Per stuk.', price: 1.00 },
  { id: 'harcha',    cat: 'Marokkaans',    art: 'round',     bg: 'bg4',              name: 'Harcha',               desc: 'Griesmeelbroodje, zacht vanbinnen en krokant vanbuiten.', price: 1.00 },
  { id: 'batbout',   cat: 'Marokkaans',    art: 'round',     bg: 'bg2',              name: 'Batbout (6 st.)',      desc: 'Klein pannenbrood, ideaal om te vullen.', price: 3.00 },
  { id: 'croissant', cat: 'Zoet',          art: 'croissant', bg: 'bg1',              name: 'Croissant',            desc: 'Boterig en gelaagd, elke ochtend vers.', price: 1.30 },
  { id: 'koekjes',   cat: 'Zoet',          art: 'cookie',    bg: 'bg5', feat: true,  name: 'Theekoekjes (250 g)',  desc: 'Ghriba, fekkas en meer, voor bij de muntthee.', price: 6.50 },
  { id: 'chebakia',  cat: 'Zoet',          art: 'cookie',    bg: 'bg3',              name: 'Chebakia (250 g)',     desc: 'Met honing en sesam, populair in de ramadan.', price: 7.00 },
  { id: 'taart',     cat: 'Op bestelling', art: 'cake',      bg: 'bg5',              name: 'Feesttaart (8 pers.)', desc: 'Naar keuze, met tekst of foto. 48 u op voorhand.', price: 32.00 },
  { id: 'plateau',   cat: 'Op bestelling', art: 'cookie',    bg: 'bg4',              name: 'Koekjesschaal feest',  desc: 'Voor bruiloft, Suikerfeest of geboorte.', price: 45.00 },
];

// VOORBEELDREVIEWS voor het concept. Vervang door echte Google-reviews
// (met toestemming) voordat de site live gaat.
const REVIEWS = [
  { name: 'Sanae B.',  when: '2 weken geleden',  stars: 5, text: 'Elke zaterdag halen we hier msemen en harcha voor het ontbijt. Altijd warm en vers, en super vriendelijk personeel.', liked: ['Msemen', 'Vriendelijk'] },
  { name: 'Tom V.',    when: '1 maand geleden',  stars: 5, text: 'Beste stokbrood van Boom. Krokant zoals het hoort, en ook vroeg in de ochtend al open.', liked: ['Brood', 'Vroeg open'] },
  { name: 'Yassin E.', when: '1 maand geleden',  stars: 4, text: 'Voor het Suikerfeest een grote koekjesschaal besteld. Mooi gepresenteerd en iedereen vond het lekker.', liked: ['Feestbestelling'] },
  { name: 'Lotte D.',  when: '2 maanden geleden', stars: 5, text: 'Ontdekt via een collega. De khobz is echt een aanrader bij soep. Ik kom zeker terug!', liked: ['Khobz'] },
  { name: 'Karim A.',  when: '3 maanden geleden', stars: 4, text: 'Goede prijzen en veel keuze. Soms een korte rij in het weekend, maar het is het wachten waard.', liked: ['Prijs', 'Keuze'] },
  { name: 'Nadia M.',  when: '4 maanden geleden', stars: 5, text: 'Verjaardagstaart met foto laten maken voor mijn dochter. Prachtig resultaat en heel lekker.', liked: ['Taart', 'Service'] },
];
// ==========================================================================

const euro = n => '€ ' + n.toFixed(2).replace('.', ',');
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const starStr = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

/* ---------- Winkelmandje (blijft bewaard tussen pagina's) ---------- */
const BASKET_KEY = 'idriss-basket';
let basket = {};
try { basket = JSON.parse(localStorage.getItem(BASKET_KEY)) || {}; } catch { basket = {}; }
function saveBasket() { try { localStorage.setItem(BASKET_KEY, JSON.stringify(basket)); } catch {} }
const basketCount = () => Object.values(basket).reduce((a, b) => a + b, 0);

function change(id, delta, notify) {
  basket[id] = Math.max(0, (basket[id] || 0) + delta);
  if (!basket[id]) delete basket[id];
  saveBasket();
  updateFloatCart();
  if (typeof onBasketChange === 'function') onBasketChange();
  if (notify) toast(`${PRODUCTS.find(p => p.id === id).name} toegevoegd`);
}

/* ---------- Tekeningen (SVG-sprite) ---------- */
const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="crust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6a557"/><stop offset="1" stop-color="#9a531d"/></linearGradient>
  <linearGradient id="flat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d39c"/><stop offset="1" stop-color="#c98a43"/></linearGradient>
  <symbol id="loaf" viewBox="0 0 120 80"><path d="M10 60 C10 20 40 8 60 8 C80 8 110 20 110 60 Q110 72 98 72 H22 Q10 72 10 60Z" fill="url(#crust)"/><path d="M35 28 l12 18 M55 22 l12 20 M75 26 l12 18" stroke="#f6d39c" stroke-width="5" stroke-linecap="round"/></symbol>
  <symbol id="baguette" viewBox="0 0 120 80"><rect x="6" y="30" width="108" height="26" rx="13" fill="url(#crust)" transform="rotate(-12 60 43)"/><path d="M26 44 l10 -8 M48 40 l10 -8 M70 35 l10 -8 M92 31 l8 -6" stroke="#f6d39c" stroke-width="4" stroke-linecap="round"/></symbol>
  <symbol id="round" viewBox="0 0 120 80"><ellipse cx="60" cy="48" rx="52" ry="26" fill="url(#flat)"/><ellipse cx="60" cy="44" rx="40" ry="17" fill="#e8b878" opacity=".6"/><g fill="#7a4a24" opacity=".55"><circle cx="45" cy="42" r="1.8"/><circle cx="60" cy="38" r="1.8"/><circle cx="75" cy="44" r="1.8"/><circle cx="54" cy="50" r="1.8"/><circle cx="68" cy="52" r="1.8"/></g></symbol>
  <symbol id="square" viewBox="0 0 120 80"><rect x="22" y="14" width="76" height="56" rx="8" fill="url(#flat)" transform="rotate(-6 60 42)"/><path d="M30 30 H90 M30 44 H90 M30 58 H90" stroke="#b9772f" stroke-width="2" opacity=".45" transform="rotate(-6 60 42)"/></symbol>
  <symbol id="croissant" viewBox="0 0 120 80"><path d="M12 54 Q20 22 60 18 Q100 22 108 54 Q96 46 86 50 Q74 36 60 36 Q46 36 34 50 Q24 46 12 54Z" fill="url(#crust)"/><path d="M44 24 L50 44 M60 20 V40 M76 24 L70 44" stroke="#f6d39c" stroke-width="3" stroke-linecap="round"/></symbol>
  <symbol id="cookie" viewBox="0 0 120 80"><circle cx="45" cy="44" r="24" fill="#e9c48a"/><path d="M33 36 l4 -3 M50 34 l4 2 M42 50 l4 -2 M55 48 l3 3" stroke="#b07a3a" stroke-width="2.5" stroke-linecap="round"/><circle cx="80" cy="40" r="22" fill="#c98a43"/><circle cx="80" cy="40" r="14" fill="none" stroke="#f3d39c" stroke-width="3" stroke-dasharray="4 5"/></symbol>
  <symbol id="cake" viewBox="0 0 120 80"><rect x="24" y="36" width="72" height="34" rx="6" fill="#f3d9bd"/><rect x="24" y="36" width="72" height="10" rx="5" fill="#fff6ea"/><path d="M24 50 H96" stroke="#b5492b" stroke-width="4"/><circle cx="44" cy="30" r="5" fill="#b5492b"/><circle cx="60" cy="28" r="5" fill="#b5492b"/><circle cx="76" cy="30" r="5" fill="#b5492b"/></symbol>
  <symbol id="wheat" viewBox="0 0 24 24"><path d="M12 22V8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><g fill="currentColor"><ellipse cx="9" cy="10" rx="2.2" ry="3.4" transform="rotate(-30 9 10)"/><ellipse cx="15" cy="10" rx="2.2" ry="3.4" transform="rotate(30 15 10)"/><ellipse cx="9" cy="15" rx="2.2" ry="3.4" transform="rotate(-30 9 15)"/><ellipse cx="15" cy="15" rx="2.2" ry="3.4" transform="rotate(30 15 15)"/><ellipse cx="12" cy="5" rx="2" ry="3.2"/></g></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
</defs></svg>`;

/* ---------- Header en footer, gedeeld door alle pagina's ---------- */
const PAGES = [
  ['index.html', 'Home'],
  ['assortiment.html', 'Assortiment'],
  ['over-ons.html', 'Over ons'],
  ['reviews.html', 'Reviews'],
  ['contact.html', 'Contact'],
];

function layout() {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  const here = document.body.dataset.page;
  const links = PAGES.map(([href, label]) =>
    `<a href="${href}"${href === here ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  $('#site-header').outerHTML = `
    <nav class="nav" id="nav">
      <div class="wrap">
        <a href="index.html" class="logo">
          <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#b5492b"/><use href="#wheat" x="8" y="8" width="24" height="24" style="color:#f6c77f"/></svg>
          ${CONFIG.name}
        </a>
        <button class="burger" id="burger" aria-label="Menu openen" aria-expanded="false" aria-controls="menu"><span></span></button>
        <div class="menu" id="menu">
          ${links}
          <a href="bestellen.html" class="btn"${here === 'bestellen.html' ? ' aria-current="page"' : ''}>Bestellen</a>
        </div>
      </div>
    </nav>`;
  $('#burger').onclick = () => {
    const open = $('#nav').classList.toggle('open');
    $('#burger').setAttribute('aria-expanded', open);
  };

  $('#site-footer').outerHTML = `
    <footer class="footer">
      <div class="wrap">
        <div class="cols">
          <div>
            <h4>${CONFIG.name}</h4>
            <p style="margin:0 0 8px">Elke dag vers brood, Marokkaanse specialiteiten en gebak op bestelling, met liefde gebakken in Boom.</p>
            <span class="badge" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#f6e7cf"><span class="dot" data-status-dot></span><span data-status-text></span></span>
          </div>
          <div>
            <h4>Pagina's</h4>
            ${PAGES.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
            <a href="bestellen.html">Bestellen</a>
          </div>
          <div>
            <h4>Contact</h4>
            <span style="display:block;padding:3px 0">${CONFIG.street}, ${CONFIG.city}</span>
            <a href="tel:${CONFIG.phoneLink}">${CONFIG.phoneDisplay}</a>
            <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
            <a href="${CONFIG.googleLink}" target="_blank" rel="noopener">Google Maps</a>
          </div>
        </div>
        <div class="bottom"><span>© ${new Date().getFullYear()} ${CONFIG.name}</span><span>Vers gebakken met liefde</span></div>
      </div>
    </footer>
    <a href="bestellen.html" class="btn float-cart" id="floatCart"></a>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

/* ---------- Open/gesloten ---------- */
function nextOpen(d, mins) {
  for (let k = 0; k < 7; k++) {
    const i = (d + k) % 7, [day, o] = HOURS[i];
    if (!o || (k === 0 && mins >= toMin(o))) continue;
    return k === 0 ? `opent om ${o}` : k === 1 ? `morgen open om ${o}` : `${day.toLowerCase()} open om ${o}`;
  }
  return '';
}

function renderStatus() {
  const now = new Date(), d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  const [, o, c] = HOURS[d];
  const open = o && mins >= toMin(o) && mins < toMin(c);
  $$('[data-status-dot]').forEach(el => el.className = 'dot ' + (open ? 'open' : 'closed'));
  $$('[data-status-text]').forEach(el => el.textContent = open ? `Nu open · tot ${c}` : 'Nu gesloten · ' + nextOpen(d, mins));
  const table = $('#hours');
  if (table) {
    table.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(i => {
      const [day, oo, cc] = HOURS[i];
      return `<tr class="${i === d ? 'today' : ''}"><td>${day}${i === d ? ' (vandaag)' : ''}</td><td>${oo ? oo + ' – ' + cc : 'Gesloten'}</td></tr>`;
    }).join('');
  }
}

/* ---------- Producten ---------- */
function productCard(p) {
  return `
    <article class="card">
      <div class="art ${p.bg}"><span class="tag">${p.cat}</span><svg viewBox="0 0 120 80"><use href="#${p.art}"/></svg></div>
      <div class="body">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="row"><span class="price">${euro(p.price)}</span>
          <button class="add" type="button" aria-label="${p.name} toevoegen" data-id="${p.id}">+</button></div>
      </div>
    </article>`;
}

function renderGrid(el, list) {
  el.innerHTML = list.map(productCard).join('');
  $$('.add', el).forEach(b => b.onclick = () => change(b.dataset.id, 1, true));
}

/* ---------- Reviews ---------- */
const AVATAR_COLORS = ['#b5492b', '#2c4a9a', '#4f6b45', '#c7712a', '#7a3e6b', '#2f7f7a'];
function reviewCard(r, i) {
  const initials = r.name.split(' ').map(w => w[0]).join('');
  return `
    <article class="review">
      <header>
        <span class="avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${initials}</span>
        <span class="who"><b>${r.name}</b><span>${r.when}</span></span>
      </header>
      <span class="stars" aria-label="${r.stars} van 5 sterren">${starStr(r.stars)}</span>
      <p>${r.text}</p>
      ${r.liked ? `<div class="liked">${r.liked.map(l => `<span class="chip">${l}</span>`).join('')}</div>` : ''}
    </article>`;
}

/* ---------- Kleine hulpjes ---------- */
function updateFloatCart() {
  const fc = $('#floatCart');
  if (!fc) return;
  const n = basketCount();
  fc.textContent = `🧺 Bestelling (${n})`;
  fc.classList.toggle('show', n > 0 && document.body.dataset.page !== 'bestellen.html');
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function fillConfig() {
  $$('[data-cfg]').forEach(el => { el.textContent = CONFIG[el.dataset.cfg]; });
  $$('[data-tel]').forEach(el => { el.href = 'tel:' + CONFIG.phoneLink; });
  $$('[data-wa]').forEach(el => { el.href = 'https://wa.me/' + CONFIG.whatsapp; });
  $$('[data-google]').forEach(el => { el.href = CONFIG.googleLink; });
  $$('[data-rating]').forEach(el => { el.textContent = CONFIG.googleRating.toFixed(1).replace('.', ','); });
  $$('[data-rating-stars]').forEach(el => { el.textContent = starStr(CONFIG.googleRating); });
  $$('[data-rating-count]').forEach(el => { el.textContent = CONFIG.googleCount; });
}

/* ---------- Start ---------- */
layout();
fillConfig();
renderStatus();
updateFloatCart();
setInterval(renderStatus, 60000);
