// Weblity — de boekpagina.
// Haalt de vrije uren op bij de boekingsserver, laat de bezoeker een dienst,
// dag en uur kiezen en stuurt de boeking in. Lukt dat om welke reden ook niet,
// dan kan de bezoeker altijd nog via WhatsApp of telefoon boeken.
(() => {
  'use strict';

  // Het adres van de boekingsserver (het beheerscherm draait op hetzelfde adres).
  const lokaal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API = lokaal ? 'http://localhost:4200' : 'https://weblity-beheer.onrender.com';
  const WHATSAPP = '32469226035';

  const $ = id => document.getElementById(id);
  const keuze = { dienst: '', datum: '', tijd: '' };
  let agenda = [];

  const dagKort = new Intl.DateTimeFormat('nl-BE', { weekday: 'short', timeZone: 'UTC' });
  const maandKort = new Intl.DateTimeFormat('nl-BE', { month: 'short', timeZone: 'UTC' });
  const dagLang = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const alsDatum = d => new Date(d + 'T12:00:00Z');

  function knop(klasse, n) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'keuze ' + klasse;
    b.style.setProperty('--n', n);
    b.setAttribute('aria-pressed', 'false');
    return b;
  }
  function markeer(houder, gekozen) {
    houder.querySelectorAll('.keuze').forEach(b => b.setAttribute('aria-pressed', String(b === gekozen)));
  }

  // ---------- Agenda ophalen ----------
  // De gratis server slaapt in als er even niemand langskwam. Wakker worden
  // duurt tot een minuut, dus we blijven het rustig opnieuw proberen.
  async function haalAgenda() {
    const begin = Date.now();
    const traag = setTimeout(() => {
      $('agendaStatus').textContent = 'De agenda wordt wakker, dit kan een halve minuut duren. Geen zin om te wachten? Boek hieronder via WhatsApp.';
    }, 6000);
    while (Date.now() - begin < 90_000) {
      try {
        const r = await fetch(API + '/api/agenda', { signal: AbortSignal.timeout(25_000) });
        if (r.ok) { clearTimeout(traag); return r.json(); }
      } catch { /* nog niet wakker */ }
      await new Promise(klaar => setTimeout(klaar, 3000));
    }
    clearTimeout(traag);
    throw new Error('onbereikbaar');
  }

  function tekenDiensten(diensten) {
    $('diensten').replaceChildren(...diensten.map((naam, n) => {
      const b = knop('', n);
      b.textContent = naam;
      b.addEventListener('click', () => { keuze.dienst = naam; markeer($('diensten'), b); bijwerken(); });
      return b;
    }));
  }

  function tekenDagen() {
    $('dagen').replaceChildren(...agenda.map((dag, n) => {
      const d = alsDatum(dag.datum), vrij = dag.uren.filter(u => u.vrij).length;
      const b = knop('keuze--dag', n);
      b.disabled = vrij === 0;
      b.innerHTML = '<small></small><b></b><span></span>';
      b.children[0].textContent = dagKort.format(d).replace('.', '');
      b.children[1].textContent = d.getUTCDate();
      b.children[2].textContent = maandKort.format(d).replace('.', '');
      b.setAttribute('aria-label', dagLang.format(d) + (vrij ? '' : ', volzet'));
      b.addEventListener('click', () => { keuze.datum = dag.datum; keuze.tijd = ''; markeer($('dagen'), b); tekenUren(); bijwerken(); });
      return b;
    }));
  }

  function tekenUren() {
    const dag = agenda.find(d => d.datum === keuze.datum);
    $('urenHint').hidden = Boolean(dag);
    $('uren').replaceChildren(...(dag ? dag.uren : []).map((uur, n) => {
      const b = knop('keuze--uur', n);
      b.textContent = uur.tijd;
      b.disabled = !uur.vrij;
      if (!uur.vrij) b.setAttribute('aria-label', uur.tijd + ', bezet');
      b.addEventListener('click', () => { keuze.tijd = uur.tijd; markeer($('uren'), b); bijwerken(); });
      return b;
    }));
  }

  // ---------- Overzicht rechts ----------
  function zet(id, waarde, leeg) {
    $(id).textContent = waarde || leeg;
    $(id).classList.toggle('leeg', !waarde);
  }
  function bijwerken() {
    zet('ovDienst', keuze.dienst, 'nog kiezen');
    zet('ovDag', keuze.datum && dagLang.format(alsDatum(keuze.datum)), 'nog kiezen');
    zet('ovUur', keuze.tijd, 'nog kiezen');
    $('verstuur').disabled = !(keuze.dienst && keuze.datum && keuze.tijd);
    $('whatsapp').href = whatsappLink();
  }

  /** WhatsApp-bericht met alles wat de bezoeker al invulde. */
  function whatsappLink() {
    const regels = ['Dag Weblity, ik wil graag een gesprek boeken.'];
    if (keuze.dienst) regels.push('Waarover: ' + keuze.dienst);
    if (keuze.datum) regels.push('Wanneer: ' + dagLang.format(alsDatum(keuze.datum)) + (keuze.tijd ? ' om ' + keuze.tijd : ''));
    const naam = $('naam').value.trim(), bericht = $('bericht').value.trim();
    if (naam) regels.push('Naam: ' + naam);
    if (bericht) regels.push('', bericht);
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(regels.join('\n'))}`;
  }
  ['naam', 'bericht'].forEach(id => $(id).addEventListener('input', () => { $('whatsapp').href = whatsappLink(); }));

  // ---------- Versturen ----------
  $('boek').addEventListener('submit', async e => {
    e.preventDefault();
    const fout = $('fout'), verstuur = $('verstuur');
    fout.textContent = '';
    if (!keuze.dienst || !keuze.datum || !keuze.tijd) { fout.textContent = 'Kies eerst een dienst, een dag en een uur.'; return; }
    if (!e.target.reportValidity()) return;

    verstuur.disabled = true;
    const tekst = verstuur.textContent;
    verstuur.textContent = 'Bezig met boeken…';
    try {
      const r = await fetch(API + '/api/boekingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...keuze,
          naam: $('naam').value, telefoon: $('telefoon').value, email: $('email').value,
          bericht: $('bericht').value, website: $('website').value,
        }),
        signal: AbortSignal.timeout(70_000),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        fout.textContent = data.fout || 'Het boeken lukte niet. Probeer het opnieuw of boek via WhatsApp.';
        // Iemand was net sneller: toon de agenda opnieuw zodat het uur als bezet verschijnt.
        if (r.status === 409) { keuze.tijd = ''; agenda = (await haalAgenda()).dagen; tekenDagen(); tekenUren(); markeerDag(); bijwerken(); }
        return;
      }
      $('geluktTekst').textContent = `${dagLang.format(alsDatum(keuze.datum))} om ${keuze.tijd}`;
      $('geluktNaam').textContent = $('naam').value.trim().split(' ')[0];
      $('boek').hidden = true;
      $('gelukt').hidden = false;
      $('gelukt').scrollIntoView({ block: 'center' });
    } catch {
      fout.textContent = 'De boeking kon niet verstuurd worden. Controleer je verbinding, of boek via WhatsApp.';
    } finally {
      verstuur.textContent = tekst;
      verstuur.disabled = !(keuze.dienst && keuze.datum && keuze.tijd);
    }
  });
  function markeerDag() {
    const i = agenda.findIndex(d => d.datum === keuze.datum);
    if (i >= 0) markeer($('dagen'), $('dagen').children[i]);
  }

  // ---------- Start ----------
  bijwerken();
  haalAgenda().then(data => {
    agenda = data.dagen;
    $('agendaStatus').hidden = true;
    $('stappen').hidden = false;
    tekenDiensten(data.diensten);
    tekenDagen();
    tekenUren();
    // Wie via een knop "Website" of "Webshop" binnenkomt, heeft de dienst al gekozen.
    const vooraf = new URLSearchParams(location.search).get('dienst');
    const b = [...$('diensten').children].find(k => k.textContent === vooraf);
    if (b) b.click();
  }).catch(() => {
    $('agendaStatus').classList.remove('laden');
    $('agendaStatus').textContent = 'De agenda is nu even niet bereikbaar. Boek via WhatsApp of bel ons, dan regelen we het meteen.';
  });
})();
