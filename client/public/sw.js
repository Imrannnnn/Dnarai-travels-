/* eslint-env serviceworker */

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/favicon.ico', // Adjust path based on your vite setup
            badge: '/favicon.ico',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.url || '/'
            },
            ...data
        };

        // We can show the notification to the user
        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.notification.data.url) {
        // Open the window to the URL attached to the payload
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
