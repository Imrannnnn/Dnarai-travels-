import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { applyTheme, getInitialTheme } from './theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const t = getInitialTheme()
    setTheme(t)
    applyTheme(t)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next) => {
        setTheme(next)
        applyTheme(next)
      },
      toggleTheme: () => {
        setTheme((prev) => {
          const next = prev === 'dark' ? 'light' : 'dark'
          applyTheme(next)
          return next
        })
      },
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
