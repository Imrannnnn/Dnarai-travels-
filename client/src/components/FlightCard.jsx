import * as Lucide from 'lucide-react'
import { convertTo12Hour } from '../utils/time'
import clsx from 'clsx'

const FallbackIcon = () => null
const Plane = Lucide.Plane || FallbackIcon
const Calendar = Lucide.Calendar || FallbackIcon
const Armchair = Lucide.Armchair || FallbackIcon
const CloudSun = Lucide.CloudSun || FallbackIcon
const Sun = Lucide.Sun || FallbackIcon
const Cloud = Lucide.Cloud || FallbackIcon

function WeatherIcon({ type }) {
  if (type === 'sun') return <Sun className="text-coral-500" size={20} />
  if (type === 'cloud') return <Cloud className="text-ocean-400" size={20} />
  return <CloudSun className="text-ocean-500" size={20} />
}

function StatusBadge({ status }) {
  const tone = status === 'Updated' ? 'updated' : 'ontime'
  return (
    <span
      className={clsx(
        'rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide',
        tone === 'updated'
          ? 'bg-coral-50 text-coral-600 dark:bg-coral-900/20 dark:text-coral-400'
          : 'bg-ocean-50 text-ocean-700 dark:bg-ocean-900/20 dark:text-ocean-300'
      )}
    >
      {status}
    </span>
  )
}

export default function FlightCard({ flight, onSelect }) {
  return (
    <button
      type="button"
      className="group relative w-full overflow-hidden rounded-[2.5rem] bg-white text-left transition-all hover:shadow-2xl focus:outline-none dark:bg-slate-900 premium-shadow border border-slate-200/60 dark:border-white/5 active:scale-[0.98]"
      onClick={() => onSelect?.(flight)}
    >
      {/* Ticket "Punch" Circles */}
      <div className="absolute top-[65%] left-0 h-8 w-4 -translate-x-1/2 rounded-r-full bg-slate-50 dark:bg-slate-950 shadow-inner border-y border-r border-slate-200/60 dark:border-slate-800" />
      <div className="absolute top-[65%] right-0 h-8 w-4 translate-x-1/2 rounded-l-full bg-slate-50 dark:bg-slate-950 shadow-inner border-y border-l border-slate-200/60 dark:border-slate-800" />

      {/* --- Top Section: Airline & Route --- */}
      <div className="p-6 md:p-8 pb-10 relative">
        <div className="flex items-start justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl overflow-hidden shadow-sm bg-white p-1 border border-slate-100 dark:border-slate-800 dark:bg-slate-950 flex-shrink-0">
              <img
                src={flight.logoUrl}
                alt={flight.airline}
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight font-display truncate">{flight.airline}</div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400 font-mono tracking-wider uppercase">{flight.flightNumber}</div>
            </div>
          </div>
          <StatusBadge status={flight.status} />
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Origin */}
          <div className="text-left flex-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{flight.fromCity}</div>
            <div className="text-3xl md:text-5xl font-black text-gradient-premium font-display tracking-tight leading-none">{flight.fromCode}</div>
            <div className="mt-2 text-xs md:text-base font-bold text-slate-900 dark:text-slate-300">{convertTo12Hour(flight.departTime24)}</div>
          </div>

          {/* Path Graphic */}
          <div className="flex-[0.5] flex flex-col items-center justify-center pt-4">
            <div className="flex items-center gap-1 mb-1">
              <div className="text-[8px] md:text-[10px] font-black text-ocean-600/60 uppercase tracking-widest">{flight.duration}</div>
            </div>
            <div className="relative w-full flex items-center">
              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800" />
              <div className="bg-ocean-50 dark:bg-ocean-900/40 p-1.5 rounded-full z-10 mx-[-10px] transform group-hover:translate-x-2 transition-transform duration-700">
                <Plane className="text-ocean-500 rotate-90" size={16} md:size={20} strokeWidth={3} />
              </div>
              <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800" />
            </div>
          </div>

          {/* Destination */}
          <div className="text-right flex-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{flight.toCity}</div>
            <div className="text-3xl md:text-5xl font-black text-gradient-premium font-display tracking-tight leading-none">{flight.toCode}</div>
            <div className="mt-2 text-xs md:text-base font-bold text-slate-900 dark:text-slate-300">{convertTo12Hour(flight.arriveTime24)}</div>
          </div>
        </div>
      </div>

      {/* --- Divider --- */}
      <div className="relative flex items-center justify-center">
        <div className="w-[85%] border-t-2 border-dashed border-slate-200 dark:border-slate-800" />
      </div>

      {/* --- Bottom Section: Details --- */}
      <div className="bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-8 backdrop-blur-sm">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {/* Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Date</span>
              <div className="flex items-center gap-1.5 md:gap-2 text-slate-900 dark:text-white font-bold text-xs md:text-sm">
                <Calendar size={14} className="text-ocean-500" />
                <span className="truncate">{flight.date}</span>
              </div>
            </div>

            {/* Seat */}
            <div className="flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 pl-3 md:pl-6">
              <span className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Seat</span>
              <div className="flex items-center gap-1.5 md:gap-2 text-slate-900 dark:text-white font-bold text-xs md:text-sm">
                <Armchair size={14} className="text-ocean-500" />
                <span>{flight.seat}</span>
              </div>
            </div>

            {/* Weather */}
            <div className="flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 pl-3 md:pl-6">
              <span className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Climate</span>
              <div className="flex items-center gap-1.5 md:gap-2 text-slate-900 dark:text-white font-bold text-xs md:text-sm">
                <WeatherIcon type={flight.weather.type} />
                <span>{flight.weather.tempC}°C</span>
              </div>
            </div>
          </div>

          {/* Concierge Advice */}
          {flight.weather.advice && (
            <div className="rounded-2xl bg-white dark:bg-slate-950/50 p-4 border border-slate-100 dark:border-white/5 flex items-start gap-3 shadow-sm group-hover:bg-ocean-50/30 dark:group-hover:bg-ocean-900/10 transition-colors duration-300">
              <div className="mt-0.5 p-1.5 rounded-lg bg-ocean-100 dark:bg-ocean-950 text-ocean-600 dark:text-ocean-400">
                <Lucide.Sparkles size={14} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-ocean-600 dark:text-ocean-400 mb-1">Traveler&apos;s Attire Advice</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {flight.weather.advice}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
