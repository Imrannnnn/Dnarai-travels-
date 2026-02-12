export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-display mb-2">{title}</h1>
      {subtitle ? (
        <p className="text-lg font-medium text-slate-500 dark:text-slate-400 max-w-2xl">{subtitle}</p>
      ) : null}
    </div>
  )
}
