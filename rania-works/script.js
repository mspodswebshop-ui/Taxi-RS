/* ==========================================================================
   Rania Works — gedrag van de pagina
   Geen framework, geen build. Gewoon wat JavaScript.

   De teksten, het werk en de tarieven staan in inhoud.js. Wat in het beheer
   (beheer.html) is aangepast, gaat daarop voor.
   ========================================================================== */

var INHOUD = (typeof inhoudOphalen === 'function') ? inhoudOphalen() : STANDAARD_INHOUD;

/* Het WhatsApp-nummer waar alles naartoe gaat. */
var WHATSAPP = INHOUD.nummer;

/* Adres van een WhatsApp-gesprek, met tekst er alvast ingezet. */
function waLink(tekst) {
  return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(tekst);
}

/* Tekst veilig in HTML zetten. */
function veilig(tekst) {
  return String(tekst == null ? '' : tekst)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function () {
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* ======================================================================
     De inhoud op de pagina zetten
     ====================================================================== */

  /* ---------- Losse teksten en het nummer ---------- */
  function tekstenPlaatsen() {
    var zet = function (id, waarde) {
      var el = document.getElementById(id);
      if (el) el.textContent = waarde;
    };
    zet('heroLead', INHOUD.teksten.lead);
    zet('statLevering', INHOUD.teksten.levering);
    zet('statRevisies', INHOUD.teksten.revisies);
    zet('formNummer', INHOUD.nummerGetoond);
    zet('footerNummer', INHOUD.nummerGetoond);
  }

  /* ---------- Het werk ---------- */
  function werkPlaatsen() {
    var grid = document.getElementById('werkGrid');
    if (!grid) return;

    var lijst = (INHOUD.werk || []).filter(function (w) { return w && w.titel; });
    grid.classList.toggle('solo', lijst.length === 1);

    if (!lijst.length) {
      grid.innerHTML = '<p class="note">Er staat nog geen werk op de site.</p>';
      return;
    }

    grid.innerHTML = lijst.map(function (w) {
      var beeld = w.beeld
        ? '<img src="' + veilig(w.beeld) + '" alt="Beeld uit: ' + veilig(w.titel) + '">'
        : '<span class="play" aria-hidden="true">▶</span>';

      var binnen =
        '<div class="work-thumb" data-label="' + veilig(w.formaat || '') + '">' + beeld + '</div>' +
        '<div class="work-info">' +
          '<h3>' + veilig(w.titel) + '</h3>' +
          '<p>' + veilig(w.omschrijving || '') + '</p>' +
          (w.link ? '<span class="work-link">Bekijk de video →</span>' : '') +
        '</div>';

      return w.link
        ? '<a class="work-card reveal" href="' + veilig(w.link) + '" target="_blank" rel="noopener">' + binnen + '</a>'
        : '<article class="work-card reveal">' + binnen + '</article>';
    }).join('');
  }

  /* ---------- De tarieven, en dezelfde lijst in het formulier ---------- */
  function tarievenPlaatsen() {
    var grid = document.getElementById('tarievenGrid');
    var lijst = INHOUD.tarieven || [];

    if (grid) {
      grid.innerHTML = lijst.map(function (t) {
        var punten = (t.punten || []).map(function (p) {
          return '<li>' + veilig(p) + '</li>';
        }).join('');

        return '<article class="price reveal' + (t.uitgelicht ? ' price-featured' : '') + '">' +
          (t.uitgelicht ? '<span class="tag">Meest gekozen</span>' : '') +
          '<p class="len">' + veilig(t.kort || t.lengte) + '</p>' +
          '<p class="amount">' + veilig(t.prijs) + '</p>' +
          '<p class="price-for">' + veilig(t.voor || '') + '</p>' +
          '<ul class="ticks">' + punten + '</ul>' +
          '<button class="btn ' + (t.uitgelicht ? 'btn-primary' : 'btn-ghost') + ' btn-block"' +
            ' data-lengte="' + veilig(t.lengte) + '" data-prijs="' + veilig(t.prijs) + '">' +
            'Kies deze lengte</button>' +
        '</article>';
      }).join('');
    }

    var select = document.getElementById('lengte');
    if (select) {
      select.innerHTML =
        '<option value="">Nog geen idee</option>' +
        lijst.map(function (t) {
          var label = veilig(t.lengte) + ' — ' + veilig(t.prijs);
          return '<option>' + label + '</option>';
        }).join('') +
        '<option>Andere lengte — graag een prijs</option>';
    }
  }

  tekstenPlaatsen();
  werkPlaatsen();
  tarievenPlaatsen();

  /* ---------- Jaartal in de voet ---------- */
  var jaar = $('#jaar');
  if (jaar) jaar.textContent = new Date().getFullYear();

  /* ======================================================================
     Gedrag
     ====================================================================== */

  /* ---------- Kop: achtergrond zodra je scrolt + zwevende knop ---------- */
  var header = $('#siteHeader');
  var fab = $('#fabWa');

  function bijScrollen() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 20);
    if (fab) fab.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', bijScrollen, { passive: true });
  bijScrollen();

  /* ---------- Menu op gsm ---------- */
  var menuBtn = $('#menuBtn');
  var nav = $('#nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Onderdelen laten verschijnen bij het scrollen ---------- */
  var teTonen = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var kijker = new IntersectionObserver(function (items) {
      items.forEach(function (item, i) {
        if (!item.isIntersecting) return;
        var el = item.target;
        setTimeout(function () { el.classList.add('in'); }, Math.min(i * 70, 280));
        kijker.unobserve(el);
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
    teTonen.forEach(function (el) { kijker.observe(el); });
  } else {
    teTonen.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Welk menu-item is in beeld ---------- */
  var secties = ['werk', 'diensten', 'werkwijze', 'tarieven', 'faq']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && secties.length) {
    var menuKijker = new IntersectionObserver(function (items) {
      items.forEach(function (item) {
        if (!item.isIntersecting) return;
        $$('.nav a').forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + item.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secties.forEach(function (s) { menuKijker.observe(s); });
  }

  /* ---------- Korte melding onderaan ---------- */
  var toast = $('#toast');
  var toastTimer;
  function melding(tekst) {
    if (!toast) return;
    toast.textContent = tekst;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* ======================================================================
     Het aanvraagformulier
     ====================================================================== */
  var form = $('#bookingForm');
  var bubble = $('#previewBubble');
  var verplicht = ['naam', 'type', 'bericht'];

  /* Datum leesbaar maken: 2026-09-24 wordt "donderdag 24 september 2026". */
  function datumInTekst(waarde) {
    if (!waarde) return '';
    var d = new Date(waarde + 'T00:00:00');
    if (isNaN(d)) return waarde;
    try {
      return d.toLocaleDateString('nl-BE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch (e) {
      return waarde;
    }
  }

  /* Alles wat is ingevuld omzetten naar één net WhatsApp-bericht. */
  function berichtOpbouwen() {
    if (!form) return '';
    var v = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    var regels = [];
    regels.push('Hallo Rania, ik zou graag een edit laten maken.');
    regels.push('');
    if (v('naam')) regels.push('Naam: ' + v('naam'));
    if (v('bedrijf')) regels.push('Bedrijf: ' + v('bedrijf'));
    if (v('type')) regels.push('Soort edit: ' + v('type'));
    if (v('platform')) regels.push('Platform: ' + v('platform'));
    if (v('lengte')) regels.push('Lengte: ' + v('lengte'));
    if (v('deadline')) regels.push('Nodig tegen: ' + datumInTekst(v('deadline')));
    if (v('bericht')) {
      regels.push('');
      regels.push('Wat ik in gedachten heb:');
      regels.push(v('bericht'));
    }
    regels.push('');
    regels.push('Laat maar weten wat het zou kosten en wanneer het klaar kan zijn. Bedankt!');

    return regels.join('\n');
  }

  /* Het voorbeeld in de telefoon meteen bijwerken. */
  function voorbeeldBijwerken() {
    if (!bubble) return;
    var iets = ['naam', 'bedrijf', 'type', 'platform', 'lengte', 'deadline', 'bericht']
      .some(function (id) {
        var el = document.getElementById(id);
        return el && el.value.trim() !== '';
      });

    bubble.textContent = iets
      ? berichtOpbouwen()
      : 'Vul het formulier in — je bericht verschijnt hier.';
  }

  /* Controleren of het nodige is ingevuld. */
  function isVolledig() {
    var goed = true;
    verplicht.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var veld = el.closest('.field');
      var leeg = el.value.trim() === '';
      if (veld) veld.classList.toggle('invalid', leeg);
      if (leeg && goed) {
        goed = false;
        el.focus();
      }
    });
    return goed;
  }

  if (form) {
    form.addEventListener('input', voorbeeldBijwerken);
    form.addEventListener('change', voorbeeldBijwerken);

    /* Foutmelding weghalen zodra iemand iets invult. */
    form.addEventListener('input', function (e) {
      var veld = e.target.closest('.field');
      if (veld && e.target.value.trim() !== '') veld.classList.remove('invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!isVolledig()) {
        melding('Vul de velden met een * nog even in.');
        return;
      }
      window.open(waLink(berichtOpbouwen()), '_blank', 'noopener');
    });

    /* Geen datum in het verleden kunnen kiezen. */
    var deadline = document.getElementById('deadline');
    if (deadline) deadline.min = new Date().toISOString().slice(0, 10);

    voorbeeldBijwerken();
  }

  /* ---------- Bericht kopiëren ---------- */
  var copyBtn = $('#copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var tekst = berichtOpbouwen();
      var klaar = function () { melding('Bericht gekopieerd.'); };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(tekst).then(klaar, function () { terugval(tekst, klaar); });
      } else {
        terugval(tekst, klaar);
      }
    });
  }

  /* Kopiëren op oudere browsers of zonder https. */
  function terugval(tekst, klaar) {
    var hulp = document.createElement('textarea');
    hulp.value = tekst;
    hulp.setAttribute('readonly', '');
    hulp.style.position = 'fixed';
    hulp.style.opacity = '0';
    document.body.appendChild(hulp);
    hulp.select();
    try { document.execCommand('copy'); klaar(); }
    catch (e) { melding('Kopiëren lukte niet — selecteer de tekst zelf.'); }
    document.body.removeChild(hulp);
  }

  /* ---------- Knoppen bij de tarieven ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lengte]');
    if (!btn) return;

    var keuze = btn.getAttribute('data-lengte') + ' — ' + btn.getAttribute('data-prijs');
    var select = document.getElementById('lengte');

    if (select) {
      var gevonden = Array.prototype.some.call(select.options, function (opt) {
        if (opt.value === keuze || opt.text === keuze) { select.value = opt.value; return true; }
        return false;
      });
      if (!gevonden) select.value = '';
    }

    voorbeeldBijwerken();
    document.getElementById('aanvraag').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () {
      var naam = document.getElementById('naam');
      if (naam && !naam.value) naam.focus({ preventScroll: true });
    }, 700);
  });

  /* ---------- Directe WhatsApp-links (voet en zwevende knop) ---------- */
  var kortBericht = 'Hallo Rania, ik zag je website en zou graag een edit laten maken.';
  ['#footerWa', '#fabWa'].forEach(function (sel) {
    var el = $(sel);
    if (!el) return;
    el.href = waLink(kortBericht);
    el.target = '_blank';
    el.rel = 'noopener';
  });
});
