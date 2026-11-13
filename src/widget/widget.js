/*!
 * Zubair Chat widget — free, self-hosted, Crisp-style live chat.
 *
 * Embed on any website with ONE tag:
 *
 *   <script src="https://YOUR-AGENT.vercel.app/widget/widget.js"
 *           data-color="blue" data-name="Zubair" defer></script>
 *
 * Options (all optional, as data-* attributes on the script tag):
 *   data-color     blue | indigo | violet | pink | crimson | orange | amber |
 *                  emerald | teal | slate | black   — or any hex like "#0ea5e9"
 *   data-mode      light (default) | dark
 *   data-position  right (default) | left
 *   data-name      the human operator's name shown in the header
 *   data-title     header title             (default "Hi there 👋")
 *   data-avatar    https URL of the operator's photo
 *   data-quick     quick replies, separated by "|"
 *
 * Security: every message is rendered with textContent (never innerHTML),
 * links are limited to http(s)/mailto, and no cookies are used.
 */
(function () {
  "use strict";
  if (window.__zubairChatLoaded) return;
  window.__zubairChatLoaded = true;

  var script = document.currentScript;
  if (!script) return;
  var API = new URL(script.src).origin;
  var cfg = script.dataset || {};
  var STORE = "zcw:" + API;
  var NAME = (cfg.name || "Zubair").slice(0, 40);
  var QUICK = (cfg.quick || "What do you offer?|Pricing|Book a call").split("|").map(function (q) { return q.trim().slice(0, 40); }).filter(Boolean).slice(0, 5);
  var COLORS = ["blue", "indigo", "violet", "pink", "crimson", "orange", "amber", "emerald", "teal", "slate", "black"];

  // ── Icons (static, trusted strings) ─────────────────────────────────────
  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4.4 21l3.9-2c1.2.4 2.4.5 3.7.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4l17.5-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.2 1l1.8 6.4 9 1-9 1-1.8 6.4c-.2.7.5 1.3 1.2 1z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z"/></svg>'
  };

  // ── Tiny DOM helpers ────────────────────────────────────────────────────
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    var s = h("span");
    s.innerHTML = ICON[name]; // constant markup only
    return s.firstChild;
  }
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { return {}; } }
  function save(patch) { try { localStorage.setItem(STORE, JSON.stringify(patch === null ? {} : Object.assign(load(), patch))); } catch (e) { /* storage blocked */ } }
  function clock(ms) { return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

  // Safe rich text: **bold**, http(s) links, emails. Built from text nodes only.
  var RICH = /(\*\*[^*\n]+\*\*|https?:\/\/[^\s<>"')]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;
  function rich(target, text) {
    text.split(RICH).forEach(function (part) {
      if (!part) return;
      if (/^\*\*.+\*\*$/.test(part)) return target.appendChild(h("strong", "", part.slice(2, -2)));
      if (/^https?:\/\//.test(part)) {
        var href = part.replace(/[.,;:!?]+$/, "");
        var a = h("a", "", href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer nofollow";
        target.appendChild(a);
        if (part.length > href.length) target.appendChild(document.createTextNode(part.slice(href.length)));
        return;
      }
      if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
        var m = h("a", "", part); m.href = "mailto:" + part; return target.appendChild(m);
      }
      target.appendChild(document.createTextNode(part));
    });
  }

  function avatar(author, online) {
    var a = h("span", "zcw-av " + (author === "ai" ? "ai" : "human"));
    if (author === "ai") a.appendChild(icon("spark"));
    else if (cfg.avatar && /^https:\/\//.test(cfg.avatar)) {
      var img = h("img"); img.src = cfg.avatar; img.alt = ""; a.appendChild(img);
    } else a.textContent = NAME.charAt(0).toUpperCase();
    if (online !== undefined) a.appendChild(h("span", "zcw-pres" + (online ? " on" : "")));
    return a;
  }

  // ── API ─────────────────────────────────────────────────────────────────
  var token = load().token || null;
  var lastId = 0;
  function api(path, method, body) {
    var headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(API + "/api/live" + path, {
      method: method || "GET", headers: headers, credentials: "omit",
      body: body !== undefined ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return (r.status === 204 ? Promise.resolve({}) : r.json().catch(function () { return {}; }))
        .then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
    });
  }

  // ── Build the UI ────────────────────────────────────────────────────────
  var root = h("div", "zcw");
  var color = (cfg.color || "blue").toLowerCase();
  if (COLORS.indexOf(color) > -1) root.dataset.color = color;
  else if (/^#[0-9a-f]{6}$/i.test(color)) root.style.setProperty("--zcw-primary", color);
  if (cfg.mode === "dark") root.dataset.mode = "dark";
  if (cfg.position === "left") root.classList.add("zcw-left");

  var panel = h("section", "zcw-panel");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with " + NAME);

  var head = h("header", "zcw-head");
  var top = h("div", "zcw-head-top");
  var team = h("div", "zcw-team");
  var humanAv = avatar("zubair", false);
  team.appendChild(humanAv);
  team.appendChild(avatar("ai"));
  var closeBtn = h("button", "zcw-x"); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close chat"); closeBtn.appendChild(icon("close"));
  top.appendChild(team); top.appendChild(closeBtn);
  var title = h("h2", "zcw-title", (cfg.title || "Hi there 👋").slice(0, 60));
  var sub = h("p", "zcw-sub");
  var subDot = h("span", "zcw-dot");
  var subText = h("span", "", "Ask us anything — we're here to help");
  sub.appendChild(subDot); sub.appendChild(subText);
  head.appendChild(top); head.appendChild(title); head.appendChild(sub);

  var body = h("div", "zcw-body");
  body.setAttribute("aria-live", "polite");
  var quick = h("div", "zcw-quick");
  var form = h("form", "zcw-compose");
  var input = h("textarea"); input.rows = 1; input.maxLength = 2000; input.placeholder = "Compose your message…"; input.setAttribute("aria-label", "Message");
  var sendBtn = h("button", "zcw-send"); sendBtn.type = "submit"; sendBtn.disabled = true; sendBtn.setAttribute("aria-label", "Send"); sendBtn.appendChild(icon("send"));
  form.appendChild(input); form.appendChild(sendBtn);
  var foot = h("footer", "zcw-foot");
  var footDot = h("span", "zcw-dot");
  var footText = h("span", "", "");
  foot.appendChild(footDot); foot.appendChild(footText);

  panel.appendChild(head); panel.appendChild(body); panel.appendChild(quick); panel.appendChild(form); panel.appendChild(foot);

  var launcher = h("button", "zcw-launcher"); launcher.type = "button"; launcher.setAttribute("aria-label", "Open chat");
  launcher.appendChild(icon("chat"));
  var badge = h("span", "zcw-badge"); badge.hidden = true; launcher.appendChild(badge);

  root.appendChild(panel); root.appendChild(launcher);

  // ── State & rendering ───────────────────────────────────────────────────
  var messages = [{ author: "ai", text: "Hi! 👋 I'm the AI assistant. Ask me anything — or tap \"Talk to " + NAME + "\" and " + NAME + " will join this chat.", at: Date.now(), welcome: true }];
  var open = false, sending = false, typing = false, unread = 0, status = null, askEmail = false;

  function setStatus(s) {
    if (!s) return;
    status = s;
    var on = !!s.online;
    subDot.className = "zcw-dot" + (on ? " on" : "");
    footDot.className = "zcw-dot" + (on ? " on" : "");
    humanAv.querySelector(".zcw-pres").className = "zcw-pres" + (on ? " on" : "");
    subText.textContent = on ? NAME + " is online" : "We typically reply " + (s.replyTime || "within 1 hour");
    footText.textContent = on ? NAME + " is active now" : NAME + " was active recently · replies " + (s.replyTime || "within 1 hour");
  }

  function render() {
    body.textContent = "";
    messages.forEach(function (m, i) {
      var prev = messages[i - 1], next = messages[i + 1];
      var first = !prev || prev.author !== m.author;
      var last = !next || next.author !== m.author;
      var me = m.author === "visitor";
      var row = h("div", "zcw-row" + (me ? " me" : "") + (first ? " first" : ""));
      if (!me) row.appendChild(last ? avatar(m.author) : h("span", "zcw-ghost"));
      var stack = h("div", "zcw-stack");
      if (!me && first) {
        var nm = h("span", "zcw-name", m.author === "ai" ? "AI assistant" : NAME);
        if (m.author === "ai") nm.appendChild(h("span", "zcw-tag", "AI"));
        stack.appendChild(nm);
      }
      var b = h("div", "zcw-bubble" + (me ? " me" : m.author === "ai" ? " ai" : "") + (m.pending ? " pending" : ""));
      if (me) b.textContent = m.text; else rich(b, m.text);
      stack.appendChild(b);
      if (last && !m.welcome && !m.pending) stack.appendChild(h("span", "zcw-time", clock(m.at)));
      row.appendChild(stack);
      body.appendChild(row);
    });
    if (typing || sending) {
      var tr = h("div", "zcw-row first");
      tr.appendChild(avatar(typing ? "zubair" : "ai"));
      var tb = h("div", "zcw-bubble" + (typing ? "" : " ai"));
      var dots = h("span", "zcw-typing"); dots.appendChild(h("i")); dots.appendChild(h("i")); dots.appendChild(h("i"));
      tb.appendChild(dots); tr.appendChild(tb); body.appendChild(tr);
    }
    if (askEmail && token && !(status && status.online)) body.appendChild(emailCard());
    quick.hidden = messages.some(function (m) { return m.author === "visitor"; }) || sending;
    body.scrollTop = body.scrollHeight;
  }

  function emailCard() {
    var c = h("div", "zcw-card");
    c.appendChild(h("b", "", "Get the reply by email"));
    c.appendChild(h("p", "", NAME + " typically replies " + ((status && status.replyTime) || "within 1 hour") + ". Leave your email so you don't miss it."));
    var f = h("form"); var e = h("input"); e.type = "email"; e.placeholder = "you@example.com"; e.maxLength = 160; e.setAttribute("aria-label", "Your email");
    var s = h("button", "zcw-save", "Save"); s.type = "submit";
    f.appendChild(e); f.appendChild(s); c.appendChild(f);
    var err = h("p", "zcw-err"); err.hidden = true; c.appendChild(err);
    var skip = h("button", "zcw-skip", "No thanks"); skip.type = "button"; c.appendChild(skip);
    skip.onclick = function () { save({ emailDismissed: true }); askEmail = false; render(); };
    f.onsubmit = function (ev) {
      ev.preventDefault();
      api("/identify", "POST", { email: e.value.trim() }).then(function (r) {
        if (!r.ok) { err.textContent = r.data.error || "Please enter a valid email."; err.hidden = false; return; }
        save({ identified: true }); askEmail = false;
        messages.push({ author: "ai", text: "Thanks! " + NAME + " will follow up by email if you've left.", at: Date.now() });
        render();
      });
    };
    return c;
  }

  function absorb(list, countUnread) {
    var fresh = (list || []).filter(function (m) { return m && m.id > lastId && /^(visitor|ai|zubair)$/.test(m.author); });
    if (!fresh.length) return;
    lastId = fresh[fresh.length - 1].id;
    messages = messages.filter(function (m) { return !m.pending; }).concat(fresh.map(function (m) {
      return { author: m.author, text: String(m.text), at: m.at };
    }));
    if (countUnread && !open) {
      unread += fresh.filter(function (m) { return m.author !== "visitor"; }).length;
      badge.textContent = unread > 9 ? "9+" : String(unread); badge.hidden = !unread;
    }
  }

  function poll() {
    if (!token || document.hidden) return;
    api("/messages?after=" + lastId).then(function (r) {
      if (r.status === 401 || r.status === 404) { token = null; lastId = 0; save(null); return; }
      if (!r.ok) return;
      absorb(r.data.messages, true);
      setStatus(r.data.status);
      typing = !!r.data.typing;
      render();
    }).catch(function () { /* offline */ });
  }

  function send(text) {
    text = String(text || "").trim().slice(0, 2000);
    if (!text || sending) return;
    input.value = ""; input.style.height = "auto"; sendBtn.disabled = true;
    messages.push({ author: "visitor", text: text, at: Date.now(), pending: true });
    sending = true; render();
    var req = token
      ? api("/messages", "POST", { text: text })
      : api("/conversations", "POST", { text: text, page: location.pathname.slice(0, 200) });
    req.then(function (r) {
      if (token && (r.status === 401 || r.status === 404)) { token = null; lastId = 0; save(null); sending = false; messages.pop(); return send(text); }
      if (r.status === 429) messages = messages.filter(function (m) { return !m.pending; }).concat([{ author: "ai", text: "You're sending messages quickly — please wait a moment.", at: Date.now() }]);
      else if (!r.ok) throw new Error("send failed");
      if (r.data.token) { token = r.data.token; save({ token: token }); }
      absorb(r.data.messages, false);
      setStatus(r.data.status);
      var s = load();
      if (!s.identified && !s.emailDismissed) askEmail = true;
    }).catch(function () {
      messages = messages.map(function (m) { return Object.assign({}, m, { pending: false }); });
      messages.push({ author: "ai", text: "Couldn't reach the server. Please try again in a moment.", at: Date.now() });
    }).then(function () { sending = false; render(); });
  }

  // ── Events ──────────────────────────────────────────────────────────────
  QUICK.concat(["Talk to " + NAME]).forEach(function (q) {
    var b = h("button", "", q); b.type = "button"; b.onclick = function () { send(q); }; quick.appendChild(b);
  });

  function toggle(state) {
    open = state === undefined ? !open : state;
    panel.hidden = !open;
    root.classList.toggle("zcw-open", open);
    launcher.textContent = "";
    launcher.appendChild(icon(open ? "close" : "chat"));
    launcher.appendChild(badge);
    launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) {
      unread = 0; badge.hidden = true; render();
      if (!token) api("/status").then(function (r) { if (r.ok) setStatus(r.data.status); }).catch(function () {});
      else poll();
      if (matchMedia("(pointer: fine)").matches) input.focus();
    }
  }
  launcher.onclick = function () { toggle(); };
  closeBtn.onclick = function () { toggle(false); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
  form.onsubmit = function (e) { e.preventDefault(); send(input.value); };
  var lastTyping = 0;
  input.addEventListener("input", function () {
    sendBtn.disabled = !input.value.trim();
    input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px";
    if (token && Date.now() - lastTyping > 4000) { lastTyping = Date.now(); api("/typing", "POST", {}).catch(function () {}); }
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); }
  });

  // Poll every 3s while open, every ~21s while closed (keeps the badge fresh).
  var tick = 0;
  setInterval(function () { tick++; if (open || tick % 7 === 0) poll(); }, 3000);
  document.addEventListener("visibilitychange", poll);

  // ── Mount (stylesheet comes from the same server as this script) ────────
  function mount() {
    var css = h("link"); css.rel = "stylesheet"; css.href = API + "/widget/widget.css";
    document.head.appendChild(css);
    document.body.appendChild(root);
    setStatus({ online: false, replyTime: "within 1 hour" });
    if (token) poll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
