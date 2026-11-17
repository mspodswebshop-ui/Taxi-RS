// Beheerscherm: boekingen tonen, bijwerken en melden als er een nieuwe binnenkomt.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const VERVERS_MS = 20_000;

  let boekingen = [], vandaag = '', filter = 'komend', zoekterm = '';
  let bekend = null;          // id's die we al gezien hebben; null = eerste keer laden
  const vers = new Set();     // id's die net binnenkwamen, lichten even op
  let timer = null;

  async function api(pad, opties = {}) {
    const r = await fetch(pad, {
      ...opties,
      headers: opties.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opties.body ? JSON.stringify(opties.body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && pad !== '/api/login') { toonLogin(); throw new Error('Niet ingelogd.'); }
    if (!r.ok) throw new Error(data.fout || 'Er ging iets mis.');
    return data;
  }

  function toast(tekst) {
    const t = $('toast');
    t.textContent = tekst;
    t.classList.add('zichtbaar');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('zichtbaar'), 3200);
  }

  // ---------- Inloggen ----------
  function toonLogin() {
    clearInterval(timer);
    $('app').hidden = true;
    $('login').hidden = false;
    $('wachtwoord').focus();
  }
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginFout').textContent = '';
    try {
      await api('/api/login', { method: 'POST', body: { wachtwoord: $('wachtwoord').value } });
      $('wachtwoord').value = '';
      start();
    } catch (err) { $('loginFout').textContent = err.message; }
  });
  $('uitloggen').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' }).catch(() => {});
    bekend = null;
    toonLogin();
  });

  // ---------- Laden ----------
  async function laad() {
    try {
      const data = await api('/api/beheer/boekingen');
      vandaag = data.vandaag;
      boekingen = data.boekingen;
      $('live').classList.remove('uit');

      const ids = new Set(boekingen.map(b => b.id));
      if (bekend) {
        const nieuw = boekingen.filter(b => !bekend.has(b.id));
        if (nieuw.length) {
          nieuw.forEach(b => vers.add(b.id));
          piep();
          const b = nieuw[0];
          const tekst = nieuw.length === 1 ? `Nieuwe boeking: ${b.naam}` : `${nieuw.length} nieuwe boekingen`;
          toast(tekst);
        }
      }
      bekend = ids;
      teken();
    } catch (err) {
      if (err.message !== 'Niet ingelogd.') $('live').classList.add('uit');
    }
  }

  // Korte dubbele toon bij een nieuwe boeking.
  function piep() {
    try {
      const ctx = piep.ctx || (piep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      [880, 1175].forEach((hz, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .16;
        o.frequency.value = hz; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
        o.start(t); o.stop(t + .32);
      });
    } catch { /* geen geluid beschikbaar */ }
  }

  // ---------- Tekenen ----------
  const dagFmt = new Intl.DateTimeFormat('nl-BE', { weekday: 'short', timeZone: 'UTC' });
  const datumFmt = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const langFmt = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const ontvangenFmt = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const alsDatum = d => new Date(d + 'T12:00:00Z');

  /** Telefoonnummer naar het formaat dat WhatsApp verwacht (landcode, alleen cijfers). */
  function waNummer(tel) {
    let n = tel.replace(/[^\d+]/g, '');
    if (n.startsWith('+')) return n.slice(1);
    if (n.startsWith('00')) return n.slice(2);
    if (n.startsWith('0')) return '32' + n.slice(1);
    return n;
  }

  const actief = b => b.status === 'nieuw' || b.status === 'bevestigd';
  const filters = {
    komend: b => actief(b) && b.datum >= vandaag,
    nieuw: b => b.status === 'nieuw',
    bevestigd: b => b.status === 'bevestigd',
    afgerond: b => b.status === 'afgerond',
    geannuleerd: b => b.status === 'geannuleerd',
    alle: () => true,
  };

  function teken() {
    $('nNieuw').textContent = boekingen.filter(filters.nieuw).length;
    $('nVandaag').textContent = boekingen.filter(b => actief(b) && b.datum === vandaag).length;
    $('nKomend').textContent = boekingen.filter(filters.komend).length;
    $('nTotaal').textContent = boekingen.length;
    document.title = (boekingen.filter(filters.nieuw).length ? `(${boekingen.filter(filters.nieuw).length}) ` : '') + 'Weblity · Beheer';

    const q = zoekterm.toLowerCase();
    let lijst = boekingen.filter(filters[filter]);
    if (q) lijst = lijst.filter(b => `${b.naam} ${b.telefoon} ${b.email} ${b.dienst}`.toLowerCase().includes(q));
    // Komende afspraken eerst (vroegste bovenaan), wat voorbij is daaronder (recentste eerst).
    const toekomst = lijst.filter(b => b.datum >= vandaag);
    const verleden = lijst.filter(b => b.datum < vandaag).reverse();
    lijst = [...toekomst, ...verleden];

    const doel = $('lijst');
    doel.replaceChildren(...lijst.map(kaart));
    $('leeg').hidden = lijst.length > 0;
    $('leeg').textContent = boekingen.length ? 'Geen boekingen in deze lijst.' : 'Er zijn nog geen boekingen. Zodra iemand boekt, verschijnt die hier.';
  }

  function kaart(b) {
    const el = $('kaart').content.firstElementChild.cloneNode(true);
    const k = s => el.querySelector(s);
    el.classList.toggle('is-nieuw', b.status === 'nieuw');
    el.classList.toggle('is-oud', b.datum < vandaag || b.status === 'geannuleerd');
    if (vers.has(b.id)) { el.classList.add('is-vers'); setTimeout(() => vers.delete(b.id), 5000); }

    k('.js-dag').textContent = b.datum === vandaag ? 'vandaag' : dagFmt.format(alsDatum(b.datum));
    k('.js-datum').textContent = datumFmt.format(alsDatum(b.datum));
    k('.js-uur').textContent = b.tijd;
    k('.js-naam').textContent = b.naam;
    k('.js-dienst').textContent = b.dienst;
    k('.js-status').textContent = b.status;
    k('.js-status').classList.add('pil--' + b.status);
    k('.js-bericht').textContent = b.bericht;
    k('.js-bericht').hidden = !b.bericht;
    k('.js-bel').textContent = '☎ ' + b.telefoon;
    k('.js-bel').href = 'tel:' + b.telefoon.replace(/[^\d+]/g, '');
    k('.js-mail').textContent = b.email ? '✉ ' + b.email : '';
    k('.js-mail').hidden = !b.email;
    if (b.email) k('.js-mail').href = 'mailto:' + b.email;
    k('.js-meta').textContent = 'Geboekt op ' + ontvangenFmt.format(new Date(b.aangemaakt));
    if (b.ontvangen_cent > 0) k('.js-betaald').textContent = '✓ ' + new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(b.ontvangen_cent / 100) + ' ontvangen';
    k('.js-betaling').onclick = () => dispatchEvent(new CustomEvent('weblity:betaling', { detail: b }));

    const voornaam = b.naam.split(' ')[0];
    const bericht = `Dag ${voornaam}, hier Weblity. Je gesprek over "${b.dienst}" op ${langFmt.format(alsDatum(b.datum))} om ${b.tijd} is bevestigd. Tot dan!`;
    k('.js-whatsapp').href = `https://wa.me/${waNummer(b.telefoon)}?text=${encodeURIComponent(bericht)}`;

    const toon = (s, aan) => { k(s).hidden = !aan; };
    toon('.js-bevestig', b.status === 'nieuw');
    toon('.js-afrond', b.status === 'bevestigd');
    toon('.js-annuleer', actief(b));
    toon('.js-herstel', b.status === 'geannuleerd' || b.status === 'afgerond');
    toon('.js-verwijder', b.status === 'geannuleerd' || b.status === 'afgerond');

    k('.js-bevestig').onclick = () => zet(b, 'bevestigd', 'Bevestigd. Laat het de klant weten via WhatsApp.');
    k('.js-afrond').onclick = () => zet(b, 'afgerond', 'Afgerond.');
    k('.js-annuleer').onclick = () => confirm(`De boeking van ${b.naam} annuleren? Het uur komt weer vrij op de website.`) && zet(b, 'geannuleerd', 'Geannuleerd.');
    k('.js-herstel').onclick = () => zet(b, 'bevestigd', 'Teruggezet.');
    k('.js-verwijder').onclick = async () => {
      if (!confirm(`De boeking van ${b.naam} definitief verwijderen? Dit kan je niet ongedaan maken.`)) return;
      try { await api(`/api/beheer/boekingen/${b.id}`, { method: 'DELETE' }); toast('Verwijderd.'); laad(); }
      catch (err) { toast(err.message); }
    };
    return el;
  }

  async function zet(b, status, melding) {
    try {
      await api(`/api/beheer/boekingen/${b.id}`, { method: 'PATCH', body: { status } });
      toast(melding);
      laad();
    } catch (err) { toast(err.message); }
  }

  // ---------- Filters en zoeken ----------
  $('filters').addEventListener('click', e => {
    const knop = e.target.closest('button[data-filter]');
    if (!knop) return;
    filter = knop.dataset.filter;
    document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('aan', b === knop));
    teken();
  });
  $('zoek').addEventListener('input', e => { zoekterm = e.target.value.trim(); teken(); });

  // ---------- Meldingen op dit toestel ----------
  const kanPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIphone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const alsApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let werker = null;

  const naarBytes = sleutel => {
    const b64 = (sleutel + '='.repeat((4 - sleutel.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  };

  async function toonMeldingen() {
    const toon = (id, aan) => { $(id).hidden = !aan; };
    let aan = false;
    if (kanPush) {
      try {
        werker = werker || await navigator.serviceWorker.register('sw.js');
        aan = Notification.permission === 'granted' && Boolean(await werker.pushManager.getSubscription());
      } catch { /* geen service worker mogelijk */ }
    }
    toon('meldIphone', !kanPush && isIphone && !alsApp);
    toon('meldNiet', !kanPush && !(isIphone && !alsApp));
    toon('meldUitleg', kanPush && !aan);
    toon('meldAan', kanPush && !aan);
    toon('testmelding', aan);
    toon('meldUit', aan);
    $('meldStatus').textContent = aan ? 'aan' : 'uit';
    $('meldStatus').className = 'pil ' + (aan ? 'pil--bevestigd' : 'pil--geannuleerd');
    // Staan de meldingen nog uit, dan klapt de uitleg vanzelf open.
    if (!aan && !toonMeldingen.gezien) $('meldingen').open = true;
    toonMeldingen.gezien = true;
  }

  $('meldAan').addEventListener('click', async () => {
    const uit = $('meldResultaat');
    uit.textContent = 'Bezig…';
    try {
      if (await Notification.requestPermission() !== 'granted') {
        uit.textContent = 'Meldingen zijn geweigerd. Zet ze aan in de instellingen van je toestel bij Weblity en probeer opnieuw.';
        return;
      }
      const { sleutel } = await api('/api/beheer/push');
      if (!sleutel) throw new Error('Meldingen zijn op de server nog niet ingesteld.');
      werker = werker || await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const abonnement = await werker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: naarBytes(sleutel) });
      await api('/api/beheer/push', { method: 'POST', body: { abonnement: abonnement.toJSON() } });
      uit.textContent = 'Meldingen staan aan op dit toestel. Stuur een testmelding om het te proberen.';
    } catch (err) {
      uit.textContent = 'Aanzetten lukte niet: ' + err.message;
    }
    toonMeldingen();
  });

  $('meldUit').addEventListener('click', async () => {
    try {
      const abonnement = await werker.pushManager.getSubscription();
      if (abonnement) {
        await api('/api/beheer/push', { method: 'DELETE', body: { endpoint: abonnement.endpoint } });
        await abonnement.unsubscribe();
      }
      $('meldResultaat').textContent = 'Meldingen staan uit op dit toestel.';
    } catch (err) { $('meldResultaat').textContent = err.message; }
    toonMeldingen();
  });

  $('testmelding').addEventListener('click', async () => {
    $('meldResultaat').textContent = 'Bezig…';
    try {
      const r = await api('/api/beheer/testmelding', { method: 'POST' });
      $('meldResultaat').textContent = `Verstuurd naar ${r.toestellen} ${r.toestellen === 1 ? 'toestel' : 'toestellen'}. De melding verschijnt binnen enkele seconden.`;
    } catch (err) { $('meldResultaat').textContent = err.message; }
  });

  // ---------- Start ----------
  function start() {
    $('login').hidden = true;
    $('app').hidden = false;
    laad();
    toonMeldingen();
    dispatchEvent(new Event('weblity:start'));
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) laad(); }, VERVERS_MS);
  }
  addEventListener('weblity:toast', e => toast(e.detail));
  addEventListener('weblity:herlaad', () => laad());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('app').hidden) laad(); });

  fetch('/api/sessie').then(r => r.json()).then(s => (s.ingelogd ? start() : toonLogin())).catch(toonLogin);
})();
