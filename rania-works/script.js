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
     Navigatie
     --------------------------------------------------------------------
     De site bestaat uit losse pagina's. In de versie waar alles op één
     pagina staat (rania-works-compleet.html) worden dezelfde links
     sprongen binnen die ene pagina.
     ====================================================================== */
  var eenPagina = document.body.getAttribute('data-modus') === 'een-pagina';
  var HUIDIGE = document.body.getAttribute('data-pagina') || 'home';

  var PAGINAS = {
    home:      { bestand: 'index.html',     anker: '#top' },
    werk:      { bestand: 'werk.html',      anker: '#werk' },
    diensten:  { bestand: 'diensten.html',  anker: '#diensten' },
    werkwijze: { bestand: 'werkwijze.html', anker: '#werkwijze' },
    tarieven:  { bestand: 'tarieven.html',  anker: '#tarieven' },
    aanvraag:  { bestand: 'aanvraag.html',  anker: '#aanvraag' },
    vragen:    { bestand: 'vragen.html',    anker: '#faq' }
  };

  function naar(sleutel) {
    var p = PAGINAS[sleutel];
    if (!p) return '#';
    if (eenPagina) return p.anker;
    return (sleutel === HUIDIGE) ? p.anker : p.bestand;
  }

  /* Elke link met data-naar krijgt het juiste adres, en het menu laat zien
     op welke pagina je zit. */
  $$('[data-naar]').forEach(function (el) {
    var sleutel = el.getAttribute('data-naar');
    el.setAttribute('href', naar(sleutel));
    if (!eenPagina && sleutel === HUIDIGE) el.classList.add('hier');
  });

  /* ======================================================================
     De inhoud op de pagina zetten
     ====================================================================== */

  /* ---------- Alle teksten en het nummer ---------- */

  /* Wat tussen *sterretjes* staat, wordt paars en cursief. */
  function metAccent(tekst) {
    return veilig(tekst).replace(/\*([^*]+)\*/g, '<span class="accent"><em>$1</em></span>');
  }

  function tekstenPlaatsen() {
    $$('[data-tekst]').forEach(function (el) {
      var sleutel = el.getAttribute('data-tekst');
      var waarde = INHOUD.teksten[sleutel];
      if (waarde == null) return;
      el.innerHTML = metAccent(waarde);
    });

    var zet = function (id, waarde) {
      var el = document.getElementById(id);
      if (el) el.textContent = waarde;
    };
    zet('formNummer', INHOUD.nummerGetoond);
    zet('footerNummer', INHOUD.nummerGetoond);
    zet('menuNummer', INHOUD.nummerGetoond);

    /* De lopende band: de woorden twee keer, zodat ze naadloos doorlopen. */
    var band = document.getElementById('marqueeTrack');
    if (band) {
      var woorden = String(INHOUD.teksten.marquee || '').split(',')
        .map(function (w) { return w.trim(); }).filter(Boolean);
      var stuk = woorden.map(function (w) {
        return '<span>' + veilig(w) + '</span><i>✦</i>';
      }).join('');
      band.innerHTML = stuk + stuk;
    }
  }

  /* ---------- De snelkoppelingen op de startpagina ---------- */
  function snelkoppelingenPlaatsen() {
    var grid = document.getElementById('snelGrid');
    if (!grid) return;

    var t = INHOUD.teksten;
    var kaarten = [
      { naar: 'werk',     naam: 'Werk',     onder: t.werkTitel,     lead: t.werkLead },
      { naar: 'diensten', naam: 'Diensten', onder: t.dienstenTitel, lead: t.dienstenLead },
      { naar: 'tarieven', naam: 'Tarieven', onder: t.tarievenTitel, lead: t.tarievenLead },
      { naar: 'aanvraag', naam: 'Aanvraag', onder: t.aanvraagTitel, lead: t.aanvraagLead }
    ];

    grid.innerHTML = kaarten.map(function (k) {
      return '<a class="snel-kaart reveal" href="' + veilig(naar(k.naar)) + '">' +
        '<h3>' + veilig(k.naam) + '</h3>' +
        '<p class="snel-onder">' + veilig(k.onder || '') + '</p>' +
        '<p>' + veilig(k.lead || '') + '</p>' +
        '<span class="snel-pijl" aria-hidden="true">→</span>' +
      '</a>';
    }).join('');
  }

  /* ---------- De werkwijze ---------- */
  function werkwijzePlaatsen() {
    var lijst = document.getElementById('werkwijzeLijst');
    if (!lijst) return;

    lijst.innerHTML = (INHOUD.werkwijze || []).map(function (stap, i) {
      return '<li class="reveal">' +
        '<span class="step-n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<h3>' + veilig(stap.titel) + '</h3>' +
        '<p>' + veilig(stap.tekst || '') + '</p>' +
      '</li>';
    }).join('');
  }

  /* ---------- Het werk ---------- */

  /* Wat voor adres is dit? Een YouTube- of Vimeo-video sluiten we in,
     een los videobestand spelen we zelf af, de rest wordt een gewone link. */
  function videoSoort(adres) {
    adres = String(adres || '').trim();
    if (!adres) return null;

    var yt = adres.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return { soort: 'insluiten', bron: 'https://www.youtube.com/embed/' + yt[1] };

    var vi = adres.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vi) return { soort: 'insluiten', bron: 'https://player.vimeo.com/video/' + vi[1] };

    if (/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i.test(adres)) return { soort: 'bestand', bron: adres };

    return { soort: 'link', bron: adres };
  }

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
      var video = videoSoort(w.link);
      var kader = '';

      if (video && video.soort === 'insluiten') {
        kader = '<div class="work-thumb speelt" data-label="' + veilig(w.formaat || '') + '">' +
          '<iframe src="' + veilig(video.bron) + '" title="' + veilig(w.titel) + '"' +
          ' loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"' +
          ' allowfullscreen></iframe></div>';

      } else if (video && video.soort === 'bestand') {
        kader = '<div class="work-thumb speelt" data-label="' + veilig(w.formaat || '') + '">' +
          '<video src="' + veilig(video.bron) + '" data-pad="' + veilig(video.bron) + '"' +
          ' controls playsinline preload="metadata"' +
          (w.beeld ? ' poster="' + veilig(w.beeld) + '" data-poster="' + veilig(w.beeld) + '"' : '') +
          '></video></div>';

      } else {
        kader = '<div class="work-thumb" data-label="' + veilig(w.formaat || '') + '">' +
          (w.beeld
            ? '<img src="' + veilig(w.beeld) + '" data-pad="' + veilig(w.beeld) + '" alt="Beeld uit: ' + veilig(w.titel) + '">'
            : '<span class="play" aria-hidden="true">▶</span>') +
          '</div>';
      }

      var tekst = '<div class="work-info">' +
          '<h3>' + veilig(w.titel) + '</h3>' +
          '<p>' + veilig(w.omschrijving || '') + '</p>' +
          (video && video.soort === 'link' ? '<span class="work-link">Bekijk de video →</span>' : '') +
        '</div>';

      /* Speelt de video in de kaart zelf, dan mag de kaart geen link zijn:
         anders spring je weg zodra je op afspelen duwt. */
      return (video && video.soort === 'link')
        ? '<a class="work-card reveal" href="' + veilig(video.bron) + '" target="_blank" rel="noopener">' + kader + tekst + '</a>'
        : '<article class="work-card reveal">' + kader + tekst + '</article>';
    }).join('');

    eigenBestandenTonen(grid);
  }

  /* Wat je in het beheer uploadde, staat in de browser van dat toestel.
     Vinden we daar niets, dan blijft het pad staan zoals het er is — en dat
     werkt zodra het bestand echt naast de pagina staat, op je hosting. */
  function eigenBestandenTonen(waar) {
    if (typeof bestandOphalen !== 'function') return;

    Array.prototype.forEach.call(waar.querySelectorAll('[data-pad], [data-poster]'), function (el) {
      [['data-pad', 'src'], ['data-poster', 'poster']].forEach(function (paar) {
        var pad = el.getAttribute(paar[0]);
        if (!pad || !eigenBestand(pad)) return;
        bestandOphalen(pad).then(function (blob) {
          if (blob) el.setAttribute(paar[1], URL.createObjectURL(blob));
        });
      });
    });
  }

  /* ---------- De diensten ---------- */
  function dienstenPlaatsen() {
    var grid = document.getElementById('dienstenGrid');
    if (!grid) return;

    grid.innerHTML = (INHOUD.diensten || []).map(function (d) {
      var punten = (d.punten || []).map(function (p) {
        return '<li>' + veilig(p) + '</li>';
      }).join('');

      return '<article class="card reveal">' +
        '<span class="card-ico" aria-hidden="true">◆</span>' +
        '<h3>' + veilig(d.titel) + '</h3>' +
        '<p>' + veilig(d.tekst || '') + '</p>' +
        (punten ? '<ul class="ticks">' + punten + '</ul>' : '') +
      '</article>';
    }).join('');
  }

  /* ---------- De veelgestelde vragen ---------- */
  function faqPlaatsen() {
    var lijst = document.getElementById('faqLijst');
    if (!lijst) return;

    lijst.innerHTML = (INHOUD.faq || []).map(function (v) {
      return '<details class="reveal">' +
        '<summary>' + veilig(v.vraag) + '</summary>' +
        '<p>' + veilig(v.antwoord || '') + '</p>' +
      '</details>';
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
  dienstenPlaatsen();
  werkwijzePlaatsen();
  snelkoppelingenPlaatsen();
  faqPlaatsen();
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

  /* ---------- Het menu achter de hamburger ---------- */
  var menuBtn = $('#menuBtn');
  var menu = $('#menu');

  function menuTonen(open) {
    if (!menu || !menuBtn) return;
    menu.hidden = !open;
    /* Even wachten zodat de overgang kan starten. */
    if (open) requestAnimationFrame(function () { menu.classList.add('open'); });
    else menu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    menuBtn.classList.toggle('kruis', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var eerste = menu.querySelector('a');
      if (eerste) eerste.focus();
    }
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      menuTonen(menu.hidden);
    });

    /* Een keuze maken sluit het menu. */
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) menuTonen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        menuTonen(false);
        menuBtn.focus();
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

    var aanvraagHier = document.getElementById('aanvraag');
    if (!aanvraagHier) {
      /* Staat het formulier op een andere pagina, dan geven we de keuze mee. */
      window.location.href = naar('aanvraag') + '?lengte=' + encodeURIComponent(keuze);
      return;
    }

    voorbeeldBijwerken();
    aanvraagHier.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () {
      var naam = document.getElementById('naam');
      if (naam && !naam.value) naam.focus({ preventScroll: true });
    }, 700);
  });

  /* Kwam je van de tarievenpagina, dan staat je keuze al ingevuld. */
  (function () {
    var select = document.getElementById('lengte');
    if (!select || !window.location.search) return;
    var gevraagd = decodeURIComponent((window.location.search.match(/[?&]lengte=([^&]*)/) || [])[1] || '');
    if (!gevraagd) return;
    Array.prototype.some.call(select.options, function (opt) {
      if (opt.text === gevraagd) { select.value = opt.value; return true; }
      return false;
    });
    voorbeeldBijwerken();
  })();

  /* ---------- Het linkje naar het beheer ----------
     Alleen tonen als beheer.html er echt naast staat. Op je webhosting hoort
     dat bestand er niet bij te staan, dus daar blijft het weg. */
  var beheerLink = $('#beheerLink');
  if (beheerLink && window.fetch && window.location.protocol !== 'file:') {
    fetch('beheer.html', { method: 'HEAD' }).then(function (antwoord) {
      if (antwoord && antwoord.ok) beheerLink.hidden = false;
    })['catch'](function () { /* staat er niet: laat het weg */ });
  }

  /* ---------- Directe WhatsApp-links (voet en zwevende knop) ---------- */
  var kortBericht = 'Hallo Rania, ik zag je website en zou graag een edit laten maken.';
  ['#footerWa', '#fabWa', '#menuWa'].forEach(function (sel) {
    var el = $(sel);
    if (!el) return;
    el.href = waLink(kortBericht);
    el.target = '_blank';
    el.rel = 'noopener';
  });
});
