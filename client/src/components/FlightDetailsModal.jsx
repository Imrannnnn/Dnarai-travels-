import * as Lucide from 'lucide-react'
import Modal from './Modal'
import { convertTo12Hour, getTimePeriod } from '../utils/time'
import content from '../content/siteContent.json'

const FallbackIcon = () => null
const Calendar = Lucide.Calendar || FallbackIcon
const Clock = Lucide.Clock || FallbackIcon
const Luggage = Lucide.Luggage || FallbackIcon
const Plane = Lucide.Plane || FallbackIcon
const Armchair = Lucide.Armchair || FallbackIcon
const CloudSun = Lucide.CloudSun || FallbackIcon
const Sun = Lucide.Sun || FallbackIcon
const Cloud = Lucide.Cloud || FallbackIcon

function WeatherIcon({ type }) {
  if (type === 'sun') return <Sun className="text-coral-500" size={18} />
  if (type === 'cloud') return <Cloud className="text-ocean-400" size={18} />
  return <CloudSun className="text-ocean-500" size={18} />
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-sand-50/50 p-4 dark:bg-slate-900/50 border border-sand-100 dark:border-slate-800">
      {Icon ? <Icon size={18} className="mt-0.5 text-ocean-600" /> : null}
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </div>
      </div>
    </div>
  )
}

export default function FlightDetailsModal({ open, flight, onClose, onClear, onComplete }) {
  const title = flight
    ? `${flight.fromCity} (${flight.fromCode}) → ${flight.toCity} (${flight.toCode}) · ${flight.flightNumber}`
    : 'Flight details'

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {content.brandName} manages this booking and automates passenger communication.
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {flight?.status !== 'Completed' && (
              <button
                onClick={onComplete}
                className="rounded-xl bg-ocean-100 px-4 py-2 text-sm font-bold text-ocean-700 transition hover:bg-ocean-200 dark:bg-ocean-900/40 dark:text-ocean-300 dark:hover:bg-ocean-900/60"
              >
                Move to History
              </button>
            )}
            <button
              onClick={onClear}
              className="rounded-xl border border-coral-200 bg-white px-4 py-2 text-sm font-bold text-coral-600 transition hover:bg-coral-50 dark:border-coral-900/50 dark:bg-slate-950 dark:text-coral-400 dark:hover:bg-coral-900/20"
            >
              {flight?.status !== 'Completed' ? 'Cancel Flight' : 'Remove'}
            </button>
            <button className="rounded-xl bg-ocean-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-ocean-700 shadow-md shadow-ocean-600/20">
              Contact Support
            </button>
          </div>
        </div>
      }
    >
      {!flight ? null : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <img
              src={flight.logoUrl}
              alt={flight.airline}
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-display">
                {flight.airline}
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {flight.flightNumber} · {flight.status}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sand-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 shadow-card">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-xl bg-sand-50/50 p-4 dark:bg-slate-900 border border-sand-100 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wide text-ocean-600 dark:text-ocean-400">
                  Departure
                </div>
                <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100 font-display">
                  {convertTo12Hour(flight.departTime24)}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {getTimePeriod(flight.departTime24)} · {flight.fromCity} ({flight.fromCode})
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative flex w-full items-center justify-center">
                  <div className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-ocean-300 via-ocean-500 to-ocean-300 opacity-60" />
                  <div className="relative grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-slate-950 border-2 border-ocean-100 dark:border-slate-800 shadow-sm">
                    <Plane className="text-ocean-500" size={18} />
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {flight.duration}
                </div>
              </div>

              <div className="rounded-xl bg-sand-50/50 p-4 dark:bg-slate-900 border border-sand-100 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wide text-ocean-600 dark:text-ocean-400">
                  Arrival
                </div>
                <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100 font-display">
                  {convertTo12Hour(flight.arriveTime24)}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {getTimePeriod(flight.arriveTime24)} · {flight.toCity} ({flight.toCode})
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Row label="Departure Date" value={flight.date} icon={Calendar} />
            <Row label="Status" value={flight.status} icon={Clock} />
            <Row label="Seat" value={`Seat ${flight.seat}`} icon={Armchair} />
            <Row label="Baggage" value={flight.bags} icon={Luggage} />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-ocean-50/50 border border-ocean-100/50 px-5 py-4 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <WeatherIcon type={flight.weather?.type} />
              <div className="leading-tight">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  {flight.weather?.tempC}°C
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {flight.weather?.desc}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-ocean-600 italic bg-white dark:bg-slate-800 px-3 py-1 rounded-full font-display">
              {flight.weather?.label}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
