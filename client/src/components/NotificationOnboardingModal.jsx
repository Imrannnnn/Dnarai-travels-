import { useState, useEffect, useCallback } from 'react'
import * as Lucide from 'lucide-react'
import { useAuth } from '../data/AuthContext'
import { subscribeWebPush, testWebPush, getWebPushStatus } from '../data/api'

// Helper to convert base64 VAPID key to Uint8Array needed for Web Push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export default function NotificationOnboardingModal({ isOpen: controlledIsOpen, onClose }) {
  const { token, user } = useAuth()

  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )
  const [loading, setLoading] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [testFeedback, setTestFeedback] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Device & Environment Detection
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches)

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

  // Is modal open? If controlled from outside, respect controlledIsOpen, otherwise use internalOpen
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen

  // Check if current device has subscription registered
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) return
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      const currentPerm = Notification.permission
      setPermission(currentPerm)
      const hasSub = !!subscription && currentPerm === 'granted'

      if (hasSub && subscription) {
        // Ensure this device's subscription is registered on the backend for the current account
        const subData = subscription.toJSON ? subscription.toJSON() : subscription
        try {
          await subscribeWebPush({ subscription: subData })
          setIsSubscribed(true)
        } catch (syncErr) {
          console.warn('[NotificationOnboarding] Sync push sub error:', syncErr)
          const statusRes = await getWebPushStatus().catch(() => null)
          setIsSubscribed(!!statusRes?.subscribed)
        }
      } else {
        setIsSubscribed(false)
      }

      // Check if user is staff/admin and push is not enabled
      const activeRole = user?.role || localStorage.getItem('admin_role')
      const isStaffOrAdmin = activeRole && ['admin', 'staff', 'agent', 'superadmin'].includes(activeRole)
      if (isStaffOrAdmin && !hasSub) {
        // Check snooze timer
        const snoozeExpiry = localStorage.getItem('dnarai_push_snooze')
        if (!snoozeExpiry || Date.now() > Number(snoozeExpiry)) {
          setInternalOpen(true)
        }
      }
    } catch (err) {
      console.warn('[NotificationOnboarding] Error checking push status:', err)
      setIsSubscribed(false)
    }
  }, [user])

  // Check subscription and support on mount or user change
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

    if (supported) {
      checkSubscriptionStatus()
    }
  }, [user, token, checkSubscriptionStatus])

  // Subscribe User to Web Push
  const handleSubscribe = async () => {
    setLoading(true)
    setErrorMessage(null)
    setTestFeedback(null)

    try {
      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key is missing. Please verify environment settings.')
      }

      if (!('Notification' in window)) {
        throw new Error('This browser does not support web notifications.')
      }

      // 1. Request Browser Permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        throw new Error(
          perm === 'denied'
            ? 'Notification permission was denied. Please allow notifications in your browser settings.'
            : 'Permission was not granted.'
        )
      }

      // 2. Wait for service worker
      const registration = await navigator.serviceWorker.ready

      // 3. Subscribe to PushManager or retrieve existing
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      // 4. Send subscription to Backend API with auto-refresh support
      const subData = subscription.toJSON ? subscription.toJSON() : subscription
      const res = await subscribeWebPush({ subscription: subData })
      if (!res?.ok && !res?.success) {
        throw new Error(res?.message || 'Failed to save push subscription on server.')
      }

      setIsSubscribed(true)
      localStorage.removeItem('dnarai_push_snooze')
    } catch (err) {
      console.error('[NotificationOnboarding] Subscription error:', err)
      if (err?.status === 401 || err?.code === 'SESSION_EXPIRED' || err?.message?.toLowerCase().includes('expired')) {
        setErrorMessage('Your login session has expired. Please sign in again.')
      } else {
        setErrorMessage(err.message || 'Could not complete notification registration.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Test Push Notification
  const handleSendTestPush = async () => {
    setTestingPush(true)
    setTestFeedback(null)
    setErrorMessage(null)

    try {
      let subData = null
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        let subscription = await registration.pushManager.getSubscription()

        // If no active push subscription exists in browser yet, attempt to create it if permission is granted
        if (!subscription && Notification.permission === 'granted' && VAPID_PUBLIC_KEY) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        }

        if (subscription) {
          subData = subscription.toJSON ? subscription.toJSON() : subscription
          // Ensure it is registered on the backend before sending test alert
          await subscribeWebPush({ subscription: subData }).catch(e =>
            console.warn('[NotificationOnboarding] Sync sub on test error:', e)
          )
        }
      }

      const res = await testWebPush({ subscription: subData })
      if (!res?.ok && !res?.success) {
        throw new Error(res?.message || 'Failed to send test push notification.')
      }

      setIsSubscribed(true)
      setTestFeedback('Test alert dispatched! Look for the notification banner on your device.')
    } catch (err) {
      console.error('[NotificationOnboarding] Test push error:', err)
      if (err?.status === 401 || err?.code === 'SESSION_EXPIRED' || err?.message?.toLowerCase().includes('expired')) {
        setErrorMessage('Your login session has expired. Please sign in again.')
      } else {
        setErrorMessage(err.message || 'Failed to trigger test alert.')
      }
    } finally {
      setTestingPush(false)
    }
  }

  // Snooze for 1 hour if staff needs to complete an immediate priority task
  const handleSnooze = () => {
    localStorage.setItem('dnarai_push_snooze', String(Date.now() + 60 * 60 * 1000))
    setInternalOpen(false)
    if (onClose) onClose()
  }

  const handleClose = () => {
    setInternalOpen(false)
    if (onClose) onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Brand Accent Top Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00456E] via-[#0c598a] to-[#FBB040]" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isSubscribed
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-ocean-50 text-[#00456E] border border-ocean-100'
              }`}
            >
              {isSubscribed ? <Lucide.CheckCircle2 size={22} /> : <Lucide.BellRing size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-1 max-w-full">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="truncate">Staff Operations Requirement</span>
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {isSubscribed
                  ? 'Push Alerts Configured'
                  : isIOS && !isStandalone
                  ? 'Enable Staff Alerts on iPhone'
                  : 'Enable Mandatory Staff Alerts'}
              </h2>
            </div>
          </div>

          <button
            onClick={handleSnooze}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            title="Dismiss for now (Remind in 1 hour)"
          >
            <Lucide.X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-700 text-xs sm:text-sm">
          {/* Status Context Banner */}
          {!isSubscribed && (
            <p className="text-slate-600 leading-relaxed text-xs sm:text-[13px]">
              D.Narai staff and administrators are required to receive instant real-time notifications
              for <strong className="text-slate-900 font-semibold">duty shift schedules</strong>,{' '}
              <strong className="text-slate-900 font-semibold">flight changes</strong>, and{' '}
              <strong className="text-slate-900 font-semibold">urgent traveler alerts</strong>.
            </p>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <Lucide.AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                {permission === 'denied' && (
                  <p className="mt-1 text-[11px] text-rose-700">
                    Notifications are currently blocked. To fix: tap the lock or site settings icon in
                    your browser address bar and switch Notifications to &quot;Allow&quot;.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success / Test Alert Feedback */}
          {testFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <Lucide.CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{testFeedback}</div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCENARIO 1: ALREADY SUBSCRIBED                           */}
          {/* ======================================================== */}
          {isSubscribed ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <Lucide.ShieldCheck size={16} className="text-emerald-600" />
                  <span>Push Delivery Active</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  This device is registered and authorized. You will receive immediate audio & visual alerts
                  when duties are assigned, flight rosters change, or clients require attention.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={testingPush}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {testingPush ? (
                    <Lucide.Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Lucide.Send size={15} className="text-amber-400" />
                  )}
                  <span>{testingPush ? 'Sending Test...' : 'Send Live Test Push Alert'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : isIOS && !isStandalone ? (
            /* ======================================================== */
            /* SCENARIO 2: IPHONE / IPAD IN SAFARI (NOT STANDALONE)     */
            /* ======================================================== */
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Lucide.Smartphone size={15} className="text-amber-600" />
                  <span>Apple iOS Push Requirement</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  iOS 16.4+ requires D.Narai Travel to be added to your Home Screen as an app before
                  system alert permissions can be granted.
                </p>
              </div>

              {/* 3 Step Interactive Visual Guide */}
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick 3-Step Setup for iPhone:
                </div>

                {/* Step 1 */}
                <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="h-6 w-6 rounded-lg bg-[#00456E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      Tap the <span className="text-ocean-600 font-bold">Share</span> button
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Found at the bottom menu bar of Safari (<Lucide.Share size={12} className="inline text-ocean-600 -mt-0.5" />).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="h-6 w-6 rounded-lg bg-[#00456E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      Tap <span className="text-ocean-600 font-bold">&quot;Add to Home Screen&quot;</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scroll down in the share sheet and select the &quot;Add to Home Screen&quot; option (<Lucide.PlusSquare size={12} className="inline text-ocean-600 -mt-0.5" />).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="h-6 w-6 rounded-lg bg-[#00456E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      Open from Home Screen &amp; Enable
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Open <strong className="text-slate-800">D.Narai Staff</strong> from your home screen and tap &quot;Enable Push Notifications&quot;.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons for iOS */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={checkSubscriptionStatus}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#00456E] hover:bg-[#0c598a] text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98"
                >
                  <Lucide.RefreshCw size={14} />
                  <span>I&apos;ve Added it — Check Status</span>
                </button>
                <button
                  type="button"
                  onClick={handleSnooze}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Remind Me in 1 Hour
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* SCENARIO 3: ANDROID, DESKTOP, OR IPHONE IN STANDALONE    */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-ocean-50/60 border border-ocean-100/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#00456E] text-xs uppercase tracking-wider">
                  <Lucide.BellRing size={15} />
                  <span>
                    {isAndroid
                      ? 'Android Device Detected'
                      : isStandalone
                      ? 'Home Screen App Detected'
                      : 'Desktop Browser Detected'}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Click the button below to grant permission. Your browser will prompt you with &quot;Allow notifications&quot;.
                </p>
              </div>

              {permission === 'denied' ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                    <Lucide.Lock size={15} className="text-rose-600" />
                    <span>Permission Blocked in Browser</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Notifications are currently blocked for this site. Click the lock/settings icon next
                    to the URL address in your browser bar, set Notifications to &quot;Allow&quot;, then reload.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#00456E] hover:bg-[#0c598a] text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md shadow-[#00456E]/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                >
                  {loading ? (
                    <Lucide.Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Lucide.Bell size={18} className="text-amber-400" />
                  )}
                  <span>{loading ? 'Activating Push Service...' : 'Enable Push Notifications'}</span>
                </button>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Encrypted VAPID Web Push
                </span>
                <button
                  type="button"
                  onClick={handleSnooze}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline transition-colors"
                >
                  Remind Me in 1 Hour
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="bg-slate-50 px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-400 font-medium">
          <span className="truncate">D.NARAI ENTERPRISE INTERNAL PORTAL</span>
          <span className="flex items-center gap-1 shrink-0">
            <Lucide.ShieldCheck size={12} className="text-emerald-500" />
            <span>Staff Protocol Compliant</span>
          </span>
        </div>
      </div>
    </div>
  )
}
