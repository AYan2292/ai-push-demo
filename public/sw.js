// Service Worker - 处理推送和通知

// 收到推送时
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: '消息', body: '你有新消息' };

  const options = {
    body: data.body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💌</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💌</text></svg>',
    vibrate: [200, 100, 200],
    data: { url: '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '来自ta', options)
  );
});

// 点击通知时
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
