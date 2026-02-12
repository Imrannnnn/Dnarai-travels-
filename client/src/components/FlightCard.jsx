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
      className="group relative w-full overflow-hidden rounded-3xl bg-white text-left transition-all hover:-translate-y-1 hover:shadow-2xl focus:outline-none dark:bg-slate-900 premium-shadow border border-slate-200/60 dark:border-white/5"
      onClick={() => onSelect?.(flight)}
    >
      {/* Ticket "Punch" Circles */}
      <div className="absolute top-[65%] left-0 h-8 w-4 -translate-x-1/2 rounded-r-full bg-slate-50 dark:bg-slate-950 shadow-inner border-y border-r border-slate-200/60 dark:border-slate-800" />
      <div className="absolute top-[65%] right-0 h-8 w-4 translate-x-1/2 rounded-l-full bg-slate-50 dark:bg-slate-950 shadow-inner border-y border-l border-slate-200/60 dark:border-slate-800" />

      {/* --- Top Section: Airline & Route --- */}
      <div className="p-7 pb-10 relative">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl overflow-hidden shadow-sm bg-white p-1 border border-slate-100 dark:border-slate-800 dark:bg-slate-950">
              <img
                src={flight.logoUrl}
                alt={flight.airline}
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight font-display">{flight.airline}</div>
              <div className="text-xs font-semibold text-slate-500 font-mono tracking-wide">{flight.flightNumber}</div>
            </div>
          </div>
          <StatusBadge status={flight.status} />
        </div>

        <div className="flex items-center justify-between">
          {/* Origin */}
          <div className="text-left">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{flight.fromCity}</div>
            <div className="text-4xl font-black text-gradient-premium font-display tracking-tight">{flight.fromCode}</div>
            <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">{convertTo12Hour(flight.departTime24)}</div>
          </div>

          {/* Path Graphic */}
          <div className="flex-1 px-8 flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{flight.duration}</div>
              <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="relative w-full flex items-center">
              <div className="flex-1 h-[2px] bg-slate-200 dark:bg-slate-800" />
              <div className="bg-ocean-50 dark:bg-ocean-900/40 p-1.5 rounded-full z-10 mx-[-10px]">
                <Plane className="text-ocean-500 rotate-90" size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1 h-[2px] bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          {/* Destination */}
          <div className="text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{flight.toCity}</div>
            <div className="text-4xl font-black text-gradient-premium font-display tracking-tight">{flight.toCode}</div>
            <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">{convertTo12Hour(flight.arriveTime24)}</div>
          </div>
        </div>
      </div>

      {/* --- Divider --- */}
      <div className="relative flex items-center justify-center">
        <div className="w-[90%] border-t-2 border-dashed border-slate-200 dark:border-slate-800" />
      </div>

      {/* --- Bottom Section: Details --- */}
      <div className="bg-slate-50/50 dark:bg-slate-900/50 p-6 pt-8 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-4">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</span>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
              <Calendar size={16} className="text-ocean-500" />
              <span>{flight.date}</span>
            </div>
          </div>

          {/* Boarding */}
          <div className="flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 pl-6">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seat</span>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
              <Armchair size={16} className="text-ocean-500" />
              <span>{flight.seat}</span>
            </div>
          </div>

          {/* Weather */}
          <div className="flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 pl-6">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Forecast</span>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
              <WeatherIcon type={flight.weather.type} />
              <span>{flight.weather.tempC}°C</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
