/* ═══════════════════════════════════════════════
   KIIT-GPT · script.js
   Chat history · New chat · Search · LocalStorage
═══════════════════════════════════════════════ */

const API_URL    = "http://127.0.0.1:8000/chat";
const STORE_KEY  = "kiitgpt_chats";

// ── State ────────────────────────────────────────
let chats        = [];   // [{ id, title, messages:[{role,text}] }]
let activeChatId = null;

// ── DOM ──────────────────────────────────────────
const sidebar      = document.getElementById("sidebar");
const historyList  = document.getElementById("historyList");
const searchInput  = document.getElementById("searchHistory");
const messagesEl   = document.getElementById("messages");
const homeScreen   = document.getElementById("homeScreen");
const chatArea     = document.getElementById("chatArea");
const questionEl   = document.getElementById("question");
const sendBtn      = document.getElementById("sendBtn");

// ── Boot ─────────────────────────────────────────
function init() {
  loadFromStorage();
  renderHistory();
  if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    showHome();
  }
}

// ── Storage ──────────────────────────────────────
function loadFromStorage() {
  try { chats = JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { chats = []; }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(chats)); }

// ── Chat CRUD ─────────────────────────────────────
function createChat() {
  const id   = Date.now().toString();
  const chat = { id, title: "New Chat", messages: [] };
  chats.unshift(chat);
  save();
  loadChat(id);
  renderHistory();
}

function loadChat(id) {
  activeChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;

  messagesEl.innerHTML = "";

  if (chat.messages.length === 0) {
    showHome();
  } else {
    hideHome();
    chat.messages.forEach(m => appendBubble(m.role, m.text, false));
  }

  renderHistory();
  scrollBottom();
}

function deleteChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  save();
  if (activeChatId === id) {
    messagesEl.innerHTML = "";
    activeChatId = null;
    chats.length > 0 ? loadChat(chats[0].id) : showHome();
  }
  renderHistory();
}

function pushMessage(role, text) {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;
  chat.messages.push({ role, text });

  // Auto-title from first user message
  if (role === "user" && chat.messages.filter(m => m.role === "user").length === 1) {
    chat.title = text.length > 40 ? text.slice(0, 40) + "…" : text;
  }
  save();
  renderHistory();
}

// ── Render Sidebar ────────────────────────────────
function renderHistory(filter = "") {
  const list = chats.filter(c =>
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  if (list.length === 0) {
    historyList.innerHTML = `<div class="history-empty">${
      filter ? "No matching chats." : "No chats yet. Start one!"
    }</div>`;
    return;
  }

  historyList.innerHTML = list.map(c => `
    <div class="history-item ${c.id === activeChatId ? "active" : ""}"
         onclick="loadChat('${c.id}')">
      <span class="history-item-text" title="${esc(c.title)}">${esc(c.title)}</span>
      <button class="history-del" onclick="deleteChat('${c.id}', event)">✕</button>
    </div>
  `).join("");
}

// ── Render Bubbles ────────────────────────────────
function appendBubble(role, text, animate = true) {
  hideHome();
  const row = document.createElement("div");
  row.className = `msg-row ${role}`;
  if (!animate) row.style.animation = "none";

  if (role === "bot") {
    row.innerHTML = `
      <div class="avatar bot-av">AI</div>
      <div class="bubble">${esc(text)}</div>`;
  } else {
    row.innerHTML = `
      <div class="bubble">${esc(text)}</div>
      <div class="avatar user-av">👤</div>`;
  }

  messagesEl.appendChild(row);
  scrollBottom();
  return row;
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.id = "typingRow";
  row.innerHTML = `
    <div class="avatar bot-av">AI</div>
    <div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  messagesEl.appendChild(row);
  scrollBottom();
}
function removeTyping() {
  const el = document.getElementById("typingRow");
  if (el) el.remove();
}

// ── Ask ───────────────────────────────────────────
async function ask() {
  const query = questionEl.value.trim();
  if (!query) return;

  // Ensure we have an active chat
  if (!activeChatId) createChat();

  appendBubble("user", query);
  pushMessage("user", query);
  questionEl.value = "";
  autoResize();
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    removeTyping();

    let answer;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      answer = `❌ Error ${res.status}: ${err.detail || "Something went wrong."}`;
    } else {
      const data = await res.json();
      answer = data.answer;
    }

    appendBubble("bot", answer);
    pushMessage("bot", answer);

  } catch {
    removeTyping();
    const answer = "❌ Cannot connect to backend. Make sure the server is running on port 8000.";
    appendBubble("bot", answer);
    pushMessage("bot", answer);
  }

  sendBtn.disabled = false;
  questionEl.focus();
}

// ── Suggestion chips / cards ──────────────────────
function fillSuggestion(el) {
  // Strip emoji prefix for pill buttons (e.g. "🎓 Placements" → just ask it)
  const text = el.dataset.query || el.querySelector(".card-text")?.textContent || el.textContent;
  questionEl.value = text.trim();
  autoResize();
  ask();
}

// ── Home visibility ───────────────────────────────
function showHome() { homeScreen.style.display = "flex"; homeScreen.style.flexDirection = "column"; }
function hideHome() { homeScreen.style.display = "none"; }

// ── Controls ──────────────────────────────────────
document.getElementById("newChatBtn").addEventListener("click", createChat);
document.getElementById("openSidebar").addEventListener("click", () => sidebar.classList.remove("hidden"));
document.getElementById("sidebarClose").addEventListener("click", () => sidebar.classList.add("hidden"));
document.getElementById("clearBtn").addEventListener("click", () => {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;
  chat.messages = [];
  chat.title = "New Chat";
  save();
  messagesEl.innerHTML = "";
  showHome();
  renderHistory();
});

searchInput.addEventListener("input", () => renderHistory(searchInput.value));

questionEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
});
questionEl.addEventListener("input", autoResize);

function autoResize() {
  questionEl.style.height = "auto";
  questionEl.style.height = Math.min(questionEl.scrollHeight, 160) + "px";
}

// ── Helpers ───────────────────────────────────────
function scrollBottom() {
  requestAnimationFrame(() => { chatArea.scrollTop = chatArea.scrollHeight; });
}
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// ── Start ─────────────────────────────────────────
init();
