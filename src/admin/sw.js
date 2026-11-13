/* Service worker for the admin inbox — shows a notification when a visitor
   writes, even if the inbox tab is closed. It caches nothing. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" ? data.title : "New chat message";
  const conversationId = typeof data.conversationId === "string" ? data.conversationId : "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      tag: conversationId || "zubair-live-chat", // one notification per conversation
      renotify: true,
      data: { conversationId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.conversationId;
  // The id is only ever used as a URL fragment on our own /admin page.
  const target = "/admin" + (id ? "#" + encodeURIComponent(id) : "");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname === "/admin");
      if (open) {
        open.postMessage({ type: "open-conversation", conversationId: id });
        return open.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
