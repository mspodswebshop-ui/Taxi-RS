// Beheerscherm: tabbladen "Bezoekers" en "Verdiend".
// beheer.js laat weten wanneer je ingelogd bent (weblity:start) en wanneer je bij
// een boeking op "€ Betaling" tikt (weblity:betaling).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SITE = 'https://weblity.onrender.com';

  async function api(pad, opties = {}) {
    const r = await fetch(pad, {
      ...opties,
      headers: opties.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opties.body ? JSON.stringify(opties.body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.fout || 'Er ging iets mis.');
    return data;
  }

  const euro = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' });
  const euroRond = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const getal = new Intl.NumberFormat('nl-BE');
  const alsDatum = d => new Date(d + 'T12:00:00Z');
  const dagKort = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dagLang = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const maandKort = new Intl.DateTimeFormat('nl-BE', { month: 'short', timeZone: 'UTC' });
  const maandLang = new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const bedrag = cent => (cent % 100 ? euro : euroRond).format(cent / 100);

  // ---------- Tabbladen ----------
  let actief = 'boekingen';
  const panelen = { boekingen: 'tabBoekingen', bezoekers: 'tabBezoekers', verdiend: 'tabVerdiend' };
  function kies(tab) {
    actief = tab;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    Object.entries(panelen).forEach(([naam, id]) => { $(id).hidden = naam !== tab; });
    verbergTip();
    if (tab === 'bezoekers') laadBezoekers();
    if (tab === 'verdiend') laadInkomsten();
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) kies(b.dataset.tab); });

  // ---------- Staafgrafiek (SVG) ----------
  // Eén reeks, dus geen legende: de titel boven de grafiek zegt wat er staat.
  const NS = 'http://www.w3.org/2000/svg';
  const maak = (naam, attr = {}, ouder) => {
    const el = document.createElementNS(NS, naam);
    for (const [k, v] of Object.entries(attr)) el.setAttribute(k, v);
    if (ouder) ouder.appendChild(el);
    return el;
  };
  /** Ronde stapgrootte voor de as: 1, 2, 5, 10, 20, 50 ... */
  function stap(max, doelStreepjes = 4) {
    const ruw = Math.max(max, 1) / doelStreepjes, macht = 10 ** Math.floor(Math.log10(ruw)), f = ruw / macht;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * macht;
  }
  const kortGetal = v => (v >= 10_000 ? getal.format(Math.round(v / 1000)) + 'K' : getal.format(v));

  function staafGrafiek(houder, punten, { waardeTekst, asTekst = kortGetal, labelOm = 1, leeg = 'Nog geen gegevens.' }) {
    houder.replaceChildren();
    const B = Math.max(280, houder.clientWidth || 600), H = 190;
    const links = 38, rechts = 6, boven = 10, onder = 24;
    const pw = B - links - rechts, ph = H - boven - onder;
    const svg = maak('svg', { viewBox: `0 0 ${B} ${H}`, role: 'img' }, houder);
    const max = Math.max(...punten.map(p => p.waarde), 0);
    const s = stap(max), top = Math.max(s, Math.ceil(max / s) * s);
    const y = v => boven + ph - (v / top) * ph;
    svg.setAttribute('aria-label', `${punten.length} staven, hoogste waarde ${waardeTekst(max)}`);

    for (let v = 0; v <= top + 1e-9; v += s) {
      maak('line', { x1: links, x2: B - rechts, y1: y(v), y2: y(v), class: v === 0 ? 'basis' : 'rooster' }, svg);
      const t = maak('text', { x: links - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'as' }, svg);
      t.textContent = asTekst(v);
    }
    const band = pw / punten.length, breedte = Math.max(2, Math.min(24, band - 2)), r = Math.min(4, breedte / 2);
    const staven = [];
    punten.forEach((p, i) => {
      const x = links + i * band + (band - breedte) / 2, y0 = y(0);
      const h = p.waarde > 0 ? Math.max(2, y0 - y(p.waarde)) : 2;
      const yt = y0 - h, rr = Math.min(r, h);
      // Ronde bovenkant, rechte voet op de basislijn.
      const d = `M${x},${y0} V${yt + rr} Q${x},${yt} ${x + rr},${yt} H${x + breedte - rr} Q${x + breedte},${yt} ${x + breedte},${yt + rr} V${y0} Z`;
      staven.push(maak('path', { d, class: 'staaf' + (p.waarde > 0 ? '' : ' nul') }, svg));
      if (i % labelOm === 0 || i === punten.length - 1) {
        if (i === punten.length - 1 && i % labelOm !== 0 && (i % labelOm) < labelOm * 0.6) return;
        const t = maak('text', { x: x + breedte / 2, y: H - 6, 'text-anchor': 'middle', class: 'as' }, svg);
        t.textContent = p.kort;
      }
    });
    if (max === 0) {
      const t = maak('text', { x: links + pw / 2, y: boven + ph / 2, 'text-anchor': 'middle', class: 'leeg-tekst' }, svg);
      t.textContent = leeg;
    }
    // Ruim vangvlak per staaf, zodat je niet precies op een dunne staaf moet mikken.
    punten.forEach((p, i) => {
      const vang = maak('rect', { x: links + i * band, y: boven, width: band, height: ph, class: 'vang' }, svg);
      const toon = e => {
        staven.forEach((st, j) => st.classList.toggle('aan', j === i));
        houder.classList.add('focus');
        const doos = staven[i].getBoundingClientRect();
        tip(p.lang, waardeTekst(p.waarde), doos.left + doos.width / 2, Math.min(doos.top, (e.clientY ?? doos.top)));
      };
      vang.addEventListener('pointerenter', toon);
      vang.addEventListener('pointerdown', toon);
    });
    svg.addEventListener('pointerleave', () => { houder.classList.remove('focus'); staven.forEach(st => st.classList.remove('aan')); verbergTip(); });
  }

  function tip(titel, waarde, x, y) {
    const t = $('tip');
    t.replaceChildren(document.createTextNode(titel), Object.assign(document.createElement('b'), { textContent: waarde }));
    t.hidden = false;
    const marge = 70;
    t.style.left = Math.min(innerWidth - marge, Math.max(marge, x)) + 'px';
    t.style.top = Math.max(60, y) + 'px';
  }
  function verbergTip() { $('tip').hidden = true; }
  addEventListener('scroll', verbergTip, { passive: true });

  function tabel(houder, kop, rijen) {
    const t = document.createElement('table');
    const kr = t.createTHead().insertRow();
    kop.forEach(k => { const th = document.createElement('th'); th.textContent = k; kr.appendChild(th); });
    const body = t.createTBody();
    rijen.forEach(r => { const tr = body.insertRow(); r.forEach(c => { tr.insertCell().textContent = c; }); });
    houder.replaceChildren(t);
  }

  function meters(houder, rijen, leeg) {
    if (!rijen.length) {
      houder.replaceChildren(Object.assign(document.createElement('p'), { className: 'leeg-tekst', textContent: leeg }));
      return;
    }
    const max = Math.max(...rijen.map(r => r.waarde));
    houder.replaceChildren(...rijen.map(r => {
      const el = document.createElement('div');
      el.className = 'meter';
      const naam = Object.assign(document.createElement('span'), { textContent: r.naam, title: r.naam });
      const getalEl = Object.assign(document.createElement('b'), { textContent: getal.format(r.waarde) });
      const balk = document.createElement('i');
      balk.style.setProperty('--w', Math.max(2, (r.waarde / max) * 100) + '%');
      el.append(naam, getalEl, balk);
      return el;
    }));
  }

  // ---------- Bezoekers ----------
  let dagen = 30, bezoekData = null;
  $('periode').addEventListener('click', e => {
    const b = e.target.closest('button[data-dagen]');
    if (!b) return;
    dagen = Number(b.dataset.dagen);
    document.querySelectorAll('#periode button').forEach(k => k.classList.toggle('aan', k === b));
    laadBezoekers();
  });
  $('bLinkInsta').textContent = SITE + '/?ref=instagram';
  $('bLinkNiet').textContent = SITE + '/?niet-tellen';

  const PAGINA = { '/': 'Home', '/diensten': 'Diensten', '/projecten': 'Projecten', '/werkwijze': 'Werkwijze', '/boeken': 'Boeken' };
  const TOESTEL = { gsm: 'Gsm', computer: 'Computer', tablet: 'Tablet' };

  async function laadBezoekers() {
    try { bezoekData = await api('/api/beheer/bezoekers?dagen=' + dagen); }
    catch (err) { $('bUitleg').textContent = err.message; return; }
    tekenBezoekers();
  }
  function tekenBezoekers() {
    const d = bezoekData;
    if (!d || actief !== 'bezoekers') return;
    const totaal = d.dagen.reduce((a, r) => a + r.bezoekers, 0), weergaven = d.dagen.reduce((a, r) => a + r.weergaven, 0);
    $('bVandaag').textContent = getal.format(d.dagen.at(-1).bezoekers);
    $('bPeriode').textContent = getal.format(totaal);
    $('bPeriodeTekst').textContent = `laatste ${dagen} dagen`;
    $('bBoekingen').textContent = getal.format(d.boekingen);
    $('bUitleg').textContent = d.ooit
      ? `${getal.format(weergaven)} pagina's bekeken in deze periode. ${totaal ? Math.round((d.boekingen / totaal) * 1000) / 10 : 0}% van de bezoekers boekte een gesprek.`
      : 'Er zijn nog geen bezoeken geteld. Vanaf nu telt elke bezoeker van je website mee.';
    staafGrafiek($('bGrafiek'), d.dagen.map(r => ({
      waarde: r.bezoekers, kort: dagKort.format(alsDatum(r.dag)).replace('.', ''),
      lang: dagLang.format(alsDatum(r.dag)) + ` · ${getal.format(r.weergaven)} pagina's`,
    })), {
      waardeTekst: v => `${getal.format(v)} ${v === 1 ? 'bezoeker' : 'bezoekers'}`,
      labelOm: dagen <= 7 ? 1 : dagen <= 30 ? 7 : 15,
      leeg: 'Nog geen bezoekers in deze periode.',
    });
    tabel($('bTabel'), ['Dag', 'Pagina\'s', 'Bezoekers'],
      [...d.dagen].reverse().map(r => [dagLang.format(alsDatum(r.dag)), getal.format(r.weergaven), getal.format(r.bezoekers)]));
    meters($('bBronnen'), d.bronnen.map(r => ({ naam: r.bron, waarde: r.bezoekers })), 'Nog niets bekend. Bezoekers die je adres zelf intypen of een link zonder bron gebruiken, staan hier niet.');
    meters($('bPaginas'), d.paginas.map(r => ({ naam: PAGINA[r.pad] || r.pad, waarde: r.bezoekers })), 'Nog geen bezoeken.');
    meters($('bApparaten'), d.apparaten.map(r => ({ naam: TOESTEL[r.apparaat] || r.apparaat, waarde: r.bezoekers })), 'Nog geen bezoeken.');
  }

  // ---------- Verdiend ----------
  let inkomsten = [], vandaag = '';

  async function laadInkomsten() {
    try { ({ inkomsten, vandaag } = await api('/api/beheer/inkomsten')); }
    catch (err) { $('vFout').textContent = err.message; return; }
    if (!$('vDatum').value) $('vDatum').value = vandaag;
    tekenInkomsten();
  }

  function tekenInkomsten() {
    if (actief !== 'verdiend') return;
    const maand = vandaag.slice(0, 7), jaar = vandaag.slice(0, 4);
    const som = f => inkomsten.filter(f).reduce((a, i) => a + i.bedrag_cent, 0);
    $('vMaand').textContent = bedrag(som(i => i.datum.startsWith(maand)));
    $('vJaar').textContent = bedrag(som(i => i.datum.startsWith(jaar)));
    $('vJaarTekst').textContent = 'in ' + jaar;
    $('vTotaal').textContent = bedrag(som(() => true));

    // De laatste 12 maanden, ook die zonder inkomsten.
    const maanden = [];
    const d = new Date(vandaag.slice(0, 7) + '-15T12:00:00Z');
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d); m.setUTCMonth(d.getUTCMonth() - i);
      const sleutel = m.toISOString().slice(0, 7);
      maanden.push({ sleutel, datum: m, cent: som(x => x.datum.startsWith(sleutel)) });
    }
    staafGrafiek($('vGrafiek'), maanden.map(m => ({
      waarde: m.cent / 100, kort: maandKort.format(m.datum).replace('.', ''), lang: maandLang.format(m.datum),
    })), {
      waardeTekst: v => bedrag(Math.round(v * 100)),
      asTekst: v => '€' + kortGetal(v),
      leeg: 'Nog geen betalingen ingevoerd.',
    });
    tabel($('vTabel'), ['Maand', 'Verdiend'], [...maanden].reverse().map(m => [maandLang.format(m.datum), bedrag(m.cent)]));

    const lijst = $('vLijst');
    if (!inkomsten.length) {
      lijst.replaceChildren(Object.assign(document.createElement('p'), { className: 'klein', textContent: 'Nog geen betalingen. Voeg er hierboven een toe, of tik bij een boeking op "€ Betaling".' }));
      return;
    }
    lijst.replaceChildren(...inkomsten.map(i => {
      const r = document.createElement('div');
      r.className = 'regel';
      const t = document.createElement('time');
      t.dateTime = i.datum;
      t.textContent = dagKort.format(alsDatum(i.datum)).replace('.', '') + (i.datum.startsWith(jaar) ? '' : ' ' + i.datum.slice(0, 4));
      const wat = Object.assign(document.createElement('div'), { className: 'wat', textContent: i.omschrijving });
      if (i.boeking_naam) wat.appendChild(Object.assign(document.createElement('small'), { textContent: 'Boeking van ' + i.boeking_naam }));
      const b = Object.assign(document.createElement('b'), { textContent: bedrag(i.bedrag_cent) });
      const weg = Object.assign(document.createElement('button'), { type: 'button', textContent: '×', title: 'Verwijderen' });
      weg.setAttribute('aria-label', `Betaling "${i.omschrijving}" verwijderen`);
      weg.addEventListener('click', async () => {
        if (!confirm(`De betaling "${i.omschrijving}" van ${bedrag(i.bedrag_cent)} verwijderen?`)) return;
        try { await api('/api/beheer/inkomsten/' + i.id, { method: 'DELETE' }); laadInkomsten(); meldBoekingen(); }
        catch (err) { $('vFout').textContent = err.message; }
      });
      r.append(t, wat, b, weg);
      return r;
    }));
  }

  /** "1.250,50" of "750" of "750.5" naar centen. */
  function naarCent(invoer) {
    let s = String(invoer).replace(/[€\s]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const v = Number(s);
    return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  }

  function wisKoppeling() {
    $('vBoeking').value = '';
    $('vKoppel').hidden = true;
    $('vAnnuleer').hidden = true;
    $('vForm').classList.remove('koppel');
    $('vFormTitel').textContent = 'Betaling toevoegen';
  }
  $('vAnnuleer').addEventListener('click', () => { wisKoppeling(); $('vOmschrijving').value = ''; $('vBedrag').value = ''; });

  $('vForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('vFout').textContent = '';
    const cent = naarCent($('vBedrag').value);
    if (!(cent > 0)) { $('vFout').textContent = 'Vul een geldig bedrag in, bijvoorbeeld 750 of 1.250,50.'; return; }
    try {
      await api('/api/beheer/inkomsten', { method: 'POST', body: {
        omschrijving: $('vOmschrijving').value, datum: $('vDatum').value, bedrag_cent: cent, boeking_id: $('vBoeking').value || null,
      } });
      $('vOmschrijving').value = ''; $('vBedrag').value = ''; $('vDatum').value = vandaag;
      wisKoppeling();
      toast(`${bedrag(cent)} toegevoegd.`);
      laadInkomsten();
      meldBoekingen();
    } catch (err) { $('vFout').textContent = err.message; }
  });

  // Vanuit een boeking: formulier invullen met naam en dienst.
  addEventListener('weblity:betaling', e => {
    const b = e.detail;
    kies('verdiend');
    $('vOmschrijving').value = `${b.dienst} voor ${b.naam}`;
    $('vBoeking').value = b.id;
    $('vKoppel').textContent = `Wordt gekoppeld aan de boeking van ${b.naam}.`;
    $('vKoppel').hidden = false;
    $('vAnnuleer').hidden = false;
    $('vForm').classList.add('koppel');
    $('vFormTitel').textContent = 'Betaling van ' + b.naam;
    $('vForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('vBedrag').focus(), 350);
  });

  const toast = tekst => dispatchEvent(new CustomEvent('weblity:toast', { detail: tekst }));
  const meldBoekingen = () => dispatchEvent(new Event('weblity:herlaad'));

  addEventListener('weblity:start', () => { if (actief !== 'boekingen') kies(actief); });
  let wacht;
  addEventListener('resize', () => {
    clearTimeout(wacht);
    wacht = setTimeout(() => { if (actief === 'bezoekers') tekenBezoekers(); if (actief === 'verdiend') tekenInkomsten(); }, 150);
  });
})();
