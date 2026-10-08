"use strict";

/* =======================================================================
   Mijn AI - frontend
   Gesprekken staan in localStorage; de API-sleutel blijft op de server.
   Of iemand mag chatten (abonnement, model, limiet) bepaalt ook de server;
   deze pagina toont alleen wat er kan.
   ======================================================================= */

const STORE_KEY = "mijn-ai.chats.v2";
const PREFS_KEY = "mijn-ai.prefs.v2";

const el = (id) => document.getElementById(id);

const ui = {
  app: el("app"),
  main: el("main"),
  sidebar: el("sidebar"),
  scrim: el("scrim"),
  chatList: el("chatList"),
  searchInput: el("searchInput"),
  messages: el("messages"),
  welcome: el("welcome"),
  welcomeTitle: el("welcomeTitle"),
  planBadge: el("planBadge"),
  chatTitle: el("chatTitle"),
  upgradeChip: el("upgradeChip"),
  modelBtn: el("modelBtn"),
  modelBtnLabel: el("modelBtnLabel"),
  effortChip: el("effortChip"),
  effortChipLabel: el("effortChipLabel"),
  modelPopover: el("modelPopover"),
  modelOptions: el("modelOptions"),
  effortOptions: el("effortOptions"),
  effortNote: el("effortNote"),
  composer: el("composer"),
  input: el("input"),
  sendBtn: el("sendBtn"),
  stopBtn: el("stopBtn"),
  chatCost: el("chatCost"),
  usageWarning: el("usageWarning"),
  accountBtn: el("accountBtn"),
  accountMenu: el("accountMenu"),
  settingsModal: el("settingsModal"),
  systemPrompt: el("systemPrompt"),
  showThinking: el("showThinking"),
  showCost: el("showCost"),
  themeLabel: el("themeLabel"),
  toast: el("toast"),
  payModal: el("payModal"),
  plans: el("plans"),
  codeInput: el("codeInput"),
};

const EFFORTS = [
  { id: "low", label: "Laag", note: "Snelste en goedkoopste antwoorden. Prima voor korte vragen." },
  { id: "medium", label: "Middel", note: "Een goede balans tussen snelheid en diepgang." },
  { id: "high", label: "Hoog", note: "Degelijk doordacht, redelijk snel." },
  { id: "xhigh", label: "Extra", note: "Denkt duidelijk langer door. Sterk voor code en analyse." },
  { id: "max", label: "Max", note: "Denkt zo diep mogelijk. Het traagst, maar het best voor echt moeilijke vragen." },
];
const EFFORT_IDS = EFFORTS.map((e) => e.id);

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  modelCheck: '<path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
};

let config = {
  models: [{ id: "claude-fable-5-1", label: "Fable 5.1", tagline: "", note: "", price: null }],
  defaultModel: "claude-fable-5-1",
  defaultEffort: "max",
  defaultSystemPrompt: "",
  hasCredentials: true,
};

let chats = [];
let activeId = null;
let searchTerm = "";
let prefs = {
  theme: "dark",
  model: null,
  effort: null,
  system: null,
  showThinking: false,
  showCost: true,
  rail: false,
};
let controller = null; // AbortController van het lopende verzoek

// Stand van het abonnement, zoals de server die doorgeeft. Zonder Stripe op
// de server is `vereist` false en is alles vrij toegankelijk.
let abonnement = { vereist: false, actief: true, plan: null, plannen: [], gebruik: null };

/* ---------------------- Opslag ---------------------- */

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) chats = JSON.parse(raw);
  } catch {
    chats = [];
  }
  if (!Array.isArray(chats)) chats = [];

  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) prefs = { ...prefs, ...JSON.parse(raw) };
  } catch {
    /* standaardwaarden blijven staan */
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(chats));
  } catch {
    toast("Kon niet opslaan - de opslag van je browser is vol.");
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* niet kritisch */
  }
}

/* ---------------------- Hulpfuncties ---------------------- */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let toastTimer = null;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    ui.toast.hidden = true;
  }, 3200);
}

const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

function activeChat() {
  return chats.find((c) => c.id === activeId) ?? null;
}

function modelInfo(id) {
  return config.models.find((m) => m.id === id) ?? null;
}

/** Haiku 4.5 ondersteunt geen instelbare denkkracht. */
function supportsEffort(modelId) {
  return modelId !== "claude-haiku-4-5";
}

/* ----- Wat mag er met het huidige abonnement? ----- */

function huidigPlan() {
  if (!abonnement.vereist || !abonnement.actief) return null;
  return abonnement.plannen?.find((p) => p.id === abonnement.plan) ?? null;
}

const effortIndex = (id) => EFFORT_IDS.indexOf(id);

/** Zonder lopend abonnement is er niets af te schermen: versturen opent dan de abonnementen. */
function modelToegestaan(id) {
  if (!abonnement.vereist || !abonnement.actief) return true;
  return Boolean(huidigPlan()?.modellen.includes(id));
}

function effortToegestaan(id) {
  const plan = huidigPlan();
  if (!plan) return true;
  return effortIndex(id) <= effortIndex(plan.maxDenkkracht);
}

const planVoorModel = (id) => abonnement.plannen?.find((p) => p.modellen.includes(id)) ?? null;
const planVoorEffort = (id) =>
  abonnement.plannen?.find((p) => effortIndex(id) <= effortIndex(p.maxDenkkracht)) ?? null;

function currentModel() {
  const id = prefs.model ?? config.defaultModel;
  if (config.models.some((m) => m.id === id) && modelToegestaan(id)) return id;
  // Het beste model dat bij het abonnement hoort (de lijst loopt van sterk naar snel).
  return config.models.find((m) => modelToegestaan(m.id))?.id ?? config.defaultModel;
}

function currentEffort() {
  const gekozen = prefs.effort ?? config.defaultEffort;
  if (effortToegestaan(gekozen)) return gekozen;
  return huidigPlan()?.maxDenkkracht ?? gekozen;
}

/** Kosten tonen heeft alleen zin voor de eigenaar, niet voor abonnees. */
const toonKosten = () => prefs.showCost && !abonnement.vereist;

function titleFrom(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 46 ? `${clean.slice(0, 46)}...` : clean || "Nieuw gesprek";
}

/** Geschatte kosten in dollar, op basis van het tokengebruik. */
function costOf(usage, modelId) {
  const price = modelInfo(modelId)?.price;
  if (!price || !usage) return null;
  return (
    (usage.input * price.input +
      usage.output * price.output +
      (usage.cacheRead ?? 0) * price.cacheRead +
      // Wegschrijven naar de cache kost ongeveer 1,25x de invoerprijs.
      (usage.cacheWrite ?? 0) * price.input * 1.25) /
    1_000_000
  );
}

function formatCost(amount) {
  if (amount == null) return "";
  if (amount < 0.001) return "< $0,001";
  const decimals = amount < 1 ? 3 : 2;
  return `$${amount.toFixed(decimals).replace(".", ",")}`;
}

function chatCost(chat) {
  let total = 0;
  let known = false;
  for (const msg of chat?.messages ?? []) {
    const cost = costOf(msg.usage, msg.model);
    if (cost != null) {
      total += cost;
      known = true;
    }
  }
  return known ? total : null;
}

function euro(centen) {
  const bedrag = centen / 100;
  return `€${Number.isInteger(bedrag) ? bedrag : bedrag.toFixed(2).replace(".", ",")}`;
}

const datum = (iso) =>
  iso ? new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long" }) : "";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

/* ---------------------- Markdown ----------------------
   Compacte renderer: eerst alles escapen, dan opmaak toepassen.
   Codeblokken worden vooraf uitgenomen zodat er binnen code niets
   als markdown wordt geinterpreteerd.
   ------------------------------------------------------ */

function renderMarkdown(src) {
  const blocks = [];

  // 1. Codeblokken (```taal ... ```) eruit halen. Een laatste, nog niet
  //    afgesloten blok tijdens streamen wordt ook al getoond.
  let text = src.replace(/```([\w+-]*)\n?([\s\S]*?)(?:```|$)/g, (_m, lang, code) => {
    const i = blocks.push({ lang: lang || "", code: code.replace(/\n$/, "") }) - 1;
    return `@@CODE${i}@@`;
  });

  text = escapeHtml(text);

  // 2. Inline code beschermen tegen de overige regels.
  const inline = [];
  text = text.replace(/`([^`\n]+)`/g, (_m, code) => {
    const i = inline.push(code) - 1;
    return `@@INL${i}@@`;
  });

  // 3. Blokniveau: regel voor regel, zodat lijsten en koppen blijven kloppen.
  const lines = text.split("\n");
  const out = [];
  let listType = null; // "ul" | "ol" | null
  let inQuote = false;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.join("<br>")}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };
  const closeAll = () => {
    flushPara();
    closeList();
    closeQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      closeAll();
      continue;
    }

    // Horizontale lijn
    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      closeAll();
      out.push("<hr>");
      continue;
    }

    // Kop
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeAll();
      const level = Math.min(heading[1].length, 6);
      out.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      continue;
    }

    // Citaat (het > is al geescaped naar &gt;)
    const quote = trimmed.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushPara();
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`<p>${inlineFormat(quote[1])}</p>`);
      continue;
    }
    closeQuote();

    // Lijstitems
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushPara();
      const want = bullet ? "ul" : "ol";
      if (listType !== want) {
        closeList();
        out.push(`<${want}>`);
        listType = want;
      }
      out.push(`<li>${inlineFormat((bullet ?? numbered)[1])}</li>`);
      continue;
    }
    closeList();

    // Een codeblok-placeholder staat altijd op een eigen regel.
    if (/^@@CODE\d+@@$/.test(trimmed)) {
      flushPara();
      out.push(trimmed);
      continue;
    }

    // Tabelrij
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushPara();
      out.push(`@@ROW@@${trimmed}`);
      continue;
    }

    para.push(inlineFormat(trimmed));
  }
  closeAll();

  let html = groupTables(out).join("\n");

  // 4. Placeholders terugzetten.
  html = html.replace(
    /@@INL(\d+)@@/g,
    (_m, i) => `<code>${escapeHtml(inline[Number(i)])}</code>`,
  );
  html = html.replace(/@@CODE(\d+)@@/g, (_m, i) => codeBlockHtml(blocks[Number(i)]));

  return html;
}

/** Vet, cursief, doorhalen en links binnen een regel. */
function inlineFormat(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    // [tekst](url): alleen http(s) en mailto, zodat javascript:-links niet werken.
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

/** Opeenvolgende tabelrijen samenvoegen tot een <table>. */
function groupTables(lines) {
  const ROW_PREFIX = "@@ROW@@";
  const out = [];
  let rows = [];

  const isDivider = (row) => /^\|[\s:|-]+\|$/.test(row);

  const flush = () => {
    if (!rows.length) return;

    // De scheidingsregel (|---|---|) bepaalt of de eerste rij een koprij is.
    const header = rows.length > 1 && isDivider(rows[1]) ? rows[0] : null;
    const body = rows.filter((row, i) => !isDivider(row) && !(header && i === 0));

    const cells = (row, tag) =>
      row
        .slice(1, -1)
        .split("|")
        .map((cell) => `<${tag}>${inlineFormat(cell.trim())}</${tag}>`)
        .join("");

    let table = '<div class="table-wrap"><table>';
    if (header) table += `<thead><tr>${cells(header, "th")}</tr></thead>`;
    table += "<tbody>";
    for (const row of body) table += `<tr>${cells(row, "td")}</tr>`;
    table += "</tbody></table></div>";

    out.push(table);
    rows = [];
  };

  for (const line of lines) {
    if (line.startsWith(ROW_PREFIX)) {
      rows.push(line.slice(ROW_PREFIX.length));
      continue;
    }
    flush();
    out.push(line);
  }
  flush();
  return out;
}

function codeBlockHtml({ lang, code }) {
  return (
    '<div class="code-block">' +
    `<div class="code-head"><span>${escapeHtml(lang || "code")}</span>` +
    '<button class="copy-btn" data-copy type="button">Kopiëren</button></div>' +
    `<pre><code>${escapeHtml(code)}</code></pre></div>`
  );
}

/* ---------------------- Gesprekkenlijst ---------------------- */

function groupLabel(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((startOfToday - then) / 86_400_000);

  if (then >= startOfToday) return "Vandaag";
  if (days < 1) return "Gisteren";
  if (days < 7) return "Afgelopen 7 dagen";
  if (days < 30) return "Afgelopen 30 dagen";
  return "Ouder";
}

function matchesSearch(chat, term) {
  if (!term) return true;
  if (chat.title.toLowerCase().includes(term)) return true;
  return chat.messages.some(
    (m) => typeof m.content === "string" && m.content.toLowerCase().includes(term),
  );
}

function renderChatList() {
  ui.chatList.innerHTML = "";

  const term = searchTerm.trim().toLowerCase();
  // Lege gesprekken horen niet in de lijst, zoals bij Claude.
  const visible = chats.filter((chat) => chat.messages.length > 0 && matchesSearch(chat, term));

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = term ? "Niets gevonden." : "Nog geen gesprekken.";
    ui.chatList.append(empty);
    return;
  }

  let lastGroup = null;
  for (const chat of visible) {
    const label = groupLabel(chat.updatedAt ?? chat.createdAt);
    if (label !== lastGroup) {
      const head = document.createElement("div");
      head.className = "chat-group";
      head.textContent = label;
      ui.chatList.append(head);
      lastGroup = label;
    }

    const item = document.createElement("div");
    item.className = "chat-item" + (chat.id === activeId ? " active" : "");
    item.tabIndex = 0;
    item.setAttribute("role", "button");

    const name = document.createElement("span");
    name.className = "chat-item-name";
    name.textContent = chat.title;

    const del = document.createElement("button");
    del.className = "chat-item-del";
    del.type = "button";
    del.title = "Gesprek verwijderen";
    del.setAttribute("aria-label", `Verwijder gesprek: ${chat.title}`);
    del.innerHTML = ICONS.trash;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });

    const open = () => selectChat(chat.id);
    item.addEventListener("click", open);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    item.append(name, del);
    ui.chatList.append(item);
  }
}

/* ---------------------- Berichten tonen ---------------------- */

function setEmpty(empty) {
  ui.main.classList.toggle("empty", empty);
}

function renderMessages() {
  const chat = activeChat();
  ui.messages.innerHTML = "";

  if (!chat || chat.messages.length === 0) {
    ui.welcomeTitle.textContent = greeting();
    ui.messages.append(ui.welcome);
    ui.welcome.hidden = false;
    setEmpty(true);
    updateCost();
    return;
  }

  setEmpty(false);
  chat.messages.forEach((msg, i) => {
    ui.messages.append(buildMessageEl(msg, i === chat.messages.length - 1));
  });
  updateCost();
  scrollToBottom();
}

function buildMessageEl(msg, isLast = false) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${msg.role}` + (isLast ? " last" : "");

  if (msg.role === "user") {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.content;
    wrap.append(bubble);
    return wrap;
  }

  if (msg.thinking && prefs.showThinking) {
    wrap.append(buildThinkingEl(msg.thinking));
  }

  const prose = document.createElement("div");
  prose.className = "prose";
  prose.innerHTML = renderMarkdown(msg.content);
  wrap.append(prose);

  wrap.append(buildActions(msg, isLast));
  return wrap;
}

function actButton(icon, label, onClick) {
  const btn = document.createElement("button");
  btn.className = "act-btn";
  btn.type = "button";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = icon;
  btn.addEventListener("click", onClick);
  return btn;
}

function buildActions(msg, isLast) {
  const bar = document.createElement("div");
  bar.className = "msg-actions";

  const copy = actButton(ICONS.copy, "Kopiëren", () => copyText(msg.content, copy));
  bar.append(copy);

  if (isLast) {
    bar.append(actButton(ICONS.retry, "Opnieuw genereren", regenerate));
  }

  const info = [];
  if (msg.model) info.push(modelInfo(msg.model)?.label ?? msg.model);
  if (msg.usage && toonKosten()) {
    const cached = msg.usage.cacheRead ? ` (${msg.usage.cacheRead} uit cache)` : "";
    info.push(`${msg.usage.input} in${cached} · ${msg.usage.output} uit`);
    const cost = costOf(msg.usage, msg.model);
    if (cost != null) info.push(`ca. ${formatCost(cost)}`);
  }
  if (info.length) {
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = info.join(" · ");
    bar.append(meta);
  }

  return bar;
}

function buildThinkingEl(text) {
  const details = document.createElement("details");
  details.className = "thinking";
  const summary = document.createElement("summary");
  summary.textContent = "Denkproces";
  const body = document.createElement("div");
  body.className = "thinking-body";
  body.textContent = text;
  details.append(summary, body);
  return details;
}

function scrollToBottom() {
  ui.messages.scrollTop = ui.messages.scrollHeight;
}

/** Alleen meescrollen als de lezer al onderaan stond, zodat teruglezen kan. */
function isNearBottom() {
  const m = ui.messages;
  return m.scrollHeight - m.scrollTop - m.clientHeight < 120;
}

function updateCost() {
  const total = toonKosten() ? chatCost(activeChat()) : null;
  ui.chatCost.textContent = total ? `Dit gesprek: ca. ${formatCost(total)}` : "";
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn.classList.contains("act-btn")) {
      btn.innerHTML = ICONS.check;
      btn.classList.add("done");
      setTimeout(() => {
        btn.innerHTML = ICONS.copy;
        btn.classList.remove("done");
      }, 1400);
    } else {
      const old = btn.textContent;
      btn.textContent = "Gekopieerd";
      setTimeout(() => {
        btn.textContent = old;
      }, 1400);
    }
  } catch {
    toast("Kopiëren is niet toegestaan door je browser.");
  }
}

// Kopieerknoppen in codeblokken: een listener voor alles (event delegation).
ui.messages.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const code = btn.closest(".code-block")?.querySelector("code");
  if (code) copyText(code.textContent, btn);
});

/* ---------------------- Gesprekken beheren ---------------------- */

function newChat() {
  const now = Date.now();
  const chat = {
    id: crypto.randomUUID(),
    title: "Nieuw gesprek",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  chats.unshift(chat);
  activeId = chat.id;
  saveChats();
  renderChatList();
  renderMessages();
  updateHeader();
  if (!isMobile()) ui.input.focus();
}

function startNewChat() {
  if (controller) return toast("Wacht tot het antwoord klaar is, of klik op stop.");
  closeNav();
  // Een ongebruikt leeg gesprek hergebruiken in plaats van stapelen.
  const current = activeChat();
  if (current && current.messages.length === 0) {
    renderMessages();
    if (!isMobile()) ui.input.focus();
    return;
  }
  newChat();
}

function selectChat(id) {
  if (controller) return toast("Wacht tot het antwoord klaar is, of klik op stop.");
  // Een leeg gesprek dat je verlaat, hoeft niet te blijven bestaan.
  const vorige = activeChat();
  if (vorige && vorige.id !== id && vorige.messages.length === 0) {
    chats = chats.filter((c) => c.id !== vorige.id);
    saveChats();
  }
  activeId = id;
  renderChatList();
  renderMessages();
  updateHeader();
  closeNav();
}

function deleteChat(id) {
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  if (chat.messages.length > 0 && !confirm(`"${chat.title}" verwijderen?`)) return;
  if (id === activeId && controller) stopStreaming();

  chats = chats.filter((c) => c.id !== id);
  if (activeId === id) activeId = chats[0]?.id ?? null;
  saveChats();
  renderChatList();

  if (!activeId) {
    newChat();
  } else {
    renderMessages();
    updateHeader();
  }
}

function touchChat(chat) {
  chat.updatedAt = Date.now();
  // Het meest recente gesprek hoort bovenaan te staan.
  chats = [chat, ...chats.filter((c) => c.id !== chat.id)];
}

function updateHeader() {
  const chat = activeChat();
  ui.chatTitle.textContent = chat?.title ?? "Nieuw gesprek";
  const model = currentModel();
  ui.modelBtnLabel.textContent = modelInfo(model)?.label ?? model;
  ui.effortChip.hidden = !supportsEffort(model);
  ui.effortChipLabel.textContent = EFFORTS.find((e) => e.id === currentEffort())?.label ?? "";
  updateCost();
}

/* ---------------------- Naam aanpassen ---------------------- */

function startRename() {
  const chat = activeChat();
  if (!chat || chat.messages.length === 0) return;
  ui.chatTitle.contentEditable = "true";
  ui.chatTitle.focus();
  const range = document.createRange();
  range.selectNodeContents(ui.chatTitle);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function finishRename() {
  const chat = activeChat();
  if (ui.chatTitle.contentEditable !== "true") return;
  ui.chatTitle.contentEditable = "false";
  if (!chat) return;
  const name = ui.chatTitle.textContent.trim();
  chat.title = name === "" ? "Nieuw gesprek" : name.slice(0, 80);
  ui.chatTitle.textContent = chat.title;
  saveChats();
  renderChatList();
}

ui.chatTitle.addEventListener("click", startRename);
ui.chatTitle.addEventListener("blur", finishRename);
ui.chatTitle.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    ui.chatTitle.blur();
  } else if (e.key === "Escape") {
    ui.chatTitle.textContent = activeChat()?.title ?? "Nieuw gesprek";
    ui.chatTitle.blur();
  }
});

/* ---------------------- Versturen en streamen ---------------------- */

// === NETWERKLAAG: begin ===
/**
 * Vraagt een antwoord op bij de server en roept `onEvent` aan voor elke
 * gebeurtenis die binnenkomt.
 *
 * Dit is het enige deel van de frontend dat verschilt tussen de serverversie
 * en het losse HTML-bestand; build-standalone.mjs vervangt precies dit blok.
 */
async function requestAnswer(payload, onEvent) {
  const { signal, ...body } = payload;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Fouten voor de stream komen terug als gewone JSON.
    const info = await res.json().catch(() => ({}));
    if (info.abonnementNodig || info.limietBereikt) await haalAbonnement();
    if (info.abonnementNodig) openPlans();

    const err = new Error(info.error || `Serverfout (${res.status}).`);
    err.upgradeNaar = info.upgradeNaar ?? null;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Server-Sent Events uitlezen: blokken gescheiden door een lege regel.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;

      let event;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      onEvent(event);
      if (event.type === "done" || event.type === "error") return;
    }
  }
}
// === NETWERKLAAG: einde ===


function setBusy(busy) {
  ui.sendBtn.hidden = busy;
  ui.stopBtn.hidden = !busy;
  ui.input.disabled = busy;
}

/**
 * Bouwt de berichtenlijst voor de API.
 *
 * Voor een antwoord dat door hetzelfde model is gegeven sturen we de ruwe
 * content-blokken onveranderd terug: daar zitten de thinking-blokken in, en
 * die mogen niet worden aangepast of weggelaten. Komt het antwoord van een
 * ander model, dan sturen we alleen de tekst - thinking-blokken van het ene
 * model zijn niet altijd leesbaar voor het andere.
 */
function buildHistory(chat, model) {
  return chat.messages.map((msg) => {
    if (msg.role === "assistant" && Array.isArray(msg.blocks) && msg.model === model) {
      return { role: "assistant", content: msg.blocks };
    }
    return { role: msg.role, content: msg.content };
  });
}

async function sendMessage(text) {
  const chat = activeChat();
  if (!chat || controller) return;

  const wasFirstMessage = chat.messages.length === 0;
  chat.messages.push({ role: "user", content: text });
  if (wasFirstMessage) chat.title = titleFrom(text);
  touchChat(chat);
  saveChats();
  renderChatList();
  updateHeader();

  if (ui.welcome.parentElement) ui.welcome.remove();
  setEmpty(false);
  ui.messages.querySelector(".msg.last")?.classList.remove("last");
  ui.messages.append(buildMessageEl(chat.messages.at(-1)));
  scrollToBottom();

  await streamAnswer(chat, { restoreOnFailure: text, wasFirstMessage });
}

/** Vraagt een antwoord op bij de server en streamt het de pagina in. */
async function streamAnswer(chat, { restoreOnFailure = null, wasFirstMessage = false }) {
  const model = currentModel();

  // Skelet voor het antwoord: denkproces (optioneel), de tekst en het
  // pulserende ✦-teken zolang er nog tekst binnenkomt.
  const wrap = document.createElement("div");
  wrap.className = "msg assistant";

  const prose = document.createElement("div");
  prose.className = "prose";

  const spark = document.createElement("span");
  spark.className = "spark";
  spark.textContent = "✦";
  spark.setAttribute("aria-label", "Bezig met antwoorden");

  wrap.append(prose, spark);
  ui.messages.append(wrap);
  scrollToBottom();

  let answer = "";
  let thinking = "";
  let thinkingEl = null;
  let usage = null;
  let blocks = null;
  let answeredBy = model;
  let switched = null;
  let failed = null;
  let upgradeNaar = null;

  controller = new AbortController();
  setBusy(true);

  try {
    await requestAnswer(
      {
        messages: buildHistory(chat, model),
        system: prefs.system ?? undefined,
        model,
        effort: currentEffort(),
        signal: controller.signal,
      },
      (event) => {
        const volgen = isNearBottom();
        if (event.type === "text") {
          answer += event.text;
          prose.innerHTML = renderMarkdown(answer);
        } else if (event.type === "thinking") {
          thinking += event.text;
          if (prefs.showThinking) {
            if (!thinkingEl) {
              thinkingEl = buildThinkingEl("");
              thinkingEl.open = true;
              wrap.insertBefore(thinkingEl, prose);
            }
            thinkingEl.querySelector(".thinking-body").textContent = thinking;
          }
        } else if (event.type === "done") {
          usage = event.usage;
          blocks = event.content ?? null;
          answeredBy = event.model ?? model;
          switched = event.switchedModel ?? null;
          if (event.gebruik) {
            abonnement.gebruik = event.gebruik;
            renderAbonnement();
          }
          if (event.stopReason === "max_tokens") {
            toast("Het antwoord is afgekapt omdat het maximum bereikt was.");
          }
        } else if (event.type === "error") {
          failed = event.message;
        }
        if (volgen) scrollToBottom();
      },
    );
  } catch (err) {
    if (err.name !== "AbortError") {
      failed = err.message || "Er ging iets mis bij het versturen.";
      upgradeNaar = err.upgradeNaar ?? null;
    }
  } finally {
    controller = null;
    setBusy(false);
    spark.remove();
  }

  if (answer.trim() !== "") {
    chat.messages.push({
      role: "assistant",
      content: answer,
      // Alleen bewaren als het antwoord compleet is: halve blokken mogen
      // niet terug naar de API.
      blocks: blocks ?? undefined,
      thinking: thinking || undefined,
      usage: usage || undefined,
      model: answeredBy,
    });
    touchChat(chat);
    saveChats();
    ui.messages.querySelector(".msg.last")?.classList.remove("last");
    wrap.replaceWith(buildMessageEl(chat.messages.at(-1), true));
    updateCost();

    if (switched) {
      showNotice(
        `Het gekozen model weigerde dit verzoek; ${
          modelInfo(switched)?.label ?? switched
        } heeft het beantwoord.`,
        "info",
      );
    }
  } else {
    // Geen antwoord gekregen: het gebruikersbericht weer uit de geschiedenis
    // halen en terugzetten in het invoerveld, zodat opnieuw proberen werkt
    // zonder twee gebruikersberichten achter elkaar.
    wrap.remove();
    if (restoreOnFailure != null) {
      chat.messages.pop();
      ui.messages.lastElementChild?.remove();
      if (wasFirstMessage) chat.title = "Nieuw gesprek";
      saveChats();
      renderChatList();
      updateHeader();
      if (chat.messages.length === 0) renderMessages();
      ui.input.value = restoreOnFailure;
      autoGrow();
      ui.sendBtn.disabled = false;
    }
  }

  if (failed) {
    showNotice(failed, "error", upgradeNaar ? { label: "Bekijk abonnementen", run: () => openPlans(upgradeNaar) } : null);
  }
  scrollToBottom();
  if (!ui.input.disabled && !isMobile()) ui.input.focus();
}

/** Gooit het laatste antwoord weg en vraagt een nieuw antwoord op. */
async function regenerate() {
  const chat = activeChat();
  if (!chat || controller) return;
  if (chat.messages.at(-1)?.role !== "assistant") return;

  chat.messages.pop();
  saveChats();
  renderMessages();
  await streamAnswer(chat, {});
  saveChats();
}

function showNotice(message, kind = "error", action = null) {
  const box = document.createElement("div");
  box.className = `notice ${kind}`;
  box.textContent = message;
  if (action) {
    const btn = document.createElement("button");
    btn.className = "notice-btn";
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", action.run);
    box.append(btn);
  }
  // Een melding in een leeg gesprek mag de begroeting niet wegduwen.
  if (ui.welcome.parentElement) ui.welcome.after(box);
  else ui.messages.append(box);
}

function stopStreaming() {
  controller?.abort();
  controller = null;
  setBusy(false);
}

/* ---------------------- Invoerveld ---------------------- */

function autoGrow() {
  ui.input.style.height = "auto";
  ui.input.style.height = `${ui.input.scrollHeight}px`;
}

ui.input.addEventListener("input", () => {
  autoGrow();
  ui.sendBtn.disabled = ui.input.value.trim() === "";
});

ui.input.addEventListener("keydown", (e) => {
  // Op een telefoon maakt Enter een nieuwe regel; versturen gaat met de knop.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !isMobile()) {
    e.preventDefault();
    ui.composer.requestSubmit();
  }
});

ui.composer.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = ui.input.value.trim();
  if (text === "" || controller) return;

  // Zonder abonnement eerst een abonnement kiezen; de tekst blijft staan.
  if (abonnement.vereist && !abonnement.actief) {
    openPlans();
    return;
  }

  ui.input.value = "";
  ui.sendBtn.disabled = true;
  autoGrow();
  sendMessage(text);
});

// Klik ergens in het invoervak (niet op een knop): de cursor gaat erin.
ui.composer.addEventListener("click", (e) => {
  if (e.target === ui.composer || e.target.classList?.contains("composer-bar")) ui.input.focus();
});

ui.stopBtn.addEventListener("click", stopStreaming);

for (const btn of document.querySelectorAll(".starter")) {
  btn.addEventListener("click", () => {
    ui.input.value = btn.dataset.prompt;
    autoGrow();
    ui.sendBtn.disabled = false;
    ui.composer.requestSubmit();
  });
}

/* ---------------------- Modelkiezer ---------------------- */

function renderModelPopover() {
  const selectedModel = currentModel();
  const effortEnabled = supportsEffort(selectedModel);
  const eigenaar = !abonnement.vereist;

  ui.modelOptions.innerHTML = "";
  for (const model of config.models) {
    const locked = !modelToegestaan(model.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "model-option" + (model.id === selectedModel ? " selected" : "") + (locked ? " locked" : "");

    const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    check.setAttribute("viewBox", "0 0 24 24");
    check.setAttribute("class", "model-check");
    check.innerHTML = ICONS.modelCheck;

    const body = document.createElement("div");
    body.className = "model-body";

    const nameRow = document.createElement("div");
    nameRow.className = "model-name";
    nameRow.append(document.createTextNode(model.label));
    if (model.tagline) {
      const tag = document.createElement("span");
      tag.className = "model-tagline";
      tag.textContent = model.tagline;
      nameRow.append(tag);
    }
    body.append(nameRow);

    if (model.note) {
      const note = document.createElement("div");
      note.className = "model-note";
      note.textContent = model.note;
      body.append(note);
    }
    if (model.price && eigenaar) {
      const price = document.createElement("div");
      price.className = "model-price";
      price.textContent = `$${model.price.input} in / $${model.price.output} uit per miljoen tokens`;
      body.append(price);
    }

    btn.append(check, body);

    if (locked) {
      const nodig = planVoorModel(model.id);
      const lock = document.createElement("span");
      lock.className = "lock-tag";
      lock.textContent = nodig ? nodig.naam : "Upgrade";
      btn.append(lock);
    }

    btn.addEventListener("click", () => {
      if (locked) {
        toggleModelPopover(false);
        openPlans(planVoorModel(model.id)?.id);
        return;
      }
      prefs.model = model.id;
      savePrefs();
      updateHeader();
      renderModelPopover();
    });
    ui.modelOptions.append(btn);
  }

  ui.effortOptions.innerHTML = "";
  for (const effort of EFFORTS) {
    const locked = effortEnabled && !effortToegestaan(effort.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "effort-btn" +
      (effortEnabled && effort.id === currentEffort() ? " selected" : "") +
      (locked ? " locked" : "");
    btn.textContent = effort.label;
    btn.disabled = !effortEnabled;
    if (locked) btn.title = `Vanaf ${planVoorEffort(effort.id)?.naam ?? "een hoger abonnement"}`;
    btn.addEventListener("click", () => {
      if (locked) {
        toggleModelPopover(false);
        openPlans(planVoorEffort(effort.id)?.id);
        return;
      }
      prefs.effort = effort.id;
      savePrefs();
      updateHeader();
      renderModelPopover();
    });
    ui.effortOptions.append(btn);
  }

  ui.effortNote.textContent = effortEnabled
    ? EFFORTS.find((e) => e.id === currentEffort())?.note ?? ""
    : `${modelInfo(selectedModel)?.label ?? "Dit model"} heeft geen instelbare denkkracht.`;
}

function toggleModelPopover(open) {
  const show = open ?? ui.modelPopover.hidden;
  ui.modelPopover.hidden = !show;
  ui.modelBtn.setAttribute("aria-expanded", String(show));
  if (show) {
    toggleAccountMenu(false);
    renderModelPopover();
    plaatsModelPopover();
  }
}

/** Klapt de kiezer open naar de kant met de meeste ruimte (op mobiel is het een paneel). */
function plaatsModelPopover() {
  const pop = ui.modelPopover;
  pop.style.top = pop.style.bottom = pop.style.maxHeight = "";
  if (isMobile()) return;

  const vak = ui.composer.getBoundingClientRect();
  const boven = vak.top - 16;
  const onder = window.innerHeight - vak.bottom - 16;
  if (onder > boven) {
    pop.style.top = "calc(100% + 8px)";
    pop.style.bottom = "auto";
  } else {
    pop.style.top = "auto";
    pop.style.bottom = "calc(100% + 8px)";
  }
  pop.style.maxHeight = `${Math.min(560, Math.max(boven, onder) - 8)}px`;
}

ui.modelBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleModelPopover();
});

ui.effortChip.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleModelPopover(true);
});

/* ---------------------- Zijbalk, account en thema ---------------------- */

function applySidebar() {
  ui.app.classList.toggle("rail", Boolean(prefs.rail));
}

function openNav() {
  ui.app.classList.add("nav-open");
  ui.scrim.hidden = false;
}

function closeNav() {
  ui.app.classList.remove("nav-open");
  ui.scrim.hidden = true;
  toggleAccountMenu(false);
}

el("sidebarToggleBtn").addEventListener("click", () => {
  prefs.rail = !prefs.rail;
  applySidebar();
  savePrefs();
});

el("sidebarOpenBtn").addEventListener("click", openNav);
ui.scrim.addEventListener("click", closeNav);

el("newChatBtn").addEventListener("click", startNewChat);
el("newChatTopBtn").addEventListener("click", startNewChat);

// In de smalle strook klapt zoeken de zijbalk eerst uit.
ui.searchInput.addEventListener("focus", () => {
  if (prefs.rail && !isMobile()) {
    prefs.rail = false;
    applySidebar();
    savePrefs();
  }
});

ui.searchInput.addEventListener("input", () => {
  searchTerm = ui.searchInput.value;
  renderChatList();
});

function toggleAccountMenu(open) {
  const show = open ?? ui.accountMenu.hidden;
  ui.accountMenu.hidden = !show;
  ui.accountBtn.setAttribute("aria-expanded", String(show));
}

ui.accountBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleModelPopover(false);
  toggleAccountMenu();
});

document.addEventListener("click", (e) => {
  if (!ui.modelPopover.hidden && !ui.modelPopover.contains(e.target) && !ui.modelBtn.contains(e.target)) {
    toggleModelPopover(false);
  }
  if (!ui.accountMenu.hidden && !ui.accountMenu.contains(e.target)) {
    toggleAccountMenu(false);
  }
});

function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  ui.themeLabel.textContent = prefs.theme === "dark" ? "Licht thema" : "Donker thema";
}

el("themeBtn").addEventListener("click", () => {
  prefs.theme = prefs.theme === "dark" ? "light" : "dark";
  applyTheme();
  savePrefs();
});

/* ---------------------- Downloaden ---------------------- */

el("exportBtn").addEventListener("click", () => {
  const chat = activeChat();
  if (!chat || chat.messages.length === 0) return toast("Dit gesprek is nog leeg.");

  const lines = [`# ${chat.title}`, "", `*${new Date(chat.createdAt).toLocaleString("nl-NL")}*`, ""];
  for (const msg of chat.messages) {
    const who = msg.role === "user" ? "Jij" : modelInfo(msg.model)?.label ?? "Assistent";
    lines.push(`## ${who}`, "", msg.content, "");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${chat.title.replace(/[^\w\s-]/g, "").trim().slice(0, 50) || "gesprek"}.md`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Gesprek gedownload.");
});

/* ---------------------- Instellingen ---------------------- */

async function toonToegangscode() {
  const vak = el("codeField");
  if (!(abonnement.vereist && abonnement.actief)) {
    vak.hidden = true;
    return;
  }
  vak.hidden = false;
  try {
    const res = await fetch("/api/abonnement/code");
    const data = await res.json();
    el("myCode").textContent = res.ok ? data.code : "—";
  } catch {
    el("myCode").textContent = "—";
  }
}

function renderAbonnementInInstellingen() {
  const vereist = abonnement.vereist;
  el("subSection").hidden = !vereist;
  el("showCostRow").hidden = vereist;
  if (!vereist) return;

  const plan = huidigPlan();
  el("subPlan").textContent = plan ? `${plan.naam} · ${euro(plan.bedrag)} per maand` : "Geen abonnement";
  el("subMeta").textContent = !plan
    ? "Kies een abonnement om te kunnen chatten."
    : abonnement.opgezegd
      ? `Opgezegd. Je houdt toegang tot ${datum(abonnement.eindigtOp)}.`
      : abonnement.proef
        ? `Proefperiode tot ${datum(abonnement.eindigtOp)}.`
        : abonnement.eindigtOp
          ? `Wordt verlengd op ${datum(abonnement.eindigtOp)}.`
          : "";
  el("changePlanBtn").textContent = plan ? "Wijzigen" : "Kiezen";
  el("manageSubBtn").hidden = !plan;

  const gebruik = plan ? abonnement.gebruik : null;
  el("usageBlock").hidden = !gebruik;
  if (gebruik) {
    el("usagePct").textContent = `${gebruik.procent}%`;
    el("usageFill").style.width = `${gebruik.procent}%`;
    el("usageFill").classList.toggle("high", gebruik.procent >= 90);
    el("usageReset").textContent = gebruik.resetOp
      ? `Wordt op ${datum(gebruik.resetOp)} weer aangevuld.`
      : "";
  }
}

function openSettings() {
  toggleAccountMenu(false);
  closeNav();
  toonToegangscode();
  renderAbonnementInInstellingen();
  ui.systemPrompt.value = prefs.system ?? config.defaultSystemPrompt;
  ui.showThinking.checked = prefs.showThinking;
  ui.showCost.checked = prefs.showCost;
  ui.settingsModal.hidden = false;
}

function closeSettings() {
  ui.settingsModal.hidden = true;
}

el("settingsBtn").addEventListener("click", openSettings);
el("settingsCloseBtn").addEventListener("click", closeSettings);

ui.settingsModal.addEventListener("click", (e) => {
  if (e.target === ui.settingsModal) closeSettings();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!ui.payModal.hidden) closePlans();
  else if (!ui.settingsModal.hidden) closeSettings();
  else if (!ui.modelPopover.hidden) toggleModelPopover(false);
  else if (!ui.accountMenu.hidden) toggleAccountMenu(false);
  else if (ui.app.classList.contains("nav-open")) closeNav();
});

el("resetPromptBtn").addEventListener("click", () => {
  ui.systemPrompt.value = config.defaultSystemPrompt;
});

el("clearAllBtn").addEventListener("click", () => {
  if (!confirm("Alle gesprekken verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
  if (controller) stopStreaming();
  chats = [];
  activeId = null;
  saveChats();
  newChat();
  closeSettings();
  toast("Alle gesprekken gewist.");
});

el("settingsSaveBtn").addEventListener("click", () => {
  prefs.showThinking = ui.showThinking.checked;
  prefs.showCost = ui.showCost.checked;

  const text = ui.systemPrompt.value.trim();
  prefs.system = text === "" || text === config.defaultSystemPrompt ? null : text;

  savePrefs();
  renderMessages();
  updateHeader();
  closeSettings();
  toast("Instellingen opgeslagen.");
});

el("changePlanBtn").addEventListener("click", () => {
  closeSettings();
  openPlans();
});

/* ---------------------- Abonnement ---------------------- */

/** Haalt op of er een abonnement nodig is, en welk abonnement de bezoeker heeft. */
async function haalAbonnement() {
  try {
    const res = await fetch("/api/abonnement");
    if (!res.ok) throw new Error(String(res.status));
    abonnement = { plannen: [], ...(await res.json()) };
  } catch {
    // Geen server die dit kent (bijvoorbeeld het losse HTML-bestand):
    // dan is er ook niets af te schermen.
    abonnement = { vereist: false, actief: true, plan: null, plannen: [], gebruik: null };
  }

  renderAbonnement();
  return abonnement;
}

/** Werkt alles bij wat van het abonnement afhangt: account, badges, modelkeuze. */
function renderAbonnement() {
  const { vereist, actief, email } = abonnement;
  const plan = huidigPlan();
  const hoogste = abonnement.plannen?.at(-1);
  const kanHoger = vereist && (!plan || plan.id !== hoogste?.id);

  // Account onderin de zijbalk
  const naam = email ? email.split("@")[0] : "Jouw account";
  el("accountName").textContent = naam;
  el("accountAvatar").textContent = (email || "J").charAt(0);
  el("accountPlan").textContent = !vereist
    ? "Volledige toegang"
    : plan
      ? `${plan.naam}-abonnement`
      : "Geen abonnement";
  el("menuEmail").hidden = !email;
  el("menuEmail").textContent = email ?? "";
  el("plansMenuBtn").hidden = !vereist;
  el("plansMenuLabel").textContent = !plan
    ? "Abonnement kiezen"
    : kanHoger
      ? "Abonnement upgraden"
      : "Abonnement wijzigen";
  el("logoutBtn").hidden = !(vereist && actief);

  // Knop bovenin en badge boven de begroeting
  ui.upgradeChip.hidden = !kanHoger;
  ui.upgradeChip.textContent = plan ? "Upgraden" : "Abonneren";

  ui.planBadge.hidden = !vereist;
  if (vereist) {
    ui.planBadge.innerHTML = "";
    ui.planBadge.append(document.createTextNode(plan ? `${plan.naam}-abonnement` : "Geen abonnement"));
    if (kanHoger) {
      ui.planBadge.append(document.createTextNode(" · "));
      const cta = document.createElement("strong");
      cta.textContent = plan ? "Upgraden" : "Kies een abonnement";
      ui.planBadge.append(cta);
    }
  }

  // Waarschuwing als het gebruik bijna op is, zoals bij Claude
  const gebruik = plan ? abonnement.gebruik : null;
  const warn = ui.usageWarning;
  warn.innerHTML = "";
  warn.hidden = !(gebruik && gebruik.procent >= 80);
  if (!warn.hidden) {
    warn.append(
      document.createTextNode(
        gebruik.procent >= 100
          ? `Je limiet voor deze periode is bereikt. Op ${datum(gebruik.resetOp)} wordt die weer aangevuld.`
          : `Je hebt ${gebruik.procent}% van je gebruik voor deze periode verbruikt.`,
      ),
    );
    if (kanHoger) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Upgraden";
      btn.addEventListener("click", () => openPlans());
      warn.append(btn);
    }
  }

  ui.input.placeholder =
    vereist && !actief ? "Kies een abonnement om te beginnen" : "Waarmee kan ik je helpen?";

  updateHeader();
  if (!ui.modelPopover.hidden) renderModelPopover();
}

function renderPlans(focusId) {
  const plan = huidigPlan();
  ui.plans.innerHTML = "";

  for (const p of abonnement.plannen ?? []) {
    const isHuidig = plan?.id === p.id;
    const card = document.createElement("div");
    card.className =
      "plan-card" + (p.aanbevolen ? " featured" : "") + (focusId === p.id && !isHuidig ? " focus" : "");

    if (isHuidig || p.aanbevolen) {
      const flag = document.createElement("span");
      flag.className = "plan-flag" + (isHuidig ? " current" : "");
      flag.textContent = isHuidig ? "Huidig abonnement" : "Populair";
      card.append(flag);
    }

    const head = document.createElement("div");
    const name = document.createElement("div");
    name.className = "plan-name";
    name.textContent = p.naam;
    const tagline = document.createElement("div");
    tagline.className = "plan-tagline";
    tagline.textContent = p.tagline;
    head.append(name, tagline);

    const price = document.createElement("div");
    price.className = "plan-price";
    price.textContent = euro(p.bedrag);
    const per = document.createElement("small");
    per.textContent = "per maand";
    price.append(per);

    const list = document.createElement("ul");
    list.className = "plan-list";
    for (const k of p.kenmerken) {
      const li = document.createElement("li");
      li.textContent = k;
      list.append(li);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    const hoger = plan && p.bedrag > plan.bedrag;
    btn.className = "primary-btn wide" + (p.aanbevolen || hoger || focusId === p.id ? " accent" : "");
    btn.disabled = isHuidig;
    btn.textContent = isHuidig
      ? "Je huidige abonnement"
      : plan
        ? hoger
          ? `Upgraden naar ${p.naam}`
          : `Overstappen naar ${p.naam}`
        : `Kies ${p.naam}`;
    btn.addEventListener("click", () => kiesPlan(p, btn));

    card.append(head, price, list, btn);
    ui.plans.append(card);
  }

  el("planCode").hidden = Boolean(plan);
  el("payTitle").textContent = plan ? "Wijzig je abonnement" : "Kies je abonnement";
}

function openPlans(focusId) {
  if (!abonnement.vereist) return;
  toggleAccountMenu(false);
  toggleModelPopover(false);
  closeNav();
  renderPlans(focusId);
  ui.payModal.hidden = false;
}

function closePlans() {
  ui.payModal.hidden = true;
}

async function kiesPlan(plan, knop) {
  const huidig = huidigPlan();
  if (huidig) {
    const vraag =
      plan.bedrag > huidig.bedrag
        ? `Overstappen naar ${plan.naam} (${euro(plan.bedrag)} per maand)? Het verschil voor de rest van deze maand wordt meteen afgeschreven.`
        : `Overstappen naar ${plan.naam} (${euro(plan.bedrag)} per maand)? Het verschil voor de rest van deze maand krijg je als tegoed terug.`;
    if (!confirm(vraag)) return;
  }

  const oud = knop.textContent;
  knop.disabled = true;
  knop.textContent = "Bezig…";

  try {
    const res = await fetch("/api/abonnement/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kon het afrekenen niet starten.");

    // Nog geen abonnement: door naar de betaalpagina van Stripe.
    if (data.url) {
      window.location.href = data.url;
      return;
    }

    // Lopend abonnement omgezet: meteen bijwerken.
    if (data.stand) abonnement = { ...abonnement, ...data.stand };
    renderAbonnement();
    closePlans();
    toast(data.gewijzigd ? `Je abonnement is nu ${plan.naam}.` : "Dit is al je abonnement.");
  } catch (err) {
    toast(err.message);
    knop.disabled = false;
    knop.textContent = oud;
  }
}

el("payCloseBtn").addEventListener("click", closePlans);
ui.payModal.addEventListener("click", (e) => {
  if (e.target === ui.payModal) closePlans();
});

ui.upgradeChip.addEventListener("click", () => openPlans());
ui.planBadge.addEventListener("click", () => openPlans());
el("plansMenuBtn").addEventListener("click", () => openPlans());

el("codeBtn").addEventListener("click", async () => {
  const code = ui.codeInput.value.trim();
  if (code === "") return toast("Vul je toegangscode in.");

  try {
    const res = await fetch("/api/abonnement/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Inloggen mislukt.");

    await haalAbonnement();
    if (abonnement.actief) {
      closePlans();
      toast("Welkom terug.");
    } else {
      toast("Bij deze code hoort geen lopend abonnement.");
    }
  } catch (err) {
    toast(err.message);
  }
});

el("manageSubBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/abonnement/beheer", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kon de beheerpagina niet openen.");
    window.location.href = data.url;
  } catch (err) {
    toast(err.message);
  }
});

el("logoutBtn").addEventListener("click", async () => {
  toggleAccountMenu(false);
  if (
    !confirm(
      "Afmelden op dit apparaat? Om weer in te loggen heb je je toegangscode nodig " +
        "(te vinden bij Instellingen). Je abonnement zelf blijft gewoon lopen.",
    )
  ) {
    return;
  }
  await fetch("/api/abonnement/afmelden", { method: "POST" }).catch(() => {});
  await haalAbonnement();
  toast("Je bent afgemeld op dit apparaat.");
});

/* ---------------------- Opstarten ---------------------- */

/** Blokkeert de app met een uitleg in plaats van stilletjes te falen. */
function blockWith(title, steps) {
  ui.welcome.hidden = true;
  ui.messages.innerHTML = "";
  setEmpty(false);

  const box = document.createElement("div");
  box.className = "notice error";

  const head = document.createElement("strong");
  head.textContent = title;
  box.append(head);

  const list = document.createElement("ol");
  list.style.margin = "8px 0 0";
  list.style.paddingLeft = "20px";
  for (const step of steps) {
    const item = document.createElement("li");
    item.textContent = step;
    list.append(item);
  }
  box.append(list);

  ui.messages.append(box);
  ui.input.disabled = true;
  ui.sendBtn.disabled = true;
  ui.input.placeholder = "Niet beschikbaar";
}

async function init() {
  loadStorage();
  applyTheme();
  applySidebar();

  // Rechtstreeks geopend bestand (file://): er is dan geen server die de
  // Claude API kan aanroepen, dus chatten kan sowieso niet werken.
  if (location.protocol === "file:") {
    blockWith("Je hebt index.html rechtstreeks geopend. Zo kan de app niet werken.", [
      "Open een terminal in de map ai-app.",
      "Voer 'npm install' uit (eenmalig).",
      "Maak een bestand .env met daarin ANTHROPIC_API_KEY=sk-ant-...",
      "Voer 'npm start' uit.",
      "Ga in je browser naar http://localhost:3000",
    ]);
    return;
  }

  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error(String(res.status));
    config = { ...config, ...(await res.json()) };
  } catch {
    blockWith("Geen verbinding met de server van de app.", [
      "Kijk of 'npm start' nog draait in je terminal.",
      "Staat er een foutmelding in die terminal? Die vertelt wat er mis is.",
      "Controleer of je het adres gebruikt dat de server noemt, meestal http://localhost:3000",
    ]);
    return;
  }

  // Een opgeslagen keuze die de server niet meer kent, laten vallen.
  if (!config.models.some((m) => m.id === prefs.model)) prefs.model = null;

  // Altijd beginnen met een nieuw, leeg gesprek, zoals bij Claude. Eerdere
  // gesprekken staan in de zijbalk.
  chats = chats.filter((c) => c.messages.length > 0);
  newChat();
  updateHeader();

  ui.sendBtn.disabled = true;

  await haalAbonnement();

  // Boodschappen die Stripe of de server in de adresbalk heeft achtergelaten.
  const params = new URLSearchParams(location.search);
  if (params.has("welkom")) toast("Je abonnement is actief. Welkom!");
  if (params.has("afgebroken")) toast("Het afrekenen is afgebroken.");
  if (params.has("fout")) showNotice(params.get("fout"), "error");
  if (location.search) history.replaceState(null, "", location.pathname);

  // Nog geen abonnement: meteen laten zien wat er te kiezen valt.
  if (abonnement.vereist && !abonnement.actief && !params.has("afgebroken")) openPlans();

  if (!config.hasCredentials) {
    showNotice(
      "Er is nog geen API-sleutel ingesteld op de server. Kopieer .env.example naar .env, " +
        "vul ANTHROPIC_API_KEY in en start de server opnieuw.",
      "error",
    );
  }

  if (!isMobile()) ui.input.focus();
}

init();
