import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)

const IDLE_TIME = 60 * 60 * 1000 // 60 minutes

const getInitialAuthState = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
    const userSaved = localStorage.getItem('user')
    const lastActivity = localStorage.getItem('lastActivityTime')

    if (token) {
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10)
            if (elapsed > IDLE_TIME) {
                // Expired, clear storage and record notice
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('admin_token')
                localStorage.removeItem('admin_role')
                localStorage.removeItem('lastActivityTime')
                sessionStorage.setItem('session_expired_notice', 'Your session has expired due to inactivity. Please sign in again.')
                return { token: null, user: null, expiredOnStart: true }
            }
        } else {
            // If they have a token but no last activity, initialize it to now
            localStorage.setItem('lastActivityTime', Date.now().toString())
        }
    }
    return {
        token: token || null,
        user: userSaved ? JSON.parse(userSaved) : null,
        expiredOnStart: false,
    }
}

export function AuthProvider({ children }) {
    const [authState, setAuthState] = useState(() => getInitialAuthState())
    const token = authState.token
    const user = authState.user

    const login = (newToken, userData, refreshToken) => {
        localStorage.setItem('token', newToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        if (userData) localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('lastActivityTime', Date.now().toString())
        sessionStorage.removeItem('session_expired_notice')
        setAuthState({ token: newToken, user: userData, expiredOnStart: false })
    }

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_role')
        localStorage.removeItem('user')
        localStorage.removeItem('lastActivityTime')
        sessionStorage.removeItem('session_expired_notice')
        setAuthState({ token: null, user: null, expiredOnStart: false })
        window.location.href = '/'
    }, [])

    const handleSessionExpired = useCallback((reason = 'inactivity') => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_role')
        localStorage.removeItem('lastActivityTime')
        
        const msg = 'Your session has expired due to inactivity. Please sign in again to continue.'
        sessionStorage.setItem('session_expired_notice', msg)
        setAuthState({ token: null, user: null, expiredOnStart: false })

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('dnarai:session-expired', {
                    detail: {
                        reason,
                        message: msg,
                    },
                })
            )
        }
    }, [])

    const isAuthenticated = !!token

    // Idle timeout logic
    const idleTimeoutRef = useRef(null)
    const lastStorageWriteRef = useRef(0)

    const updateLastActivity = useCallback(() => {
        const now = Date.now()
        // Throttle writing to localStorage to once every 5 seconds
        if (now - lastStorageWriteRef.current > 5000) {
            localStorage.setItem('lastActivityTime', now.toString())
            lastStorageWriteRef.current = now
        }
    }, [])

    const checkTimeout = useCallback(() => {
        if (!isAuthenticated) return false
        const lastActivity = localStorage.getItem('lastActivityTime')
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10)
            if (elapsed > IDLE_TIME) {
                handleSessionExpired('idle_elapsed')
                return true
            }
        }
        return false
    }, [isAuthenticated, handleSessionExpired])

    const resetIdleTimer = useCallback(() => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
        if (isAuthenticated) {
            idleTimeoutRef.current = setTimeout(() => {
                if (!checkTimeout()) {
                    handleSessionExpired('idle_timer')
                }
            }, IDLE_TIME)
        }
    }, [isAuthenticated, checkTimeout, handleSessionExpired])

    const handleActivity = useCallback(() => {
        if (!isAuthenticated) return

        // Check if they already timed out before resetting
        if (checkTimeout()) return

        resetIdleTimer()
        updateLastActivity()
    }, [isAuthenticated, checkTimeout, resetIdleTimer, updateLastActivity])

    useEffect(() => {
        // If expired on initial start, dispatch event
        if (authState.expiredOnStart) {
            window.dispatchEvent(
                new CustomEvent('dnarai:session-expired', {
                    detail: {
                        reason: 'initial_expired',
                        message: 'Your previous session has expired. Please sign in to continue.',
                    },
                })
            )
        }

        // Listen for session restore from SessionExpiredModal
        const handleSessionRestored = (e) => {
            const { token: restoredToken, role: restoredRole, email: restoredEmail } = e.detail || {}
            if (restoredToken) {
                setAuthState({
                    token: restoredToken,
                    user: { role: restoredRole, email: restoredEmail },
                    expiredOnStart: false,
                })
                resetIdleTimer()
                updateLastActivity()
            }
        }

        window.addEventListener('dnarai:session-restored', handleSessionRestored)

        if (!isAuthenticated) {
            return () => {
                window.removeEventListener('dnarai:session-restored', handleSessionRestored)
            }
        }

        // Verify timeout on mount
        if (checkTimeout()) {
            return () => {
                window.removeEventListener('dnarai:session-restored', handleSessionRestored)
            }
        }

        resetIdleTimer()
        updateLastActivity()

        const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click']
        events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }))

        const checkTimeoutOnFocus = () => {
            checkTimeout()
        }

        window.addEventListener('visibilitychange', checkTimeoutOnFocus)
        window.addEventListener('focus', checkTimeoutOnFocus)

        return () => {
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
            events.forEach(event => window.removeEventListener(event, handleActivity))
            window.removeEventListener('visibilitychange', checkTimeoutOnFocus)
            window.removeEventListener('focus', checkTimeoutOnFocus)
            window.removeEventListener('dnarai:session-restored', handleSessionRestored)
        }
    }, [isAuthenticated, resetIdleTimer, handleActivity, checkTimeout, updateLastActivity, authState.expiredOnStart])

    const value = {
        token,
        user,
        login,
        logout,
        isAuthenticated,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
