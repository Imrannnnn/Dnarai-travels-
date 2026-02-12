import * as Lucide from 'lucide-react'
import clsx from 'clsx'

const Plane = Lucide.Plane
const RefreshCw = Lucide.RefreshCw
const CloudSun = Lucide.CloudSun
const CheckCircle2 = Lucide.CheckCircle2
const PassportLike = Lucide.Passport || Lucide.IdCard || Lucide.CreditCard || Lucide.UserRound || Lucide.Plane

function IconForType({ type, title }) {
  if (title === 'Check-in Available') return <CheckCircle2 size={20} />
  if (type === 'passport') return <PassportLike size={20} />
  if (type === 'weather') return <CloudSun size={20} />
  if (title === 'Flight Time Update') return <RefreshCw size={20} />
  return <Plane size={20} />
}

export default function NotificationItem({ item, onMarkRead }) {
  const iconTone = item.alert
    ? 'bg-red-50 text-red-600'
    : item.type === 'weather'
      ? 'bg-green-50 text-success-600'
      : item.title === 'Flight Time Update'
        ? 'bg-coral-50 text-coral-600'
        : 'bg-ocean-100 text-ocean-700'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMarkRead(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onMarkRead(item.id)
      }}
      className={clsx(
        'relative flex flex-col gap-4 rounded-[1.5rem] border p-6 transition-all duration-300 md:flex-row md:items-center md:gap-6',
        item.unread
          ? 'border-ocean-300 bg-ocean-50/50 hover:shadow-md dark:border-ocean-700 dark:bg-slate-900/80 shadow-soft'
          : 'border-sand-200/60 bg-white hover:shadow-card hover:border-ocean-200 dark:border-slate-800 dark:bg-slate-950/50'
      )}
    >
      {item.unread ? <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-ocean-500" /> : null}

      <div className={clsx('grid h-12 w-12 place-items-center rounded-full', iconTone)}>
        <IconForType type={item.type} title={item.title} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-display">{item.title}</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{item.message}</div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.timeAgo}</div>
      </div>

      <div className="flex shrink-0 justify-start md:justify-end">
        <button
          className={clsx(
            'rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
            item.alert
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20 rounded-2xl'
              : 'bg-ocean-50 text-ocean-700 hover:bg-ocean-600 hover:text-white dark:bg-ocean-900/30 dark:text-ocean-400 dark:hover:bg-ocean-600 dark:hover:text-white rounded-2xl shadow-sm'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {item.actionLabel}
        </button>
      </div>
    </div>
  )
}
