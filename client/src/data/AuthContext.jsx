import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)

const IDLE_TIME = 15 * 60 * 1000 // 15 minutes

const getInitialAuthState = () => {
    const token = localStorage.getItem('token')
    const userSaved = localStorage.getItem('user')
    const lastActivity = localStorage.getItem('lastActivityTime')

    if (token) {
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10)
            if (elapsed > IDLE_TIME) {
                // Expired, clear storage and return nulls
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                localStorage.removeItem('lastActivityTime')
                return { token: null, user: null }
            }
        } else {
            // If they have a token but no last activity, initialize it to now
            localStorage.setItem('lastActivityTime', Date.now().toString())
        }
    }
    return {
        token: token || null,
        user: userSaved ? JSON.parse(userSaved) : null
    }
}

export function AuthProvider({ children }) {
    const [authState, setAuthState] = useState(() => getInitialAuthState())
    const token = authState.token
    const user = authState.user

    const login = (newToken, userData, refreshToken) => {
        localStorage.setItem('token', newToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('lastActivityTime', Date.now().toString())
        setAuthState({ token: newToken, user: userData })
    }

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        localStorage.removeItem('lastActivityTime')
        setAuthState({ token: null, user: null })
        window.location.href = '/'
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
                logout()
                return true
            }
        }
        return false
    }, [isAuthenticated, logout])

    const resetIdleTimer = useCallback(() => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
        if (isAuthenticated) {
            idleTimeoutRef.current = setTimeout(() => {
                if (!checkTimeout()) {
                    logout()
                }
            }, IDLE_TIME)
        }
    }, [isAuthenticated, logout, checkTimeout])

    const handleActivity = useCallback(() => {
        if (!isAuthenticated) return

        // Check if they already timed out before resetting
        if (checkTimeout()) return

        resetIdleTimer()
        updateLastActivity()
    }, [isAuthenticated, checkTimeout, resetIdleTimer, updateLastActivity])

    useEffect(() => {
        if (!isAuthenticated) return

        // Initialize/verify on mount
        if (checkTimeout()) return

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
        }
    }, [isAuthenticated, resetIdleTimer, handleActivity, checkTimeout, updateLastActivity])

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
