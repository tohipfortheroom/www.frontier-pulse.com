self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "AI Company Tracker";
  const options = {
    body: data.body || "A new breaking story just landed.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: data.url || "/news",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/news";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();

          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }

          return undefined;
        }
      }

      return clients.openWindow(targetUrl);
    }),
  );
});
