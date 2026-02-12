import * as Lucide from 'lucide-react'

export default function WavePlane({ size = 22, className = '', label = 'Loading' }) {
  const Plane = Lucide.Plane

  return (
    <div className={className} aria-label={label} role="img">
      <div className="relative h-14 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="absolute inset-0 opacity-70">
          <div className="wave-line" />
        </div>
        <div className="wave-plane">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-navy-800 text-white shadow">
            <Plane size={size} />
          </div>
        </div>
      </div>
    </div>
  )
}
