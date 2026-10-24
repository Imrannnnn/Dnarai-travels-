import { useState, useEffect, useMemo, useRef } from 'react'
import * as Lucide from 'lucide-react'
import clsx from 'clsx'
import TravelCardPreview from './TravelCardPreview'
import WeatherCardManager from './WeatherCardManager'
import { convertFlightTimeToWat, resolveStateName } from '../../utils/travelCardTime'
import { exportCardAsImage, exportCardAsPdf } from '../../utils/cardExport'

// Helper to generate a blank itinerary leg
const createEmptyLeg = () => ({
  originCity: '',
  originState: '',
  originIata: '',
  destCity: '',
  destState: '',
  destIata: '',
  departureDate: '',
  departureTime: '',
  watDepTime: '',
  arrivalDate: '',
  arrivalTime: '',
  watArrTime: '',
  airline: '',
  flightNumber: '',
})

export default function TravelCardManager({
  passengers = [],
  bookings = [],
  initialPassengerId = null,
  initialCardType = 'travel',
  onClose,
}) {
  const [cardType, setCardType] = useState(initialCardType)

  // Mode: 'manual' (unregistered/walk-in client) | 'registered' (existing passenger in database)
  const [clientMode, setClientMode] = useState(
    initialPassengerId ? 'registered' : 'manual'
  )

  // Passenger details
  const [passengerName, setPassengerName] = useState('')
  const [selectedPassengerId, setSelectedPassengerId] = useState(
    initialPassengerId || ''
  )
  const [passengerSearch, setPassengerSearch] = useState('')

  // Card headers
  const [greeting, setGreeting] = useState('INTERNAL TRAVEL CARD')
  const [cardTitle, setCardTitle] = useState('Journey & Time-Zone Overview')
  const [showTimes] = useState(true)

  // Itinerary legs
  const [legs, setLegs] = useState([createEmptyLeg()])
  const [isExporting, setIsExporting] = useState(null) // 'png' | 'jpeg' | null
  const [exportFeedback, setExportFeedback] = useState(null)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewMode, setViewMode] = useState('split') // 'split' | 'full'

  const cardRef = useRef(null)

  // Close fullscreen modal with Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isFullscreenPreview) {
        setIsFullscreenPreview(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreenPreview])

  // If initialPassengerId changes, set client mode to registered
  useEffect(() => {
    if (initialPassengerId) {
      setSelectedPassengerId(initialPassengerId)
      setClientMode('registered')
    }
  }, [initialPassengerId])

  // Filter passengers for registered mode
  const filteredPassengers = useMemo(() => {
    if (!passengerSearch.trim()) return passengers
    const q = passengerSearch.toLowerCase()
    return passengers.filter((p) => {
      const name = (p.fullName || p.name || '').toLowerCase()
      const email = (p.email || '').toLowerCase()
      const phone = (p.phone || '').toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [passengers, passengerSearch])

  // When a registered passenger is selected, load their name and existing bookings
  useEffect(() => {
    if (clientMode !== 'registered' || !selectedPassengerId) return

    const p = passengers.find(
      (item) => String(item._id || item.id) === String(selectedPassengerId)
    )
    if (!p) return

    setPassengerName(p.fullName || p.name || 'Valued Traveler')

    // Find any bookings for this passenger
    const pId = String(p._id || p.id)
    const pBookings = bookings.filter((b) => {
      const bPid = String(
        b.passengerId?._id || b.passengerId?.id || b.passengerId
      )
      return bPid === pId
    })

    if (pBookings.length > 0) {
      // Sort chronologically
      pBookings.sort((a, b) => {
        const dateA = new Date(a.departureDateTimeUtc || a.departureDate || 0)
        const dateB = new Date(b.departureDateTimeUtc || b.departureDate || 0)
        return dateA - dateB
      })

      const mapped = pBookings.map((b) => {
        const depDate =
          b.departureDate ||
          (b.departureDateTimeUtc
            ? new Date(b.departureDateTimeUtc).toISOString().split('T')[0]
            : '')
        const depTime = b.departureTime || '14:00'
        const arrDate = b.arrivalDate || depDate
        const arrTime = b.arrivalTime || '18:00'
        const origIata = b.origin?.iata || b.originIata || ''
        const destIata = b.destination?.iata || b.destIata || ''

        const watDep = convertFlightTimeToWat({
          dateStr: depDate,
          timeStr: depTime,
          iata: origIata,
          country: b.origin?.country,
        })
        const watArr = convertFlightTimeToWat({
          dateStr: arrDate,
          timeStr: arrTime,
          iata: destIata,
          country: b.destination?.country,
        })

        const origCity =
          b.origin?.city || b.originCity || origIata || 'Origin City'
        const destCity =
          b.destination?.city ||
          b.destCity ||
          destIata ||
          'Destination City'

        const origState =
          b.origin?.state ||
          b.originState ||
          resolveStateName({ city: origCity, iata: origIata, fallback: '' })
        const destState =
          b.destination?.state ||
          b.destState ||
          resolveStateName({ city: destCity, iata: destIata, fallback: '' })

        return {
          originCity: origCity,
          originState: origState,
          originIata: origIata,
          destCity: destCity,
          destState: destState,
          destIata: destIata,
          departureDate: depDate,
          departureTime: depTime,
          watDepTime: watDep.watFormatted,
          arrivalDate: arrDate,
          arrivalTime: arrTime,
          watArrTime: watArr.watFormatted,
          airline: b.airlineName || b.airline || '',
          flightNumber: b.flightNumber || '',
        }
      })

      setLegs(mapped)
    }
  }, [clientMode, selectedPassengerId, passengers, bookings])

  // Recalculate WAT time for a specific leg when date, time, or IATA changes
  const updateLegWatTimes = (leg) => {
    const watDep = convertFlightTimeToWat({
      dateStr: leg.departureDate,
      timeStr: leg.departureTime,
      iata: leg.originIata,
    })
    const watArr = convertFlightTimeToWat({
      dateStr: leg.arrivalDate || leg.departureDate,
      timeStr: leg.arrivalTime,
      iata: leg.destIata,
    })
    return {
      ...leg,
      watDepTime: watDep.watFormatted,
      watArrTime: watArr.watFormatted,
    }
  }

  // Handle field change in an itinerary leg
  const handleLegChange = (index, field, value) => {
    setLegs((prev) => {
      const updated = [...prev]
      const currentLeg = { ...updated[index], [field]: value }

      // Auto-populate State name when IATA changes if state field is not yet set
      if (field === 'originIata' && value) {
        const autoState = resolveStateName({ iata: value, fallback: '' })
        if (autoState && !currentLeg.originState) {
          currentLeg.originState = autoState
        }
      }
      if (field === 'destIata' && value) {
        const autoState = resolveStateName({ iata: value, fallback: '' })
        if (autoState && !currentLeg.destState) {
          currentLeg.destState = autoState
        }
      }

      // If time, date, or airport IATA changed, update WAT conversion immediately
      if (
        [
          'departureTime',
          'departureDate',
          'originIata',
          'arrivalTime',
          'arrivalDate',
          'destIata',
        ].includes(field)
      ) {
        updated[index] = updateLegWatTimes(currentLeg)
      } else {
        updated[index] = currentLeg
      }
      return updated
    })
  }

  // Add new leg
  const handleAddLeg = () => {
    const lastLeg = legs[legs.length - 1]
    const newLeg = {
      originCity: lastLeg ? lastLeg.destCity : '',
      originState: lastLeg ? (lastLeg.destState || '') : '',
      originIata: lastLeg ? lastLeg.destIata : '',
      destCity: '',
      destState: '',
      destIata: '',
      departureDate: lastLeg ? (lastLeg.arrivalDate || lastLeg.departureDate) : '',
      departureTime: '',
      watDepTime: '',
      arrivalDate: '',
      arrivalTime: '',
      watArrTime: '',
      airline: '',
      flightNumber: '',
    }
    setLegs([...legs, newLeg])
  }

  // Remove leg
  const handleRemoveLeg = (index) => {
    if (legs.length <= 1) {
      alert('The card requires at least one journey segment.')
      return
    }
    setLegs(legs.filter((_, i) => i !== index))
  }

  // Move leg up
  const handleMoveUp = (index) => {
    if (index === 0) return
    setLegs((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index - 1]
      copy[index - 1] = temp
      return copy
    })
  }

  // Move leg down
  const handleMoveDown = (index) => {
    if (index >= legs.length - 1) return
    setLegs((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index + 1]
      copy[index + 1] = temp
      return copy
    })
  }

  // High-Resolution & Perfectly Aligned Export (PNG, JPEG, or PDF)
  const handleExport = async (format = 'png') => {
    const target = document.getElementById('dnarai-travel-card-export-target')
    if (!target) {
      alert('Card preview element not found. Please refresh and try again.')
      return
    }

    try {
      setIsExporting(format)
      setExportFeedback(`Generating pixel-perfect ${format.toUpperCase()}...`)

      const cleanName = (passengerName || 'Client')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .slice(0, 25)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')

      if (format === 'pdf') {
        const filename = `DNARAI_StaffTravelCard_${cleanName}_${dateStr}.pdf`
        await exportCardAsPdf(target, { filename, scale: 2, backgroundColor: '#ffffff' })
        setExportFeedback(`Downloaded ${filename} successfully!`)
      } else {
        const filename = `DNARAI_StaffTravelCard_${cleanName}_${dateStr}.${format === 'jpeg' ? 'jpg' : 'png'}`
        await exportCardAsImage(target, { filename, format, scale: 2, backgroundColor: '#ffffff' })
        setExportFeedback(`Downloaded ${filename} successfully!`)
      }

      setTimeout(() => setExportFeedback(null), 4000)
    } catch (err) {
      console.error('Failed to export travel card:', err)
      alert(`Could not export card: ${err.message}`)
      setExportFeedback(null)
    } finally {
      setIsExporting(null)
    }
  }

  if (cardType === 'weather') {
    return (
      <div className="space-y-4">
        {/* Card Type Switcher Bar */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setCardType('travel')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <Lucide.Plane size={14} className="text-ocean-600" />
            <span>Flight Timeline & WAT Card</span>
          </button>
          <button
            type="button"
            onClick={() => setCardType('weather')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-white text-slate-900 shadow-xs"
          >
            <Lucide.SunMedium size={14} className="text-amber-500" />
            <span>Weather Travel Tip Card</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
              Active
            </span>
          </button>
        </div>

        <WeatherCardManager
          passengers={passengers}
          bookings={bookings}
          initialPassengerId={selectedPassengerId || initialPassengerId}
          onClose={onClose}
          onSwitchToTravelCard={() => setCardType('travel')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      {/* Card Type Switcher Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setCardType('travel')}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-white text-slate-900 shadow-xs"
        >
          <Lucide.Plane size={14} className="text-ocean-600" />
          <span>Flight Timeline & WAT Card</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-ocean-100 text-ocean-800">
            Active
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCardType('weather')}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <Lucide.SunMedium size={14} className="text-amber-500" />
          <span>Weather Travel Tip Card</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
            New
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TOP HEADER & EXPORT ACTIONS                              */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-[#00456E] text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Lucide.Clock size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Staff Travel Card Generator
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Internal visual route and Nigeria Time (WAT) reference card for
                staff & administrators.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setPassengerName('')
              setLegs([createEmptyLeg()])
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
            title="Reset card fields"
          >
            <Lucide.RotateCcw size={13} />
            <span>Reset Card</span>
          </button>

          {/* View Mode Toggle: Split vs Full Page */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Split View (Form + Live Card)"
            >
              <Lucide.Columns size={13} />
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                viewMode === 'full'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Full Page Live Card"
            >
              <Lucide.Eye size={13} className="text-ocean-600" />
              <span>Full Page</span>
            </button>
          </div>

          {/* Full Screen Modal Preview Button */}
          <button
            type="button"
            onClick={() => setIsFullscreenPreview(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-ocean-200 bg-ocean-50/70 hover:bg-ocean-100/70 text-ocean-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
            title="Preview full card on entire screen"
          >
            <Lucide.Maximize2 size={14} className="text-ocean-600" />
            <span>Full Screen Preview</span>
          </button>

          <button
            disabled={isExporting !== null}
            onClick={() => handleExport('png')}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#00456E] hover:bg-[#0c3b5e] text-white text-xs font-bold shadow-md shadow-[#00456E]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting === 'png' ? (
              <Lucide.Loader2 size={15} className="animate-spin" />
            ) : (
              <Lucide.Download size={15} />
            )}
            <span>Export PNG</span>
          </button>

          <button
            disabled={isExporting !== null}
            onClick={() => handleExport('jpeg')}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting === 'jpeg' ? (
              <Lucide.Loader2 size={15} className="animate-spin" />
            ) : (
              <Lucide.Image size={15} />
            )}
            <span>Export JPEG</span>
          </button>

          <button
            disabled={isExporting !== null}
            onClick={() => handleExport('pdf')}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            title="Export as Document PDF"
          >
            {isExporting === 'pdf' ? (
              <Lucide.Loader2 size={15} className="animate-spin" />
            ) : (
              <Lucide.FileText size={15} className="text-rose-600" />
            )}
            <span>PDF</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center"
              title="Close Generator"
            >
              <Lucide.X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Export notification feedback */}
      {exportFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Lucide.CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Full Page Banner Alert */}
      {viewMode === 'full' && (
        <div className="bg-ocean-50/80 border border-ocean-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-ocean-900">
            <Lucide.Eye size={16} className="text-ocean-600 shrink-0" />
            <span>Full-Page Card Preview Mode — All itinerary legs and live adjustments are active.</span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className="px-3 py-1.5 rounded-xl bg-white border border-ocean-200 font-bold text-ocean-900 hover:bg-ocean-100/50 shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Lucide.Columns size={13} />
            <span>Switch to Form + Preview</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN WORKSPACE: CONTROLS & LIVE PREVIEW                  */}
      {/* ======================================================== */}
      <div className={clsx(
        "grid gap-8 items-start",
        viewMode === 'split' ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1 max-w-2xl mx-auto w-full"
      )}>
        {/* LEFT COLUMN: ITINERARY CONTROLS (6 cols on lg) */}
        {viewMode === 'split' && (
          <div className="lg:col-span-6 space-y-5">
          {/* CARD 1: CLIENT SELECTION & DETAILS */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                1. Client / Passenger
              </h2>

              {/* Mode Toggle Pills */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setClientMode('manual')}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                    clientMode === 'manual'
                      ? 'bg-white text-[#00456E] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Manual / Walk-In
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode('registered')}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                    clientMode === 'registered'
                      ? 'bg-white text-[#00456E] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Registered Client
                </button>
              </div>
            </div>

            {/* If Registered Client Mode */}
            {clientMode === 'registered' && (
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <label className="block text-xs font-bold text-slate-700">
                  Select Registered Passenger
                </label>
                <div className="relative">
                  <Lucide.Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search passenger by name or email..."
                    value={passengerSearch}
                    onChange={(e) => setPassengerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#00456E]"
                  />
                </div>

                <select
                  value={selectedPassengerId}
                  onChange={(e) => setSelectedPassengerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00456E]"
                >
                  {filteredPassengers.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.fullName || p.name} — {p.email || 'No email'}
                    </option>
                  ))}
                  {filteredPassengers.length === 0 && (
                    <option value="" disabled>
                      No passengers found
                    </option>
                  )}
                </select>
              </div>
            )}

            {/* Passenger Full Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Client / Passenger Name
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Enter client / passenger full name..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-[#00456E]"
              />
            </div>

            {/* Card Titles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Card Label
                </label>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="e.g. INTERNAL TRAVEL CARD"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:border-[#00456E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="e.g. Journey & Time-Zone Overview"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00456E]"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: JOURNEY SEGMENTS & WAT CONVERSIONS */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  2. Route Segments ({legs.length})
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enter local flight times. West Africa Time (WAT / UTC+1) converts
                  automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddLeg}
                className="px-3 py-1.5 rounded-xl bg-ocean-50 text-[#00456E] border border-ocean-200 hover:bg-ocean-100 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Lucide.Plus size={14} />
                <span>Add Segment</span>
              </button>
            </div>

            {/* Legs List */}
            <div className="space-y-4">
              {legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 relative"
                >
                  {/* Leg Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-[#00456E] text-white text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        {leg.originIata || 'ORG'} ➔ {leg.destIata || 'DST'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Up"
                      >
                        <Lucide.ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === legs.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Down"
                      >
                        <Lucide.ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLeg(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg ml-1"
                        title="Remove Segment"
                      >
                        <Lucide.Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Origin & Destination Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Origin */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Departure (From)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[9px] font-bold text-slate-500">
                            IATA
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            value={leg.originIata}
                            onChange={(e) =>
                              handleLegChange(
                                idx,
                                'originIata',
                                e.target.value.toUpperCase()
                              )
                            }
                            placeholder="LOS"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-center uppercase"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-500">
                            City, Country
                          </label>
                          <input
                            type="text"
                            value={leg.originCity}
                            onChange={(e) =>
                              handleLegChange(idx, 'originCity', e.target.value)
                            }
                            placeholder="Departure City, Country"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="text-[9px] font-bold text-slate-500 flex items-center justify-between">
                          <span>State Name (Card Time Badge)</span>
                          <span className="text-[8px] text-slate-400 font-normal">Auto or custom</span>
                        </label>
                        <input
                          type="text"
                          value={leg.originState || ''}
                          onChange={(e) =>
                            handleLegChange(idx, 'originState', e.target.value)
                          }
                          placeholder={resolveStateName({ city: leg.originCity, iata: leg.originIata, fallback: 'Departure State' })}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500">
                            Date
                          </label>
                          <input
                            type="date"
                            value={leg.departureDate}
                            onChange={(e) =>
                              handleLegChange(
                                idx,
                                'departureDate',
                                e.target.value
                              )
                            }
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 truncate block" title={`${leg.originState || resolveStateName({ city: leg.originCity, iata: leg.originIata, fallback: 'Departure' })} Time`}>
                            {leg.originState || resolveStateName({ city: leg.originCity, iata: leg.originIata, fallback: 'Departure' })} Time
                          </label>
                          <input
                            type="time"
                            value={leg.departureTime}
                            onChange={(e) =>
                              handleLegChange(
                                idx,
                                'departureTime',
                                e.target.value
                              )
                            }
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black text-[#00456E]"
                          />
                        </div>
                      </div>

                      {/* Calculated WAT Pill */}
                      <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center justify-between">
                        <span>Nigeria Time:</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                          {leg.watDepTime || leg.departureTime || '—:—'} WAT
                        </span>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Arrival (To)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[9px] font-bold text-slate-500">
                            IATA
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            value={leg.destIata}
                            onChange={(e) =>
                              handleLegChange(
                                idx,
                                'destIata',
                                e.target.value.toUpperCase()
                              )
                            }
                            placeholder="LHR"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-center uppercase"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-500">
                            City, Country
                          </label>
                          <input
                            type="text"
                            value={leg.destCity}
                            onChange={(e) =>
                              handleLegChange(idx, 'destCity', e.target.value)
                            }
                            placeholder="Arrival City, Country"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="text-[9px] font-bold text-slate-500 flex items-center justify-between">
                          <span>State Name (Card Time Badge)</span>
                          <span className="text-[8px] text-slate-400 font-normal">Auto or custom</span>
                        </label>
                        <input
                          type="text"
                          value={leg.destState || ''}
                          onChange={(e) =>
                            handleLegChange(idx, 'destState', e.target.value)
                          }
                          placeholder={resolveStateName({ city: leg.destCity, iata: leg.destIata, fallback: 'Arrival State' })}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500">
                            Date
                          </label>
                          <input
                            type="date"
                            value={leg.arrivalDate || leg.departureDate}
                            onChange={(e) =>
                              handleLegChange(idx, 'arrivalDate', e.target.value)
                            }
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 truncate block" title={`${leg.destState || resolveStateName({ city: leg.destCity, iata: leg.destIata, fallback: 'Arrival' })} Time`}>
                            {leg.destState || resolveStateName({ city: leg.destCity, iata: leg.destIata, fallback: 'Arrival' })} Time
                          </label>
                          <input
                            type="time"
                            value={leg.arrivalTime}
                            onChange={(e) =>
                              handleLegChange(idx, 'arrivalTime', e.target.value)
                            }
                            className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black text-[#00456E]"
                          />
                        </div>
                      </div>

                      {/* Calculated WAT Pill */}
                      <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center justify-between">
                        <span>Nigeria Time:</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                          {leg.watArrTime || leg.arrivalTime || '—:—'} WAT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Airline & Flight Number */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Airline (optional, e.g. Air Peace)"
                      value={leg.airline || ''}
                      onChange={(e) =>
                        handleLegChange(idx, 'airline', e.target.value)
                      }
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Flight No (optional, e.g. P4 7122)"
                      value={leg.flightNumber || ''}
                      onChange={(e) =>
                        handleLegChange(idx, 'flightNumber', e.target.value)
                      }
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium font-mono uppercase"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddLeg}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#00456E] hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Lucide.Plus size={15} />
              <span>Add Another Flight Segment</span>
            </button>
          </div>
        </div>
      )}

        {/* RIGHT COLUMN: LIVE CARD PREVIEW */}
        <div className={clsx(
          "flex flex-col items-center",
          viewMode === 'split' ? "lg:col-span-6" : "w-full"
        )}>
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Staff Card Preview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(true)}
                className="px-2.5 py-1 rounded-lg bg-ocean-50 hover:bg-ocean-100 border border-ocean-200 text-ocean-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                title="Preview full on screen"
              >
                <Lucide.Maximize2 size={12} className="text-ocean-600" />
                <span>Full on Screen</span>
              </button>
            </div>
          </div>

          {/* Card Container Frame */}
          <div className="w-full flex justify-center p-3 sm:p-5 bg-slate-100/90 rounded-3xl border border-slate-200 shadow-inner overflow-x-auto">
            <TravelCardPreview
              ref={cardRef}
              passengerName={passengerName}
              greeting={greeting}
              cardTitle={cardTitle}
              itineraryLegs={legs}
              showTimes={showTimes}
            />
          </div>

          {/* Quick Export Footer Bar under Preview */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full">
            <button
              disabled={isExporting !== null}
              onClick={() => handleExport('png')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00456E] hover:bg-[#0c3b5e] text-white text-xs font-bold shadow-md shadow-[#00456E]/20 transition-all flex items-center justify-center gap-2"
            >
              {isExporting === 'png' ? (
                <Lucide.Loader2 size={15} className="animate-spin" />
              ) : (
                <Lucide.Download size={15} />
              )}
              <span>Download PNG Card</span>
            </button>

            <button
              disabled={isExporting !== null}
              onClick={() => handleExport('jpeg')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isExporting === 'jpeg' ? (
                <Lucide.Loader2 size={15} className="animate-spin" />
              ) : (
                <Lucide.Image size={15} />
              )}
              <span>Download JPEG</span>
            </button>

            <button
              disabled={isExporting !== null}
              onClick={() => handleExport('pdf')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isExporting === 'pdf' ? (
                <Lucide.Loader2 size={15} className="animate-spin" />
              ) : (
                <Lucide.FileText size={15} className="text-rose-600" />
              )}
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FULLSCREEN IMMERSIVE LIGHTBOX MODAL                      */}
      {/* ======================================================== */}
      {isFullscreenPreview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col p-3 sm:p-5 animate-in fade-in duration-200 overflow-hidden"
        >
          {/* Top Bar inside Fullscreen Modal */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-ocean-500/20 text-ocean-400 flex items-center justify-center border border-ocean-500/30">
                <Lucide.Plane size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>D.Narai Staff Travel Card</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ocean-400/20 text-ocean-300 border border-ocean-400/30">
                    Live Fullscreen View
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  {passengerName || 'Client'} • {legs.length} Flight Leg{legs.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Modal Controls: Zoom & Actions */}
            <div className="flex items-center gap-2">
              {/* Zoom Buttons */}
              <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 border border-white/10 text-white text-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                  className="px-2.5 py-1 hover:bg-white/10 rounded-lg font-bold"
                  title="Zoom Out"
                >
                  <Lucide.ZoomOut size={14} />
                </button>
                <span className="px-2 font-mono text-[11px] text-ocean-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                  className="px-2.5 py-1 hover:bg-white/10 rounded-lg font-bold"
                  title="Zoom In"
                >
                  <Lucide.ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-1 hover:bg-white/10 rounded-lg text-[10px] uppercase font-bold text-slate-300"
                >
                  100%
                </button>
              </div>

              {/* Download actions right inside modal */}
              <button
                type="button"
                onClick={() => handleExport('png')}
                disabled={isExporting !== null}
                className="px-3 py-1.5 rounded-xl bg-[#00456E] hover:bg-[#0c3b5e] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-white/20"
              >
                <Lucide.Download size={14} />
                <span>Save PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('jpeg')}
                disabled={isExporting !== null}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Lucide.Image size={14} />
                <span>JPEG</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={isExporting !== null}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Lucide.FileText size={14} className="text-rose-400" />
                <span>PDF</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-1 border border-white/10"
                title="Close Fullscreen (Esc)"
              >
                <Lucide.X size={18} />
              </button>
            </div>
          </div>

          {/* Card Presentation Area (Centered & Scrollable) */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              <TravelCardPreview
                passengerName={passengerName}
                greeting={greeting}
                cardTitle={cardTitle}
                itineraryLegs={legs}
                showTimes={showTimes}
              />
            </div>
          </div>

          {/* Modal Bottom Instruction */}
          <div className="w-full text-center text-[11px] text-slate-400 pt-2 shrink-0">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">ESC</kbd> or click the close button to return to the itinerary editor.
          </div>
        </div>
      )}
    </div>
  )
}
