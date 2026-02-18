import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import NotificationItem from '../components/NotificationItem'
import clsx from 'clsx'
import { useAppData } from '../data/AppDataContext'
import * as Lucide from 'lucide-react'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'flight', label: 'Flights' },
  { id: 'passport', label: 'Passport' },
  { id: 'weather', label: 'Weather' },
]

export default function NotificationsPage() {
  const [active, setActive] = useState('all')
  const { notifications: items, unreadCount, markAllAsRead, markAsRead } = useAppData()

  const filtered = useMemo(() => {
    if (active === 'all') return items
    return items.filter((n) => n.type === active)
  }, [active, items])

  const markRead = (id) => {
    markAsRead(id)
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-[1600px] mb-20 md:mb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10">
        <PageHeader
          title="Notifications Center"
          subtitle="Stay updated with your flight information"
        />

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 px-6 py-3 text-sm font-bold text-ocean-600 dark:text-ocean-400 shadow-sm transition-all hover:bg-ocean-50 dark:hover:bg-slate-800 hover:border-ocean-200 active:scale-95"
          >
            <Lucide.CheckCheck size={18} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="rounded-[2.5rem] bg-white p-6 md:p-10 shadow-card dark:border dark:border-slate-800 dark:bg-slate-900/50 backdrop-blur-sm premium-shadow">
        {/* Modern Filter Pills */}
        <div className="mb-10 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl inline-flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={clsx(
                'relative flex items-center gap-2 rounded-[1.25rem] px-6 py-3 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] transition-all duration-500 whitespace-nowrap',
                active === f.id
                  ? 'bg-white dark:bg-slate-900 text-ocean-600 shadow-sm dark:text-ocean-400'
                  : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/80 dark:text-slate-400'
              )}
            >
              {f.label}
              {f.id === 'all' && unreadCount > 0 && (
                <span className="relative flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-lg shadow-red-500/20">
                  {unreadCount}
                </span>
              )}
              {active === f.id && (
                <div className="absolute inset-0 border border-slate-200/60 dark:border-slate-700 rounded-[1.25rem] pointer-events-none" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:gap-6">
          {filtered.length > 0 ? (
            filtered.map((n) => (
              <NotificationItem key={n.id} item={n} onMarkRead={markRead} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-ocean-100 dark:bg-ocean-900/20 rounded-full blur-2xl opacity-50 animate-pulse" />
                <div className="relative h-20 w-20 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-300 border border-slate-100 dark:border-slate-700">
                  <Lucide.BellOff size={36} />
                </div>
              </div>
              <div className="max-w-xs">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display mb-2">All Caught Up</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                  No notifications found for <span className="text-ocean-600 dark:text-ocean-400 font-bold">&quot;{active}&quot;</span> categories. We&apos;ll alert you if anything changes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
