export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8 md:mb-12 relative">
      <div className="absolute -left-6 top-0 bottom-0 w-1 bg-ocean-500 rounded-full hidden md:block" />
      <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display mb-3">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-base md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-6 md:hidden h-1 w-12 bg-ocean-500 rounded-full" />
    </div>
  )
}
