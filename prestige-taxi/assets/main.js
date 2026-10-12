/* Prestige Taxi Antwerpen — gedrag voor alle pagina's */

(function () {
  "use strict";

  var PHONE_INTL = "32483851397";
  var EMAIL = "hamzazahoume@hotmail.com";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.remove("no-js");

  /* ---------- Header en mobiel menu ---------- */

  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 30);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-menu");
  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
    }
    if (menu) menu.setAttribute("aria-hidden", String(!open));
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("nav-open"));
    });
  }
  if (menu) {
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("nav-open")) setMenu(false);
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 960 && document.body.classList.contains("nav-open")) setMenu(false);
  });

  /* ---------- Verschijnen bij scrollen ---------- */

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Gloed die de muis volgt op kaarten ---------- */

  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- Tellers ---------- */

  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var start = performance.now();
    var dur = 1600;
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- Reviews-slider met schuifbalk ---------- */

  document.querySelectorAll("[data-slider]").forEach(function (root) {
    var track = root.querySelector(".slider-track");
    var slides = track ? track.children : [];
    var range = root.querySelector(".slider-range");
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var current = root.querySelector("[data-current]");
    var total = root.querySelector("[data-total]");
    if (!track || !slides.length) return;

    if (total) total.textContent = String(slides.length).padStart(2, "0");

    function maxScroll() { return track.scrollWidth - track.clientWidth; }
    function step() {
      var s = slides[0];
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return s.getBoundingClientRect().width + gap;
    }
    function activeIndex() {
      var max = maxScroll();
      if (max > 0 && track.scrollLeft >= max - 4) return slides.length - 1;
      return Math.round(track.scrollLeft / step());
    }

    var syncing = false;
    function update() {
      var max = maxScroll();
      var pct = max > 0 ? (track.scrollLeft / max) * 100 : 0;
      if (range && !syncing) {
        range.value = String(pct);
        range.style.setProperty("--progress", pct + "%");
      }
      if (current) current.textContent = String(activeIndex() + 1).padStart(2, "0");
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
    }

    function go(dir) {
      var max = maxScroll();
      if (dir > 0 && track.scrollLeft >= max - 4) {
        track.scrollTo({ left: 0 });
      } else {
        track.scrollBy({ left: dir * step() });
      }
    }

    if (prev) prev.addEventListener("click", function () { go(-1); pause(); });
    if (next) next.addEventListener("click", function () { go(1); pause(); });

    // De balk: verschuif hem en de reviews schuiven mee.
    if (range) {
      range.addEventListener("input", function () {
        syncing = true;
        var pct = parseFloat(range.value);
        range.style.setProperty("--progress", pct + "%");
        track.style.scrollBehavior = "auto";
        track.style.scrollSnapType = "none";
        track.scrollLeft = (pct / 100) * maxScroll();
        pause();
      });
      range.addEventListener("change", function () {
        syncing = false;
        track.style.scrollBehavior = "";
        track.style.scrollSnapType = "";
        // Laat de dichtstbijzijnde review netjes vastklikken.
        track.scrollTo({ left: Math.round(track.scrollLeft / step()) * step() });
      });
      range.addEventListener("pointerup", function () { range.dispatchEvent(new Event("change")); });
    }

    var raf = 0;
    track.addEventListener("scroll", function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener("resize", update);

    // Slepen met de muis op desktop (aanraken werkt al vanzelf).
    var down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add("dragging"); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove("dragging");
        track.scrollTo({ left: Math.round(track.scrollLeft / step()) * step() });
        pause();
      }
    });

    // Vanzelf doorschuiven, pauzeren zodra iemand er zelf mee bezig is.
    var timer = null, resumeTimer = null;
    function play() {
      if (reduceMotion || timer) return;
      timer = setInterval(function () { go(1); }, 5500);
    }
    function stop() { clearInterval(timer); timer = null; }
    function pause() {
      stop();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(play, 9000);
    }
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", play);
    root.addEventListener("focusin", stop);
    track.addEventListener("touchstart", pause, { passive: true });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { entry.isIntersecting ? play() : stop(); });
      }, { threshold: 0.3 }).observe(root);
    } else {
      play();
    }

    root.addEventListener("keydown", function (e) {
      if (e.target === range) return;
      if (e.key === "ArrowRight") { go(1); pause(); }
      if (e.key === "ArrowLeft") { go(-1); pause(); }
    });

    update();
  });

  /* ---------- Reservatieformulier ---------- */

  var form = document.getElementById("booking-form");
  if (form) {
    var dateInput = form.querySelector("[name=datum]");
    if (dateInput) {
      var today = new Date();
      var iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      dateInput.min = iso;
      if (!dateInput.value) dateInput.value = iso;
    }

    // Vooraf invullen vanuit de snelle boekingskaart (?van=...&naar=...).
    var params = new URLSearchParams(window.location.search);
    ["van", "naar", "dienst"].forEach(function (key) {
      var el = form.querySelector("[name=" + key + "]");
      if (el && params.get(key)) el.value = params.get(key);
    });

    function buildMessage() {
      var d = new FormData(form);
      var lines = [
        "Nieuwe ritaanvraag via de website",
        "",
        "Naam: " + (d.get("naam") || ""),
        "Telefoon: " + (d.get("telefoon") || ""),
        "Dienst: " + (d.get("dienst") || ""),
        "Ophaaladres: " + (d.get("van") || ""),
        "Bestemming: " + (d.get("naar") || ""),
        "Datum: " + (d.get("datum") || "") + " om " + (d.get("tijd") || ""),
        "Passagiers: " + (d.get("personen") || "")
      ];
      if (d.get("opmerking")) lines.push("Opmerking: " + d.get("opmerking"));
      return lines.join("\n");
    }

    function validate() {
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (el) {
        var field = el.closest(".field");
        var valid = el.checkValidity();
        if (field) field.classList.toggle("invalid", !valid);
        if (!valid && ok) { el.focus(); ok = false; }
      });
      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var via = e.submitter && e.submitter.value === "mail" ? "mail" : "whatsapp";
      var msg = buildMessage();
      if (via === "mail") {
        window.location.href = "mailto:" + EMAIL +
          "?subject=" + encodeURIComponent("Ritaanvraag Prestige Taxi") +
          "&body=" + encodeURIComponent(msg);
      } else {
        window.open("https://wa.me/" + PHONE_INTL + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
      }
    });

    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && e.target.checkValidity()) field.classList.remove("invalid");
    });
  }

  /* ---------- Snelle boekingskaart op de homepagina ---------- */

  var quick = document.getElementById("quick-form");
  if (quick) {
    quick.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(quick);
      var q = new URLSearchParams();
      ["van", "naar"].forEach(function (k) { if (d.get(k)) q.set(k, d.get(k)); });
      window.location.href = "contact.html" + (q.toString() ? "?" + q.toString() : "") + "#reserveren";
    });
  }

  /* ---------- Jaartal in de footer ---------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
