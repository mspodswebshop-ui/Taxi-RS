/* Finesse Decore — kleine interacties: menu, scroll-effect, reveal, formulier */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var links = document.getElementById('navLinks');

  /* mobiel menu */
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* achtergrond onder de navigatie zodra je scrollt */
  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* elementen laten verschijnen tijdens het scrollen */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 90 + 'ms';
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* jaartal in de footer */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* offerteformulier -> opent de mailclient met alles ingevuld.
     INVULLEN:CONTACT — zet hier je eigen e-mailadres.
     Wil je liever een echt formulier zonder mailclient? Maak een gratis
     account op formspree.io en vervang dit blok door:
        <form action="https://formspree.io/f/JOUW_ID" method="POST">
     (en verwijder deze submit-handler). */
  var MAIL_TO = 'info@finessedecore.be';

  var form = document.getElementById('quoteForm');
  var note = document.getElementById('formNote');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var required = ['name', 'email'];
    var missing = false;
    required.forEach(function (id) {
      var el = document.getElementById(id);
      var empty = !el.value.trim();
      el.classList.toggle('is-error', empty);
      if (empty) missing = true;
    });
    var email = document.getElementById('email');
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.classList.add('is-error');
      missing = true;
    }
    if (missing) {
      note.textContent = 'Vul minstens je naam en een geldig e-mailadres in.';
      return;
    }

    var get = function (id) { return (document.getElementById(id).value || '').trim(); };
    var body = [
      'Naam: ' + get('name'),
      'E-mail: ' + get('email'),
      'Telefoon: ' + (get('phone') || '-'),
      'Datum feest: ' + (get('date') || '-'),
      'Soort feest: ' + get('type'),
      '',
      'Bericht:',
      get('message') || '-'
    ].join('\n');

    var subject = 'Offerteaanvraag ' + get('type') + ' — ' + get('name');
    window.location.href = 'mailto:' + MAIL_TO +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    note.textContent = 'Je mailprogramma opent nu. Geen venster? Mail ons gerust op ' + MAIL_TO + '.';
  });
})();
