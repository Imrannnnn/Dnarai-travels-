import * as Lucide from 'lucide-react'
import clsx from 'clsx'

const CreditCard = Lucide.CreditCard
const IdCard = Lucide.IdCard || Lucide.BadgeCheck || Lucide.UserRound || Lucide.CreditCard
const Passport = Lucide.Passport || Lucide.Book || Lucide.IdCard || Lucide.CreditCard

function Icon({ type }) {
  if (type === 'passport') return <Passport size={18} />
  if (type === 'id') return <IdCard size={18} />
  return <CreditCard size={18} />
}

export default function DocumentCard({ doc }) {
  const badgeTone =
    doc.badge.tone === 'warning'
      ? 'bg-coral-50 text-coral-600 dark:bg-coral-900/20 dark:text-coral-400'
      : 'bg-green-50 text-success-600 dark:bg-green-900/20 dark:text-success-400'

  return (
    <div className="rounded-[1.25rem] border border-sand-200/60 bg-white p-6 transition-all duration-300 hover:border-ocean-300 hover:shadow-card hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ocean-50 text-ocean-600 dark:bg-slate-900 dark:text-ocean-400 border border-ocean-100/50 dark:border-slate-800">
        <Icon type={doc.icon} />
      </div>
      <div className="text-lg font-black text-slate-900 dark:text-white font-display">{doc.title}</div>
      <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 font-mono tracking-wide">{doc.maskedNumber}</div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wide">
        <span>Exp: {doc.expiry}</span>
        <span className={clsx('rounded-lg px-2.5 py-1', badgeTone)}>
          {doc.badge.label}
        </span>
      </div>
    </div>
  )
}
