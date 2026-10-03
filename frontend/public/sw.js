self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Salón Masai ✨';
  const options = {
    body: data.body || 'Tienes una nueva actualización en tu cita.',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: { url: data.url || '/perfil' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/perfil';

  event.waitUntil(self.clients.openWindow(targetUrl));
});
