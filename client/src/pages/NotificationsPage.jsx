import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import NotificationItem from '../components/NotificationItem'
import clsx from 'clsx'
import { useAppData } from '../data/AppDataContext'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'flight', label: 'Flights' },
  { id: 'passport', label: 'Passport' },
  { id: 'weather', label: 'Weather' },
]

export default function NotificationsPage() {
  const [active, setActive] = useState('all')
  const { notifications: items, setNotifications: setItems } = useAppData()

  const filtered = useMemo(() => {
    if (active === 'all') return items
    return items.filter((n) => n.type === active)
  }, [active, items])

  function markRead(id) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1600px]">
      <PageHeader
        title="Notifications Center"
        subtitle="Stay updated with your flight information"
      />

      <div className="rounded-[2rem] bg-white p-8 shadow-card dark:border dark:border-slate-800 dark:bg-slate-900/50 backdrop-blur-sm premium-shadow">
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200/50 pb-5 dark:border-slate-800">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={clsx(
                'rounded-2xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300',
                active === f.id
                  ? 'bg-ocean-600 text-white shadow-lg shadow-ocean-600/30 ring-2 ring-ocean-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transform scale-105'
                  : 'bg-white border border-sand-200 text-slate-500 hover:bg-ocean-50 hover:text-ocean-700 hover:border-ocean-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {filtered.map((n) => (
            <NotificationItem key={n.id} item={n} onMarkRead={markRead} />
          ))}
        </div>
      </div>
    </div>
  )
}
