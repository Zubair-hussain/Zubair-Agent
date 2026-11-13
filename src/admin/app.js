/* Admin inbox client. Security notes:
   • The session lives in an HttpOnly cookie — this script never sees a token.
   • Every piece of visitor-supplied text is rendered with textContent, never
     innerHTML, so a visitor cannot inject markup or scripts into this page. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const el = {
    login: $("login-view"), app: $("app-view"), loginForm: $("login-form"), loginError: $("login-error"),
    loginButton: $("login-button"), username: $("username"), password: $("password"),
    logout: $("logout-button"), list: $("conversation-list"), emptyList: $("empty-list"),
    notifyBanner: $("notify-banner"), notifyButton: $("notify-button"), notifyText: $("notify-text"),
    storeWarning: $("store-warning"), presence: $("presence-label"),
    threadEmpty: $("thread-empty"), threadBody: $("thread-body"), threadTitle: $("thread-title"),
    threadSub: $("thread-sub"), messages: $("messages"), typing: $("typing"), aiToggle: $("ai-toggle"),
    deleteButton: $("delete-button"), back: $("back-button"), replyForm: $("reply-form"),
    replyInput: $("reply-input"), sendButton: $("send-button"), toast: $("toast"),
  };

  const state = {
    me: null,
    conversations: [],
    activeId: null,
    lastMessageId: 0,
    unreadTotal: 0,
    listTimer: null,
    threadTimer: null,
    lastTypingSent: 0,
  };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  // ── HTTP ────────────────────────────────────────────────────────────────
  class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }

  const api = async (path, { method = "GET", body } = {}) => {
    const res = await fetch("/api/admin" + path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined || method !== "GET" ? { "Content-Type": "application/json" } : undefined,
      body: method === "GET" ? undefined : JSON.stringify(body === undefined ? {} : body),
    });
    if (res.status === 204) return {};
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && path !== "/login") showLogin();
      throw new ApiError(res.status, data.error || "Something went wrong.");
    }
    return data;
  };

  // ── Small helpers ───────────────────────────────────────────────────────
  let toastTimer;
  const toast = (text) => {
    el.toast.textContent = text;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.hidden = true), 3200);
  };

  const node = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const timeAgo = (ms) => {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  };

  const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const displayName = (c) => c.name || c.email || "Visitor " + c.id.slice(0, 4).toUpperCase();
  const AUTHOR_LABEL = { visitor: "Visitor", ai: "Zubair AI", zubair: "You" };

  // ── Views ───────────────────────────────────────────────────────────────
  function showLogin() {
    stopPolling();
    state.me = null;
    el.app.hidden = true;
    el.login.hidden = false;
    el.password.value = "";
    el.username.focus();
  }

  function showApp() {
    el.login.hidden = true;
    el.app.hidden = false;
    el.storeWarning.hidden = state.me.storePersistent;
    setupNotifications();
    startPolling();
    const fromHash = decodeURIComponent(location.hash.slice(1));
    if (UUID_RE.test(fromHash)) openConversation(fromHash);
  }

  // ── Login / logout ──────────────────────────────────────────────────────
  el.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    el.loginError.hidden = true;
    el.loginButton.disabled = true;
    try {
      await api("/login", { method: "POST", body: { username: el.username.value, password: el.password.value } });
      state.me = await api("/me");
      showApp();
    } catch (err) {
      el.loginError.textContent = err.message;
      el.loginError.hidden = false;
    } finally {
      el.loginButton.disabled = false;
      el.password.value = "";
    }
  });

  el.logout.addEventListener("click", async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    showLogin();
  });

  // ── Notifications ───────────────────────────────────────────────────────
  const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  const base64UrlToBytes = (value) => {
    const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  };

  async function subscribeToPush() {
    const registration = await navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin" });
    await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(state.me.push.publicKey),
      }));
    await api("/push/subscribe", { method: "POST", body: { subscription: subscription.toJSON() } });
  }

  function setupNotifications() {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      el.notifyBanner.hidden = true;
      if (pushSupported && state.me.push.enabled) subscribeToPush().catch(() => {});
      return;
    }

    el.notifyBanner.hidden = false;
    if (Notification.permission === "denied") {
      el.notifyButton.hidden = true;
      el.notifyText.textContent =
        "Notifications are blocked for this site. Click the lock icon in the address bar and allow them to get message alerts.";
    }
  }

  // Must run from a click: browsers only show the permission prompt on a user gesture.
  el.notifyButton.addEventListener("click", async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setupNotifications();
    el.notifyBanner.hidden = true;
    try {
      if (pushSupported && state.me.push.enabled) {
        await subscribeToPush();
        toast("Notifications are on — you'll be alerted even when this tab is closed.");
      } else {
        toast("Notifications are on while this tab stays open.");
      }
    } catch {
      toast("Notifications allowed, but background alerts could not be set up on this browser.");
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const id = event.data && event.data.type === "open-conversation" && event.data.conversationId;
      if (UUID_RE.test(id || "")) openConversation(id);
    });
  }

  // In-page fallback: alert when the tab is in the background and a new message arrives.
  function announce(newUnread) {
    document.title = (newUnread ? "(" + newUnread + ") " : "") + "Inbox — Zubair Live Chat";
    if (newUnread > state.unreadTotal && document.hidden && "Notification" in window && Notification.permission === "granted") {
      const latest = state.conversations.find((c) => c.unread);
      const n = new Notification("💬 " + (latest ? displayName(latest) : "New message"), {
        body: latest ? latest.preview : "",
        tag: latest ? latest.id : "zubair-live-chat",
      });
      n.onclick = () => {
        window.focus();
        if (latest) openConversation(latest.id);
      };
    }
    state.unreadTotal = newUnread;
  }

  // ── Conversation list ───────────────────────────────────────────────────
  function renderList() {
    el.list.replaceChildren(
      ...state.conversations.map((c) => {
        const button = node("button", "conversation" + (c.id === state.activeId ? " active" : ""));
        button.type = "button";
        button.addEventListener("click", () => openConversation(c.id));

        const name = displayName(c);
        button.append(node("span", "avatar", name.slice(0, 1)));

        const main = node("span");
        main.append(node("span", "name", name));
        const prefix = c.lastAuthor === "zubair" ? "You: " : c.lastAuthor === "ai" ? "AI: " : "";
        main.append(node("span", "preview", prefix + (c.preview || "")));
        button.append(main);

        const meta = node("span", "meta");
        meta.append(node("span", "", timeAgo(c.updatedAt)));
        if (c.unread) meta.append(node("span", "badge", String(c.unread)));
        else if (c.handoff) meta.append(node("span", "tag", "wants you"));
        button.append(meta);

        const item = node("li");
        item.append(button);
        return item;
      })
    );
    el.emptyList.hidden = state.conversations.length > 0;
  }

  async function refreshList() {
    try {
      // `active=1` doubles as the presence heartbeat → visitors see "Online".
      const data = await api("/conversations" + (document.hidden ? "" : "?active=1"));
      state.conversations = data.conversations;
      el.presence.textContent = document.hidden ? "Away — visitors see your usual reply time" : "You appear online to visitors";
      announce(data.unreadTotal);
      renderList();
    } catch {
      /* transient network errors are retried on the next tick */
    }
  }

  // ── Thread ──────────────────────────────────────────────────────────────
  function appendMessages(messages) {
    const nearBottom = el.messages.scrollHeight - el.messages.scrollTop - el.messages.clientHeight < 120;
    for (const m of messages) {
      if (m.id <= state.lastMessageId) continue;
      state.lastMessageId = m.id;
      const kind = AUTHOR_LABEL[m.author] ? m.author : "visitor";
      const wrap = node("div", "msg " + kind);
      // The AI writes light markdown; show it as clean plain text here.
      wrap.append(node("div", "bubble", kind === "ai" ? m.text.replace(/\*\*/g, "") : m.text));
      wrap.append(node("span", "who", AUTHOR_LABEL[kind] + " · " + clock(m.at)));
      el.messages.append(wrap);
    }
    if (nearBottom) el.messages.scrollTop = el.messages.scrollHeight;
  }

  function renderThreadHead(c) {
    el.threadTitle.textContent = displayName(c);
    el.threadSub.textContent = [c.email && c.name ? c.email : "", c.page ? "on " + c.page : ""].filter(Boolean).join(" · ");
    el.aiToggle.checked = Boolean(c.aiEnabled);
  }

  async function refreshThread() {
    const id = state.activeId;
    if (!id) return;
    try {
      const data = await api("/conversations/" + id + "?after=" + state.lastMessageId);
      if (id !== state.activeId) return; // user switched threads mid-request
      renderThreadHead(data.conversation);
      appendMessages(data.messages);
      el.typing.hidden = !data.typing;
    } catch (err) {
      if (err.status === 404) closeThread();
    }
  }

  async function openConversation(id) {
    state.activeId = id;
    state.lastMessageId = 0;
    el.messages.replaceChildren();
    el.threadEmpty.hidden = true;
    el.threadBody.hidden = false;
    el.app.classList.add("show-thread");
    history.replaceState(null, "", "#" + id);
    renderList();
    await refreshThread();
    el.messages.scrollTop = el.messages.scrollHeight;
    refreshList();
    if (window.matchMedia("(min-width: 761px)").matches) el.replyInput.focus();
  }

  function closeThread() {
    state.activeId = null;
    el.threadBody.hidden = true;
    el.threadEmpty.hidden = false;
    el.app.classList.remove("show-thread");
    history.replaceState(null, "", location.pathname);
    renderList();
  }

  el.back.addEventListener("click", closeThread);

  el.replyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = el.replyInput.value.trim();
    if (!text || !state.activeId) return;
    el.sendButton.disabled = true;
    try {
      const data = await api("/conversations/" + state.activeId + "/messages", { method: "POST", body: { text } });
      el.replyInput.value = "";
      el.replyInput.style.height = "auto";
      appendMessages([data.message]);
      el.messages.scrollTop = el.messages.scrollHeight;
      refreshList();
    } catch (err) {
      toast(err.message);
    } finally {
      el.sendButton.disabled = false;
      el.replyInput.focus();
    }
  });

  el.replyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      el.replyForm.requestSubmit();
    }
  });

  el.replyInput.addEventListener("input", () => {
    el.replyInput.style.height = "auto";
    el.replyInput.style.height = Math.min(el.replyInput.scrollHeight, 160) + "px";
    if (state.activeId && Date.now() - state.lastTypingSent > 4000) {
      state.lastTypingSent = Date.now();
      api("/conversations/" + state.activeId + "/typing", { method: "POST" }).catch(() => {});
    }
  });

  el.aiToggle.addEventListener("change", async () => {
    if (!state.activeId) return;
    try {
      await api("/conversations/" + state.activeId, { method: "PATCH", body: { aiEnabled: el.aiToggle.checked } });
      toast(el.aiToggle.checked ? "Zubair AI will answer this visitor." : "AI paused — only you reply here.");
    } catch (err) {
      el.aiToggle.checked = !el.aiToggle.checked;
      toast(err.message);
    }
  });

  el.deleteButton.addEventListener("click", async () => {
    if (!state.activeId || !window.confirm("Delete this conversation permanently? This cannot be undone.")) return;
    try {
      await api("/conversations/" + state.activeId, { method: "DELETE" });
      closeThread();
      refreshList();
    } catch (err) {
      toast(err.message);
    }
  });

  // ── Polling (fast while visible, slow in the background) ────────────────
  function schedule() {
    stopPolling();
    if (!state.me) return;
    state.listTimer = setInterval(refreshList, document.hidden ? 20000 : 4000);
    state.threadTimer = setInterval(refreshThread, document.hidden ? 20000 : 2500);
  }
  function startPolling() {
    refreshList();
    schedule();
  }
  function stopPolling() {
    clearInterval(state.listTimer);
    clearInterval(state.threadTimer);
  }
  document.addEventListener("visibilitychange", () => {
    if (!state.me) return;
    schedule();
    if (!document.hidden) {
      refreshList();
      refreshThread();
    }
  });

  // ── Boot ────────────────────────────────────────────────────────────────
  api("/me")
    .then((me) => {
      state.me = me;
      showApp();
    })
    .catch(() => showLogin());
})();
