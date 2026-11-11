/* ==========================================================================
   Weblity — gedrag en animaties
   Geen bibliotheken: alles hieronder is gewone JavaScript.
   Elk onderdeel staat in een eigen functie en wordt onderaan gestart. Gaat er
   één stuk, dan blijft de rest van de pagina gewoon werken.
   ========================================================================== */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // Wie om minder beweging vraagt, krijgt overal meteen de eindtoestand.
  const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Koppen in woorden knippen ---------- */
  function splitHeadings() {
    for (const el of $$("[data-split]")) {
      let i = 0;
      const wrapWords = (node, parent) => {
        const frag = document.createDocumentFragment();
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(" "); continue; }
          const outer = document.createElement("span");
          outer.className = "w";
          const inner = document.createElement("span");
          inner.className = "w__i";
          inner.style.setProperty("--i", i++);
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        }
        parent.replaceChild(frag, node);
      };
      for (const node of [...el.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE) wrapWords(node, el);
        else if (node.nodeType === Node.ELEMENT_NODE) {
          node.classList.add("is-split");
          for (const sub of [...node.childNodes]) {
            if (sub.nodeType === Node.TEXT_NODE) wrapWords(sub, node);
          }
        }
      }
      el.classList.add("split");
    }
  }

  /* ---------- Verschijnen bij scrollen ---------- */
  function initReveal() {
    const items = $$("[data-reveal], [data-split]");
    if (CALM || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Lopende animaties pauzeren buiten beeld ---------- */
  function initLive() {
    const items = $$("[data-live]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-live"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("is-live", e.isIntersecting);
    }, { rootMargin: "80px 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Lopende banden: inhoud verdubbelen voor een naadloze lus ---------- */
  function initMarquees() {
    for (const m of $$("[data-marquee]")) {
      const group = $(".marquee__group", m);
      if (!group || $(".marquee__track", m)) continue;
      const track = document.createElement("div");
      track.className = "marquee__track";
      const copy = group.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      m.append(track);
      track.append(group, copy);
    }
  }

  /* ---------- Navigatie ---------- */
  function initNav() {
    const nav = $("#nav");
    const toggle = $("#navToggle");
    const links = $$("#navLinks a");
    if (!nav || !toggle) return;

    const setOpen = (open) => {
      nav.classList.toggle("nav--open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("nav--open")));
    links.forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", (e) => { if (!nav.contains(e.target)) setOpen(false); });

    // Het menu-item van het deel dat midden in beeld staat, licht op.
    if ("IntersectionObserver" in window) {
      const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const link = byId.get(e.target.id);
          if (link) link.classList.toggle("active", e.isIntersecting);
        }
      }, { rootMargin: "-50% 0px -50% 0px" });
      byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------- Alles wat aan de scrollpositie hangt ---------- */
  function initScrollFx() {
    const nav = $("#nav");
    const bar = $("#progress");
    const rail = $("#howRail");
    const grid = $("#howGrid");
    const mock = $("#mock");
    const mockWrap = $(".mock-wrap");
    const hero = $(".hero");
    const spot = $(".hero__spot");
    const marquees = () => $$(".marquee");

    let lastY = scrollY;
    let queued = false;
    let pointer = { x: 0, y: 0 };
    let skewTimer;

    const frame = () => {
      queued = false;
      const y = scrollY;
      const vh = innerHeight;
      const max = document.documentElement.scrollHeight - vh;

      if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

      if (nav) {
        nav.classList.toggle("nav--scrolled", y > 30);
        if (!nav.classList.contains("nav--open")) {
          if (y > 420 && y > lastY + 6) nav.classList.add("nav--hidden");
          else if (y < lastY - 6 || y < 420) nav.classList.remove("nav--hidden");
        }
      }

      // De bouwer ligt eerst achterover en komt recht terwijl je scrolt.
      if (mock && mockWrap && !CALM) {
        const top = mockWrap.getBoundingClientRect().top;
        const p = clamp((vh - top) / (vh * 0.85), 0, 1);
        const eased = 1 - Math.pow(1 - p, 2);
        mock.style.setProperty("--rx", `${((1 - eased) * 17 - pointer.y * 2).toFixed(2)}deg`);
        mock.style.setProperty("--ry", `${(pointer.x * 3).toFixed(2)}deg`);
        mock.style.setProperty("--sc", (0.93 + 0.07 * eased).toFixed(3));
      }

      // De lijn naast "Zo werkt het" loopt vol.
      if (rail && grid) {
        const g = grid.getBoundingClientRect();
        rail.style.transform = `scaleY(${clamp((vh * 0.55 - g.top) / g.height, 0, 1)})`;
      }

      // Lopende banden hellen even mee met de scrollsnelheid.
      if (!CALM) {
        const skew = clamp((y - lastY) * 0.22, -9, 9);
        if (Math.abs(skew) > 0.4) {
          marquees().forEach((m) => m.style.setProperty("--skew", `${-skew}deg`));
          clearTimeout(skewTimer);
          skewTimer = setTimeout(() => marquees().forEach((m) => m.style.setProperty("--skew", "0deg")), 140);
        }
      }

      lastY = y;
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    addEventListener("load", queue);

    if (hero && FINE_POINTER && !CALM) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        pointer = { x: (e.clientX - r.left) / r.width * 2 - 1, y: (e.clientY - r.top) / r.height * 2 - 1 };
        if (spot) {
          spot.style.setProperty("--px", `${e.clientX - r.left}px`);
          spot.style.setProperty("--py", `${e.clientY - r.top}px`);
        }
        queue();
      });
      hero.addEventListener("pointerleave", () => { pointer = { x: 0, y: 0 }; queue(); });
    }
    frame();
  }

  /* ---------- Het wisselende woord in de kop ---------- */
  function initRotator() {
    const box = $("#rotator");
    if (!box || CALM) return;
    const words = ["website", "webshop", "portfolio", "landingspagina"];
    let i = 0;
    let word = $(".rotator__word", box);

    setInterval(async () => {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      word.classList.add("out");
      await sleep(430);
      const next = document.createElement("span");
      next.className = "rotator__word grad";
      next.textContent = words[i];
      word.replaceWith(next);
      word = next;
    }, 2600);
  }

  /* ---------- Confetti ---------- */
  function burst(container, x, y, count = 26) {
    if (CALM || !container.animate) return;
    const colors = ["#8b6bff", "#4a7dff", "#27e0c3", "#ffd447", "#ff8a5c", "#ffffff"];
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("i");
      bit.className = "confetti";
      bit.style.background = colors[i % colors.length];
      if (i % 3 === 0) bit.style.borderRadius = "50%";
      container.append(bit);
      const angle = Math.random() * Math.PI * 2;
      const reach = 60 + Math.random() * 150;
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach - 50;
      bit.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(1)`, opacity: 1 },
        { transform: `translate(${x + dx * 0.8}px, ${y + dy * 0.8}px) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x + dx}px, ${y + dy + 90}px) rotate(${Math.random() * 720}deg) scale(0.4)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(0.15, 0.7, 0.3, 1)" })
        .onfinish = () => bit.remove();
    }
  }

  /* ---------- De bouwer die zichzelf bedient ---------- */
  function initMock() {
    const mock = $("#mock");
    if (!mock) return;
    const inner = $(".mock__inner", mock);
    const cursor = $("#mockCursor");
    const ghost = $("#mockGhost");
    const canvas = $("#mockCanvas");
    const drop = $("#mockDrop");
    const site = $("#mockSite");
    const title = $("#mockTitle");
    const caret = $(".site__title .caret", mock);
    const urlBox = $("#mockUrlBox");
    const url = $("#mockUrl");
    const publish = $("#mockPublish");
    const publishLabel = $("#mockPublishLabel");
    const swatches = $$("[data-swatch]", mock);
    const pieces = (name) => $$(name ? `[data-piece="${name}"]` : "[data-piece]", site);

    const TITLE = "Vers brood, elke ochtend.";
    const URL_DRAFT = url.textContent;
    const ghostLabel = document.createElement("span");
    ghost.append(ghostLabel);

    const setTheme = (n) => {
      site.dataset.theme = n;
      swatches.forEach((s, i) => s.classList.toggle("on", i === n));
    };
    const goLive = () => {
      publish.classList.add("live");
      publishLabel.textContent = "Live";
      urlBox.classList.add("live");
      url.textContent = "jouwdomein.be";
    };

    if (CALM) {
      // Geen tijdlijn: toon het afgewerkte resultaat.
      drop.classList.add("gone");
      site.classList.add("has");
      pieces().forEach((p) => p.classList.add("on"));
      title.textContent = TITLE;
      caret.hidden = true;
      cursor.hidden = true;
      setTheme(1);
      goLive();
      return;
    }

    // De tijdlijn loopt alleen als de bouwer in beeld is en het tabblad open staat.
    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 }).observe(mock);
    const wait = async (ms) => {
      await sleep(ms);
      while (!visible || document.hidden) await sleep(300);
    };

    // Positie van een element binnen de mock, los van kanteling of schaal.
    const at = (el, fx = 0.5, fy = 0.5) => {
      let x = 0, y = 0;
      for (let n = el; n && n !== inner; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
      return { x: x + el.offsetWidth * fx, y: y + el.offsetHeight * fy };
    };
    const place = (p, dur) => {
      for (const el of [cursor, ghost]) {
        el.style.transitionDuration = `${dur}ms`;
        el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
    };
    const move = async (p, dur = 720) => { place(p, dur); await wait(dur + 70); };
    const press = async () => {
      cursor.classList.add("down");
      await wait(150);
      cursor.classList.remove("down");
      await wait(140);
    };

    const drag = async (name) => {
      const block = $(`[data-blk="${name}"]`, mock);
      const parts = pieces(name);
      await move(at(block, 0.3, 0.55));
      cursor.classList.add("down");
      block.classList.add("lift");
      ghostLabel.textContent = block.textContent.trim();
      ghost.classList.add("on");
      await wait(220);
      canvas.classList.add("over");
      await move(at(parts[0], 0.35, 0.5), 860);
      cursor.classList.remove("down");
      ghost.classList.remove("on");
      block.classList.remove("lift");
      canvas.classList.remove("over");
      drop.classList.add("gone");
      site.classList.add("has");
      parts.forEach((p, i) => { p.style.transitionDelay = `${i * 110}ms`; p.classList.add("on"); });
      await wait(520);
    };

    const type = async () => {
      caret.hidden = false;
      for (const ch of TITLE) {
        title.textContent += ch;
        await wait(34 + Math.random() * 46);
      }
      await wait(350);
      caret.hidden = true;
    };

    const reset = async () => {
      site.classList.remove("has", "shine");
      await wait(520);
      pieces().forEach((p) => { p.style.transitionDelay = "0ms"; p.classList.remove("on"); });
      title.textContent = "";
      setTheme(0);
      publish.classList.remove("live");
      publishLabel.textContent = "Publiceer";
      urlBox.classList.remove("live");
      url.textContent = URL_DRAFT;
      drop.classList.remove("gone");
      await wait(700);
    };

    (async () => {
      const rest = () => ({ x: inner.offsetWidth * 0.62, y: inner.offsetHeight * 0.8 });
      place(rest(), 0);
      await wait(1300);
      for (;;) {
        await drag("kop");
        await type();
        await drag("foto");
        await drag("tekst");
        await drag("knop");
        await wait(350);

        for (const n of [1, 2, 1]) {
          await move(at(swatches[n]), 560);
          await press();
          setTheme(n);
          await wait(820);
        }

        await move(at(publish));
        cursor.classList.add("down");
        publish.classList.add("press");
        await wait(170);
        cursor.classList.remove("down");
        publish.classList.remove("press");
        publish.classList.add("busy");
        await wait(1000);
        publish.classList.remove("busy");
        goLive();
        site.classList.add("shine");
        const p = at(publish);
        burst(inner, p.x, p.y, 30);

        await move(rest(), 950);
        await wait(3600);
        await reset();
      }
    })();
  }

  /* ---------- Functiekaarten: licht dat de muis volgt ---------- */
  function initCards() {
    if (!FINE_POINTER) return;
    for (const card of $$(".card")) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    }
  }

  /* ---------- Functiekaart: AI die een tekst typt ---------- */
  function initAi() {
    const prompt = $("#aiPrompt");
    const out = $("#aiOut");
    if (!prompt || !out) return;
    const card = out.closest("[data-live]");
    const samples = [
      ["Schrijf een welkomsttekst voor mijn kapsalon", "Welkom bij Studio Lien. Neem even tijd voor jezelf en ga naar buiten met een kapsel dat bij je past."],
      ["Beschrijf mijn fietsenwinkel in twee zinnen", "Van stadsfiets tot racefiets: wij helpen je kiezen. Loop gerust binnen voor een proefrit."],
      ["Maak een korte tekst voor mijn taxidienst", "Dag en nacht klaar voor je rit. Op tijd, comfortabel en met een prijs die je vooraf kent."],
    ];
    if (CALM) { out.textContent = samples[0][1]; return; }

    const wait = async (ms) => {
      await sleep(ms);
      while (!card.classList.contains("is-live") || document.hidden) await sleep(300);
    };
    (async () => {
      for (let i = 0; ; i = (i + 1) % samples.length) {
        const [question, answer] = samples[i];
        prompt.textContent = question;
        out.textContent = "";
        await wait(700);
        for (const ch of answer) {
          out.textContent += ch;
          await wait(16 + Math.random() * 26);
        }
        await wait(2600);
      }
    })();
  }

  /* ---------- Functiekaart: stijl wisselt ---------- */
  function initStyleViz() {
    const viz = $("#styleViz");
    if (!viz || CALM) return;
    let n = 0;
    setInterval(() => {
      if (!viz.closest("[data-live]").classList.contains("is-live")) return;
      n = (n + 1) % 4;
      viz.dataset.theme = n;
    }, 1900);
  }

  /* ---------- Zo werkt het: het beeld wisselt mee met de stap ---------- */
  function initHow() {
    const texts = $$(".how__text");
    const visuals = $$(".how__visual");
    if (!texts.length) return;
    let current = "";
    const activate = (step) => {
      if (step === current) return;
      current = step;
      texts.forEach((t) => t.classList.toggle("active", t.dataset.step === step));
      visuals.forEach((v) => v.classList.toggle("active", v.dataset.step === step));
    };
    // Actief is de stap waarvan de tekst het dichtst bij het midden van het scherm staat.
    let queued = false;
    const update = () => {
      queued = false;
      const mid = innerHeight / 2;
      let best = texts[0];
      let bestGap = Infinity;
      for (const t of texts) {
        const r = t.getBoundingClientRect();
        const gap = Math.abs(r.top + r.height / 2 - mid);
        if (gap < bestGap) { bestGap = gap; best = t; }
      }
      activate(best.dataset.step);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    update();
  }

  /* ---------- Templates: de kaartjes tekenen ---------- */
  function initTemplates() {
    const host = $("#tplRows");
    if (!host) return;
    const rows = [
      [
        { n: "Restaurant", bg: "#1c1410", ink: "#f7e9d7", ac: "#e9a23b", v: "center" },
        { n: "Kapsalon", bg: "#f6eee9", ink: "#2a1f1c", ac: "#c9697a", v: "split" },
        { n: "Webshop", bg: "#f3f5fb", ink: "#161a26", ac: "#4a7dff", v: "grid" },
        { n: "Portfolio", bg: "#0f1012", ink: "#f2f2f2", ac: "#d7ff3f", v: "split" },
        { n: "Coach", bg: "#eef7f1", ink: "#153426", ac: "#1f9d6b", v: "center" },
        { n: "Aannemer", bg: "#16202b", ink: "#eef3f8", ac: "#ffb020", v: "grid" },
      ],
      [
        { n: "Fotograaf", bg: "#ecebe6", ink: "#191917", ac: "#191917", v: "grid" },
        { n: "Taxi", bg: "#121212", ink: "#ffffff", ac: "#ffcc00", v: "split" },
        { n: "Vereniging", bg: "#fff7e8", ink: "#3a2a05", ac: "#ef6a3a", v: "center" },
        { n: "Bakkerij", bg: "#fbf6ee", ink: "#241c15", ac: "#e2602b", v: "split" },
        { n: "Schoonheidssalon", bg: "#1a1320", ink: "#f6ecff", ac: "#d59bff", v: "center" },
        { n: "Fietsenwinkel", bg: "#eaf4ff", ink: "#0f2238", ac: "#0b84ff", v: "grid" },
      ],
    ];
    const text = '<div class="tpl__t"><u></u><u></u><em></em></div>';
    const bodies = {
      split: `${text}<div class="tpl__pic"></div>`,
      center: `${text}<div class="tpl__pic"></div>`,
      grid: `${text}<div class="tpl__tiles"><i></i><i></i><i></i></div>`,
    };
    const card = (t) => `
      <figure class="tpl" style="--bg:${t.bg};--ink:${t.ink};--ac:${t.ac}">
        <div class="tpl__page tpl__page--${t.v}">
          <div class="tpl__nav"><b></b><span class="sk"></span><span class="sk"></span><span class="sk"></span></div>
          <div class="tpl__body">${bodies[t.v]}</div>
        </div>
        <figcaption>${t.n}</figcaption>
      </figure>`;

    host.innerHTML = rows.map((row, i) => `
      <div class="marquee${i % 2 ? " marquee--rev" : ""}" data-marquee style="--dur:${52 + i * 8}s">
        <div class="marquee__group">${row.map(card).join("")}</div>
      </div>`).join("");
  }

  /* ---------- Cijfers die oplopen ---------- */
  function initCounters() {
    const nums = $$("[data-count]");
    if (CALM || !("IntersectionObserver" in window)) return;
    nums.forEach((el) => { el.textContent = el.dataset.from; });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target;
        const from = Number(el.dataset.from);
        const to = Number(el.dataset.count);
        const start = performance.now();
        const dur = 1500;
        const step = (now) => {
          const p = clamp((now - start) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(from + (to - from) * eased);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }

  /* ---------- Prijzen: per maand of per jaar ---------- */
  function initBilling() {
    const box = $(".billing");
    if (!box) return;
    const buttons = $$("button", box);
    const thumb = $(".billing__thumb", box);
    const nums = $$(".plan__num");

    const moveThumb = () => {
      const on = $("button.on", box);
      thumb.style.width = `${on.offsetWidth}px`;
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    const select = (period) => {
      buttons.forEach((b) => {
        const on = b.dataset.period === period;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      moveThumb();
      for (const n of nums) {
        const value = n.dataset[period];
        if (n.textContent === value) continue;
        if (CALM) { n.textContent = value; continue; }
        n.classList.remove("flip");
        void n.offsetWidth; // animatie opnieuw laten starten
        n.classList.add("flip");
        setTimeout(() => { n.textContent = value; }, 240);
      }
    };
    buttons.forEach((b) => b.addEventListener("click", () => select(b.dataset.period)));
    addEventListener("resize", moveThumb);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveThumb);
    moveThumb();

    // Een plan kiezen vult het formulier alvast in.
    const planField = $("#f-plan");
    $$("[data-plan]").forEach((a) => a.addEventListener("click", () => {
      if (planField) planField.value = a.dataset.plan;
    }));
  }

  /* ---------- Vragen: uitklappen ---------- */
  function initFaq() {
    const items = $$(".faq__item");
    const set = (item, open) => {
      item.classList.toggle("open", open);
      $(".faq__q", item).setAttribute("aria-expanded", String(open));
      $(".faq__a", item).inert = !open;
    };
    items.forEach((item, i) => {
      set(item, i === 0);
      $(".faq__q", item).addEventListener("click", () => {
        const open = !item.classList.contains("open");
        items.forEach((other) => set(other, other === item && open));
      });
    });
  }

  /* ---------- Knoppen die licht naar de muis toe trekken ---------- */
  function initMagnetic() {
    if (!FINE_POINTER || CALM) return;
    for (const el of $$("[data-magnetic]")) {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--tx", `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
        el.style.setProperty("--ty", `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--tx", "0px");
        el.style.setProperty("--ty", "0px");
      });
    }
  }

  /* ---------- Formulier voor vroege toegang ---------- */
  // Verstuurt naar Netlify Forms zonder de pagina te verlaten. Zonder
  // JavaScript werkt het formulier ook: dan gaat de bezoeker naar bedankt.html.
  function initForm() {
    const form = $("#form");
    if (!form) return;
    const button = $(".form__submit", form);
    const label = $(".form__submit-label", form);
    const error = $("#formError");
    const done = $("#formDone");
    const idle = label.textContent;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.hidden = true;
      button.classList.add("busy");
      label.textContent = "Bezig met versturen…";
      try {
        const res = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        done.hidden = false;
        $$("input, select, textarea, button", form).forEach((el) => { el.disabled = true; });
        burst(form, form.offsetWidth / 2, form.offsetHeight / 2 - 40, 40);
      } catch {
        error.hidden = false;
      } finally {
        button.classList.remove("busy");
        label.textContent = idle;
      }
    });
  }

  function initYear() {
    const el = $("#year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- Starten ---------- */
  // De volgorde telt: eerst de inhoud opbouwen, dan pas observeren.
  const steps = [
    splitHeadings, initTemplates, initMarquees, initReveal, initLive, initNav,
    initScrollFx, initRotator, initMock, initCards, initAi, initStyleViz,
    initHow, initCounters, initBilling, initFaq, initMagnetic, initForm, initYear,
  ];
  for (const step of steps) {
    try { step(); } catch (err) { console.error(`Weblity: ${step.name} is niet gestart.`, err); }
  }
  window.WEBLITY_READY = true;
})();
