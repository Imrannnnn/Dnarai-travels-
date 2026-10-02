import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'
import { login as apiLogin, getApiBaseUrl } from '../data/api'
import { useAuth } from '../data/AuthContext'

export default function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('Your session has expired. Please sign in again to continue.')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { login } = useAuth()

  useEffect(() => {
    const handleSessionExpired = (e) => {
      const customMsg = e.detail?.message || 'Your session has expired. Please sign in again to continue.'
      setMessage(customMsg)
      setError('')
      setSuccess(false)
      setPassword('')

      // Attempt to retrieve saved user's email
      try {
        const savedUserStr = localStorage.getItem('user')
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr)
          if (parsed?.email) setEmail(parsed.email)
        }
      } catch {
        // ignore
      }

      setIsOpen(true)
    }

    window.addEventListener('dnarai:session-expired', handleSessionExpired)
    return () => window.removeEventListener('dnarai:session-expired', handleSessionExpired)
  }, [])

  const handleReLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const baseUrl = getApiBaseUrl()
      const data = await apiLogin({ email, password, baseUrl })

      if (!data?.accessToken) {
        throw new Error(data?.message || 'Authentication failed. Please verify credentials.')
      }

      // Update primary AuthContext
      login(data.accessToken, { role: data.role, email }, data.refreshToken)

      // Store tokens for admin/staff if applicable
      if (['admin', 'staff', 'agent'].includes(data.role)) {
        localStorage.setItem('admin_token', data.accessToken)
        localStorage.setItem('admin_role', data.role)
      }

      // Clear any session expired flags
      sessionStorage.removeItem('session_expired_notice')

      setSuccess(true)

      // Notify any listening components (e.g. SuperAdminPage, Dashboard) to re-sync
      window.dispatchEvent(
        new CustomEvent('dnarai:session-restored', {
          detail: {
            token: data.accessToken,
            role: data.role,
            email,
          },
        })
      )

      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
        setPassword('')
      }, 900)
    } catch (err) {
      console.error('[SessionExpiredModal] Re-login failed:', err)
      setError(err?.message || 'Invalid email or password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFullRedirect = () => {
    setIsOpen(false)
    const isAdmin =
      window.location.pathname.startsWith('/super-admin') ||
      window.location.pathname.startsWith('/admin') ||
      window.location.pathname.startsWith('/superadmin')

    sessionStorage.setItem('session_expired_notice', 'Your session has expired. Please sign in to continue.')
    if (isAdmin) {
      window.location.href = '/super-admin/login'
    } else {
      window.location.href = '/login'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden text-slate-900 dark:text-white">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-3 shadow-inner">
            <Lucide.ShieldAlert size={30} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight font-display text-slate-900 dark:text-white">
            Session Expired
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
            {message}
          </p>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-in zoom-in-95">
            <Lucide.CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span>Session restored! Resuming your workspace...</span>
          </div>
        ) : (
          <form onSubmit={handleReLogin} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                <Lucide.AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1">
                Account Email
              </label>
              <div className="relative">
                <Lucide.Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lucide.Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <Lucide.EyeOff size={15} /> : <Lucide.Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Re-login Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 rounded-2xl bg-ocean-600 hover:bg-ocean-700 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-ocean-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Lucide.Loader2 size={16} className="animate-spin" />
                  <span>Verifying & Resuming...</span>
                </>
              ) : (
                <>
                  <Lucide.LogIn size={16} />
                  <span>Sign In & Resume Session</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Secondary Logout / Switch Account Link */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={handleFullRedirect}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors inline-flex items-center gap-1.5"
          >
            <Lucide.ArrowRight size={12} />
            <span>Switch account or go to Login Page</span>
          </button>
        </div>
      </div>
    </div>
  )
}
