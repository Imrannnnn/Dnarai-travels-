import webpush from 'web-push';

let isConfigured = false;

function configureWebPush() {
    if (isConfigured) return true;
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@test.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        isConfigured = true;
        return true;
    } else {
        console.warn('Web Push VAPID keys are missing. Push notifications will not work.');
        return false;
    }
}

export const PushService = {
    /**
     * Send a push notification to all active subsciptions of a user
     * @param {Object} user - The mongoose User model document
     * @param {Object} payload - The notification payload (title, body, etc)
     */
    async sendPushNotification(user, payload) {
        if (!configureWebPush()) return;

        // If the user hasn't opted-in to web push notifications
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return;
        }

        const payloadString = JSON.stringify(payload);
        const validSubscriptions = [];
        const subscriptionsToRemove = [];

        // Attempt to send notification to each of the user's registered devices/browsers
        await Promise.all(
            user.pushSubscriptions.map(async (subscription) => {
                try {
                    await webpush.sendNotification(subscription, payloadString);
                    validSubscriptions.push(subscription);
                } catch (error) {
                    // Status 410 (Gone) or 404 means the subscription has expired or is no longer valid
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        subscriptionsToRemove.push(subscription);
                    } else {
                        console.error('Error sending push notification:', error);
                        validSubscriptions.push(subscription); // Keep it if there was a temporary error
                    }
                }
            })
        );

        // Clean up expired or invalid subscriptions from the database
        if (subscriptionsToRemove.length > 0) {
            user.pushSubscriptions = validSubscriptions;
            await user.save();
        }
    }
};
