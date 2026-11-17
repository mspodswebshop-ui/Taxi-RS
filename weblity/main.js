// Weblity — gedeeld gedrag voor alle pagina's: menu, animaties en de schermen
// van de projecten. Alles hier is versiering: zonder dit script blijft elke
// pagina leesbaar en bruikbaar.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const muis = matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  root.classList.remove('geen-js');

  /* ---------- Kop, menu en voortgangsbalk ---------- */
  const kop = $('.kop');
  let wacht = false;
  function scroll() {
    wacht = false;
    kop.classList.toggle('vast', scrollY > 20);
    root.style.setProperty('--scroll', (scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(4));
  }
  addEventListener('scroll', () => { if (!wacht) { wacht = true; requestAnimationFrame(scroll); } }, { passive: true });
  scroll();

  const menuknop = $('.menuknop');
  const zetMenu = open => {
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    menuknop.setAttribute('aria-expanded', open);
    menuknop.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
  };
  menuknop.addEventListener('click', () => zetMenu(!document.body.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') zetMenu(false); });
  // Bij "terug" in de browser mag het menu niet open blijven staan.
  addEventListener('pageshow', () => zetMenu(false));

  /* ---------- In beeld schuiven ---------- */
  // Elementen naast elkaar krijgen elk een kleine vertraging, zodat ze na elkaar verschijnen.
  $$('[data-reveal]').forEach(el => {
    if (el.style.getPropertyValue('--d')) return;
    const buren = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    el.style.setProperty('--d', Math.min(buren.indexOf(el), 6));
  });
  const kijker = new IntersectionObserver(items => items.forEach(item => {
    if (!item.isIntersecting) return;
    item.target.classList.add('in');
    kijker.unobserve(item.target);
    item.target.dispatchEvent(new CustomEvent('inbeeld'));
  }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], .scherm-wrap, .dienstbeeld').forEach(el => kijker.observe(el));

  /* ---------- Lichtvlek op kaarten ---------- */
  if (muis) {
    $$('.kaart').forEach(kaart => kaart.addEventListener('pointermove', e => {
      const r = kaart.getBoundingClientRect();
      kaart.style.setProperty('--mx', e.clientX - r.left + 'px');
      kaart.style.setProperty('--my', e.clientY - r.top + 'px');
    }));
  }

  /* ---------- Schermen: meekantelen, tellen en typen ---------- */
  const euro = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' });
  function tel(el) {
    const doel = Number(el.dataset.tel), soort = el.dataset.soort, start = performance.now(), duur = 1600;
    (function stap(nu) {
      const k = Math.min(1, (nu - start) / duur), e = 1 - Math.pow(1 - k, 3), v = doel * e;
      el.textContent = soort === 'euro' ? euro.format(v) : Math.round(v) + (soort === 'procent' ? '%' : '');
      if (k < 1) requestAnimationFrame(stap);
    })(start);
  }
  function typ(el) {
    const tekst = el.dataset.typ.replace(/\\n/g, '\n');
    if (rustig) { el.textContent = tekst; el.classList.add('klaar'); return; }
    let i = 0;
    (function stap() {
      i = Math.min(tekst.length, i + 2);
      el.textContent = tekst.slice(0, i);
      if (i < tekst.length) setTimeout(stap, 22); else el.classList.add('klaar');
    })();
  }
  $$('.scherm-wrap').forEach(wrap => {
    wrap.addEventListener('inbeeld', () => {
      setTimeout(() => $$('[data-tel]', wrap).forEach(tel), 500);
      setTimeout(() => $$('[data-typ]', wrap).forEach(typ), 1100);
      // Pas na de intro mag het scherm de muis volgen.
      setTimeout(() => wrap.classList.add('kantel'), 1500);
    }, { once: true });
    if (!muis || rustig) return;
    wrap.addEventListener('pointermove', e => {
      const r = wrap.getBoundingClientRect();
      wrap.style.setProperty('--ty', ((e.clientX - r.left) / r.width - .5) * 9 + 'deg');
      wrap.style.setProperty('--tx', ((e.clientY - r.top) / r.height - .5) * -7 + 'deg');
    });
    wrap.addEventListener('pointerleave', () => { wrap.style.setProperty('--ty', '0deg'); wrap.style.setProperty('--tx', '0deg'); });
  });

  /* ---------- Knop die licht naar de muis trekt ---------- */
  if (muis && !rustig) {
    $$('.knop--groot').forEach(knop => {
      knop.addEventListener('pointermove', e => {
        const r = knop.getBoundingClientRect();
        knop.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      knop.addEventListener('pointerleave', () => { knop.style.transform = ''; });
    });
  }

  /* ---------- Home: lichtstraal met stof ---------- */
  const held = $('.held'), canvas = held && $('canvas', held);
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, zichtbaar = true, stof = [];
    const grens = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    function maat() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = held.clientWidth; H = held.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stof = Array.from({ length: Math.round(Math.min(110, W / 11)) }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3,
        vx: (Math.random() - .5) * .22, vy: -Math.random() * .2 - .03, f: Math.random() * 6.28,
      }));
    }
    function teken(t) {
      if (zichtbaar) {
        ctx.clearRect(0, 0, W, H);
        const ox = W * 1.04, oy = -H * .08, flikker = .9 + Math.sin(t / 900) * .06;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.hypot(W, H) * 1.05);
        g.addColorStop(0, `rgba(255,226,170,${.3 * flikker})`);
        g.addColorStop(.5, `rgba(232,180,90,${.08 * flikker})`);
        g.addColorStop(1, 'rgba(232,180,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(-W * .1, H * .34); ctx.lineTo(W * .32, H * 1.15); ctx.closePath(); ctx.fill();
        for (const d of stof) {
          d.x += d.vx; d.y += d.vy;
          if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
          if (d.x < -5) d.x = W + 5; else if (d.x > W + 5) d.x = -5;
          // Stof licht alleen op binnen de straal.
          const hoek = Math.atan2(d.y - oy, ox - d.x), inStraal = grens(1 - Math.abs(hoek - .62) / .42);
          ctx.fillStyle = `rgba(255,236,200,${(.05 + inStraal * .6) * (.55 + Math.sin(t / 600 + d.f) * .45)})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
        }
      }
      if (!rustig) requestAnimationFrame(teken);
    }
    new IntersectionObserver(([e]) => { zichtbaar = e.isIntersecting; }).observe(held);
    addEventListener('resize', maat);
    maat();
    requestAnimationFrame(teken);
  }

  /* ---------- Bezoek tellen ---------- */
  // Zonder cookies: de server bewaart geen IP-adres, alleen een code die elke dag verandert.
  // Open de site één keer met ?niet-tellen om je eigen bezoeken op dat toestel niet mee te tellen.
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('niet-tellen')) localStorage.setItem('weblity-niet-tellen', '1');
    if (q.has('wel-tellen')) localStorage.removeItem('weblity-niet-tellen');
    const lokaal = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (localStorage.getItem('weblity-niet-tellen') !== '1' && (lokaal || location.protocol === 'https:') && navigator.sendBeacon) {
      const API = lokaal ? 'http://localhost:4200' : 'https://weblity-beheer.onrender.com';
      navigator.sendBeacon(API + '/api/bezoek', new Blob([JSON.stringify({
        pad: location.pathname, ref: q.get('ref') || q.get('utm_source') || '', verwijzer: document.referrer,
      })], { type: 'text/plain' }));
    }
  } catch { /* tellen is nooit belangrijker dan de site */ }

  const jaar = $('#jaar');
  if (jaar) jaar.textContent = new Date().getFullYear();
})();
