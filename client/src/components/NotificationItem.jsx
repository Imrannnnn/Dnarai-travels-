import * as Lucide from 'lucide-react'
import clsx from 'clsx'

const Plane = Lucide.Plane
const RefreshCw = Lucide.RefreshCw
const CloudSun = Lucide.CloudSun
const CheckCircle2 = Lucide.CheckCircle2

function IconForType({ type, title }) {
  if (title === 'Check-in Available') return <CheckCircle2 size={24} />
  if (type === 'passport') return <Lucide.CreditCard size={24} />
  if (type === 'weather') return <CloudSun size={24} />
  if (title === 'Flight Time Update') return <RefreshCw size={24} />
  return <Plane size={24} />
}

export default function NotificationItem({ item, onMarkRead }) {
  const iconTone = item.alert
    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    : item.type === 'weather'
      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
      : item.title === 'Flight Time Update'
        ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
        : 'bg-ocean-100 text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-400'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMarkRead(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onMarkRead(item.id)
      }}
      className={clsx(
        'group relative flex flex-col gap-5 rounded-[2rem] border p-6 transition-all duration-300 md:flex-row md:items-center md:gap-6 active:scale-[0.98]',
        item.unread
          ? 'border-ocean-200 bg-white shadow-soft hover:shadow-lg dark:border-ocean-900/50 dark:bg-slate-900/90'
          : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-ocean-100 hover:shadow-card dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-900'
      )}
    >
      {/* Unread Indicator */}
      {item.unread && (
        <div className="absolute top-6 right-6 h-2 w-2 rounded-full bg-ocean-500 shadow-lg shadow-ocean-500/50 md:static md:h-2.5 md:w-2.5 md:mr-2" />
      )}

      <div className={clsx(
        'grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm',
        iconTone
      )}>
        <IconForType type={item.type} title={item.title} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-lg font-black text-slate-900 dark:text-white font-display tracking-tight">
            {item.title}
          </div>
          {item.alert && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
          {item.message}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Lucide.Clock size={12} className="text-slate-400" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {item.timeAgo}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between md:justify-end gap-3 mt-2 md:mt-0">
        <button
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95',
            item.alert
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
              : 'bg-white text-slate-900 border border-slate-200 hover:bg-ocean-600 hover:text-white hover:border-ocean-600 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-ocean-600 dark:hover:border-ocean-600 shadow-sm'
          )}
          onClick={(e) => {
            e.stopPropagation()
            // Action logic if needed
          }}
        >
          {item.actionLabel || 'Details'}
          <Lucide.ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
