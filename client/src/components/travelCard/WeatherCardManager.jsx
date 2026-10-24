import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as Lucide from 'lucide-react'
import clsx from 'clsx'
import WeatherCardPreview from './WeatherCardPreview'
import {
  fetchWeatherTipData,
  formatDateReadable,
} from '../../utils/weatherCardService'
import { exportCardAsImage, exportCardAsPdf } from '../../utils/cardExport'
import airportData from '../../../airports.json'

export default function WeatherCardManager({
  passengers = [],
  bookings = [],
  initialPassengerId = null,
  onClose,
  onSwitchToTravelCard,
}) {
  // Mode: 'registered' (existing passenger in database) | 'manual' (walk-in client)
  const [clientMode, setClientMode] = useState(
    initialPassengerId ? 'registered' : 'manual'
  )

  // Passenger details
  const [passengerName, setPassengerName] = useState('Valued Traveler')
  const [selectedPassengerId, setSelectedPassengerId] = useState(
    initialPassengerId || ''
  )
  const [passengerSearch, setPassengerSearch] = useState('')

  // Destination & Flight details
  const [iata, setIata] = useState('IAH')
  const [city, setCity] = useState('Houston')
  const [airportName, setAirportName] = useState('GEO BUSH')
  const [state, setState] = useState('TX')
  const [travelDate, setTravelDate] = useState('2026-10-15')
  const [dateFormatted, setDateFormatted] = useState('October 15, 2026')

  // Weather & Advice Content
  const [weatherSummary, setWeatherSummary] = useState(
    `Hot and highly humid (Highs in the lower 90s°F/32°C–33°C, heat index up to 105°F) with mostly sunny skies turning to a 50% chance of afternoon thunderstorms and breezy conditions (gusts up to 25 mph). Overnight lows will cool down to 61°F–75°F.`
  )
  const [clothingAdvice, setClothingAdvice] = useState(
    `Wear loose, lightweight, breathable fabrics for the daytime heat, carry a packable rain layer for afternoon storms, and keep a light jacket for chilly indoor AC and cooler evening lows.`
  )
  const [weatherMetrics, setWeatherMetrics] = useState({
    highTempF: 92,
    highTempC: 33,
    lowTempF: 68,
    lowTempC: 20,
    apparentTempF: 105,
    apparentTempC: 41,
    conditionShort: 'Thunderstorms',
    conditionDesc: 'Afternoon thunderstorms',
    conditionIcon: 'storm',
    rainProb: 50,
    windSpeedMph: 15,
    windGustsMph: 25,
    humidity: 78,
  })

  // UI and feedback state
  const [isFetchingWeather, setIsFetchingWeather] = useState(false)
  const [isExporting, setIsExporting] = useState(null) // 'png' | 'jpeg' | null
  const [exportFeedback, setExportFeedback] = useState(null)
  const [airportSuggestions, setAirportSuggestions] = useState([])
  const [showAirportSuggestions, setShowAirportSuggestions] = useState(false)

  const cardRef = useRef(null)
  const airportWrapperRef = useRef(null)

  // Fullscreen Preview & View Mode state
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewMode, setViewMode] = useState('split') // 'split' | 'full'

  // Close airport suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        airportWrapperRef.current &&
        !airportWrapperRef.current.contains(event.target)
      ) {
        setShowAirportSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Get bookings for selected passenger
  const passengerBookings = useMemo(() => {
    if (!selectedPassengerId) return []
    const pId = String(selectedPassengerId)
    return bookings.filter((b) => {
      const bPid = String(
        b.passengerId?._id || b.passengerId?.id || b.passengerId
      )
      return bPid === pId
    })
  }, [bookings, selectedPassengerId])

  // Handle automated weather fetch
  const handleAutoGenerateWeather = useCallback(
    async (overrideParams = {}) => {
      const queryCity = overrideParams.city ?? city
      const queryIata = overrideParams.iata ?? iata
      const queryDate = overrideParams.travelDate ?? travelDate
      const queryAirport = overrideParams.airportName ?? airportName
      const queryState = overrideParams.state ?? state

      try {
        setIsFetchingWeather(true)
        setExportFeedback('Fetching climate data & generating weather tip...')

        const tip = await fetchWeatherTipData({
          city: queryCity,
          iata: queryIata,
          dateStr: queryDate,
          airportName: queryAirport,
          state: queryState,
        })

        setWeatherSummary(tip.weatherSummary)
        setClothingAdvice(tip.clothingAdvice)
        setWeatherMetrics(tip.metrics)
        setDateFormatted(tip.dateFormatted)

        if (tip.city && !city) setCity(tip.city)
        if (tip.airportName && !airportName) setAirportName(tip.airportName)

        setExportFeedback(
          tip.dataSource === 'live_forecast'
            ? 'Weather forecast successfully generated from live meteorology data!'
            : 'Weather tip successfully generated from destination climate profile!'
        )
        setTimeout(() => setExportFeedback(null), 3500)
      } catch (err) {
        console.error('Weather generation failed:', err)
        setExportFeedback(`Weather notice: ${err.message}`)
        setTimeout(() => setExportFeedback(null), 4000)
      } finally {
        setIsFetchingWeather(false)
      }
    },
    [city, iata, travelDate, airportName, state]
  )

  // When a registered passenger is selected
  useEffect(() => {
    if (clientMode !== 'registered' || !selectedPassengerId) return

    const p = passengers.find(
      (item) => String(item._id || item.id) === String(selectedPassengerId)
    )
    if (!p) return

    const pName = p.fullName || p.name || 'Valued Traveler'
    setPassengerName(pName)

    // If passenger has bookings, auto-populate from the latest or upcoming booking
    if (passengerBookings.length > 0) {
      const b = passengerBookings[0]
      const destIata = (b.destination?.iata || b.destIata || 'IAH').toUpperCase()
      const destCity = b.destination?.city || b.destCity || 'Houston'
      const destAirport = b.destination?.airport_name || ''
      const destState = b.destination?.state || b.destState || ''
      const depDate =
        b.departureDate ||
        (b.departureDateTimeUtc
          ? new Date(b.departureDateTimeUtc).toISOString().split('T')[0]
          : travelDate)

      setIata(destIata)
      setCity(destCity)
      if (destAirport) setAirportName(destAirport)
      if (destState) setState(destState)
      setTravelDate(depDate)
      setDateFormatted(formatDateReadable(depDate))

      // Trigger automated generation
      handleAutoGenerateWeather({
        city: destCity,
        iata: destIata,
        travelDate: depDate,
        airportName: destAirport,
        state: destState,
      })
    }
  }, [clientMode, selectedPassengerId, passengers, passengerBookings, handleAutoGenerateWeather, travelDate])

  // Airport Search & Autocomplete
  const handleAirportSearch = (value) => {
    setIata(value.toUpperCase())
    if (value.length < 2) {
      setAirportSuggestions([])
      setShowAirportSuggestions(false)
      return
    }

    const filtered = airportData
      .filter(
        (a) =>
          (a.iata || '').toLowerCase().includes(value.toLowerCase()) ||
          (a.city || '').toLowerCase().includes(value.toLowerCase()) ||
          (a.airport_name || '').toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 8)

    setAirportSuggestions(filtered)
    setShowAirportSuggestions(filtered.length > 0)
  }

  const handleSelectAirport = (airport) => {
    setIata(airport.iata)
    setCity(airport.city)
    setAirportName(airport.airport_name)
    setState(airport.country)
    setShowAirportSuggestions(false)

    // Trigger auto generation
    handleAutoGenerateWeather({
      city: airport.city,
      iata: airport.iata,
      airportName: airport.airport_name,
      state: airport.country,
    })
  }

  // High-Resolution & Perfectly Aligned Export (PNG, JPEG, or PDF)
  const handleExport = async (format = 'png') => {
    const target = document.getElementById('dnarai-weather-card-export-target')
    if (!target) {
      alert('Card preview element not found. Please refresh and try again.')
      return
    }

    try {
      setIsExporting(format)
      setExportFeedback(`Generating pixel-perfect ${format.toUpperCase()}...`)

      const cleanPassenger = (passengerName || 'Client')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .slice(0, 20)
      const cleanIata = (iata || 'DEST').toUpperCase()
      const dateStr = (travelDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '')

      if (format === 'pdf') {
        const filename = `DNARAI_WeatherTip_${cleanPassenger}_${cleanIata}_${dateStr}.pdf`
        await exportCardAsPdf(target, { filename, scale: 2, backgroundColor: '#FAF8F4' })
        setExportFeedback(`Downloaded ${filename} successfully!`)
      } else {
        const filename = `DNARAI_WeatherTip_${cleanPassenger}_${cleanIata}_${dateStr}.${format === 'jpeg' ? 'jpg' : 'png'}`
        await exportCardAsImage(target, { filename, format, scale: 2, backgroundColor: '#FAF8F4' })
        setExportFeedback(`Downloaded ${filename} successfully!`)
      }

      setTimeout(() => setExportFeedback(null), 4000)
    } catch (err) {
      console.error('Failed to export weather card:', err)
      alert(`Could not export weather card: ${err.message}`)
      setExportFeedback(null)
    } finally {
      setIsExporting(null)
    }
  }

  // Copy WhatsApp / Email Formatted Text
  const handleCopyText = () => {
    const text = `🌤️ *WEATHER TRAVEL TIP — D.NARAI TRAVELS* ✈️
👤 *Passenger:* ${passengerName.toUpperCase()}
📍 *Destination:* ${iata.toUpperCase()} (${city}${airportName ? `, ${airportName}` : ''}${state ? `, ${state}` : ''})
📅 *Travel Date:* ${dateFormatted || travelDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🌡️ *WEATHER SUMMARY FOR ${dateFormatted.toUpperCase()}:*
${weatherSummary}

👗 *WEATHER-ALIGNED CLOTHING ADVICE:*
${clothingAdvice}
━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *“Our services end when you successfully arrive at your destination”*

🌐 Website: www.dnaraitravels.com
📞 Direct Support: 08166698589`

    navigator.clipboard.writeText(text)
    setExportFeedback('Copied formatted weather tip text to clipboard!')
    setTimeout(() => setExportFeedback(null), 3000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      {/* ======================================================== */}
      {/* TOP HEADER & EXPORT ACTIONS                              */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <Lucide.SunMedium size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight font-display uppercase">
                  Weather Travel Tip Card
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Automated Tip
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate and export branded passenger climate & clothing advice cards.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
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
              <Lucide.Eye size={13} className="text-amber-500" />
              <span>Full Page</span>
            </button>
          </div>

          {/* Full Screen Modal Preview Button */}
          <button
            type="button"
            onClick={() => setIsFullscreenPreview(true)}
            className="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            title="Preview full card on entire screen"
          >
            <Lucide.Maximize2 size={14} className="text-amber-600" />
            <span>Full Screen Preview</span>
          </button>

          {onSwitchToTravelCard && (
            <button
              onClick={onSwitchToTravelCard}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
              title="Switch to Flight Itinerary Card"
            >
              <Lucide.Plane size={15} className="text-ocean-600" />
              <span>Itinerary Card</span>
            </button>
          )}

          <button
            onClick={handleCopyText}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
            title="Copy WhatsApp text format"
          >
            <Lucide.Copy size={15} className="text-emerald-600" />
            <span>Copy Text</span>
          </button>

          <button
            disabled={isExporting !== null}
            onClick={() => handleExport('jpeg')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            <Lucide.Download size={15} />
            <span>JPEG</span>
          </button>

          <button
            disabled={isExporting !== null}
            onClick={() => handleExport('pdf')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            title="Download PDF"
          >
            {isExporting === 'pdf' ? (
              <Lucide.Loader2 size={15} className="animate-spin" />
            ) : (
              <Lucide.FileText size={15} className="text-rose-600" />
            )}
            <span>PDF</span>
          </button>

          <button
            disabled={isExporting !== null}
            onClick={() => handleExport('png')}
            className="px-4 py-2.5 rounded-xl bg-[#00456E] hover:bg-[#003859] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-[#00456E]/20 disabled:opacity-50"
          >
            {isExporting === 'png' ? (
              <Lucide.Loader2 size={15} className="animate-spin" />
            ) : (
              <Lucide.Image size={15} />
            )}
            <span>Export HD PNG</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="Close Generator"
            >
              <Lucide.X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Export Status Feedback Alert */}
      {exportFeedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-xs font-semibold text-amber-900 animate-fadeIn">
          <Lucide.CheckCircle2 size={16} className="text-amber-600 shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Full Page Banner Alert */}
      {viewMode === 'full' && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Lucide.Eye size={16} className="text-amber-600 shrink-0" />
            <span>Full-Page Card Preview Mode — All edits and live data updates are active.</span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 font-bold text-amber-900 hover:bg-amber-100/50 shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Lucide.Columns size={13} />
            <span>Switch to Form + Preview</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* LAYOUT: CONFIGURATION CONTROLS + LIVE PREVIEW            */}
      {/* ======================================================== */}
      <div className={clsx(
        "grid gap-6 items-start",
        viewMode === 'split' ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1 max-w-2xl mx-auto w-full"
      )}>
        {/* ======================================================== */}
        {/* LEFT COLUMN: CONTROLS & AUTOMATION                       */}
        {/* ======================================================== */}
        {viewMode === 'split' && (
          <div className="lg:col-span-6 space-y-5">
          {/* Client Mode Switcher (Manual Walk-In vs Registered Database Passenger) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lucide.UserCheck size={14} className="text-ocean-600" />
                Traveler Profile Source
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {clientMode === 'registered' ? 'Database linked' : 'Custom input'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setClientMode('manual')}
                className={clsx(
                  'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
                  clientMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Lucide.Edit3 size={14} />
                <span>Manual Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setClientMode('registered')}
                className={clsx(
                  'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
                  clientMode === 'registered'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Lucide.Database size={14} />
                <span>Select Passenger ({passengers.length})</span>
              </button>
            </div>

            {/* Mode A: Database Passenger Selector */}
            {clientMode === 'registered' && (
              <div className="space-y-3 pt-2">
                <div className="relative">
                  <Lucide.Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={passengerSearch}
                    onChange={(e) => setPassengerSearch(e.target.value)}
                    placeholder="Search passenger by name, email, or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-ocean-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                  {filteredPassengers.map((p) => {
                    const isSelected =
                      String(p._id || p.id) === String(selectedPassengerId)
                    return (
                      <div
                        key={p._id || p.id}
                        onClick={() => setSelectedPassengerId(p._id || p.id)}
                        className={clsx(
                          'p-2.5 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between',
                          isSelected
                            ? 'bg-ocean-100/70 border border-ocean-300 text-ocean-900 font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        )}
                      >
                        <div>
                          <div className="font-bold">{p.fullName || p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.email || p.phone}
                          </div>
                        </div>
                        {isSelected && (
                          <Lucide.CheckCircle2 size={16} className="text-ocean-700" />
                        )}
                      </div>
                    )
                  })}
                  {filteredPassengers.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No passengers match search.
                    </div>
                  )}
                </div>

                {/* If selected passenger has bookings, show quick buttons */}
                {passengerBookings.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Booked Flights for this Passenger:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {passengerBookings.map((b, idx) => {
                        const dest =
                          b.destination?.iata || b.destIata || 'DEST'
                        const city =
                          b.destination?.city || b.destCity || ''
                        const date =
                          b.departureDate ||
                          (b.departureDateTimeUtc
                            ? new Date(b.departureDateTimeUtc)
                                .toISOString()
                                .split('T')[0]
                            : '')
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setIata(dest)
                              setCity(city)
                              if (date) {
                                setTravelDate(date)
                                setDateFormatted(formatDateReadable(date))
                              }
                              handleAutoGenerateWeather({
                                city,
                                iata: dest,
                                travelDate: date,
                              })
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold transition-all flex items-center gap-1.5"
                          >
                            <Lucide.PlaneTakeoff size={12} className="text-amber-600" />
                            <span>
                              {dest} ({city}) • {date}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Passenger Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Passenger Full Name (Displays on Card)
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="e.g. ADESANYA TEMITOPE"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-ocean-500 uppercase"
              />
            </div>
          </div>

          {/* Destination & Flight Details */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lucide.MapPin size={14} className="text-ocean-600" />
                Destination & Travel Date
              </label>
              <button
                type="button"
                onClick={() => handleAutoGenerateWeather()}
                disabled={isFetchingWeather}
                className="text-xs font-bold text-ocean-600 hover:text-ocean-800 flex items-center gap-1 disabled:opacity-50"
              >
                <Lucide.RefreshCw
                  size={13}
                  className={clsx(isFetchingWeather && 'animate-spin')}
                />
                <span>Auto-Refresh Weather</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* IATA Code with Autocomplete */}
              <div className="relative" ref={airportWrapperRef}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Destination Airport (IATA)
                </label>
                <div className="relative">
                  <Lucide.PlaneLanding
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={iata}
                    onChange={(e) => handleAirportSearch(e.target.value)}
                    onFocus={() => iata.length >= 2 && setShowAirportSuggestions(true)}
                    placeholder="e.g. IAH, LHR, LOS"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-black tracking-wider uppercase text-slate-900 focus:outline-none focus:border-ocean-500"
                  />
                </div>

                {/* Suggestions Dropdown */}
                {showAirportSuggestions && airportSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {airportSuggestions.map((a, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectAirport(a)}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-900 mr-2">
                            {a.iata}
                          </span>
                          <span className="text-slate-600">{a.city}</span>
                          <div className="text-[10px] text-slate-400 truncate">
                            {a.airport_name}
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold">
                          {a.country}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination City */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Destination City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Houston"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-ocean-500"
                />
              </div>

              {/* Airport / Terminal Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Airport / Terminal (e.g. GEO BUSH)
                </label>
                <input
                  type="text"
                  value={airportName}
                  onChange={(e) => setAirportName(e.target.value)}
                  placeholder="e.g. GEO BUSH"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-ocean-500 uppercase"
                />
              </div>

              {/* State / Country */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  State / Country Code
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. TX, United States"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-ocean-500 uppercase"
                />
              </div>
            </div>

            {/* Travel Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Main Travel Date
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => {
                    setTravelDate(e.target.value)
                    setDateFormatted(formatDateReadable(e.target.value))
                    handleAutoGenerateWeather({ travelDate: e.target.value })
                  }}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-ocean-500"
                />

                <input
                  type="text"
                  value={dateFormatted}
                  onChange={(e) => setDateFormatted(e.target.value)}
                  placeholder="e.g. October 15, 2026"
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-ocean-500"
                />
              </div>
            </div>

            {/* Big Trigger Button */}
            <button
              type="button"
              onClick={() => handleAutoGenerateWeather()}
              disabled={isFetchingWeather}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isFetchingWeather ? (
                <Lucide.Loader2 size={16} className="animate-spin" />
              ) : (
                <Lucide.Sparkles size={16} />
              )}
              <span>
                {isFetchingWeather
                  ? 'Generating Tip from Climate Engine...'
                  : 'Auto-Generate Weather Summary & Advice'}
              </span>
            </button>
          </div>

          {/* Weather Content Customization (Editable) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lucide.FileEdit size={14} className="text-ocean-600" />
                Weather Content & Clothing Advice
              </label>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                Staff Editable
              </span>
            </div>

            {/* Weather Summary Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Weather Summary for {dateFormatted}:
                </label>
                <span className="text-[10px] text-slate-400">
                  {weatherSummary.length} chars
                </span>
              </div>
              <textarea
                rows={3}
                value={weatherSummary}
                onChange={(e) => setWeatherSummary(e.target.value)}
                placeholder="Enter or customize the automated weather summary..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-ocean-500 resize-y"
              />
            </div>

            {/* Weather-Aligned Clothing Advice Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Weather-aligned clothing advice:
                </label>
                <span className="text-[10px] text-slate-400">
                  {clothingAdvice.length} chars
                </span>
              </div>
              <textarea
                rows={3}
                value={clothingAdvice}
                onChange={(e) => setClothingAdvice(e.target.value)}
                placeholder="Enter or customize the automated clothing advice..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-ocean-500 resize-y"
              />
            </div>

            {/* D.Narai Corporate Brand Palette */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Lucide.Sparkles size={13} style={{ color: '#F5A000' }} />
                  Corporate Brand Palette
                </span>
                <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Brand Standard
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold text-slate-600">
                <div className="bg-white rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
                  <div className="w-full h-3.5 rounded bg-[#06466B] mb-1" />
                  <span className="truncate block text-[9.5px]">Deep Navy</span>
                </div>
                <div className="bg-white rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
                  <div className="w-full h-3.5 rounded bg-[#F5A000] mb-1" />
                  <span className="truncate block text-[9.5px]">Warm Amber</span>
                </div>
                <div className="bg-white rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
                  <div className="w-full h-3.5 rounded bg-[#FAF8F4] border border-slate-200 mb-1" />
                  <span className="truncate block text-[9.5px]">Soft Ivory</span>
                </div>
                <div className="bg-white rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
                  <div className="w-full h-3.5 rounded bg-[#EAF1F5] border border-slate-200 mb-1" />
                  <span className="truncate block text-[9.5px]">Mist Blue</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ======================================================== */}
        {/* RIGHT COLUMN: LIVE REAL-TIME CARD PREVIEW                */}
        {/* ======================================================== */}
        <div className={clsx(
          "flex flex-col items-center",
          viewMode === 'split' ? "lg:col-span-6" : "w-full"
        )}>
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Lucide.Eye size={14} className="text-amber-500" />
              Live Visual Card Preview (540px)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                title="Preview full on screen"
              >
                <Lucide.Maximize2 size={12} className="text-amber-600" />
                <span>Full on Screen</span>
              </button>
            </div>
          </div>

          {/* Interactive Card Canvas Wrapper */}
          <div className="w-full flex justify-center overflow-x-auto py-2">
            <WeatherCardPreview
              ref={cardRef}
              passengerName={passengerName}
              iata={iata}
              city={city}
              airportName={airportName}
              state={state}
              travelDate={travelDate}
              dateFormatted={dateFormatted}
              weatherSummary={weatherSummary}
              clothingAdvice={clothingAdvice}
              metrics={weatherMetrics}
            />
          </div>

          <div className="text-center text-[11px] text-slate-400 mt-3 max-w-sm">
            Ready for instant download as 2x high-resolution PNG, JPEG, or document PDF for WhatsApp, Email, or printing.
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
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Lucide.SunMedium size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>D.Narai Weather Travel Tip Card</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Live Fullscreen View
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  {passengerName || 'Valued Traveler'} • {iata || 'DEST'} • {dateFormatted || travelDate}
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
                <span className="px-2 font-mono text-[11px] text-amber-300">
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
                className="px-3 py-1.5 rounded-xl bg-[#00456E] hover:bg-[#003859] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-white/20"
              >
                <Lucide.Image size={14} />
                <span>Save PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('jpeg')}
                disabled={isExporting !== null}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Lucide.Download size={14} />
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
              <WeatherCardPreview
                passengerName={passengerName}
                iata={iata}
                city={city}
                airportName={airportName}
                state={state}
                travelDate={travelDate}
                dateFormatted={dateFormatted}
                weatherSummary={weatherSummary}
                clothingAdvice={clothingAdvice}
                metrics={weatherMetrics}
              />
            </div>
          </div>

          {/* Modal Bottom Instruction */}
          <div className="w-full text-center text-[11px] text-slate-400 pt-2 shrink-0">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">ESC</kbd> or click the close button to return to the card editor.
          </div>
        </div>
      )}
    </div>
  )
}
