import { useState, useEffect, useMemo, useRef } from 'react'
import * as Lucide from 'lucide-react'
import html2canvas from 'html2canvas'
import clsx from 'clsx'
import TravelCardPreview from './TravelCardPreview'
import { convertFlightTimeToWat, resolveStateName } from '../../utils/travelCardTime'

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
  onClose,
}) {
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

  const cardRef = useRef(null)

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

  // High-Resolution Export (PNG or JPEG)
  const handleExport = async (format = 'png') => {
    const target = document.getElementById('dnarai-travel-card-export-target')
    if (!target) {
      alert('Card preview element not found. Please refresh and try again.')
      return
    }

    try {
      setIsExporting(format)
      setExportFeedback(`Generating high-resolution ${format.toUpperCase()}...`)

      // Wait for fonts and rendering to be completely settled
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }
      await new Promise((r) => setTimeout(r, 200))

      const canvas = await html2canvas(target, {
        scale: 3, // 3x resolution for razor-sharp clarity and clear text
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('dnarai-travel-card-export-target')
          if (el) {
            el.style.width = '540px'
            el.style.minWidth = '540px'
            el.style.maxWidth = '540px'
            el.style.margin = '0 auto'
            el.style.transform = 'none'
          }
        },
      })

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
      const dataUrl = canvas.toDataURL(mimeType, 0.98)

      const cleanName = (passengerName || 'Client')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .slice(0, 25)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const filename = `DNARAI_StaffTravelCard_${cleanName}_${dateStr}.${format === 'jpeg' ? 'jpg' : 'png'}`

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setExportFeedback(`Downloaded ${filename} successfully!`)
      setTimeout(() => setExportFeedback(null), 4000)
    } catch (err) {
      console.error('Failed to export travel card:', err)
      alert(`Could not export card: ${err.message}`)
      setExportFeedback(null)
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
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

      {/* ======================================================== */}
      {/* MAIN TWO-COLUMN WORKSPACE: CONTROLS & LIVE PREVIEW       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: ITINERARY CONTROLS (6 cols on lg) */}
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

        {/* RIGHT COLUMN: LIVE CARD PREVIEW (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Staff Card Preview
              </span>
            </div>

            <div className="text-[11px] font-bold text-slate-400">
              High-Res Vector Export (560px)
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
          </div>
        </div>
      </div>
    </div>
  )
}
