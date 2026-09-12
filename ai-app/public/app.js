"use strict";

/* =======================================================================
   Mijn AI - frontend
   Gesprekken staan in localStorage; de API-sleutel blijft op de server.
   ======================================================================= */

const STORE_KEY = "mijn-ai.chats.v1";
const PREFS_KEY = "mijn-ai.prefs.v1";

const el = (id) => document.getElementById(id);

const ui = {
  sidebar: el("sidebar"),
  chatList: el("chatList"),
  messages: el("messages"),
  welcome: el("welcome"),
  chatTitle: el("chatTitle"),
  modelBadge: el("modelBadge"),
  composer: el("composer"),
  input: el("input"),
  sendBtn: el("sendBtn"),
  stopBtn: el("stopBtn"),
  settingsModal: el("settingsModal"),
  modelSelect: el("modelSelect"),
  effortSelect: el("effortSelect"),
  systemPrompt: el("systemPrompt"),
  showThinking: el("showThinking"),
  themeLabel: el("themeLabel"),
  toast: el("toast"),
};

let config = {
  models: [{ id: "claude-opus-5", label: "Opus 5" }],
  defaultModel: "claude-opus-5",
  defaultSystemPrompt: "",
  hasCredentials: true,
};

let chats = [];
let activeId = null;
let prefs = {
  theme: "dark",
  model: null,
  effort: "high",
  system: null,
  showThinking: false,
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
    toast("Kon het gesprek niet opslaan - de opslag is vol.");
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
  }, 2600);
}

function activeChat() {
  return chats.find((c) => c.id === activeId) ?? null;
}

function titleFrom(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean || "Nieuw gesprek";
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

    let table = "<table>";
    if (header) table += `<thead><tr>${cells(header, "th")}</tr></thead>`;
    table += "<tbody>";
    for (const row of body) table += `<tr>${cells(row, "td")}</tr>`;
    table += "</tbody></table>";

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

/* ---------------------- Weergave ---------------------- */

function renderChatList() {
  ui.chatList.innerHTML = "";
  if (chats.length === 0) return;

  const label = document.createElement("div");
  label.className = "chat-list-label";
  label.textContent = "Gesprekken";
  ui.chatList.append(label);

  for (const chat of chats) {
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

function renderMessages() {
  const chat = activeChat();
  ui.messages.innerHTML = "";

  if (!chat || chat.messages.length === 0) {
    ui.messages.append(ui.welcome);
    ui.welcome.hidden = false;
    return;
  }

  for (const msg of chat.messages) {
    ui.messages.append(buildMessageEl(msg));
  }
  scrollToBottom();
}

function buildMessageEl(msg) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${msg.role}`;

  const role = document.createElement("div");
  role.className = "msg-role";
  role.textContent = msg.role === "user" ? "Jij" : "Assistent";
  wrap.append(role);

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

  const footer = document.createElement("div");
  footer.className = "msg-footer";

  const copy = document.createElement("button");
  copy.className = "copy-btn";
  copy.type = "button";
  copy.textContent = "Kopieren";
  copy.addEventListener("click", () => copyText(msg.content, copy));
  footer.append(copy);

  if (msg.usage) {
    const usage = document.createElement("span");
    usage.className = "usage";
    const cached = msg.usage.cacheRead ? `, ${msg.usage.cacheRead} uit cache` : "";
    usage.textContent = `${msg.usage.input} in / ${msg.usage.output} uit${cached}`;
    footer.append(usage);
  }

  wrap.append(footer);
  return wrap;
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

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "Gekopieerd!";
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
  const chat = {
    id: crypto.randomUUID(),
    title: "Nieuw gesprek",
    messages: [],
    createdAt: Date.now(),
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
  if (controller) return toast("Wacht tot het antwoord klaar is of klik op stop.");
  activeId = id;
  renderChatList();
  renderMessages();
  updateHeader();
  if (window.innerWidth <= 820) ui.sidebar.classList.add("collapsed");
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

function updateHeader() {
  const chat = activeChat();
  ui.chatTitle.textContent = chat?.title ?? "Nieuw gesprek";
  const model = config.models.find((m) => m.id === currentModel());
  ui.modelBadge.textContent = model?.label ?? currentModel();
}

function currentModel() {
  return prefs.model ?? config.defaultModel;
}

/* ---------------------- Versturen en streamen ---------------------- */

function setBusy(busy) {
  ui.sendBtn.hidden = busy;
  ui.stopBtn.hidden = !busy;
  ui.input.disabled = busy;
}

async function sendMessage(text) {
  const chat = activeChat();
  if (!chat || controller) return;

  const wasFirstMessage = chat.messages.length === 0;

  // 1. Gebruikersbericht toevoegen en tonen.
  chat.messages.push({ role: "user", content: text });
  if (wasFirstMessage) chat.title = titleFrom(text);
  saveChats();
  renderChatList();
  updateHeader();

  if (ui.welcome.parentElement) ui.welcome.remove();
  ui.messages.append(buildMessageEl(chat.messages.at(-1)));
  scrollToBottom();

  // 2. Leeg antwoord-element klaarzetten waar we in streamen.
  const wrap = document.createElement("div");
  wrap.className = "msg assistant";
  const role = document.createElement("div");
  role.className = "msg-role";
  role.textContent = "Assistent";
  const prose = document.createElement("div");
  prose.className = "prose cursor";
  wrap.append(role, prose);
  ui.messages.append(wrap);
  scrollToBottom();

  let answer = "";
  let thinking = "";
  let thinkingEl = null;
  let usage = null;
  let failed = null;

  controller = new AbortController();
  setBusy(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: chat.messages.map(({ role: r, content }) => ({ role: r, content })),
        system: prefs.system ?? undefined,
        model: currentModel(),
        effort: prefs.effort,
      }),
    });

    if (!res.ok) {
      // Fouten voor de stream komen terug als gewone JSON.
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Serverfout (${res.status}).`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Server-Sent Events uitlezen: blokken gescheiden door een lege regel.
    readLoop: while (true) {
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

        if (event.type === "text") {
          answer += event.text;
          prose.innerHTML = renderMarkdown(answer);
          prose.classList.add("cursor");
          scrollToBottom();
        } else if (event.type === "thinking") {
          thinking += event.text;
          if (prefs.showThinking) {
            if (!thinkingEl) {
              thinkingEl = buildThinkingEl("");
              thinkingEl.open = true;
              wrap.insertBefore(thinkingEl, prose);
            }
            thinkingEl.querySelector(".thinking-body").textContent = thinking;
            scrollToBottom();
          }
        } else if (event.type === "done") {
          usage = event.usage;
          if (event.stopReason === "max_tokens") {
            toast("Het antwoord is afgekapt omdat het maximum is bereikt.");
          }
          break readLoop;
        } else if (event.type === "error") {
          failed = event.message;
          break readLoop;
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      failed = err.message || "Er ging iets mis bij het versturen.";
    }
  } finally {
    controller = null;
    setBusy(false);
    prose.classList.remove("cursor");
  }

  // 3. Resultaat opslaan en definitief renderen.
  if (answer.trim() !== "") {
    chat.messages.push({
      role: "assistant",
      content: answer,
      thinking: thinking || undefined,
      usage: usage || undefined,
    });
    saveChats();
    wrap.replaceWith(buildMessageEl(chat.messages.at(-1)));
  } else {
    // Geen antwoord gekregen: het gebruikersbericht weer uit de geschiedenis
    // halen en terugzetten in het invoerveld, zodat opnieuw proberen werkt
    // zonder twee gebruikersberichten achter elkaar.
    wrap.remove();
    chat.messages.pop();
    ui.messages.lastElementChild?.remove();
    if (wasFirstMessage) chat.title = "Nieuw gesprek";
    saveChats();
    renderChatList();
    updateHeader();
    if (chat.messages.length === 0) renderMessages();
    ui.input.value = text;
    autoGrow();
    ui.sendBtn.disabled = false;
  }

  if (failed) showError(failed);
  scrollToBottom();
  ui.input.focus();
}

function showError(message) {
  const box = document.createElement("div");
  box.className = "error-box";
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
  ui.input.style.height = `${Math.min(ui.input.scrollHeight, 220)}px`;
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

/* ---------------------- Zijbalk en thema ---------------------- */

el("newChatBtn").addEventListener("click", () => {
  if (controller) return toast("Wacht tot het antwoord klaar is of klik op stop.");
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

function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  ui.themeLabel.textContent = prefs.theme === "dark" ? "Licht thema" : "Donker thema";
}

el("themeBtn").addEventListener("click", () => {
  prefs.theme = prefs.theme === "dark" ? "light" : "dark";
  applyTheme();
  savePrefs();
});

/* ---------------------- Instellingen ---------------------- */

function openSettings() {
  ui.modelSelect.value = currentModel();
  ui.effortSelect.value = prefs.effort;
  ui.systemPrompt.value = prefs.system ?? config.defaultSystemPrompt;
  ui.showThinking.checked = prefs.showThinking;
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
  if (e.key === "Escape" && !ui.settingsModal.hidden) closeSettings();
});

el("resetPromptBtn").addEventListener("click", () => {
  ui.systemPrompt.value = config.defaultSystemPrompt;
});

el("settingsSaveBtn").addEventListener("click", () => {
  prefs.model = ui.modelSelect.value;
  prefs.effort = ui.effortSelect.value;
  prefs.showThinking = ui.showThinking.checked;

  const text = ui.systemPrompt.value.trim();
  prefs.system = text === "" || text === config.defaultSystemPrompt ? null : text;

  savePrefs();
  updateHeader();
  renderMessages();
  closeSettings();
  toast("Instellingen opgeslagen.");
});

/* ---------------------- Opstarten ---------------------- */

async function init() {
  loadStorage();
  applyTheme();

  try {
    const res = await fetch("/api/config");
    if (res.ok) config = { ...config, ...(await res.json()) };
  } catch {
    toast("Kon de serverinstellingen niet ophalen.");
  }

  ui.modelSelect.innerHTML = "";
  for (const model of config.models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.label;
    ui.modelSelect.append(option);
  }
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
  if (window.innerWidth <= 820) ui.sidebar.classList.add("collapsed");

  if (!config.hasCredentials) {
    showError(
      "Er is nog geen API-sleutel ingesteld op de server. Kopieer .env.example naar .env, " +
        "vul ANTHROPIC_API_KEY in en start de server opnieuw.",
    );
  }

  ui.input.focus();
}

init();
