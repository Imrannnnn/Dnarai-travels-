import * as Lucide from 'lucide-react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useMemo, useState, useEffect } from 'react'
import { useAppData } from '../data/AppDataContext'
import { useAuth } from '../data/AuthContext'
import { useTheme } from '../theme/ThemeContext'
import content from '../content/siteContent.json'

const Plane = Lucide.Plane
const Bell = Lucide.Bell
const UserRound = Lucide.UserRound
const LayoutDashboard = Lucide.LayoutDashboard
const Moon = Lucide.Moon
const Sun = Lucide.Sun
const LogIn = Lucide.LogIn
const LogOut = Lucide.LogOut
const Menu = Lucide.Menu
const X = Lucide.X
const Home = Lucide.Home || Lucide.LayoutDashboard || Lucide.Plane
const Info = Lucide.Info || Lucide.BadgeInfo || Lucide.HelpCircle || Lucide.Plane

function NavItem({ to, icon: Icon, label, badge, onClick }) {
  const SafeIcon = Icon || Plane
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'relative inline-flex items-center gap-3 px-5 py-3 md:py-2.5 rounded-xl md:rounded-full text-sm font-semibold transition-all duration-300 w-full md:w-auto',
          isActive
            ? 'bg-ocean-600 text-white shadow-lg shadow-ocean-600/30'
            : 'text-slate-600 dark:text-slate-300 hover:bg-ocean-50 hover:text-ocean-700 dark:hover:bg-white/5 dark:hover:text-white'
        )
      }
    >
      <SafeIcon size={20} strokeWidth={2.5} />
      <span>{label}</span>
      {badge ? (
        <span className="ml-auto md:ml-2 md:absolute md:-right-1 md:-top-1 grid min-w-[20px] h-5 place-items-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-white shadow-md">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export default function Navbar() {
  const { unreadCount: unread, passenger } = useAppData()
  const { isAuthenticated, logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const brandName = content.brandName
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  const initials = useMemo(() => {
    const name = passenger?.name || user?.email || 'Guest User'
    const parts = name.split(/[\s@]/).filter(Boolean)
    return (parts[0]?.[0] || 'G').toUpperCase() + (parts[1]?.[0] || 'U').toUpperCase()
  }, [passenger?.name, user?.email])

  const menuItems = [
    { to: '/', icon: Home, label: 'Home' },
    ...(isAuthenticated ? [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/notifications', icon: Bell, label: 'Alerts', badge: unread },
      { to: '/profile', icon: UserRound, label: 'Profile' },
    ] : []),
    { to: '/about', icon: Info, label: 'Support' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-sand-200/60 bg-white/95 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/95 shadow-soft">
        <div className="w-full flex items-center justify-between px-6 lg:px-10 py-4 max-w-[1920px] mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer z-50 relative">
            <div className="h-20 w-20 transition-transform duration-300 group-hover:scale-105 active:scale-95">
              <img
                src="/D-NARAI_Logo 01.svg"
                alt="Dnarai Enterprise"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-display uppercase">{brandName}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-dnarai-navy-500 dark:text-dnarai-gold-400">Travel Portal</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full border border-sand-200/80 dark:border-slate-700/50 shadow-soft backdrop-blur-md">
            {menuItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3 z-50 relative">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/50 bg-white/50 text-slate-700 hover:bg-slate-100 dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Desktop User Menu / Auth Button */}
            <div className="hidden md:flex items-center">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-ocean-600 hover:bg-ocean-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-ocean-600/20 transition-all active:scale-95 ml-2"
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </Link>
              ) : (
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700 ml-2">
                  <div className="hidden lg:block text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-display">{passenger?.name?.split(' ')[0] || user?.email?.split('@')[0]}</div>
                    <div className="text-[10px] font-bold text-ocean-600 dark:text-ocean-400 uppercase tracking-tighter">
                      {user?.role || 'Traveler'}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="relative group cursor-pointer outline-none"
                    title="Profile"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900 shadow-md group-hover:ring-ocean-500 transition-all">
                      {initials}
                    </div>
                  </button>
                  <button
                    onClick={logout}
                    className="h-10 w-10 grid place-items-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white transition-transform active:scale-90"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={clsx(
          'fixed inset-0 z-30 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl transition-all duration-500 md:hidden flex flex-col pt-24 px-6 pb-10',
          isMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-4'
        )}
      >
        {/* Mobile Navigation List */}
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
          <div className="space-y-1 py-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 px-2">Menu</h3>
            {menuItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setIsMenuOpen(false)} />
            ))}
          </div>

          {!isAuthenticated && (
            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center justify-center gap-3 bg-ocean-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-xl shadow-ocean-600/30 active:scale-95 transition-all"
              >
                <LogIn size={20} />
                <span>Login to Account</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile User Profile Check */}
        {isAuthenticated && (
          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white truncate text-lg">
                  {passenger?.name || user?.email?.split('@')[0]}
                </div>
                <div className="text-xs font-medium text-ocean-600 dark:text-ocean-400 uppercase tracking-wide">
                  {user?.role || 'Traveler Account'}
                </div>
              </div>
              <button
                onClick={() => {
                  logout()
                  setIsMenuOpen(false)
                }}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 active:scale-95 transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>

            <div className="mt-4 flex justify-between items-center px-2">
              <span className="text-xs text-slate-400 font-medium">v1.0.2 Mobile Build</span>
              <span className="text-xs text-slate-400 font-medium">Secure Connection</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
