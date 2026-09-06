/* =========================================================
   Weblity — interaction & animation engine
   ========================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WHATSAPP_NUMBER = '32469226035';

  /* ---------- Intro curtain ---------- */
  var curtain = document.querySelector('.curtain');
  if (curtain) {
    window.setTimeout(function () {
      if (curtain.parentNode) curtain.parentNode.removeChild(curtain);
    }, reduced ? 0 : 1300);
  }

  /* ---------- Page transition on internal links ---------- */
  if (!reduced) {
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a') : null;
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (href.charAt(0) === '#' || href.indexOf('tel:') === 0 ||
          href.indexOf('mailto:') === 0 || href.indexOf('wa.me') > -1) return;

      var url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      document.body.classList.add('is-leaving');
      var veil = document.createElement('div');
      veil.className = 'curtain';
      veil.style.animation = 'none';
      veil.style.opacity = '0';
      veil.style.transition = 'opacity .32s ease';
      document.body.appendChild(veil);
      requestAnimationFrame(function () { veil.style.opacity = '1'; });
      window.setTimeout(function () { window.location.href = url.href; }, 330);
    });
  }

  /* ---------- Sticky nav state + scroll progress ---------- */
  var nav = document.getElementById('nav');
  var progress = document.querySelector('.progress');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 24);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Hamburger / full-screen menu ---------- */
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('mobile-menu');

  if (toggle && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', function () {
      setMenu(!menu.classList.contains('open'));
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && menu.classList.contains('open')) setMenu(false);
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-scale');
  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || reduced) {
      Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('in'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      Array.prototype.forEach.call(revealEls, function (el) { revealObserver.observe(el); });
    }
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll('[data-target]');
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseFloat(el.getAttribute('data-target'));
      var suffix = el.getAttribute('data-suffix') || '';
      var prefix = el.getAttribute('data-prefix') || '';
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      if (reduced) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      var duration = 1600;
      var start = performance.now();
      var step = function (now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 4);
        el.textContent = prefix + (eased * target).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(counters, runCounter);
    } else {
      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      Array.prototype.forEach.call(counters, function (el) { counterObserver.observe(el); });
    }
  }

  /* ---------- Desktop-only pointer effects ---------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (finePointer && !reduced) {
    /* Cursor spotlight */
    var spot = document.querySelector('.spotlight');
    if (spot) {
      var sx = window.innerWidth / 2, sy = window.innerHeight / 2;
      var cx = sx, cy = sy, raf = null;
      var render = function () {
        cx += (sx - cx) * 0.12;
        cy += (sy - cy) * 0.12;
        spot.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
        raf = Math.abs(sx - cx) > 0.5 || Math.abs(sy - cy) > 0.5 ? requestAnimationFrame(render) : null;
      };
      window.addEventListener('pointermove', function (e) {
        sx = e.clientX; sy = e.clientY;
        spot.style.opacity = '1';
        if (!raf) raf = requestAnimationFrame(render);
      }, { passive: true });
      document.addEventListener('pointerleave', function () { spot.style.opacity = '0'; });
    }

    /* Card spotlight + subtle 3D tilt */
    var tiltCards = document.querySelectorAll('.card, .review, .price-card');
    Array.prototype.forEach.call(tiltCards, function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = e.clientX - r.left;
        var py = e.clientY - r.top;
        card.style.setProperty('--mx', px + 'px');
        card.style.setProperty('--my', py + 'px');
        var rx = ((py / r.height) - 0.5) * -5;
        var ry = ((px / r.width) - 0.5) * 5;
        card.style.transform =
          'translateY(-8px) perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });

    /* Magnetic buttons */
    var magnets = document.querySelectorAll('.btn, .nav-cta');
    Array.prototype.forEach.call(magnets, function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + mx * 0.18 + 'px,' + (my * 0.28 - 2) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });

    /* Hero parallax */
    var parallax = document.querySelectorAll('[data-parallax]');
    if (parallax.length) {
      window.addEventListener('scroll', function () {
        var y = window.scrollY || window.pageYOffset;
        Array.prototype.forEach.call(parallax, function (el) {
          var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
          el.style.transform = 'translate3d(0,' + (y * speed) + 'px,0)';
        });
      }, { passive: true });
    }
  }

  /* ---------- Booking form → WhatsApp ---------- */
  var form = document.getElementById('booking-form');
  if (form) {
    var serviceSelect = document.getElementById('dienst');
    var params = new URLSearchParams(window.location.search);
    var preset = params.get('dienst');
    if (preset && serviceSelect) {
      var match = Array.prototype.some.call(serviceSelect.options, function (o) {
        return o.value === preset;
      });
      if (match) serviceSelect.value = preset;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };

      var dienstText = serviceSelect && serviceSelect.selectedOptions.length
        ? serviceSelect.selectedOptions[0].text
        : '';

      var lines = [
        'Hallo Weblity, ik wil graag een afspraak boeken.',
        'Naam: ' + val('naam'),
        'Telefoon: ' + val('telefoon'),
        'Dienst: ' + dienstText
      ];
      if (val('datum')) lines.push('Gewenste datum: ' + val('datum'));
      if (val('tijd')) lines.push('Gewenste tijd: ' + val('tijd'));
      if (val('bericht')) lines.push('Bericht: ' + val('bericht'));

      window.open(
        'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank'
      );

      var confirmBox = document.getElementById('booking-confirm');
      if (confirmBox) {
        confirmBox.classList.add('show');
        confirmBox.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
    });
  }
})();
