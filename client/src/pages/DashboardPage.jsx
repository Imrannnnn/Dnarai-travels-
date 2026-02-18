import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'
import FlightCard from '../components/FlightCard'
import * as Lucide from 'lucide-react'
import { useAppData } from '../data/AppDataContext'
import BookingModal from '../components/BookingModal'
import FlightDetailsModal from '../components/FlightDetailsModal'

const Plus = Lucide.Plus
const Plane = Lucide.Plane

export default function DashboardPage() {
  const navigate = useNavigate()
  const { flights, passenger, addBooking, clearFlight, completeFlight } = useAppData()
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('upcoming') // 'upcoming' | 'history'

  const displayedFlights = flights.filter((f) => {
    if (viewMode === 'upcoming') return f.status !== 'Completed'
    return f.status === 'Completed'
  })

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1600px] space-y-10 pb-28 md:pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title={`Welcome back, ${passenger?.name?.split(' ')[0] || 'Traveler'}`}
          subtitle="Your global travel itinerary and updates are ready."
        />
        <div className="flex gap-3">
          <button
            onClick={() => setBookingModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ocean-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-[1.02] active:scale-95"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {!passenger && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700 bg-gradient-to-r from-ocean-600 to-indigo-600 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Lucide.UserCheck size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight font-display">Link Your Account</h3>
              <p className="text-white/80 font-medium max-w-xl">
                Your account is currently not linked to a passenger profile. Link your account now to see your travel details, history, and request new bookings seamlessly.
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-black text-ocean-700 shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <span>Setup Profile Now</span>
              <Lucide.ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <div className="space-y-8">
          <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-1 md:h-6 md:w-1.5 rounded-full bg-ocean-600" />
                  <h2 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-display">My Journeys</h2>
                </div>
                <p className="text-[10px] md:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4 md:ml-5">
                  Your curated travel itineraries
                </p>
              </div>

              <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center self-start sm:self-auto shadow-inner border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode('upcoming')}
                  className={clsx(
                    'relative rounded-xl px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all duration-300 whitespace-nowrap',
                    viewMode === 'upcoming'
                      ? 'bg-white dark:bg-slate-900 text-ocean-600 shadow-premium dark:text-ocean-400 ring-1 ring-black/5 dark:ring-white/5'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setViewMode('history')}
                  className={clsx(
                    'relative rounded-xl px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all duration-300 whitespace-nowrap',
                    viewMode === 'history'
                      ? 'bg-white dark:bg-slate-900 text-ocean-600 shadow-premium dark:text-ocean-400 ring-1 ring-black/5 dark:ring-white/5'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  History
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {displayedFlights.length > 0 ? (
                displayedFlights.map((f) => (
                  <FlightCard key={f.id} flight={f} onSelect={setSelectedFlight} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
                    <Plane size={48} className="text-ocean-200 dark:text-ocean-900" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-lg text-slate-900 dark:text-white font-display uppercase tracking-wide">No {viewMode} flights</p>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                      {viewMode === 'upcoming'
                        ? 'Your schedule is clear. Ready to plan your next adventure?'
                        : 'Your travel history is currently empty.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          {/* Status Card */}
          <div className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Plane size={120} className="text-slate-900 dark:text-white" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 font-display relative z-10">Travel Status</h3>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-5 p-5 bg-white/80 dark:bg-slate-950/50 rounded-2xl border border-white/50 dark:border-slate-700 shadow-sm backdrop-blur-sm">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-lg shadow-emerald-500/30"></span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Biometric Verified</div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mt-0.5">Ready for Boarding</div>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 bg-white/40 dark:bg-slate-900/20 rounded-2xl border border-white/20 dark:border-slate-800 backdrop-blur-sm">
                <div className="h-4 w-4 rounded-full bg-sky-500 relative">
                  <div className="absolute inset-0 bg-sky-400 blur-[2px] rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">Priority Access</div>
                  <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide mt-0.5">SkyTeam Elite</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-display">12</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trips</div>
                </div>
                <div className="text-center border-l border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-display">48k</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Miles</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <BookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onSubmit={addBooking}
      />

      <FlightDetailsModal
        open={!!selectedFlight}
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
        onClear={() => {
          if (confirm('Are you sure you want to remove this flight?')) {
            clearFlight(selectedFlight.id)
            setSelectedFlight(null)
          }
        }}
        onComplete={() => {
          completeFlight(selectedFlight.id)
          setSelectedFlight(null)
        }}
      />
    </div>
  )
}
