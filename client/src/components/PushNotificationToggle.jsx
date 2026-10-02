import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../data/AuthContext'
import NotificationOnboardingModal from './NotificationOnboardingModal'

export default function PushNotificationToggle({ compact = false }) {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [user])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription && Notification.permission === 'granted')
    } catch {
      // ignore
    }
  }

  const hasUser = user || (typeof window !== 'undefined' && (localStorage.getItem('admin_token') || localStorage.getItem('token')))
  if (!hasUser) return null

  if (!isSupported) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 rounded-xl transition-all border ${
          compact
            ? 'p-2 sm:px-2.5 sm:py-1.5 text-xs bg-slate-100 text-slate-500 border-slate-200'
            : 'px-3 py-2 text-xs bg-slate-100 text-slate-500 border-slate-200'
        }`}
        title="Web Push Unavailable (Requires HTTPS or PWA)"
      >
        <BellOff size={15} />
        <span className={compact ? 'hidden sm:inline font-semibold' : 'font-semibold'}>Alerts Inactive</span>
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 rounded-xl transition-all border shrink-0 ${
          isSubscribed
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70 shadow-2xs'
            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-xs animate-pulse'
        } ${compact ? 'p-2 sm:px-2.5 sm:py-1.5 text-xs' : 'px-3 py-2 text-xs font-semibold'}`}
        title={isSubscribed ? 'Push Alerts Active (Click to Test)' : 'Action Required: Enable Staff Push Alerts'}
      >
        {isSubscribed ? (
          <>
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span className={compact ? 'hidden sm:inline font-bold' : 'font-bold'}>Alerts Active</span>
          </>
        ) : (
          <>
            <Bell size={15} className="text-amber-600 shrink-0" />
            <span className={compact ? 'hidden sm:inline font-bold' : 'font-bold'}>Enable Alerts</span>
          </>
        )}
      </button>

      {showModal && (
        <NotificationOnboardingModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            checkSubscription()
          }}
        />
      )}
    </>
  )
}
