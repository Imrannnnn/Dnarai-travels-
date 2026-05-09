import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user')
        return saved ? JSON.parse(saved) : null
    })

    const login = (newToken, userData, refreshToken) => {
        localStorage.setItem('token', newToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(userData))
        setToken(newToken)
        setUser(userData)
    }

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
        window.location.href = '/'
    }, [])

    const isAuthenticated = !!token

    // Idle timeout logic
    const idleTimeoutRef = useRef(null);
    const IDLE_TIME = 30 * 60 * 1000; // 30 minutes

    const resetIdleTimer = useCallback(() => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        if (isAuthenticated) {
            idleTimeoutRef.current = setTimeout(() => {
                // User has been idle for 30 minutes, log them out
                logout();
            }, IDLE_TIME);
        }
    }, [isAuthenticated, logout, IDLE_TIME]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Initialize the timer
        resetIdleTimer();

        const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        // Use a throttled version or just direct if performance is acceptable.
        // For simple timeout resets, direct is usually fine as clearTimeout is fast.
        const handleActivity = () => resetIdleTimer();

        events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

        return () => {
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [isAuthenticated, resetIdleTimer]);

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
