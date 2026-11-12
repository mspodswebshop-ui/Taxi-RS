/**
 * Dit script draait IN de pagina van de klant, wanneer die in de editor
 * geopend is. Het maakt elementen aanklikbaar en tekst typbaar, en praat met
 * het dashboard eromheen via postMessage.
 *
 * Alles wat de editor zelf toevoegt krijgt het kenmerk data-zetlive, zodat het
 * bij het opslaan weer netjes verwijderd kan worden.
 */
(() => {
  // Alleen actief als de pagina in het editorvenster zit, niet los geopend.
  if (window.parent === window) return;
  document.currentScript?.remove();

  const send = (type, data = {}) => window.parent.postMessage({ zetlive: true, type, ...data }, "*");

  /* ------------------------------ Kaders ------------------------------ */

  const layer = document.createElement("div");
  layer.setAttribute("data-zetlive", "");
  layer.innerHTML = `<style>
    [data-zetlive] .zl-box{position:fixed;pointer-events:none;z-index:2147483646;box-sizing:border-box;display:none}
    [data-zetlive] .zl-hover{border:1px dashed #4f46e5}
    [data-zetlive] .zl-select{border:2px solid #4f46e5}
    [data-zetlive] .zl-tag{position:absolute;left:-2px;bottom:100%;background:#4f46e5;color:#fff;
      font:600 11px/1 system-ui,sans-serif;padding:4px 6px;border-radius:4px 4px 0 0;white-space:nowrap}
    [data-zl-edit]{outline:none!important;cursor:text!important}
    html{cursor:default}
  </style><div class="zl-box zl-hover"></div><div class="zl-box zl-select"><span class="zl-tag"></span></div>`;
  document.documentElement.appendChild(layer);
  const hoverBox = layer.querySelector(".zl-hover");
  const selectBox = layer.querySelector(".zl-select");
  const tagLabel = layer.querySelector(".zl-tag");

  let selected = null;
  let hovered = null;

  function place(box, el) {
    if (!el || !el.isConnected) return (box.style.display = "none");
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  function redraw() {
    place(selectBox, selected);
    place(hoverBox, hovered && hovered !== selected ? hovered : null);
  }
  addEventListener("scroll", redraw, true);
  addEventListener("resize", redraw);
  setInterval(redraw, 300); // afbeeldingen die laat laden verschuiven de pagina

  /* --------------------------- Wat is dit element? ---------------------- */

  const NAMES = {
    H1: "Kop", H2: "Kop", H3: "Kop", H4: "Kop", H5: "Kop", H6: "Kop", P: "Tekst", A: "Link", BUTTON: "Knop",
    IMG: "Afbeelding", LI: "Lijstpunt", SPAN: "Tekst", SECTION: "Sectie", HEADER: "Kop van de pagina",
    FOOTER: "Voettekst", NAV: "Menu", DIV: "Blok", BODY: "Hele pagina", UL: "Lijst", OL: "Lijst", LABEL: "Label",
  };
  const NO_TEXT = new Set(["IMG", "VIDEO", "AUDIO", "IFRAME", "INPUT", "TEXTAREA", "SELECT", "SVG", "CANVAS", "HR", "BR", "BODY", "HTML"]);

  const looksLikeButton = (el) => el.tagName === "BUTTON" || (el.tagName === "A" && /\b(btn|button|knop|cta)\b/i.test(el.className));
  const nameOf = (el) => (looksLikeButton(el) ? "Knop" : NAMES[el.tagName.toUpperCase()] || el.tagName.toLowerCase());

  /** Tekst is te typen als het element zelf (niet alleen een kind) tekst bevat. */
  const hasOwnText = (el) =>
    !NO_TEXT.has(el.tagName.toUpperCase()) && !el.closest("svg") &&
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  function toHex(color) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    if (!m || m[4] === "0") return "";
    return "#" + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }

  function describe(el) {
    const cs = getComputedStyle(el);
    const link = el.closest("a");
    return {
      name: nameOf(el),
      tag: el.tagName.toLowerCase(),
      editable: hasOwnText(el),
      canParent: Boolean(el.parentElement && el.parentElement !== document.documentElement),
      canRemove: el !== document.body,
      image: el.tagName === "IMG" ? { src: el.getAttribute("src") || "", alt: el.getAttribute("alt") || "" } : null,
      link: link ? { href: link.getAttribute("href") || "", newTab: link.target === "_blank" } : null,
      style: {
        color: toHex(cs.color),
        backgroundColor: toHex(cs.backgroundColor),
        fontSize: Math.round(parseFloat(cs.fontSize)),
        bold: Number(cs.fontWeight) >= 600,
        italic: cs.fontStyle === "italic",
        underline: cs.textDecorationLine.includes("underline"),
        textAlign: cs.textAlign.replace("start", "left").replace("end", "right"),
        borderRadius: Math.round(parseFloat(cs.borderTopLeftRadius)) || 0,
        paddingY: Math.round(parseFloat(cs.paddingTop)) || 0,
        paddingX: Math.round(parseFloat(cs.paddingLeft)) || 0,
      },
    };
  }

  /* ------------------------------ Selecteren --------------------------- */

  function deselect(tell = true) {
    if (selected) {
      selected.removeAttribute("data-zl-edit");
      selected.removeAttribute("contenteditable");
      selected.removeAttribute("spellcheck");
    }
    selected = null;
    redraw();
    if (tell) send("deselect");
  }

  function select(el, point) {
    if (el === selected) return;
    deselect(false);
    selected = el;
    if (hasOwnText(el)) {
      el.setAttribute("data-zl-edit", "");
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");
      el.focus({ preventScroll: true });
      // De cursor neerzetten waar geklikt is, zodat je meteen kunt typen.
      const range = point && document.caretRangeFromPoint?.(point.x, point.y);
      if (range && el.contains(range.startContainer)) {
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    tagLabel.textContent = nameOf(el);
    redraw();
    send("select", { info: describe(el) });
  }

  const isOurs = (el) => !(el instanceof Element) || el.closest("[data-zetlive]") || el === document.documentElement;

  addEventListener("mousemove", (e) => {
    hovered = isOurs(e.target) ? null : e.target;
    redraw();
  }, true);
  addEventListener("mouseleave", () => { hovered = null; redraw(); }, true);

  addEventListener("click", (e) => {
    // Links en knoppen doen in de editor niets: klikken is selecteren.
    e.preventDefault();
    e.stopPropagation();
    if (isOurs(e.target)) return;
    if (selected && selected.hasAttribute("data-zl-edit") && selected.contains(e.target)) return;
    select(e.target, { x: e.clientX, y: e.clientY });
  }, true);
  for (const type of ["submit", "auxclick", "dragstart"]) addEventListener(type, (e) => e.preventDefault(), true);

  /* --------------------------- Ongedaan maken -------------------------- */

  /** De inhoud van de pagina, zonder de sporen van de editor. */
  function cleanBody() {
    const el = selected;
    const marked = el?.hasAttribute("data-zl-edit");
    if (marked) for (const a of ["data-zl-edit", "contenteditable", "spellcheck"]) el.removeAttribute(a);
    const html = document.body.innerHTML;
    if (marked) {
      el.setAttribute("data-zl-edit", "");
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");
    }
    return html;
  }

  let last = cleanBody();
  let bodyStyle = document.body.getAttribute("style");
  const undoStack = [];
  const redoStack = [];
  let typing = null;

  const state = () => ({ html: cleanBody(), style: document.body.getAttribute("style") });
  const tellHistory = () => send("history", { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });

  /** Leg vast dat er iets veranderd is. */
  function commit() {
    clearTimeout(typing);
    typing = null;
    const now = state();
    if (now.html === last && now.style === bodyStyle) return;
    undoStack.push({ html: last, style: bodyStyle });
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
    last = now.html;
    bodyStyle = now.style;
    send("dirty");
    tellHistory();
    redraw();
  }

  function restore(from, to) {
    if (typing) commit();
    if (!from.length) return;
    to.push({ html: last, style: bodyStyle });
    const prev = from.pop();
    deselect();
    document.body.innerHTML = prev.html;
    if (prev.style === null) document.body.removeAttribute("style");
    else document.body.setAttribute("style", prev.style);
    last = prev.html;
    bodyStyle = prev.style;
    send("dirty");
    tellHistory();
  }

  addEventListener("input", () => {
    send("dirty");
    redraw();
    clearTimeout(typing);
    typing = setTimeout(commit, 600);
  }, true);

  addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      restore(e.shiftKey ? redoStack : undoStack, e.shiftKey ? undoStack : redoStack);
    } else if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      restore(redoStack, undoStack);
    } else if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      send("save");
    } else if (e.key === "Escape") {
      deselect();
    } else if (e.key === "Enter" && selected?.hasAttribute("data-zl-edit")) {
      // Een nieuwe regel, geen nieuw blok: zo blijft de opmaak van de site heel.
      e.preventDefault();
      document.execCommand("insertLineBreak");
    }
  }, true);

  // Plakken zonder opmaak, anders komt er vreemde HTML van elders mee.
  addEventListener("paste", (e) => {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData?.getData("text/plain") || "");
  }, true);

  /* ---------------------- Opdrachten van het dashboard ------------------ */

  function fullHtml() {
    if (typing) commit();
    const el = selected;
    deselect(false);
    const copy = document.documentElement.cloneNode(true);
    copy.querySelectorAll("[data-zetlive]").forEach((n) => n.remove());
    if (el?.isConnected) select(el);
    const dt = document.doctype;
    const doctype = dt
      ? `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ""}${dt.systemId ? ` "${dt.systemId}"` : ""}>\n`
      : "";
    return doctype + copy.outerHTML + "\n";
  }

  const commands = {
    style({ prop, value }) {
      if (!selected) return;
      if (value === "" || value == null) selected.style.removeProperty(prop);
      else selected.style.setProperty(prop, value);
      if (!selected.getAttribute("style")) selected.removeAttribute("style");
    },
    link({ href, newTab }) {
      const a = selected?.closest("a");
      if (!a) return;
      if (href !== undefined) a.setAttribute("href", href);
      if (newTab !== undefined) {
        if (newTab) { a.target = "_blank"; a.rel = "noopener"; }
        else { a.removeAttribute("target"); a.removeAttribute("rel"); }
      }
    },
    image({ src, alt }) {
      if (selected?.tagName !== "IMG") return;
      if (src !== undefined) {
        selected.setAttribute("src", src);
        selected.removeAttribute("srcset"); // anders blijft de oude afbeelding staan
      }
      if (alt !== undefined) selected.setAttribute("alt", alt);
    },
    parent() {
      if (selected?.parentElement && selected.parentElement !== document.documentElement) select(selected.parentElement);
    },
    duplicate() {
      if (!selected || selected === document.body) return;
      const el = selected;
      deselect(false);
      const copy = el.cloneNode(true);
      copy.removeAttribute("id");
      el.after(copy);
      select(copy);
    },
    remove() {
      if (!selected || selected === document.body) return;
      const el = selected;
      deselect();
      el.remove();
    },
    deselect: () => deselect(),
    undo: () => restore(undoStack, redoStack),
    redo: () => restore(redoStack, undoStack),
    getHtml: ({ requestId }) => send("html", { requestId, html: fullHtml() }),
  };

  const SILENT = new Set(["parent", "deselect", "undo", "redo", "getHtml"]);

  addEventListener("message", (e) => {
    if (e.source !== window.parent || !e.data?.zetlive) return;
    const run = commands[e.data.cmd];
    if (!run) return;
    run(e.data);
    if (SILENT.has(e.data.cmd)) return;
    commit();
    if (selected) send("select", { info: describe(selected) });
  });

  send("ready", { title: document.title });
})();
