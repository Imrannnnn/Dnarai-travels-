import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '../data/AuthContext';

// Helper to convert base64 VAPID key to Uint8Array needed for Web Push
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export default function PushNotificationToggle() {
    const { token, user } = useAuth();
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if the browser supports service workers and push API
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking push subscription:', error);
        }
    };

    const subscribeUser = async () => {
        if (!VAPID_PUBLIC_KEY) {
            alert('Push Keys missing! Please restart your "npm run dev" terminal for the client so it can load the new .env values.');
            return;
        }
        setLoading(true);
        try {
            // Prompt user for notification permissions
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('Permission for notifications was denied');
                setLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // Subscribe via the browser PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // Send the subscription object to our backend API properly
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/web-push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ subscription }),
            });

            if (res.ok) {
                setIsSubscribed(true);
                alert('Successfully enabled push notifications!');
            } else {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to save subscription');
            }
        } catch (error) {
            console.error('Failed to subscribe to web push:', error);
            alert('Failed to subscribe: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    if (!isSupported) {
        return (
            <button
                onClick={() => alert('Web Push requires a secure HTTPS connection (or localhost).\nPlease access your site via a domain with SSL to enable push notifications on phone.')}
                className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors bg-slate-200 text-slate-500 hover:bg-slate-300"
                title="Requires HTTPS"
            >
                <BellOff size={18} />
                <span className="text-sm font-medium">Alerts Unavailable</span>
            </button>
        );
    }

    return (
        <button
            onClick={isSubscribed ? null : subscribeUser}
            disabled={isSubscribed || loading}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isSubscribed
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            title={isSubscribed ? "Notifications Enabled" : "Enable Push Notifications"}
        >
            {isSubscribed ? (
                <>
                    <Bell size={18} />
                    <span className="text-sm font-medium">Alerts On</span>
                </>
            ) : (
                <>
                    <BellOff size={18} />
                    <span className="text-sm font-medium">
                        {loading ? 'Enabling...' : 'Enable Alerts'}
                    </span>
                </>
            )}
        </button>
    );
}
