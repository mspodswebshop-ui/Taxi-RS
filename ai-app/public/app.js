"use strict";

/* =======================================================================
   Mijn AI - frontend
   Gesprekken staan in localStorage; de API-sleutel blijft op de server.
   ======================================================================= */

const STORE_KEY = "mijn-ai.chats.v2";
const PREFS_KEY = "mijn-ai.prefs.v2";

const el = (id) => document.getElementById(id);

const ui = {
  app: el("app"),
  sidebar: el("sidebar"),
  chatList: el("chatList"),
  searchInput: el("searchInput"),
  messages: el("messages"),
  welcome: el("welcome"),
  welcomeTitle: el("welcomeTitle"),
  chatTitle: el("chatTitle"),
  modelBtn: el("modelBtn"),
  modelBtnLabel: el("modelBtnLabel"),
  modelPopover: el("modelPopover"),
  modelOptions: el("modelOptions"),
  effortOptions: el("effortOptions"),
  effortNote: el("effortNote"),
  composer: el("composer"),
  input: el("input"),
  sendBtn: el("sendBtn"),
  stopBtn: el("stopBtn"),
  chatCost: el("chatCost"),
  settingsModal: el("settingsModal"),
  systemPrompt: el("systemPrompt"),
  showThinking: el("showThinking"),
  showCost: el("showCost"),
  themeLabel: el("themeLabel"),
  toast: el("toast"),
};

const EFFORTS = [
  { id: "low", label: "Laag", note: "Snelste en goedkoopste antwoorden. Prima voor korte vragen." },
  { id: "medium", label: "Middel", note: "Een goede balans tussen snelheid en diepgang." },
  { id: "high", label: "Hoog", note: "De standaard: degelijk doordacht, redelijk snel." },
  { id: "xhigh", label: "Extra", note: "Denkt duidelijk langer door. Sterk voor code en analyse." },
  { id: "max", label: "Max", note: "Denkt zo diep mogelijk. Het traagst en het duurst, maar het best voor echt moeilijke vragen." },
];

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
};
let controller = null; // AbortController van het lopende verzoek

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
  }, 2800);
}

function activeChat() {
  return chats.find((c) => c.id === activeId) ?? null;
}

function currentModel() {
  const id = prefs.model ?? config.defaultModel;
  return config.models.some((m) => m.id === id) ? id : config.defaultModel;
}

function currentEffort() {
  return prefs.effort ?? config.defaultEffort;
}

function modelInfo(id) {
  return config.models.find((m) => m.id === id) ?? null;
}

/** Haiku 4.5 ondersteunt geen instelbare denkkracht. */
function supportsEffort(modelId) {
  return modelId !== "claude-haiku-4-5";
}

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
    '<button class="copy-btn" data-copy type="button">Kopieren</button></div>' +
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
  if (days < 7) return "Deze week";
  if (days < 30) return "Deze maand";
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
  const visible = chats.filter((chat) => matchesSearch(chat, term));

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
    del.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
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

function renderMessages() {
  const chat = activeChat();
  ui.messages.innerHTML = "";

  if (!chat || chat.messages.length === 0) {
    ui.welcomeTitle.textContent = greeting();
    ui.messages.append(ui.welcome);
    ui.welcome.hidden = false;
    updateCost();
    return;
  }

  chat.messages.forEach((msg, i) => {
    ui.messages.append(buildMessageEl(msg, i === chat.messages.length - 1));
  });
  updateCost();
  scrollToBottom();
}

function buildMessageEl(msg, isLast = false) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${msg.role}`;

  if (msg.role === "user") {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.content;
    wrap.append(bubble);
    return wrap;
  }

  // Kop: avatar, naam en het model dat antwoordde
  const head = document.createElement("div");
  head.className = "msg-head";
  const avatar = document.createElement("span");
  avatar.className = "msg-avatar";
  avatar.textContent = "✦";
  const name = document.createElement("span");
  name.className = "msg-name";
  name.textContent = "Assistent";
  head.append(avatar, name);

  if (msg.model) {
    const model = document.createElement("span");
    model.className = "msg-model";
    model.textContent = modelInfo(msg.model)?.label ?? msg.model;
    head.append(model);
  }
  wrap.append(head);

  if (msg.thinking && prefs.showThinking) {
    wrap.append(buildThinkingEl(msg.thinking));
  }

  const prose = document.createElement("div");
  prose.className = "prose";
  prose.innerHTML = renderMarkdown(msg.content);
  wrap.append(prose);

  wrap.append(buildFooter(msg, isLast));
  return wrap;
}

function buildFooter(msg, isLast) {
  const footer = document.createElement("div");
  footer.className = "msg-footer";

  const copy = document.createElement("button");
  copy.className = "copy-btn";
  copy.type = "button";
  copy.textContent = "Kopieren";
  copy.addEventListener("click", () => copyText(msg.content, copy));
  footer.append(copy);

  if (isLast) {
    const again = document.createElement("button");
    again.className = "copy-btn";
    again.type = "button";
    again.textContent = "Opnieuw";
    again.title = "Genereer een nieuw antwoord op dezelfde vraag";
    again.addEventListener("click", regenerate);
    footer.append(again);
  }

  if (msg.usage) {
    const tokens = document.createElement("span");
    tokens.className = "meta";
    const cached = msg.usage.cacheRead ? ` (${msg.usage.cacheRead} uit cache)` : "";
    tokens.textContent = `${msg.usage.input} in${cached} · ${msg.usage.output} uit`;
    footer.append(tokens);

    const cost = costOf(msg.usage, msg.model);
    if (cost != null && prefs.showCost) {
      const sep = document.createElement("span");
      sep.className = "meta meta-sep";
      sep.textContent = "·";
      const price = document.createElement("span");
      price.className = "meta";
      price.textContent = `ca. ${formatCost(cost)}`;
      price.title = "Ruwe schatting op basis van het tokengebruik";
      footer.append(sep, price);
    }
  }

  return footer;
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

function updateCost() {
  const total = prefs.showCost ? chatCost(activeChat()) : null;
  ui.chatCost.textContent = total ? `Dit gesprek: ca. ${formatCost(total)}` : "";
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "Gekopieerd";
    setTimeout(() => {
      btn.textContent = old;
    }, 1400);
  } catch {
    toast("Kopieren is niet toegestaan door je browser.");
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
  ui.input.focus();
}

function selectChat(id) {
  if (controller) return toast("Wacht tot het antwoord klaar is, of klik op stop.");
  activeId = id;
  renderChatList();
  renderMessages();
  updateHeader();
  if (window.innerWidth <= 860) ui.sidebar.classList.add("collapsed");
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
  ui.modelBtnLabel.textContent = modelInfo(currentModel())?.label ?? currentModel();
  updateCost();
}

/* ---------------------- Naam aanpassen ---------------------- */

function startRename() {
  const chat = activeChat();
  if (!chat) return;
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
    throw new Error(info.error || `Serverfout (${res.status}).`);
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
  ui.messages.append(buildMessageEl(chat.messages.at(-1)));
  scrollToBottom();

  await streamAnswer(chat, { restoreOnFailure: text, wasFirstMessage });
}

/** Vraagt een antwoord op bij de server en streamt het de pagina in. */
async function streamAnswer(chat, { restoreOnFailure = null, wasFirstMessage = false }) {
  const model = currentModel();

  // Skelet voor het antwoord: kop, denkproces (optioneel) en de tekst.
  const wrap = document.createElement("div");
  wrap.className = "msg assistant";

  const head = document.createElement("div");
  head.className = "msg-head";
  const avatar = document.createElement("span");
  avatar.className = "msg-avatar";
  avatar.textContent = "✦";
  const name = document.createElement("span");
  name.className = "msg-name";
  name.textContent = "Assistent";
  const modelTag = document.createElement("span");
  modelTag.className = "msg-model";
  modelTag.textContent = modelInfo(model)?.label ?? model;
  head.append(avatar, name, modelTag);

  const prose = document.createElement("div");
  prose.className = "prose";

  // Drie stipjes tot de eerste tekst binnenkomt.
  const pending = document.createElement("div");
  pending.className = "pending";
  pending.innerHTML = "<span></span><span></span><span></span>";

  wrap.append(head, pending, prose);
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
        if (event.type === "text") {
          answer += event.text;
          pending.remove();
          prose.innerHTML = renderMarkdown(answer);
          prose.classList.add("cursor");
          scrollToBottom();
        } else if (event.type === "thinking") {
          thinking += event.text;
          if (prefs.showThinking) {
            if (!thinkingEl) {
              thinkingEl = buildThinkingEl("");
              thinkingEl.open = true;
              wrap.insertBefore(thinkingEl, pending);
            }
            thinkingEl.querySelector(".thinking-body").textContent = thinking;
            scrollToBottom();
          }
        } else if (event.type === "done") {
          usage = event.usage;
          blocks = event.content ?? null;
          answeredBy = event.model ?? model;
          switched = event.switchedModel ?? null;
          if (event.stopReason === "max_tokens") {
            toast("Het antwoord is afgekapt omdat het maximum bereikt was.");
          }
        } else if (event.type === "error") {
          failed = event.message;
        }
      },
    );
  } catch (err) {
    if (err.name !== "AbortError") {
      failed = err.message || "Er ging iets mis bij het versturen.";
    }
  } finally {
    controller = null;
    setBusy(false);
    pending.remove();
    prose.classList.remove("cursor");
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

  if (failed) showNotice(failed, "error");
  scrollToBottom();
  if (!ui.input.disabled) ui.input.focus();
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

function showNotice(message, kind = "error") {
  const box = document.createElement("div");
  box.className = `notice ${kind}`;
  box.textContent = message;
  ui.messages.append(box);
}

function stopStreaming() {
  controller?.abort();
  controller = null;
  setBusy(false);
}

/* ---------------------- Invoerveld ---------------------- */

function autoGrow() {
  ui.input.style.height = "auto";
  ui.input.style.height = `${Math.min(ui.input.scrollHeight, 240)}px`;
}

ui.input.addEventListener("input", () => {
  autoGrow();
  ui.sendBtn.disabled = ui.input.value.trim() === "";
});

ui.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    ui.composer.requestSubmit();
  }
});

ui.composer.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = ui.input.value.trim();
  if (text === "" || controller) return;
  ui.input.value = "";
  ui.sendBtn.disabled = true;
  autoGrow();
  sendMessage(text);
});

ui.stopBtn.addEventListener("click", stopStreaming);

for (const btn of document.querySelectorAll(".suggestion")) {
  btn.addEventListener("click", () => {
    ui.input.value = btn.dataset.prompt;
    autoGrow();
    ui.composer.requestSubmit();
  });
}

/* ---------------------- Modelkiezer ---------------------- */

function renderModelPopover() {
  const selectedModel = currentModel();
  const effortEnabled = supportsEffort(selectedModel);

  ui.modelOptions.innerHTML = "";
  for (const model of config.models) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "model-option" + (model.id === selectedModel ? " selected" : "");

    const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    check.setAttribute("viewBox", "0 0 24 24");
    check.setAttribute("class", "model-check");
    check.innerHTML = '<path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';

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
    if (model.price) {
      const price = document.createElement("div");
      price.className = "model-price";
      price.textContent = `$${model.price.input} in / $${model.price.output} uit per miljoen tokens`;
      body.append(price);
    }

    btn.append(check, body);
    btn.addEventListener("click", () => {
      prefs.model = model.id;
      if (!supportsEffort(model.id)) prefs.effort = prefs.effort ?? config.defaultEffort;
      savePrefs();
      updateHeader();
      renderModelPopover();
    });
    ui.modelOptions.append(btn);
  }

  ui.effortOptions.innerHTML = "";
  for (const effort of EFFORTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "effort-btn" + (effortEnabled && effort.id === currentEffort() ? " selected" : "");
    btn.textContent = effort.label;
    btn.disabled = !effortEnabled;
    if (!effortEnabled) btn.style.opacity = "0.4";
    btn.addEventListener("click", () => {
      prefs.effort = effort.id;
      savePrefs();
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
  if (show) renderModelPopover();
}

ui.modelBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleModelPopover();
});

document.addEventListener("click", (e) => {
  if (ui.modelPopover.hidden) return;
  if (!ui.modelPopover.contains(e.target) && e.target !== ui.modelBtn) {
    toggleModelPopover(false);
  }
});

/* ---------------------- Zijbalk, zoeken en thema ---------------------- */

el("newChatBtn").addEventListener("click", () => {
  if (controller) return toast("Wacht tot het antwoord klaar is, of klik op stop.");
  // Een ongebruikt leeg gesprek hergebruiken in plaats van stapelen.
  const current = activeChat();
  if (current && current.messages.length === 0) return ui.input.focus();
  newChat();
});

el("sidebarOpenBtn").addEventListener("click", () =>
  ui.sidebar.classList.toggle("collapsed"),
);
el("sidebarCloseBtn").addEventListener("click", () =>
  ui.sidebar.classList.add("collapsed"),
);

ui.searchInput.addEventListener("input", () => {
  searchTerm = ui.searchInput.value;
  renderChatList();
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

function openSettings() {
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
  if (!ui.settingsModal.hidden) closeSettings();
  else if (!ui.modelPopover.hidden) toggleModelPopover(false);
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

/* ---------------------- Opstarten ---------------------- */

/** Blokkeert de app met een uitleg in plaats van stilletjes te falen. */
function blockWith(title, steps) {
  ui.welcome.hidden = true;
  ui.messages.innerHTML = "";

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

  if (chats.length === 0) {
    newChat();
  } else {
    activeId = chats[0].id;
    renderChatList();
    renderMessages();
  }
  updateHeader();

  ui.sendBtn.disabled = true;
  if (window.innerWidth <= 860) ui.sidebar.classList.add("collapsed");

  if (!config.hasCredentials) {
    showNotice(
      "Er is nog geen API-sleutel ingesteld op de server. Kopieer .env.example naar .env, " +
        "vul ANTHROPIC_API_KEY in en start de server opnieuw.",
      "error",
    );
  }

  ui.input.focus();
}

init();
