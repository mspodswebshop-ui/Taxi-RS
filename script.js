/* =========================================================
   Weblity — interaction & animation engine
   ========================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var WHATSAPP_NUMBER = '32469226035';

  /* ---------------------------------------------------------
     Preloader
     --------------------------------------------------------- */
  var loader = document.getElementById('loader');
  if (loader) {
    var pct = document.getElementById('loader-pct');
    var seen = document.documentElement.classList.contains('seen');

    if (pct && !reduced && !seen) {
      var start = performance.now();
      var dur = 1150;
      var tickPct = function (now) {
        var p = Math.min((now - start) / dur, 1);
        pct.textContent = Math.round(p * 100) + '%';
        if (p < 1) requestAnimationFrame(tickPct);
      };
      requestAnimationFrame(tickPct);
    }

    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, reduced ? 0 : (seen ? 950 : 2250));
  }

  /* ---------------------------------------------------------
     Page transitions
     --------------------------------------------------------- */
  if (!reduced) {
    var wipe = document.createElement('div');
    wipe.className = 'wipe';
    document.body.appendChild(wipe);

    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a') : null;
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href) return;
      if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (href.charAt(0) === '#' || href.indexOf('tel:') === 0 ||
          href.indexOf('mailto:') === 0 || href.indexOf('wa.me') > -1) return;

      var url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      wipe.classList.add('on');
      window.setTimeout(function () { window.location.href = url.href; }, 430);
    });
  }

  /* ---------------------------------------------------------
     Sticky nav + scroll progress
     --------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var progress = document.querySelector('.progress');
  var scrollY = 0;
  var ticking = false;

  function onScroll() {
    scrollY = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', scrollY > 24);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     Hamburger / full-screen menu
     --------------------------------------------------------- */
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
      if (window.innerWidth > 1080 && menu.classList.contains('open')) setMenu(false);
    });
  }

  /* ---------------------------------------------------------
     Nav link letter flip
     --------------------------------------------------------- */
  if (finePointer && !reduced) {
    var navAnchors = document.querySelectorAll('.nav-links > li > a');
    Array.prototype.forEach.call(navAnchors, function (a) {
      var text = a.textContent.trim();
      if (!text || text.length > 20) return;
      var html = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text[i] === ' ' ? '&nbsp;' : text[i];
        html += '<span class="flip" style="--l:' + i + '"><span data-c="' + ch + '">' + ch + '</span></span>';
      }
      a.innerHTML = html;
    });
  }

  /* ---------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     Animated counters
     --------------------------------------------------------- */
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
      var begin = performance.now();
      var step = function (now) {
        var p = Math.min((now - begin) / duration, 1);
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

  /* ---------------------------------------------------------
     Text scramble
     --------------------------------------------------------- */
  var scrambleEls = document.querySelectorAll('[data-scramble]');
  if (scrambleEls.length && !reduced) {
    var CHARS = '!<>-_\\/[]{}—=+*^?#________';
    Array.prototype.forEach.call(scrambleEls, function (el) {
      var final = el.textContent;
      var frame = 0;
      var queue = [];
      for (var i = 0; i < final.length; i++) {
        queue.push({ to: final[i], start: Math.floor(Math.random() * 18), end: Math.floor(Math.random() * 18) + 18 });
      }
      var run = function () {
        var out = '';
        var done = 0;
        for (var i = 0; i < queue.length; i++) {
          var q = queue[i];
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) { out += CHARS[Math.floor(Math.random() * CHARS.length)]; }
          else { out += ' '; }
        }
        el.textContent = out;
        if (done < queue.length) { frame++; requestAnimationFrame(run); }
      };
      window.setTimeout(run, 250);
    });
  }

  /* ---------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------- */
  var faqButtons = document.querySelectorAll('.faq-q');
  Array.prototype.forEach.call(faqButtons, function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      if (!item) return;
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------------------------------------------------------
     Particle constellation
     --------------------------------------------------------- */
  var canvas = document.getElementById('particles');
  if (canvas && !reduced && window.innerWidth > 640) {
    var ctx = canvas.getContext('2d');
    var pw = 0, ph = 0, dots = [], pRaf = null;
    var pointer = { x: -9999, y: -9999 };
    var LINK2 = 13000;
    var REPEL2 = 12000;

    var sizeCanvas = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      pw = window.innerWidth;
      ph = window.innerHeight;
      canvas.width = pw * dpr;
      canvas.height = ph * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var n = Math.min(80, Math.round(pw / 20));
      dots = [];
      for (var i = 0; i < n; i++) {
        dots.push({
          x: Math.random() * pw,
          y: Math.random() * ph,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.6
        });
      }
    };

    var draw = function () {
      pRaf = requestAnimationFrame(draw);

      // Only paint while the field is actually on screen
      if (scrollY > ph * 1.4) { ctx.clearRect(0, 0, pw, ph); return; }

      ctx.clearRect(0, 0, pw, ph);

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > pw) d.vx *= -1;
        if (d.y < 0 || d.y > ph) d.vy *= -1;

        var mx = d.x - pointer.x, my = d.y - pointer.y;
        var md2 = mx * mx + my * my;
        if (md2 < REPEL2) {
          var md = Math.sqrt(md2) || 1;
          d.x += (mx / md) * 1.4;
          d.y += (my / md) * 1.4;
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(160,180,255,.45)';
        ctx.fill();
      }

      ctx.lineWidth = 0.7;
      for (var a = 0; a < dots.length; a++) {
        for (var b = a + 1; b < dots.length; b++) {
          var p = dots[a], q = dots[b];
          var dx = p.x - q.x, dy = p.y - q.y;
          var dist2 = dx * dx + dy * dy;
          if (dist2 > LINK2) continue;
          ctx.strokeStyle = 'rgba(130,150,255,' + (1 - dist2 / LINK2) * 0.2 + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    };

    sizeCanvas();
    draw();

    window.addEventListener('resize', sizeCanvas);
    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }, { passive: true });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (pRaf) { cancelAnimationFrame(pRaf); pRaf = null; }
      } else if (!pRaf) {
        draw();
      }
    });
  }

  /* ---------------------------------------------------------
     Desktop pointer effects
     --------------------------------------------------------- */
  if (finePointer && !reduced) {

    /* Custom cursor */
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('cursor-on');

    var mx2 = window.innerWidth / 2, my2 = window.innerHeight / 2;
    var rx = mx2, ry = my2, cRaf = null;

    var moveCursor = function () {
      rx += (mx2 - rx) * 0.16;
      ry += (my2 - ry) * 0.16;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
      cRaf = requestAnimationFrame(moveCursor);
    };
    moveCursor();

    document.addEventListener('pointermove', function (e) {
      mx2 = e.clientX;
      my2 = e.clientY;
      dot.style.transform = 'translate3d(' + mx2 + 'px,' + my2 + 'px,0) translate(-50%,-50%)';
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });

    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('a,button,input,select,textarea,.faq-q') : null;
      ring.classList.toggle('grow', !!t);
    });

    /* Spotlight glow */
    var spot = document.querySelector('.spotlight');
    if (spot) {
      var sx = mx2, sy = my2, gx = sx, gy = sy, sRaf = null;
      var renderSpot = function () {
        gx += (sx - gx) * 0.1;
        gy += (sy - gy) * 0.1;
        spot.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
        sRaf = requestAnimationFrame(renderSpot);
      };
      renderSpot();
      window.addEventListener('pointermove', function (e) {
        sx = e.clientX; sy = e.clientY;
        spot.style.opacity = '1';
      }, { passive: true });
    }

    /* Card glow + 3D tilt */
    var tiltCards = document.querySelectorAll('.card, .review, .price-card, .work-card, .stat');
    Array.prototype.forEach.call(tiltCards, function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = e.clientX - r.left;
        var py = e.clientY - r.top;
        card.style.setProperty('--mx', px + 'px');
        card.style.setProperty('--my', py + 'px');
        var rotX = ((py / r.height) - 0.5) * -5;
        var rotY = ((px / r.width) - 0.5) * 5;
        card.style.transform =
          'translateY(-8px) perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });

    /* Magnetic buttons */
    var magnets = document.querySelectorAll('.btn, .nav-cta');
    Array.prototype.forEach.call(magnets, function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var ox = e.clientX - r.left - r.width / 2;
        var oy = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + ox * 0.18 + 'px,' + (oy * 0.28 - 2) + 'px)';
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

  /* ---------------------------------------------------------
     Booking form → WhatsApp
     --------------------------------------------------------- */
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
